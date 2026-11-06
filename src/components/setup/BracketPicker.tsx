export const BRACKET_SIZES = [4, 8, 16, 32, 64];

interface Props {
  value: number;
  available: number | null;
  onChange: (size: number) => void;
}

export default function BracketPicker({ value, available, onChange }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted">토너먼트 규모</h2>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="토너먼트 규모">
        {BRACKET_SIZES.map((size) => {
          const disabled = available !== null && available < size;
          const selected = value === size;
          return (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(size)}
              className={`h-16 rounded-xl border text-center transition-colors touch-manipulation
                ${selected ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface hover:border-ink/30'}
                disabled:opacity-35 disabled:hover:border-line disabled:cursor-not-allowed`}
            >
              <span className="block text-base font-bold tabular">{size}강</span>
              <span className={`block text-[11px] ${selected ? 'text-accent/80' : 'text-muted'}`}>
                {disabled ? '부족' : `${size}곳`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
