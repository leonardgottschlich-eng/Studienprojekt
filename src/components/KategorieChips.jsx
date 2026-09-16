import { kategorienVon } from "../data/kategorien";

const chipStil = {
  display: "inline-block", fontSize: 11, color: "#374151", background: "#f3f4f6",
  padding: "3px 7px", borderRadius: 5, fontWeight: 500, whiteSpace: "nowrap",
  maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis",
};

/**
 * Klassifikationen eines Belegs als Chips.
 * In der Liste werden nur die ersten Einträge gezeigt, der Rest als "+n".
 */
export default function KategorieChips({ doc, kategorien, max = 2 }) {
  const liste = kategorien ?? kategorienVon(doc);

  if (!liste.length) {
    return <span style={{ ...chipStil, background: "#fafaf8", color: "#9ca3af" }}>Nicht klassifiziert</span>;
  }

  const sichtbar = liste.slice(0, max);
  const rest = liste.length - sichtbar.length;

  return (
      <span style={{ display: "flex", flexWrap: "wrap", gap: 3, minWidth: 0 }} title={liste.join(", ")}>
        {sichtbar.map((k) => <span key={k} style={chipStil}>{k}</span>)}
        {rest > 0 && (
            <span style={{ ...chipStil, background: "#eef2f6", color: "#18537a", fontWeight: 600 }}>+{rest}</span>
        )}
      </span>
  );
}
