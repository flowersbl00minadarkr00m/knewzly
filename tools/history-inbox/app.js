import { renderConstellation } from '/src/constellation-view.js';
import { drawerRelationshipItems, renderDrawerContent } from '/src/context-drawer.js';
import { buildRelationshipItems } from '/src/relationship-layer.js';
import { renderTimelineCanvas } from '/src/timeline-canvas.js';

const token = new URLSearchParams(location.search).get('token') ?? '';
const state = { bootstrap: null, preview: null };

const byId = (id) => document.getElementById(id);
const form = byId('draft-form');
const status = byId('status');
const errorSummary = byId('error-summary');
const errorList = byId('error-list');
const relationshipList = byId('relationship-list');
const previewSection = byId('preview-section');
const promoteButton = byId('promote-draft');
const promotionConfirmed = byId('promotion-confirmed');
const promotionReceipt = byId('promotion-receipt');

const staticPathIds = new Map([
  ['capture.workingTitle', 'capture-working-title'],
  ['capture.whyItMatters', 'capture-why'],
  ['capture.sourceUrls', 'capture-source-urls'],
  ['anchor', 'anchor-id'],
  ['anchor.id', 'anchor-id'],
  ['anchor.title', 'anchor-title'],
  ['anchor.date.display', 'anchor-date-display'],
  ['anchor.date.sortKey', 'anchor-date-sort'],
  ['anchor.lane', 'anchor-lane'],
  ['anchor.story', 'anchor-story'],
  ['anchor.claimType', 'anchor-claim-type'],
  ['anchor.confidence', 'anchor-confidence'],
  ['anchor.source.label', 'source-label'],
  ['anchor.source.url', 'source-url'],
  ['anchor.source.accessedDate', 'source-accessed-date'],
]);

function lines(value) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function selectOptions(select, values, placeholder = 'Choose…') {
  select.innerHTML = '';
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = placeholder;
  select.appendChild(blank);
  for (const value of values ?? []) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, {
    method,
    headers: {
      'X-Knewzly-Session': token,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const envelope = await response.json();
  if (!response.ok || !envelope.ok) {
    const caught = new Error(envelope.errors?.[0]?.message ?? 'Local request failed.');
    caught.status = response.status;
    caught.errors = envelope.errors ?? [];
    throw caught;
  }
  return envelope.data;
}

function relationshipField(path) {
  const match = path.match(/^relationships\[(\d+)\]\.(.+)$/);
  if (!match) return null;
  return relationshipList.querySelector(`[data-index="${match[1]}"] [data-field="${CSS.escape(match[2])}"]`);
}

function fieldForPath(path) {
  if (path.startsWith('capture.sourceUrls[')) return byId('capture-source-urls');
  return byId(staticPathIds.get(path)) ?? relationshipField(path) ?? byId('anchor-id');
}

function clearErrors() {
  errorSummary.hidden = true;
  errorList.innerHTML = '';
  document.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));
  document.querySelectorAll('.field-error').forEach((message) => { message.textContent = ''; });
}

function showErrors(errors) {
  clearErrors();
  for (const item of errors) {
    const field = fieldForPath(item.path);
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      const inline = field.closest('.relationship-row')
        ? field.closest('.relationship-row').querySelector(`[data-error="${CSS.escape(item.path.split('.').at(-1))}"]`)
        : byId(`error-${field.id}`);
      if (inline) inline.textContent = item.message;
    }
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = field ? `#${field.id}` : '#draft-form';
    link.textContent = item.message;
    if (field) link.addEventListener('click', () => setTimeout(() => field.focus(), 0));
    li.appendChild(link);
    errorList.appendChild(li);
  }
  errorSummary.hidden = false;
  errorSummary.focus();
}

function showStatus(message, { isError = false } = {}) {
  status.textContent = message;
  status.classList.toggle('notice-error', isError);
}

function invalidatePreview() {
  clearErrors();
  if (!state.preview) return;
  state.preview = null;
  previewSection.hidden = true;
  promotionConfirmed.checked = false;
  promoteButton.disabled = true;
  showStatus('Draft changed after preview. Save and validate again before promotion.');
}

function addRelationship(value = {}, { invalidate = true } = {}) {
  const row = byId('relationship-template').content.firstElementChild.cloneNode(true);
  relationshipList.appendChild(row);
  const options = state.bootstrap?.options ?? {};
  selectOptions(row.querySelector('[data-field="type"]'), options.relationshipTypes);
  selectOptions(row.querySelector('[data-field="confidence"]'), options.relationshipConfidences);
  selectOptions(row.querySelector('[data-field="claimType"]'), options.anchorClaimTypes);
  for (const [name, fieldValue] of Object.entries(value)) {
    const field = row.querySelector(`[data-field="${CSS.escape(name)}"]`);
    if (field) field.value = fieldValue;
  }
  reindexRelationships();
  row.querySelector('.remove-relationship').addEventListener('click', () => {
    row.remove();
    reindexRelationships();
    invalidatePreview();
  });
  if (invalidate) invalidatePreview();
}

function reindexRelationships() {
  [...relationshipList.children].forEach((row, index) => {
    row.dataset.index = String(index);
    row.querySelector('legend').textContent = `Relationship ${index + 1}`;
    row.querySelectorAll('[data-field]').forEach((field) => {
      field.id = `relationship-${index}-${field.dataset.field}`;
      const label = field.closest('label');
      if (label) label.htmlFor = field.id;
      const inline = row.querySelector(`[data-error="${CSS.escape(field.dataset.field)}"]`);
      if (inline) {
        inline.id = `error-${field.id}`;
        field.setAttribute('aria-describedby', inline.id);
      }
    });
  });
}

function relationshipValues() {
  return [...relationshipList.children].map((row) => Object.fromEntries(
    [...row.querySelectorAll('[data-field]')].map((field) => [field.dataset.field, field.value.trim()]),
  ));
}

function hasAnchorInput() {
  return ['anchor-id', 'anchor-title', 'anchor-date-display', 'anchor-date-sort', 'anchor-story', 'source-label', 'source-url', 'source-accessed-date']
    .some((id) => byId(id).value.trim());
}

function draftFromForm() {
  const anchor = hasAnchorInput() ? {
    id: byId('anchor-id').value,
    title: byId('anchor-title').value,
    date: {
      display: byId('anchor-date-display').value,
      sortKey: byId('anchor-date-sort').value === '' ? '' : Number(byId('anchor-date-sort').value),
    },
    lane: byId('anchor-lane').value,
    story: byId('anchor-story').value,
    people: lines(byId('anchor-people').value),
    topics: lines(byId('anchor-topics').value),
    themes: lines(byId('anchor-themes').value),
    claimType: byId('anchor-claim-type').value,
    confidence: byId('anchor-confidence').value,
    source: {
      label: byId('source-label').value,
      url: byId('source-url').value,
      accessedDate: byId('source-accessed-date').value,
    },
  } : null;
  return {
    draftId: byId('draft-id').value,
    capture: {
      workingTitle: byId('capture-working-title').value,
      whyItMatters: byId('capture-why').value,
      sourceUrls: lines(byId('capture-source-urls').value),
    },
    anchor,
    relationships: relationshipValues(),
  };
}

function setValue(id, value) {
  byId(id).value = value ?? '';
}

function populateDraft(draft = null) {
  form.reset();
  relationshipList.innerHTML = '';
  previewSection.hidden = true;
  state.preview = null;
  promotionConfirmed.checked = false;
  promoteButton.disabled = true;
  promotionReceipt.hidden = true;
  clearErrors();
  if (!draft) {
    setValue('draft-id', crypto.randomUUID());
    showStatus('New incomplete draft. Add the three Capture fields, then save locally.');
    return;
  }
  setValue('draft-id', draft.draftId);
  setValue('capture-working-title', draft.capture?.workingTitle);
  setValue('capture-why', draft.capture?.whyItMatters);
  setValue('capture-source-urls', (draft.capture?.sourceUrls ?? []).join('\n'));
  if (draft.anchor) {
    setValue('anchor-id', draft.anchor.id);
    setValue('anchor-title', draft.anchor.title);
    setValue('anchor-date-display', draft.anchor.date?.display);
    setValue('anchor-date-sort', draft.anchor.date?.sortKey);
    setValue('anchor-lane', draft.anchor.lane);
    setValue('anchor-story', draft.anchor.story);
    setValue('anchor-people', (draft.anchor.people ?? []).join('\n'));
    setValue('anchor-topics', (draft.anchor.topics ?? []).join('\n'));
    setValue('anchor-themes', (draft.anchor.themes ?? []).join('\n'));
    setValue('anchor-claim-type', draft.anchor.claimType);
    setValue('anchor-confidence', draft.anchor.confidence);
    setValue('source-label', draft.anchor.source?.label);
    setValue('source-url', draft.anchor.source?.url);
    setValue('source-accessed-date', draft.anchor.source?.accessedDate);
  }
  for (const relationship of draft.relationships ?? []) addRelationship(relationship, { invalidate: false });
  showStatus(`Opened ${draft.state} draft. Last local save: ${draft.updatedAt}.`);
}

function populateBootstrap(data, selectedId = '') {
  state.bootstrap = data;
  const options = data.options;
  selectOptions(byId('anchor-lane'), options.lanes);
  selectOptions(byId('anchor-claim-type'), options.anchorClaimTypes);
  selectOptions(byId('anchor-confidence'), options.anchorConfidences);
  const datalist = byId('anchor-options');
  datalist.innerHTML = '';
  for (const anchor of options.anchors) {
    const option = document.createElement('option');
    option.value = anchor.id;
    option.label = anchor.title;
    datalist.appendChild(option);
  }
  const select = byId('draft-select');
  select.innerHTML = '<option value="">New draft</option>';
  for (const draft of data.drafts) {
    const option = document.createElement('option');
    option.value = draft.draftId;
    option.textContent = `${draft.capture?.workingTitle || draft.draftId} — ${draft.state}`;
    select.appendChild(option);
  }
  select.value = selectedId;
  const readOnlyNotice = byId('read-only-notice');
  readOnlyNotice.hidden = !data.readOnly;
  readOnlyNotice.textContent = data.storeError?.message
    ?? (data.readOnly ? 'Promotion is locked pending manual recovery.' : '');
  form.querySelectorAll('input, select, textarea, button').forEach((control) => {
    control.disabled = data.readOnly;
  });
}

async function refresh(selectedId = '') {
  const data = await request('/api/bootstrap');
  populateBootstrap(data, selectedId);
  return data;
}

async function saveDraft() {
  clearErrors();
  const draft = draftFromForm();
  try {
    const saved = await request(`/api/drafts/${encodeURIComponent(draft.draftId)}`, { method: 'PUT', body: draft });
    await refresh(saved.draftId);
    populateDraft(saved);
    byId('draft-select').value = saved.draftId;
    showStatus(`Saved locally as ${saved.state}. Canonical Atlas content was not changed.`);
    return saved;
  } catch (caught) {
    showErrors(caught.errors);
    showStatus(caught.message, { isError: true });
    throw caught;
  }
}

function renderPreview(data) {
  previewSection.hidden = false;
  byId('preview-text').textContent = [
    data.preview.text,
    '',
    `Affected anchors: ${data.diff.anchorIds.join(', ')}`,
    `Affected relationships: ${data.diff.relationshipIds.join(', ') || 'none'}`,
    `Affected files: ${data.diff.paths.join(', ')}`,
    `Base anchors SHA-256: ${data.baseDigests.anchors}`,
    `Base relationships SHA-256: ${data.baseDigests.relationships}`,
  ].join('\n');

  try {
    const items = buildRelationshipItems(data.relationshipsDocument, data.anchorsDocument);
    renderDrawerContent({
      labelEl: byId('preview-drawer-label'),
      titleEl: byId('preview-drawer-title'),
      metaEl: byId('preview-drawer-meta'),
      storyEl: byId('preview-drawer-story'),
      peopleEl: byId('preview-drawer-people'),
      topicsEl: byId('preview-drawer-topics'),
      sourceEl: byId('preview-drawer-source'),
      relEl: byId('preview-drawer-relationships'),
    }, data.anchor, drawerRelationshipItems(data.anchor.id, items));
    byId('preview-drawer-label').textContent = 'Draft preview — not published';

    const timelineRoot = byId('preview-timeline');
    renderTimelineCanvas(timelineRoot, data.anchorsDocument);
    const timelineCandidate = timelineRoot.querySelector(`[data-anchor-id="${CSS.escape(data.anchor.id)}"]`);
    timelineCandidate?.classList.add('is-draft-preview');
    if (timelineCandidate) {
      const badge = document.createElement('span');
      badge.className = 'candidate-badge';
      badge.textContent = 'Draft preview — not published';
      timelineCandidate.appendChild(badge);
    }

    const constellation = renderConstellation({
      doc: document,
      svg: byId('preview-constellation-svg'),
      overlay: byId('preview-constellation-overlay'),
      legend: byId('preview-constellation-legend'),
    }, data.anchorsDocument, data.relationshipsDocument, { width: 900, height: 600 });
    const constellationCandidate = constellation.nodeButtons.get(data.anchor.id);
    constellationCandidate?.classList.add('is-draft-preview');
    if (constellationCandidate) {
      const badge = document.createElement('span');
      badge.className = 'candidate-badge';
      badge.textContent = 'Draft';
      constellationCandidate.appendChild(badge);
    }
  } catch (caught) {
    showStatus(`Content structure is valid and the textual preview is available, but a visual preview failed: ${caught.message}`, { isError: true });
  }

  promotionConfirmed.checked = false;
  promoteButton.disabled = true;
  previewSection.scrollIntoView({ block: 'start' });
}

function renderPromotionReceipt(result) {
  const { receipt, instructions } = result;
  const values = {
    'transaction-id': receipt.transactionId,
    'receipt-draft-id': receipt.draftId,
    'promoted-at': receipt.promotedAt,
    'anchor-ids': receipt.anchorIds.join(', '),
    'relationship-ids': receipt.relationshipIds.join(', ') || 'none',
    'changed-paths': receipt.paths.join(', '),
    'backup-location': receipt.backupLocation,
    'promotion-instructions': instructions,
  };
  for (const [id, value] of Object.entries(values)) byId(id).textContent = value;
  promotionReceipt.hidden = false;
  promotionReceipt.focus();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await saveDraft().catch(() => {});
});
form.addEventListener('input', invalidatePreview);

byId('preview-draft').addEventListener('click', async () => {
  try {
    const saved = await saveDraft();
    const preview = await request('/api/preview', { method: 'POST', body: { draftId: saved.draftId } });
    state.preview = preview;
    renderPreview(preview);
    showStatus(`Content structure valid in ${preview.durationMs.toFixed(1)}ms. Historical claim not independently verified.`);
  } catch (caught) {
    if (caught.errors) showErrors(caught.errors);
    showStatus(caught.message, { isError: true });
  }
});

byId('add-relationship').addEventListener('click', () => addRelationship());
byId('new-draft').addEventListener('click', () => {
  byId('draft-select').value = '';
  populateDraft();
});
byId('draft-select').addEventListener('change', (event) => {
  const draft = state.bootstrap.drafts.find((item) => item.draftId === event.target.value);
  populateDraft(draft ?? null);
});

byId('discard-draft').addEventListener('click', async () => {
  const draftId = byId('draft-id').value;
  if (!confirm('Discard this unpromoted local draft? Canonical content will not change.')) return;
  try {
    await request(`/api/drafts/${encodeURIComponent(draftId)}`, { method: 'DELETE', body: { confirmed: true } });
    await refresh();
    populateDraft();
    showStatus('Local draft discarded. Canonical Atlas content was not changed.');
  } catch (caught) {
    showErrors(caught.errors);
    showStatus(caught.message, { isError: true });
  }
});

promotionConfirmed.addEventListener('change', () => {
  promoteButton.disabled = !(state.preview && promotionConfirmed.checked);
});

promoteButton.addEventListener('click', async () => {
  if (!state.preview || !promotionConfirmed.checked) return;
  try {
    const result = await request('/api/promote', {
      method: 'POST',
      body: {
        draftId: byId('draft-id').value,
        confirmed: true,
        baseDigests: state.preview.baseDigests,
      },
    });
    await refresh();
    populateDraft();
    renderPromotionReceipt(result);
    showStatus(`Promoted locally. ${result.instructions}`);
  } catch (caught) {
    showErrors(caught.errors);
    showStatus(caught.message, { isError: true });
  }
});

async function init() {
  if (!token) {
    showStatus('Missing local session token. Open the exact URL printed by npm run history:inbox.', { isError: true });
    return;
  }
  try {
    await refresh();
    populateDraft();
  } catch (caught) {
    showStatus(caught.message, { isError: true });
  }
}

init();
