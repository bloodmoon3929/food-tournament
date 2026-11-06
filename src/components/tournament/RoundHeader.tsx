import { X } from 'lucide-react';

interface Props {
  roundLabel: string;
  matchNumber: number;
  matchCount: number;
  progress: number;
  onQuit: () => void;
}

export default function RoundHeader({ roundLabel, matchNumber, matchCount, progress, onQuit }: Props) {
  return (
    <div className="mb-5 sm:mb-7">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-accent">
            {matchCount > 1 ? `${matchNumber} / ${matchCount} 경기` : '마지막 경기'}
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{roundLabel}</h2>
        </div>
        <button
          type="button"
          onClick={onQuit}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-sunken hover:text-ink"
        >
          <X className="h-4 w-4" /> 그만하기
        </button>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label="전체 진행률"
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
