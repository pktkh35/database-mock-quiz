export function questionStatus(draft = "", saved = "") {
  if (saved && draft === saved) return "saved";
  if (draft.trim()) return "draft";
  return saved ? "saved" : "empty";
}

const STATUS_LABEL = { empty: "ว่าง", draft: "มีร่าง ยังไม่ได้ Save", saved: "Save แล้ว" };
const GLYPH = { empty: "", draft: "•", saved: "✓" };

export default function QuestionNav({ ids, current, drafts, saved, onGo }) {
  return (
    <nav aria-label="เลือกข้อ" className="flex gap-1.5 overflow-x-auto px-1 pb-1 pt-1.5">
      {ids.map((id, i) => {
        const st = questionStatus(drafts[id], saved[id]);
        const active = i === current;
        return (
          <button
            key={id}
            onClick={() => onGo(i)}
            aria-current={active ? "step" : undefined}
            aria-label={`ข้อ ${i + 1} · ${STATUS_LABEL[st]}`}
            title={STATUS_LABEL[st]}
            className={`relative grid size-9 shrink-0 place-items-center rounded-lg border text-sm font-medium ${
              active ? "border-primary bg-primary text-white" : "border-line hover:bg-surface"
            }`}
          >
            {i + 1}
            {GLYPH[st] && (
              <span aria-hidden className={`absolute -right-1 -top-1 grid size-4 place-items-center rounded-full border border-line bg-bg text-[10px] leading-none ${st === "saved" ? "text-ok" : "text-primary-strong"}`}>
                {GLYPH[st]}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
