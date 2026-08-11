// FreshnessBanner — design.md §4 (Today panel components), §5 (today-stories.json
// shape), FR-015, NFR-004.
//
// Hard requirement: this module must render lastUpdated/freshnessState
// TRUTHFULLY. It never silently implies freshness when the data is stale,
// missing, or errored. The published freshnessState is the CI job's own
// computation (design.md §6, TD-004) — this module displays it, and applies
// only an AGE-BASED FLOOR on top (design.md §14 risk: "freshnessState ages
// toward stale/very_stale/error based on lastUpdated's age, computed
// client-side as a floor even if the job never updates the file — never
// trust the job's last write alone"). It never reinterprets upward — a
// declared "error" is never shown as anything better than "error".

const SEVERITY = { fresh: 0, stale: 1, very_stale: 2, no_data: 3, error: 3 };

const COPY = {
  fresh: {
    label: 'Fresh',
    message: 'This slice reflects recent reporting.',
  },
  stale: {
    label: 'Stale',
    message: 'This slice is running behind schedule — some stories may be out of date.',
  },
  very_stale: {
    label: 'Very stale',
    message: 'This slice has not refreshed in a long time. Treat these headlines as historical, not current.',
  },
  no_data: {
    label: 'No data',
    message: 'No current-news data is available right now.',
  },
  error: {
    label: 'Error',
    message: 'The news refresh job failed or reported an error. Nothing here is confirmed current.',
  },
};

// Exact hour thresholds are an implementation choice, not a number fixed by
// design.md (§14 names the *principle* — age floors freshness — not exact
// hours). Documented here rather than invented silently: this is a
// deliberately conservative floor so a frozen file can't look "fresh"
// forever just because the CI job wrote a good value once and then stopped.
const AGE_FLOOR_HOURS = {
  stale: 6,
  very_stale: 48,
  error: 24 * 14,
};

/**
 * @param {number} hoursOld
 * @returns {string|null} the minimum state the age alone justifies, or null
 *   if the age doesn't force any floor.
 */
export function ageFloorState(hoursOld) {
  if (!Number.isFinite(hoursOld) || hoursOld < 0) return null;
  if (hoursOld >= AGE_FLOOR_HOURS.error) return 'error';
  if (hoursOld >= AGE_FLOOR_HOURS.very_stale) return 'very_stale';
  if (hoursOld >= AGE_FLOOR_HOURS.stale) return 'stale';
  return null;
}

/**
 * Pure computation — no DOM — so it's directly unit-testable under node:test.
 * @param {string} freshnessState
 * @param {string} lastUpdated - ISO timestamp
 * @param {Date} [now]
 */
export function describeFreshness(freshnessState, lastUpdated, now = new Date()) {
  // An unrecognized freshnessState fails closed to "error" — never silently
  // treated as fresh (FR-015/NFR-004).
  const declared = COPY[freshnessState] ? freshnessState : 'error';

  const parsed = lastUpdated ? new Date(lastUpdated) : null;
  const validDate = parsed instanceof Date && !Number.isNaN(parsed.getTime());
  const hoursOld = validDate ? (now.getTime() - parsed.getTime()) / 36e5 : NaN;

  // A missing or unparseable lastUpdated is itself untrustworthy — floor to
  // "error" rather than displaying an empty/blank age.
  const floor = validDate ? ageFloorState(hoursOld) : 'error';

  let effective = declared;
  if (floor && SEVERITY[floor] > SEVERITY[declared]) {
    effective = floor;
  }

  const copy = COPY[effective];
  return {
    declaredState: freshnessState,
    effectiveState: effective,
    ageFloored: effective !== declared,
    label: copy.label,
    message: copy.message,
    lastUpdatedDisplay: validDate ? parsed.toLocaleString() : 'unknown',
    lastUpdatedIso: validDate ? parsed.toISOString() : null,
    hoursOld: validDate ? Math.round(hoursOld * 10) / 10 : null,
  };
}

/**
 * Renders the banner into `container` from a loaded today-stories.json object.
 * @param {HTMLElement} container
 * @param {{freshnessState?: string, lastUpdated?: string}} todayStories
 * @param {{now?: Date}} [opts]
 * @returns {ReturnType<typeof describeFreshness>}
 */
export function renderFreshnessBanner(container, todayStories, { now } = {}) {
  const { freshnessState, lastUpdated } = todayStories || {};
  const info = describeFreshness(freshnessState, lastUpdated, now);

  container.innerHTML = '';
  const el = document.createElement('div');
  el.className = `freshness-banner freshness-${info.effectiveState}`;
  el.setAttribute('role', 'status');
  el.dataset.freshnessState = info.effectiveState;
  el.dataset.declaredState = info.declaredState;

  const label = document.createElement('strong');
  label.className = 'freshness-label';
  label.textContent = info.label;

  const message = document.createElement('span');
  message.className = 'freshness-message';
  message.textContent = info.message;

  const updated = document.createElement('span');
  updated.className = 'freshness-updated';
  updated.textContent = `Last updated: ${info.lastUpdatedDisplay}`;

  el.append(label, document.createTextNode(' — '), message, document.createTextNode(' '), updated);

  if (info.ageFloored) {
    const notice = document.createElement('span');
    notice.className = 'freshness-floor-notice';
    notice.textContent = ` (shown as "${info.label}" because the data is older than its declared state suggests — the page never trusts a stale write as current)`;
    el.appendChild(notice);
  }

  container.appendChild(el);
  return info;
}

/**
 * Explicit fetch-failure state — used when today-stories.json itself could
 * not be loaded/parsed at all (network error, HTTP failure, malformed JSON).
 * Distinct from freshnessState: "error" (a value the CI job can publish);
 * this is "we don't even have a file to read."
 */
export function renderFreshnessBannerError(container, message = "Could not load today's news feed.") {
  container.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'freshness-banner freshness-fetch-error';
  el.setAttribute('role', 'alert');
  el.dataset.freshnessState = 'fetch-error';

  const label = document.createElement('strong');
  label.className = 'freshness-label';
  label.textContent = 'Unavailable';

  const msg = document.createElement('span');
  msg.className = 'freshness-message';
  msg.textContent = message;

  el.append(label, document.createTextNode(' — '), msg);
  container.appendChild(el);
}
