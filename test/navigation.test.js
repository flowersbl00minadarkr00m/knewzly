import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pages = [
  { path: 'index.html', currentHref: 'index.html', currentLabel: 'Home' },
  { path: 'today.html', currentHref: 'today.html', currentLabel: 'Today' },
  { path: 'atlas.html', currentHref: 'atlas.html', currentLabel: 'History Atlas' },
];

const destinationHrefs = ['index.html', 'today.html', 'atlas.html'];
const destinationLabels = ['Home', 'Today', 'History Atlas'];

function primaryNav(html) {
  return html.match(/<nav\b[^>]*aria-label=["']Primary["'][^>]*>[\s\S]*?<\/nav>/i)?.[0] ?? '';
}

function navLinks(nav) {
  return [...nav.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => ({
    attributes: match[1],
    href: match[1].match(/\bhref=["']([^"']+)["']/i)?.[1],
    label: match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
  }));
}

function learnerFacingText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

test('T1 public navigation contract', async (t) => {
  for (const page of pages) {
    await t.test(`${page.path} exposes the same three destinations and current state`, async () => {
      const html = await readFile(page.path, 'utf8');
      const nav = primaryNav(html);
      assert.ok(nav, `${page.path} must include <nav aria-label="Primary">`);

      const links = navLinks(nav);
      assert.deepEqual(links.map(({ href }) => href), destinationHrefs);
      assert.deepEqual(links.map(({ label }) => label), destinationLabels);

      const current = links.filter(({ attributes }) => /\baria-current=["']page["']/i.test(attributes));
      assert.equal(current.length, 1, `${page.path} must identify exactly one current destination`);
      assert.equal(current[0].href, page.currentHref);
      assert.equal(current[0].label, page.currentLabel);

      assert.match(html, /<link\b[^>]*href=["']styles\/site-nav\.css["'][^>]*>/i);
      assert.doesNotMatch(learnerFacingText(html), /\b(?:F01|pilot(?:\s+slice|\s+spine)?)\b/i);
    });
  }
});

test('T1 preserves page-specific learner journeys', async () => {
  const [home, today, atlas] = await Promise.all(
    pages.map(({ path }) => readFile(path, 'utf8')),
  );

  assert.match(home, /<a\b[^>]*class=["'][^"']*\bcard\b[^"']*["'][^>]*href=["']today\.html["']/i);
  assert.match(home, /<a\b[^>]*class=["'][^"']*\bcard\b[^"']*["'][^>]*href=["']atlas\.html["']/i);

  for (const id of ['section-nav', 'story-grid', 'weekly-ledger', 'story-grid-after-ledger']) {
    assert.match(today, new RegExp(`\\bid=["']${id}["']`));
  }

  for (const id of [
    'view-toggle-timeline',
    'view-toggle-constellation',
    'context-drawer',
    'export-progress-button',
    'import-progress-input',
  ]) {
    assert.match(atlas, new RegExp(`\\bid=["']${id}["']`));
  }
  assert.match(atlas, /<script\b[^>]*src=["']src\/trace-to-origin\.js["'][^>]*><\/script>/i);
});
