import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createHistoryInboxServer } from '../scripts/history-inbox-server.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const quietLogger = { info() {}, warn() {}, error() {} };

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function minimalDraft() {
  return {
    capture: {
      workingTitle: 'Temporary authoring acceptance anchor',
      whyItMatters: 'Proves recoverable local capture without publishing test content.',
      sourceUrls: ['https://example.com/history/source'],
    },
    anchor: null,
    relationships: [],
  };
}

function completeDraft() {
  return {
    ...minimalDraft(),
    anchor: {
      id: 'temporary-authoring-acceptance-anchor',
      title: 'Temporary authoring acceptance anchor',
      date: { display: '2026', sortKey: 2026 },
      lane: 'north-america',
      story: 'A temporary candidate exercises the local History Inbox transaction boundary.',
      people: ['Example Researcher'],
      topics: ['authoring safety'],
      themes: ['maintainer tooling'],
      claimType: 'fact',
      confidence: 'high',
      source: {
        label: 'Temporary test source',
        url: 'https://example.com/history/source',
        accessedDate: '2026-09-01',
      },
    },
    relationships: [{
      id: 'temporary-authoring-acceptance-anchor-turing',
      from: 'temporary-authoring-acceptance-anchor',
      to: 'turing',
      type: 'influenced',
      confidence: 'documented',
      claimType: 'fact',
      label: 'Temporary candidate to Turing acceptance relationship.',
    }],
  };
}

async function fixture(t, options = {}) {
  const tempRoot = await mkdtemp(join(tmpdir(), 'knewzly-history-inbox-'));
  const corpusDir = join(tempRoot, 'content');
  const stateDir = join(tempRoot, '.knewzly');
  await mkdir(corpusDir, { recursive: true });
  await Promise.all([
    copyFile(join(ROOT, 'content', 'anchors.json'), join(corpusDir, 'anchors.json')),
    copyFile(join(ROOT, 'content', 'relationships.json'), join(corpusDir, 'relationships.json')),
  ]);
  if (options.storeBytes !== undefined) {
    await mkdir(stateDir, { recursive: true });
    await writeFile(join(stateDir, 'history-inbox.json'), options.storeBytes);
  }
  const inbox = createHistoryInboxServer({
    rootDir: ROOT,
    corpusDir,
    stateDir,
    faultInjector: options.faultInjector,
    logger: quietLogger,
  });
  const session = await inbox.start();
  t.after(async () => {
    await inbox.stop();
    await rm(tempRoot, { recursive: true, force: true });
  });
  return { tempRoot, corpusDir, stateDir, inbox, session };
}

async function api(session, path, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${session.origin}${path}`, {
    method,
    headers: {
      'X-Knewzly-Session': session.token,
      ...(method === 'GET' ? {} : { Origin: session.origin, 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}

async function rawRequest(session, path, headers = {}) {
  return new Promise((resolveRequest, rejectRequest) => {
    const request = httpRequest({
      host: session.host,
      port: session.port,
      path,
      headers: { Host: `${session.host}:${session.port}`, ...headers },
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolveRequest({
        status: response.statusCode,
        body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
      }));
    });
    request.on('error', rejectRequest);
    request.end();
  });
}

async function canonicalBytes(corpusDir) {
  const [anchors, relationships] = await Promise.all([
    readFile(join(corpusDir, 'anchors.json')),
    readFile(join(corpusDir, 'relationships.json')),
  ]);
  return { anchors, relationships };
}

async function save(session, body = completeDraft()) {
  return api(session, '/api/drafts/temporary-draft', { method: 'PUT', body });
}

test('T3 server binds only to loopback with an ephemeral port and random session token', async (t) => {
  const { inbox, session } = await fixture(t);

  assert.equal(session.host, '127.0.0.1');
  assert.ok(session.port > 0);
  assert.match(session.token, /^[a-f0-9]{64}$/);
  assert.equal(session.url, `${session.origin}/tools/history-inbox/?token=${session.token}`);
  assert.equal(inbox.promotionLocked, false);
});

test('T3 request authority, JSON, size, and route controls fail before state access', async (t) => {
  const { session, stateDir } = await fixture(t);

  const badToken = await fetch(`${session.origin}/api/bootstrap`, {
    headers: { 'X-Knewzly-Session': 'bad-token' },
  });
  assert.equal(badToken.status, 403);

  const badHost = await rawRequest(session, '/api/bootstrap', {
    Host: 'attacker.example',
    'X-Knewzly-Session': session.token,
  });
  assert.equal(badHost.status, 403);
  assert.equal(badHost.body.errors[0].code, 'authority.host');

  const badOrigin = await api(session, '/api/drafts/temporary-draft', {
    method: 'PUT',
    body: minimalDraft(),
    headers: { Origin: 'https://attacker.example' },
  });
  assert.equal(badOrigin.status, 403);
  assert.equal(badOrigin.body.errors[0].code, 'authority.origin');

  const badContentType = await api(session, '/api/drafts/temporary-draft', {
    method: 'PUT',
    body: JSON.stringify(minimalDraft()),
    headers: { 'Content-Type': 'text/plain' },
  });
  assert.equal(badContentType.status, 415);

  const oversized = await api(session, '/api/drafts/temporary-draft', {
    method: 'PUT',
    body: { ...minimalDraft(), padding: 'x'.repeat(70 * 1024) },
  });
  assert.equal(oversized.status, 413);

  const traversal = await rawRequest(session, `/tools/%2e%2e/package.json?token=${session.token}`);
  assert.equal(traversal.status, 404);
  const unknown = await rawRequest(session, `/package.json?token=${session.token}`);
  assert.equal(unknown.status, 404);

  await assert.rejects(access(join(stateDir, 'history-inbox.json')));
});

test('T3 incomplete drafts persist across restart without changing canonical bytes', async (t) => {
  const context = await fixture(t);
  const before = await canonicalBytes(context.corpusDir);
  const saved = await save(context.session, minimalDraft());
  assert.equal(saved.status, 200);
  assert.equal(saved.body.data.state, 'incomplete');
  await context.inbox.stop();

  const restarted = createHistoryInboxServer({
    rootDir: ROOT,
    corpusDir: context.corpusDir,
    stateDir: context.stateDir,
    logger: quietLogger,
  });
  const restartedSession = await restarted.start();
  t.after(() => restarted.stop());
  const bootstrap = await api(restartedSession, '/api/bootstrap');
  assert.equal(bootstrap.status, 200);
  assert.equal(bootstrap.body.data.drafts.length, 1);
  assert.equal(bootstrap.body.data.drafts[0].draftId, 'temporary-draft');
  assert.notEqual(restartedSession.token, context.session.token);

  const after = await canonicalBytes(context.corpusDir);
  assert.equal(hash(after.anchors), hash(before.anchors));
  assert.equal(hash(after.relationships), hash(before.relationships));
});

test('T3 draft timestamps are server-owned so client metadata cannot poison restart persistence', async (t) => {
  const context = await fixture(t);
  const saved = await save(context.session, {
    ...minimalDraft(),
    createdAt: 'not-a-timestamp',
    updatedAt: 'also-not-a-timestamp',
  });
  assert.equal(saved.status, 200);
  assert.notEqual(saved.body.data.createdAt, 'not-a-timestamp');
  assert.ok(Number.isFinite(Date.parse(saved.body.data.createdAt)));
  await context.inbox.stop();

  const restarted = createHistoryInboxServer({
    rootDir: ROOT,
    corpusDir: context.corpusDir,
    stateDir: context.stateDir,
    logger: quietLogger,
  });
  const restartedSession = await restarted.start();
  t.after(() => restarted.stop());
  const bootstrap = await api(restartedSession, '/api/bootstrap');
  assert.equal(bootstrap.status, 200);
  assert.equal(bootstrap.body.data.readOnly, false);
  assert.equal(bootstrap.body.data.drafts.length, 1);
});

test('T3 malformed store starts in named read-only mode', async (t) => {
  const { session, corpusDir } = await fixture(t, { storeBytes: '{not valid json' });
  const before = await canonicalBytes(corpusDir);
  const bootstrap = await api(session, '/api/bootstrap');
  assert.equal(bootstrap.status, 200);
  assert.equal(bootstrap.body.data.readOnly, true);
  assert.equal(bootstrap.body.data.storeError.code, 'store.malformed');
  assert.equal(bootstrap.body.data.storeError.path, '.knewzly/history-inbox.json');
  const attemptedSave = await save(session, minimalDraft());
  assert.equal(attemptedSave.status, 503);
  const after = await canonicalBytes(corpusDir);
  assert.equal(hash(after.anchors), hash(before.anchors));
  assert.equal(hash(after.relationships), hash(before.relationships));
});

test('T3 malformed nested draft and receipt entries fail closed into named read-only mode', async (t) => {
  const malformedStores = [
    {
      name: 'draft entry',
      value: {
        schemaVersion: 1,
        drafts: [{ draftId: 'broken-draft', state: 'complete', capture: null, anchor: null, relationships: [] }],
        promotedReceipts: [],
      },
    },
    {
      name: 'receipt entry',
      value: {
        schemaVersion: 1,
        drafts: [],
        promotedReceipts: [{ transactionId: 42 }],
      },
    },
  ];

  for (const malformed of malformedStores) {
    await t.test(malformed.name, async (subtest) => {
      const { session, corpusDir } = await fixture(subtest, {
        storeBytes: `${JSON.stringify(malformed.value)}\n`,
      });
      const before = await canonicalBytes(corpusDir);
      const bootstrap = await api(session, '/api/bootstrap');
      assert.equal(bootstrap.status, 200);
      assert.equal(bootstrap.body.data.readOnly, true);
      assert.equal(bootstrap.body.data.storeError.code, 'store.malformed');
      assert.equal(bootstrap.body.data.storeError.path, '.knewzly/history-inbox.json');
      const after = await canonicalBytes(corpusDir);
      assert.deepEqual(after.anchors, before.anchors);
      assert.deepEqual(after.relationships, before.relationships);
    });
  }
});

test('T3 browser source invalidates stale preview, fully reindexes relationship fields, and renders exact promotion receipts', async () => {
  const [appSource, html] = await Promise.all([
    readFile(join(ROOT, 'tools', 'history-inbox', 'app.js'), 'utf8'),
    readFile(join(ROOT, 'tools', 'history-inbox', 'index.html'), 'utf8'),
  ]);

  assert.match(appSource, /function invalidatePreview\(/);
  assert.match(appSource, /form\.addEventListener\('input', invalidatePreview\)/);
  assert.match(appSource, /function invalidatePreview\(\) \{\s*clearErrors\(\);\s*if \(!state\.preview\) return;/);
  const reindexBody = appSource.match(/function reindexRelationships\(\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(reindexBody, /field\.id = `relationship-\$\{index\}-\$\{field\.dataset\.field\}`/);
  assert.match(reindexBody, /label\.htmlFor = field\.id/);
  assert.match(reindexBody, /field\.setAttribute\('aria-describedby', inline\.id\)/);

  for (const field of ['transaction-id', 'receipt-draft-id', 'promoted-at', 'anchor-ids', 'relationship-ids', 'changed-paths', 'backup-location', 'promotion-instructions']) {
    assert.match(html, new RegExp(`id="${field}"`));
    assert.match(appSource, new RegExp(`'${field}'`));
  }
  assert.match(appSource, /populateDraft\(\);\s*renderPromotionReceipt\(result\)/);
  assert.match(html, /<link rel="icon" href="data:image\/svg\+xml,/);
});

test('T3 local launch, operating guidance, and production exclusions are explicit', async () => {
  const [packageText, readme, architecture, vercelIgnore] = await Promise.all([
    readFile(join(ROOT, 'package.json'), 'utf8'),
    readFile(join(ROOT, 'README.md'), 'utf8'),
    readFile(join(ROOT, 'docs', 'architecture.md'), 'utf8'),
    readFile(join(ROOT, '.vercelignore'), 'utf8'),
  ]);
  const packageJson = JSON.parse(packageText);
  assert.equal(packageJson.scripts['history:inbox'], 'node scripts/history-inbox-server.js --open');
  assert.match(readme, /npm run history:inbox/);
  assert.match(readme, /\.knewzly\/history-inbox\.json/);
  assert.match(readme, /does not.*historical.*verified/is);
  assert.match(readme, /git diff.*npm test.*commit.*push/is);
  assert.match(architecture, /loopback-only/i);
  assert.match(architecture, /history-inbox-backups/);
  assert.match(architecture, /restore/i);
  for (const excluded of ['tools', 'scripts', '.knewzly', 'src/history-authoring.js', 'src/history-content-validator.js']) {
    assert.match(vercelIgnore, new RegExp(`^${excluded.replaceAll('.', '\\.')}$`, 'm'));
  }
});

test('T3 preview fails incomplete drafts, validates a complete current-corpus candidate under one second, and does not write', async (t) => {
  const { session, corpusDir } = await fixture(t);
  const before = await canonicalBytes(corpusDir);
  assert.equal((await save(session, minimalDraft())).status, 200);
  const invalid = await api(session, '/api/preview', { method: 'POST', body: { draftId: 'temporary-draft' } });
  assert.equal(invalid.status, 422);
  assert.ok(invalid.body.errors.some(({ path }) => path === 'anchor'));

  const saved = await save(session);
  assert.equal(saved.status, 200);
  assert.equal(saved.body.data.state, 'complete');
  const preview = await api(session, '/api/preview', { method: 'POST', body: { draftId: 'temporary-draft' } });
  assert.equal(preview.status, 200, JSON.stringify(preview.body.errors));
  assert.ok(preview.body.data.durationMs < 1000, `preview took ${preview.body.data.durationMs}ms`);
  assert.equal(preview.body.data.preview.label, 'Draft preview — not published');
  assert.equal(preview.body.data.preview.historicalClaimVerified, false);
  assert.equal(preview.body.data.anchorsDocument.anchors.at(-1).id, 'temporary-authoring-acceptance-anchor');
  assert.equal(preview.body.data.relationshipsDocument.relationships.at(-1).id, 'temporary-authoring-acceptance-anchor-turing');

  const after = await canonicalBytes(corpusDir);
  assert.equal(hash(after.anchors), hash(before.anchors));
  assert.equal(hash(after.relationships), hash(before.relationships));
});

test('T3 cancelled and digest-conflicted promotion retain the draft and exact canonical bytes', async (t) => {
  const { session, corpusDir } = await fixture(t);
  assert.equal((await save(session)).status, 200);
  const preview = await api(session, '/api/preview', { method: 'POST', body: { draftId: 'temporary-draft' } });
  const beforeCancel = await canonicalBytes(corpusDir);
  const cancelled = await api(session, '/api/promote', {
    method: 'POST',
    body: { draftId: 'temporary-draft', confirmed: false, baseDigests: preview.body.data.baseDigests },
  });
  assert.equal(cancelled.status, 400);
  const afterCancel = await canonicalBytes(corpusDir);
  assert.equal(hash(afterCancel.anchors), hash(beforeCancel.anchors));
  assert.equal(hash(afterCancel.relationships), hash(beforeCancel.relationships));

  await writeFile(join(corpusDir, 'anchors.json'), Buffer.concat([beforeCancel.anchors, Buffer.from(' ')]));
  const beforeConflict = await canonicalBytes(corpusDir);
  const conflicted = await api(session, '/api/promote', {
    method: 'POST',
    body: { draftId: 'temporary-draft', confirmed: true, baseDigests: preview.body.data.baseDigests },
  });
  assert.equal(conflicted.status, 409);
  assert.equal(conflicted.body.errors[0].code, 'canonical.conflict');
  const afterConflict = await canonicalBytes(corpusDir);
  assert.equal(hash(afterConflict.anchors), hash(beforeConflict.anchors));
  assert.equal(hash(afterConflict.relationships), hash(beforeConflict.relationships));
  const bootstrap = await api(session, '/api/bootstrap');
  assert.equal(bootstrap.body.data.drafts[0].state, 'complete');
});

for (const stage of ['before-first-replace', 'before-second-replace']) {
  test(`T3 injected ${stage} failure restores both original byte sequences`, async (t) => {
    const context = await fixture(t, {
      faultInjector: async (currentStage) => {
        if (currentStage === stage) throw new Error(`Injected ${stage}`);
      },
    });
    assert.equal((await save(context.session)).status, 200);
    const preview = await api(context.session, '/api/preview', { method: 'POST', body: { draftId: 'temporary-draft' } });
    const before = await canonicalBytes(context.corpusDir);
    const promoted = await api(context.session, '/api/promote', {
      method: 'POST',
      body: {
        draftId: 'temporary-draft',
        confirmed: true,
        baseDigests: preview.body.data.baseDigests,
      },
    });
    assert.equal(promoted.status, 500);
    assert.equal(promoted.body.errors[0].code, 'promotion.rolled-back');
    const after = await canonicalBytes(context.corpusDir);
    assert.deepEqual(after.anchors, before.anchors);
    assert.deepEqual(after.relationships, before.relationships);
    const bootstrap = await api(context.session, '/api/bootstrap');
    assert.equal(bootstrap.body.data.drafts[0].state, 'complete');
  });
}

test('T3 restore failure reports backup location and locks further promotion', async (t) => {
  const { session, inbox } = await fixture(t, {
    faultInjector: async (stage) => {
      if (stage === 'before-second-replace' || stage === 'before-restore-anchors') {
        throw new Error(`Injected ${stage}`);
      }
    },
  });
  assert.equal((await save(session)).status, 200);
  const preview = await api(session, '/api/preview', { method: 'POST', body: { draftId: 'temporary-draft' } });
  const failed = await api(session, '/api/promote', {
    method: 'POST',
    body: { draftId: 'temporary-draft', confirmed: true, baseDigests: preview.body.data.baseDigests },
  });
  assert.equal(failed.status, 500);
  assert.equal(failed.body.errors[0].code, 'promotion.recovery-required');
  assert.match(failed.body.errors[0].message, /\.knewzly\/history-inbox-backups\//);
  assert.equal(inbox.promotionLocked, true);
  const locked = await api(session, '/api/promote', {
    method: 'POST',
    body: { draftId: 'temporary-draft', confirmed: true, baseDigests: preview.body.data.baseDigests },
  });
  assert.equal(locked.status, 503);
  assert.equal(locked.body.errors[0].code, 'promotion.locked');
});

test('T3 successful promotion appends only confirmed records and records an explicit local receipt', async (t) => {
  const { session, corpusDir, stateDir } = await fixture(t);
  assert.equal((await save(session)).status, 200);
  const preview = await api(session, '/api/preview', { method: 'POST', body: { draftId: 'temporary-draft' } });
  const before = {
    anchors: JSON.parse(await readFile(join(corpusDir, 'anchors.json'), 'utf8')),
    relationships: JSON.parse(await readFile(join(corpusDir, 'relationships.json'), 'utf8')),
  };
  const promoted = await api(session, '/api/promote', {
    method: 'POST',
    body: { draftId: 'temporary-draft', confirmed: true, baseDigests: preview.body.data.baseDigests },
  });
  assert.equal(promoted.status, 200, JSON.stringify(promoted.body.errors));
  assert.deepEqual(promoted.body.data.receipt.anchorIds, ['temporary-authoring-acceptance-anchor']);
  assert.deepEqual(promoted.body.data.receipt.relationshipIds, ['temporary-authoring-acceptance-anchor-turing']);
  assert.match(promoted.body.data.instructions, /git diff.*npm test.*commit.*push/i);
  const after = {
    anchors: JSON.parse(await readFile(join(corpusDir, 'anchors.json'), 'utf8')),
    relationships: JSON.parse(await readFile(join(corpusDir, 'relationships.json'), 'utf8')),
  };
  assert.deepEqual(after.anchors.anchors.slice(0, -1), before.anchors.anchors);
  assert.deepEqual(after.relationships.relationships.slice(0, -1), before.relationships.relationships);
  assert.equal(after.anchors.anchors.at(-1).id, 'temporary-authoring-acceptance-anchor');
  assert.equal(after.relationships.relationships.at(-1).id, 'temporary-authoring-acceptance-anchor-turing');
  const store = JSON.parse(await readFile(join(stateDir, 'history-inbox.json'), 'utf8'));
  assert.equal(store.drafts[0].state, 'promoted');
  assert.equal(store.promotedReceipts.length, 1);
  assert.equal(store.promotedReceipts[0].transactionId, promoted.body.data.receipt.transactionId);
});
