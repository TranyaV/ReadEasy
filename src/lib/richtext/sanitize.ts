/**
 * Restricts rich editor output to a known-safe tag/attribute allowlist before it's
 * ever persisted or rendered via dangerouslySetInnerHTML. Operates on a detached
 * clone — never the live editable DOM — so sanitizing never disturbs an in-progress
 * edit or its native undo history.
 */

const ALLOWED_TAGS = new Set([
  "P",
  "DIV",
  "H1",
  "H2",
  "H3",
  "UL",
  "OL",
  "LI",
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "SPAN",
  "BR",
]);

const ALLOWED_STYLE_PROPERTIES = new Set(["font-family", "font-size", "text-align"]);

function sanitizeStyle(value: string): string | null {
  const kept = value
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .filter((rule) => {
      const property = rule.split(":")[0]?.trim().toLowerCase();
      return property ? ALLOWED_STYLE_PROPERTIES.has(property) : false;
    })
    .join("; ");
  return kept || null;
}

function sanitizeInPlace(root: HTMLElement): void {
  // Snapshot first: unwrapping mutates the tree, so querySelectorAll's live result
  // would otherwise skip or revisit nodes mid-walk.
  const elements = Array.from(root.querySelectorAll("*"));

  for (const element of elements) {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      const parent = element.parentNode;
      if (!parent) continue;
      while (element.firstChild) parent.insertBefore(element.firstChild, element);
      parent.removeChild(element);
      continue;
    }

    const style = element.getAttribute("style");
    Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));

    if (style) {
      const sanitized = sanitizeStyle(style);
      if (sanitized) element.setAttribute("style", sanitized);
    }
  }
}

/** Sanitizes a clone of `root` and returns it — the live node passed in is never mutated. */
export function sanitizeEditableContent(root: HTMLElement): HTMLElement {
  const clone = root.cloneNode(true) as HTMLElement;
  sanitizeInPlace(clone);
  return clone;
}
