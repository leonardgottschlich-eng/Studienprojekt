export default function FileIcon({ type }) {
  const isPdf = type === "pdf";
  return (
    <div style={{ width: 34, height: 42, borderRadius: 5, background: isPdf ? "#fee2e2" : "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: isPdf ? "#dc2626" : "#1d4ed8", flexShrink: 0, position: "relative" }}>
      <span style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, background: isPdf ? "#dc2626" : "#1d4ed8", borderRadius: "0 5px 0 5px", opacity: 0.2 }} />
      {isPdf ? "PDF" : "IMG"}
    </div>
  );
}
