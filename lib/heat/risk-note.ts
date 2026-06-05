/** Generic boilerplate risk lines — hide on cards when badges/cautions already convey trust. */
export function isGenericRiskNote(note: string | null | undefined): boolean {
  const t = (note ?? "").trim().toLowerCase();
  if (!t) return true;
  if (t === "not investment advice." || t === "not investment advice") return true;
  if (
    t.includes("context and signal only") &&
    t.includes("not investment advice")
  ) {
    return true;
  }
  if (
    t.includes("context only") &&
    t.includes("not investment advice") &&
    t.includes("verify primary")
  ) {
    return true;
  }
  return false;
}
