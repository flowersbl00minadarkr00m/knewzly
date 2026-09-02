import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createDraft,
  prepareCandidate,
  serializeCanonicalDocument,
  validateCapture,
} from '../src/history-authoring.js';
import { validateHistoryContent } from '../src/history-content-validator.js';

const HOST = '127.0.0.1';
const STORE_VERSION = 1;
const DEFAULT_REQUEST_LIMIT = 64 * 1024;
const MODULE_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = resolve(dirname(MODULE_PATH), '..');

const ASSET_PATHS = new Map([
  ['/tools/history-inbox/', 'tools/history-inbox/index.html'],
  ['/tools/history-inbox/index.html', 'tools/history-inbox/index.html'],
  ['/tools/history-inbox/app.js', 'tools/history-inbox/app.js'],
  ['/tools/history-inbox/history-inbox.css', 'tools/history-inbox/history-inbox.css'],
  ['/src/timeline-canvas.js', 'src/timeline-canvas.js'],
  ['/src/content-loader.js', 'src/content-loader.js'],
  ['/src/constellation-view.js', 'src/constellation-view.js'],
  ['/src/context-drawer.js', 'src/context-drawer.js'],
  ['/src/relationship-layer.js', 'src/relationship-layer.js'],
  ['/styles/atlas.css', 'styles/atlas.css'],
]);

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function clone(value) {
  return structuredClone(value);
}

function error(code, path, message) {
  return { code, path, message };
}

class HttpError extends Error {
  constructor(status, errors) {
    super(errors[0]?.message ?? 'Request failed.');
    this.status = status;
    this.errors = errors;
  }
}

function emptyStore() {
  return { schemaVersion: STORE_VERSION, drafts: [], promotedReceipts: [] };
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isTimestamp(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T/.test(value)
    && Number.isFinite(Date.parse(value));
}

function validateStoredAnchor(anchor) {
  if (anchor === null) return true;
  return isRecord(anchor)
    && ['id', 'title', 'lane', 'story', 'claimType', 'confidence'].every((key) => typeof anchor[key] === 'string')
    && isRecord(anchor.date)
    && typeof anchor.date.display === 'string'
    && (typeof anchor.date.sortKey === 'number' || anchor.date.sortKey === '')
    && isStringArray(anchor.people)
    && isStringArray(anchor.topics)
    && (anchor.themes === undefined || isStringArray(anchor.themes))
    && isRecord(anchor.source)
    && ['label', 'url', 'accessedDate'].every((key) => typeof anchor.source[key] === 'string');
}

function validateStoredRelationship(relationship) {
  return isRecord(relationship)
    && ['id', 'from', 'to', 'type', 'confidence', 'claimType', 'label']
      .every((key) => typeof relationship[key] === 'string');
}

function validateStoredDraft(draft) {
  return isRecord(draft)
    && draft.schemaVersion === STORE_VERSION
    && typeof draft.draftId === 'string'
    && /^[a-zA-Z0-9-]{1,80}$/.test(draft.draftId)
    && ['incomplete', 'complete', 'promoted'].includes(draft.state)
    && isTimestamp(draft.createdAt)
    && isTimestamp(draft.updatedAt)
    && isRecord(draft.capture)
    && typeof draft.capture.workingTitle === 'string'
    && typeof draft.capture.whyItMatters === 'string'
    && isStringArray(draft.capture.sourceUrls)
    && validateStoredAnchor(draft.anchor)
    && Array.isArray(draft.relationships)
    && draft.relationships.every(validateStoredRelationship);
}

function validateStoredReceipt(receipt) {
  return isRecord(receipt)
    && ['transactionId', 'draftId', 'promotedAt', 'backupLocation']
      .every((key) => typeof receipt[key] === 'string')
    && isTimestamp(receipt.promotedAt)
    && isStringArray(receipt.anchorIds)
    && isStringArray(receipt.relationshipIds)
    && isStringArray(receipt.paths);
}

function validateStore(value) {
  if (!(isRecord(value)
    && value.schemaVersion === STORE_VERSION
    && Array.isArray(value.drafts)
    && Array.isArray(value.promotedReceipts)
    && value.drafts.every(validateStoredDraft)
    && value.promotedReceipts.every(validateStoredReceipt))) return false;
  return new Set(value.drafts.map((draft) => draft.draftId)).size === value.drafts.length;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function jsonBytes(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function atomicWrite(filePath, bytes) {
  await mkdir(dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`;
  try {
    await writeFile(tempPath, bytes, { flag: 'wx' });
    await rename(tempPath, filePath);
  } finally {
    await rm(tempPath, { force: true }).catch(() => {});
  }
}

async function readStore(storePath) {
  try {
    const bytes = await readFile(storePath, 'utf8');
    const parsed = JSON.parse(bytes);
    if (!validateStore(parsed)) throw new Error('Unsupported History Inbox store shape or version.');
    return { ok: true, store: parsed };
  } catch (caught) {
    if (caught?.code === 'ENOENT') return { ok: true, store: emptyStore() };
    return {
      ok: false,
      store: null,
      error: error(
        'store.malformed',
        '.knewzly/history-inbox.json',
        'The local History Inbox store is malformed. Repair or move this file before editing drafts.',
      ),
    };
  }
}

function requireWritableStore(result) {
  if (result.ok) return result.store;
  throw new HttpError(503, [result.error]);
}

async function readCanonical(corpusDir) {
  const anchorsPath = join(corpusDir, 'anchors.json');
  const relationshipsPath = join(corpusDir, 'relationships.json');
  const [anchorsBytes, relationshipsBytes] = await Promise.all([
    readFile(anchorsPath),
    readFile(relationshipsPath),
  ]);
  let anchorsDocument;
  let relationshipsDocument;
  try {
    anchorsDocument = JSON.parse(anchorsBytes.toString('utf8'));
    relationshipsDocument = JSON.parse(relationshipsBytes.toString('utf8'));
  } catch {
    throw new HttpError(500, [error(
      'canonical.malformed',
      'content',
      'Canonical history content is not valid JSON; no authoring operation was performed.',
    )]);
  }
  return {
    anchorsPath,
    relationshipsPath,
    anchorsBytes,
    relationshipsBytes,
    anchorsDocument,
    relationshipsDocument,
    digests: {
      anchors: sha256(anchorsBytes),
      relationships: sha256(relationshipsBytes),
    },
  };
}

function stableOptions(anchorsDocument) {
  const anchors = anchorsDocument?.anchors ?? [];
  return {
    anchors: anchors.map(({ id, title }) => ({ id, title })),
    lanes: ['philosophy', 'europe', 'north-america', 'asia', 'africa'],
    anchorClaimTypes: ['fact', 'interpretation', 'conceptual-analogy'],
    anchorConfidences: ['high', 'medium', 'medium-high', 'contested'],
    relationshipTypes: ['influenced', 'enabled', 'reacted against', 'iterated on', 'institutionalized', 'regulated', 'conceptual lens'],
    relationshipConfidences: ['documented', 'interpretation', 'indirect'],
  };
}

function pathDraftId(pathname) {
  const match = pathname.match(/^\/api\/drafts\/([a-zA-Z0-9-]{1,80})$/);
  return match?.[1] ?? null;
}

function cookieToken(request) {
  const cookies = request.headers.cookie ?? '';
  for (const pair of cookies.split(';')) {
    const [name, ...rest] = pair.trim().split('=');
    if (name === 'knewzly_session') return rest.join('=');
  }
  return '';
}

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && a.length > 0
    && Buffer.compare(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest()) === 0;
}

function sendJson(response, status, body) {
  const bytes = Buffer.from(JSON.stringify(body));
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': bytes.length,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  response.end(bytes);
}

function sendError(response, caught) {
  if (caught instanceof HttpError) {
    sendJson(response, caught.status, { ok: false, errors: caught.errors });
    return;
  }
  sendJson(response, 500, {
    ok: false,
    errors: [error('server.failed', 'server', 'The local operation failed without changing published state.')],
  });
}

async function readJson(request, requestLimit) {
  const contentType = request.headers['content-type'] ?? '';
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new HttpError(415, [error('request.content-type', 'request', 'Use Content-Type: application/json.')]);
  }
  const declaredLength = Number(request.headers['content-length']);
  if (Number.isFinite(declaredLength) && declaredLength > requestLimit) {
    throw new HttpError(413, [error('request.too-large', 'request', `JSON requests are limited to ${requestLimit} bytes.`)]);
  }
  const chunks = [];
  let size = 0;
  let tooLarge = false;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > requestLimit) {
      tooLarge = true;
    } else {
      chunks.push(chunk);
    }
  }
  if (tooLarge) {
    throw new HttpError(413, [error('request.too-large', 'request', `JSON requests are limited to ${requestLimit} bytes.`)]);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    throw new HttpError(400, [error('request.invalid-json', 'request', 'Supply one valid JSON object.')]);
  }
}

function openBrowser(url) {
  const platformCommand = process.platform === 'win32'
    ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin'
      ? ['open', [url]]
      : ['xdg-open', [url]];
  const child = spawn(platformCommand[0], platformCommand[1], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

export function createHistoryInboxServer({
  rootDir = DEFAULT_ROOT,
  corpusDir = join(rootDir, 'content'),
  stateDir = join(rootDir, '.knewzly'),
  requestLimit = DEFAULT_REQUEST_LIMIT,
  now = () => new Date().toISOString(),
  createId = randomUUID,
  faultInjector = async () => {},
  logger = console,
} = {}) {
  const resolvedRoot = resolve(rootDir);
  const resolvedCorpus = resolve(corpusDir);
  const resolvedState = resolve(stateDir);
  const storePath = join(resolvedState, 'history-inbox.json');
  const backupRoot = join(resolvedState, 'history-inbox-backups');
  const token = randomBytes(32).toString('hex');
  let origin = null;
  let promotionLocked = false;

  async function saveStore(store) {
    if (!validateStore(store)) {
      throw new HttpError(500, [error(
        'store.invalid-write',
        '.knewzly/history-inbox.json',
        'The local History Inbox refused to write an invalid draft-store shape.',
      )]);
    }
    await atomicWrite(storePath, jsonBytes(store));
  }

  async function bootstrap() {
    const [storeResult, canonical] = await Promise.all([
      readStore(storePath),
      readCanonical(resolvedCorpus),
    ]);
    return {
      readOnly: !storeResult.ok || promotionLocked,
      storeError: storeResult.error ?? null,
      drafts: storeResult.ok ? clone(storeResult.store.drafts) : [],
      promotedReceipts: storeResult.ok ? clone(storeResult.store.promotedReceipts) : [],
      digests: canonical.digests,
      options: stableOptions(canonical.anchorsDocument),
    };
  }

  async function saveDraft(draftId, body) {
    if (promotionLocked) {
      throw new HttpError(503, [error('promotion.locked', 'promotion', 'Promotion is locked pending manual recovery.')]);
    }
    const store = requireWritableStore(await readStore(storePath));
    const existingIndex = store.drafts.findIndex((draft) => draft.draftId === draftId);
    if (existingIndex >= 0 && store.drafts[existingIndex].state === 'promoted') {
      throw new HttpError(409, [error('draft.promoted', 'draftId', 'A promoted draft cannot be edited.')]);
    }
    const timestamp = now();
    const normalized = createDraft({
      ...body,
      draftId,
      createdAt: existingIndex >= 0 ? store.drafts[existingIndex].createdAt : timestamp,
      updatedAt: timestamp,
    }, { now: () => timestamp, createId: () => draftId });
    const captureErrors = validateCapture(normalized.capture);
    if (captureErrors.length > 0) throw new HttpError(422, captureErrors);
    if (existingIndex >= 0) store.drafts[existingIndex] = normalized;
    else store.drafts.push(normalized);
    await saveStore(store);
    logger.info?.(`history-inbox: saved draft ${draftId} (${normalized.state})`);
    return clone(normalized);
  }

  async function discardDraft(draftId, body) {
    if (body.confirmed !== true) {
      throw new HttpError(400, [error('confirmation.required', 'confirmed', 'Explicit discard confirmation is required.')]);
    }
    const store = requireWritableStore(await readStore(storePath));
    const draft = store.drafts.find((item) => item.draftId === draftId);
    if (!draft) throw new HttpError(404, [error('draft.not-found', 'draftId', 'Draft not found.')]);
    if (draft.state === 'promoted') {
      throw new HttpError(409, [error('draft.promoted', 'draftId', 'A promoted draft receipt cannot be discarded through this route.')]);
    }
    store.drafts = store.drafts.filter((item) => item.draftId !== draftId);
    await saveStore(store);
    logger.info?.(`history-inbox: discarded draft ${draftId}`);
    return { draftId };
  }

  async function previewDraft(body) {
    const startedAt = performance.now();
    const store = requireWritableStore(await readStore(storePath));
    const draft = store.drafts.find((item) => item.draftId === body.draftId);
    if (!draft) throw new HttpError(404, [error('draft.not-found', 'draftId', 'Draft not found.')]);
    if (draft.state === 'promoted') throw new HttpError(409, [error('draft.promoted', 'draftId', 'This draft is already promoted.')]);
    const canonical = await readCanonical(resolvedCorpus);
    const candidate = prepareCandidate({
      draft,
      anchorsDocument: canonical.anchorsDocument,
      relationshipsDocument: canonical.relationshipsDocument,
    });
    if (!candidate.ok) {
      logger.info?.(`history-inbox: preview blocked with ${candidate.errors.length} errors`);
      throw new HttpError(422, candidate.errors);
    }
    candidate.data.baseDigests = canonical.digests;
    const durationMs = performance.now() - startedAt;
    logger.info?.(`history-inbox: preview valid in ${durationMs.toFixed(1)}ms`);
    return { ...candidate.data, warnings: candidate.warnings, durationMs };
  }

  async function restoreCanonical(canonical, transactionId) {
    const failures = [];
    for (const [name, path, bytes] of [
      ['anchors', canonical.anchorsPath, canonical.anchorsBytes],
      ['relationships', canonical.relationshipsPath, canonical.relationshipsBytes],
    ]) {
      try {
        await faultInjector(`before-restore-${name}`, { transactionId });
        await atomicWrite(path, bytes);
      } catch {
        failures.push(name);
      }
    }
    return failures;
  }

  async function promoteDraft(body) {
    if (promotionLocked) {
      throw new HttpError(503, [error('promotion.locked', 'promotion', 'Promotion is locked pending manual recovery from the reported backup.')]);
    }
    if (body.confirmed !== true) {
      throw new HttpError(400, [error('confirmation.required', 'confirmed', 'Explicit promotion confirmation is required.')]);
    }
    const store = requireWritableStore(await readStore(storePath));
    const draftIndex = store.drafts.findIndex((item) => item.draftId === body.draftId);
    if (draftIndex < 0) throw new HttpError(404, [error('draft.not-found', 'draftId', 'Draft not found.')]);
    if (store.drafts[draftIndex].state === 'promoted') {
      throw new HttpError(409, [error('draft.promoted', 'draftId', 'This draft is already promoted.')]);
    }
    const canonical = await readCanonical(resolvedCorpus);
    if (body.baseDigests?.anchors !== canonical.digests.anchors
      || body.baseDigests?.relationships !== canonical.digests.relationships) {
      throw new HttpError(409, [error(
        'canonical.conflict',
        'baseDigests',
        'Canonical content changed after preview. Refresh the preview before promoting.',
      )]);
    }
    const candidate = prepareCandidate({
      draft: store.drafts[draftIndex],
      anchorsDocument: canonical.anchorsDocument,
      relationshipsDocument: canonical.relationshipsDocument,
    });
    if (!candidate.ok) throw new HttpError(422, candidate.errors);

    const transactionId = createId();
    const backupDir = join(backupRoot, transactionId);
    const backupLocation = `.knewzly/history-inbox-backups/${transactionId}`;
    await mkdir(backupDir, { recursive: true });
    await Promise.all([
      writeFile(join(backupDir, 'anchors.json'), canonical.anchorsBytes, { flag: 'wx' }),
      writeFile(join(backupDir, 'relationships.json'), canonical.relationshipsBytes, { flag: 'wx' }),
    ]);

    const anchorsTemp = join(resolvedCorpus, `.anchors.${transactionId}.tmp`);
    const relationshipsTemp = join(resolvedCorpus, `.relationships.${transactionId}.tmp`);
    try {
      await writeFile(anchorsTemp, serializeCanonicalDocument(candidate.data.anchorsDocument), { flag: 'wx' });
      await writeFile(relationshipsTemp, serializeCanonicalDocument(candidate.data.relationshipsDocument), { flag: 'wx' });
      const stagedValidation = validateHistoryContent(
        JSON.parse(await readFile(anchorsTemp, 'utf8')),
        JSON.parse(await readFile(relationshipsTemp, 'utf8')),
      );
      if (!stagedValidation.ok) throw new Error('Staged canonical validation failed.');

      await faultInjector('before-first-replace', { transactionId });
      await rename(anchorsTemp, canonical.anchorsPath);
      await faultInjector('before-second-replace', { transactionId });
      await rename(relationshipsTemp, canonical.relationshipsPath);

      const final = await readCanonical(resolvedCorpus);
      const finalValidation = validateHistoryContent(final.anchorsDocument, final.relationshipsDocument);
      if (!finalValidation.ok) throw new Error('Final canonical validation failed.');
      await faultInjector('before-store-commit', { transactionId });
      const promotedAt = now();
      const receipt = {
        transactionId,
        draftId: body.draftId,
        promotedAt,
        anchorIds: clone(candidate.data.diff.anchorIds),
        relationshipIds: clone(candidate.data.diff.relationshipIds),
        paths: clone(candidate.data.diff.paths),
        backupLocation,
      };
      store.drafts[draftIndex] = { ...store.drafts[draftIndex], state: 'promoted', updatedAt: promotedAt };
      store.promotedReceipts.push(receipt);
      await saveStore(store);
      logger.info?.(`history-inbox: promoted transaction ${transactionId}; changed ${receipt.anchorIds.length} anchor(s), ${receipt.relationshipIds.length} relationship(s)`);
      return {
        receipt,
        instructions: 'Inspect git diff, run npm test, then commit and push only after maintainer review.',
      };
    } catch (caught) {
      const restoreFailures = await restoreCanonical(canonical, transactionId);
      if (restoreFailures.length > 0) {
        promotionLocked = true;
        logger.error?.(`history-inbox: rollback incomplete; manual recovery required at ${backupLocation}`);
        throw new HttpError(500, [error(
          'promotion.recovery-required',
          'promotion',
          `Promotion did not succeed. Further promotion is locked. Restore ${restoreFailures.join(' and ')} from ${backupLocation}.`,
        )]);
      }
      logger.warn?.(`history-inbox: transaction ${transactionId} rolled back; backup retained at ${backupLocation}`);
      throw new HttpError(500, [error(
        'promotion.rolled-back',
        'promotion',
        `Promotion did not succeed. Both canonical files were restored byte-for-byte; backup retained at ${backupLocation}.`,
      )]);
    } finally {
      await Promise.all([
        rm(anchorsTemp, { force: true }),
        rm(relationshipsTemp, { force: true }),
      ]);
    }
  }

  const server = createServer(async (request, response) => {
    try {
      if (!origin) throw new Error('Server is not ready.');
      const expectedHost = origin.slice('http://'.length);
      if (request.headers.host !== expectedHost) {
        throw new HttpError(403, [error('authority.host', 'request.host', 'Host must match the loopback History Inbox origin.')]);
      }
      const rawTarget = request.url ?? '/';
      if (/\\|%2f|%5c|%2e|%00/i.test(rawTarget)) {
        throw new HttpError(404, [error('route.not-found', 'request.path', 'Route not found.')]);
      }
      const url = new URL(rawTarget, origin);
      const suppliedToken = request.headers['x-knewzly-session']
        ?? url.searchParams.get('token')
        ?? cookieToken(request);
      if (!safeEqual(suppliedToken, token)) {
        throw new HttpError(403, [error('authority.token', 'request.token', 'A valid History Inbox session token is required.')]);
      }

      if (request.method === 'GET' && ASSET_PATHS.has(url.pathname)) {
        const relativePath = ASSET_PATHS.get(url.pathname);
        const absolutePath = resolve(resolvedRoot, relativePath);
        const rootRelativePath = relative(resolvedRoot, absolutePath);
        if (rootRelativePath.startsWith('..') || isAbsolute(rootRelativePath)) {
          throw new HttpError(404, [error('route.not-found', 'request.path', 'Route not found.')]);
        }
        const bytes = await readFile(absolutePath);
        response.writeHead(200, {
          'Cache-Control': 'no-store',
          'Content-Type': CONTENT_TYPES[extname(absolutePath)] ?? 'application/octet-stream',
          'Content-Length': bytes.length,
          'Set-Cookie': `knewzly_session=${token}; HttpOnly; SameSite=Strict; Path=/`,
          'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'",
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'no-referrer',
        });
        response.end(bytes);
        return;
      }

      if (!url.pathname.startsWith('/api/')) {
        throw new HttpError(404, [error('route.not-found', 'request.path', 'Route not found.')]);
      }
      const suppliedOrigin = request.headers.origin;
      if (suppliedOrigin && suppliedOrigin !== origin) {
        throw new HttpError(403, [error('authority.origin', 'request.origin', 'Origin must exactly match the History Inbox origin.')]);
      }

      if (request.method === 'GET' && url.pathname === '/api/bootstrap') {
        sendJson(response, 200, { ok: true, data: await bootstrap() });
        return;
      }

      const draftId = pathDraftId(url.pathname);
      if (request.method === 'PUT' && draftId) {
        if (suppliedOrigin !== origin) throw new HttpError(403, [error('authority.origin', 'request.origin', 'Origin is required for mutations and must match exactly.')]);
        sendJson(response, 200, { ok: true, data: await saveDraft(draftId, await readJson(request, requestLimit)) });
        return;
      }
      if (request.method === 'DELETE' && draftId) {
        if (suppliedOrigin !== origin) throw new HttpError(403, [error('authority.origin', 'request.origin', 'Origin is required for mutations and must match exactly.')]);
        sendJson(response, 200, { ok: true, data: await discardDraft(draftId, await readJson(request, requestLimit)) });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/preview') {
        if (suppliedOrigin !== origin) throw new HttpError(403, [error('authority.origin', 'request.origin', 'Origin is required for mutations and must match exactly.')]);
        sendJson(response, 200, { ok: true, data: await previewDraft(await readJson(request, requestLimit)) });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/promote') {
        if (suppliedOrigin !== origin) throw new HttpError(403, [error('authority.origin', 'request.origin', 'Origin is required for mutations and must match exactly.')]);
        sendJson(response, 200, { ok: true, data: await promoteDraft(await readJson(request, requestLimit)) });
        return;
      }
      throw new HttpError(404, [error('route.not-found', 'request.path', 'Route not found.')]);
    } catch (caught) {
      sendError(response, caught);
    }
  });

  return {
    async start() {
      if (origin) throw new Error('History Inbox server is already running.');
      await new Promise((resolveStart, rejectStart) => {
        server.once('error', rejectStart);
        server.listen(0, HOST, () => {
          server.off('error', rejectStart);
          resolveStart();
        });
      });
      const address = server.address();
      origin = `http://${HOST}:${address.port}`;
      return {
        host: HOST,
        port: address.port,
        origin,
        token,
        url: `${origin}/tools/history-inbox/?token=${token}`,
        storePath,
      };
    },
    async stop() {
      if (!server.listening) return;
      await new Promise((resolveStop, rejectStop) => server.close((caught) => (
        caught ? rejectStop(caught) : resolveStop()
      )));
      origin = null;
    },
    get promotionLocked() {
      return promotionLocked;
    },
  };
}

async function runCli() {
  const inbox = createHistoryInboxServer();
  const session = await inbox.start();
  console.log(`History Inbox: ${session.url}`);
  console.log(`Bound to ${session.host}:${session.port}; drafts: .knewzly/history-inbox.json`);
  if (process.argv.includes('--open')) openBrowser(session.url);
  const stop = async () => {
    await inbox.stop();
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(MODULE_PATH)) {
  runCli().catch((caught) => {
    console.error(`History Inbox failed to start: ${caught.message}`);
    process.exitCode = 1;
  });
}
