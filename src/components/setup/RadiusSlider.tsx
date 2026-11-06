import { formatRadius } from '@/lib/format';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const TICKS = [500, 3000, 6000, 10000];

export default function RadiusSlider({ value, onChange, min = 500, max = 10000, step = 500 }: Props) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-muted">검색 반경</h2>
        <span className="text-lg font-bold tabular">{formatRadius(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        aria-label="검색 반경"
        className="w-full h-2 rounded-full appearance-none cursor-pointer [accent-color:rgb(var(--c-accent))]"
        style={{
          background: `linear-gradient(to right, rgb(var(--c-accent)) ${pct}%, rgb(var(--c-line)) ${pct}%)`,
        }}
      />
      <div className="flex justify-between text-xs text-muted tabular">
        {TICKS.map((t) => (
          <span key={t}>{formatRadius(t)}</span>
        ))}
      </div>
    </div>
  );
}
