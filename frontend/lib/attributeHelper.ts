export interface Attribute {
  trait_type: string;
  value: string;
}

function normalise(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function getAttribute(attrs: Attribute[], search: string): string {
  return (
    attrs.find((a) => normalise(a.trait_type).includes(normalise(search)))
      ?.value ?? "—"
  );
}
