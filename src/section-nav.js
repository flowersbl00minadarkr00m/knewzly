// src/section-nav.js — DOM filter-chip bar for the Today panel (FR-014,
// D-013). Reuses the button/aria-pressed pattern from the F07 newspaper
// mockup's `.section-nav` (`.ai/sdd/design/present-day-newspaper-concept.html`,
// D-014) rather than inventing new markup semantics.
//
// Real `<button>` elements with `aria-pressed`, not a `<select>` or
// color-only toggle — keyboard-operable, and the active state is stated in
// an attribute screen readers already understand (NFR-002, AAA).

/**
 * @param {HTMLElement} container
 * @param {Array<{id: string, label: string}>} categories
 * @param {string} activeId
 * @param {(id: string) => void} onSelect
 */
export function renderSectionNav(container, categories, activeId, onSelect) {
  const restoreActiveFocus = Array.from(container.children).includes(document.activeElement);
  container.innerHTML = '';
  container.setAttribute('role', 'toolbar');
  container.setAttribute('aria-label', 'Filter stories by category');

  let activeButton = null;

  for (const { id, label } of categories) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.filter = id;
    button.textContent = label;
    button.setAttribute('aria-pressed', String(id === activeId));
    if (id === activeId) activeButton = button;
    button.addEventListener('click', () => onSelect(id));
    container.appendChild(button);
  }

  if (restoreActiveFocus) activeButton?.focus();
}
