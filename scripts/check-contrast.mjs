#!/usr/bin/env node
// T11: computed WCAG contrast checker — real math, not eyeballed, matching
// the same method the independent gauntlet review used against the
// non-binding prototypes (design.md §15's required verification approach).
// No browser needed for this specific check: contrast is pure color math.

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function relativeLuminance({ r, g, b }) {
  const srgb = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// --- atlas.css tokens (light + dark), extracted 2026-08-11 ---
const atlasLight = {
  paper: '#f7f3e8', paperRaised: '#fffdf7', paperDeep: '#ece5d2',
  ink: '#1b2433', inkSoft: '#3a4658', rule: '#6b7684', ruleFaint: '#b7bfc7',
  accent: '#163a5f', accentSoft: '#244f76', focus: '#00685d', visited: '#5c4a13', inverse: '#fbf7ea',
};
const atlasDark = {
  paper: '#161d27', paperRaised: '#202b37', paperDeep: '#10151d',
  ink: '#f2ede0', inkSoft: '#c9cdd6', rule: '#7c8794', ruleFaint: '#445162',
  accent: '#9ac7e8', accentSoft: '#b6d9f1', focus: '#f1c96b', visited: '#f1c96b', inverse: '#10161f',
};

// --- today.html tokens (light + dark), extracted 2026-08-11 ---
const todayLight = {
  paper: '#f6f1e3', paperDeep: '#e9e1cc', ink: '#172235', inkSoft: '#43505f',
  rule: '#687586', ruleFaint: '#b5b9b5', spot: '#163a5f', spotSoft: '#244f76',
  inverse: '#fbf7ea', focus: '#00685d', ok: '#1d5a33', warn: '#6c4900', bad: '#7a1f1f',
};
const todayDark = {
  paper: '#18212b', paperDeep: '#10171f', ink: '#f3eddf', inkSoft: '#c5c4be',
  rule: '#909dab', ruleFaint: '#4f5e6e', spot: '#9ac7e8', spotSoft: '#b6d9f1',
  inverse: '#111923', focus: '#f1c96b', ok: '#7fcf9a', warn: '#e8c25b', bad: '#eb9898',
};

const AAA_TEXT = 7.0;
const AAA_UI = 3.0; // non-text UI components / large text floor, per WCAG 2.2

function checkSet(name, t, pairs) {
  console.log(`\n=== ${name} ===`);
  let failures = 0;
  for (const [label, fg, bg, floor] of pairs) {
    const ratio = contrastRatio(t[fg], t[bg]);
    const need = floor ?? AAA_TEXT;
    const pass = ratio >= need;
    if (!pass) failures++;
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${label.padEnd(38)} ${ratio.toFixed(2)}:1  (need >=${need}:1)  [${fg}=${t[fg]} on ${bg}=${t[bg]}]`);
  }
  return failures;
}

let totalFailures = 0;

totalFailures += checkSet('atlas.css — light theme (body text)', atlasLight, [
  ['ink on paper', 'ink', 'paper'],
  ['ink-soft on paper', 'inkSoft', 'paper'],
  ['ink on paper-raised', 'ink', 'paperRaised'],
  ['ink-soft on paper-raised', 'inkSoft', 'paperRaised'],
  ['ink on paper-deep', 'ink', 'paperDeep'],
  ['inverse on accent', 'inverse', 'accent'],
  ['accent on paper (links/spot text)', 'accent', 'paper'],
  ['rule on paper (borders, UI-only floor)', 'rule', 'paper', AAA_UI],
]);

totalFailures += checkSet('atlas.css — dark theme (body text)', atlasDark, [
  ['ink on paper', 'ink', 'paper'],
  ['ink-soft on paper', 'inkSoft', 'paper'],
  ['ink on paper-raised', 'ink', 'paperRaised'],
  ['ink-soft on paper-raised', 'inkSoft', 'paperRaised'],
  ['ink on paper-deep', 'ink', 'paperDeep'],
  ['inverse on accent', 'inverse', 'accent'],
  ['accent on paper (links/spot text)', 'accent', 'paper'],
  ['rule on paper (borders, UI-only floor)', 'rule', 'paper', AAA_UI],
]);

totalFailures += checkSet('today.html — light theme (body text)', todayLight, [
  ['ink on paper', 'ink', 'paper'],
  ['ink-soft on paper', 'inkSoft', 'paper'],
  ['ink on paper-deep', 'ink', 'paperDeep'],
  ['spot on paper (links/kicker)', 'spot', 'paper'],
  ['inverse on spot', 'inverse', 'spot'],
  ['ok on paper (freshness: fresh)', 'ok', 'paper'],
  ['warn on paper (freshness: stale)', 'warn', 'paper'],
  ['bad on paper (freshness: error)', 'bad', 'paper'],
]);

totalFailures += checkSet('today.html — dark theme (body text)', todayDark, [
  ['ink on paper', 'ink', 'paper'],
  ['ink-soft on paper', 'inkSoft', 'paper'],
  ['ink on paper-deep', 'ink', 'paperDeep'],
  ['spot on paper (links/kicker)', 'spot', 'paper'],
  ['inverse on spot', 'inverse', 'spot'],
  ['ok on paper (freshness: fresh)', 'ok', 'paper'],
  ['warn on paper (freshness: stale)', 'warn', 'paper'],
  ['bad on paper (freshness: error)', 'bad', 'paper'],
]);

console.log(`\n${'='.repeat(60)}`);
console.log(totalFailures === 0 ? `ALL PAIRS PASS their required floor (${totalFailures} failures)` : `${totalFailures} PAIR(S) FAIL — see FAIL lines above`);
process.exit(totalFailures === 0 ? 0 : 1);
