'use client';

import { MessageSquare } from 'lucide-react';
import { Restaurant } from '@/lib/types';
import Button from '@/components/ui/Button';
import RestaurantPhoto from './RestaurantPhoto';
import RestaurantMeta from './RestaurantMeta';

export type CardState = 'idle' | 'picked' | 'dropped';

interface Props {
  restaurant: Restaurant;
  onSelect: () => void;
  onReviews: () => void;
  state?: CardState;
  /** 키보드 단축키 안내 (←, →) */
  hotkey?: string;
}

const stateClass: Record<CardState, string> = {
  idle: 'hover:-translate-y-0.5 hover:shadow-lift',
  picked: 'ring-2 ring-accent shadow-lift scale-[1.015]',
  dropped: 'opacity-40 scale-[0.98]',
};

export default function RestaurantCard({ restaurant, onSelect, onReviews, state = 'idle', hotkey }: Props) {
  const categories = restaurant.menu?.categories?.filter((c) => c !== '레스토랑' && c !== '음식점').slice(0, 2) ?? [];
  const open = restaurant.opening_hours?.open_now;

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-card
                  transition-all duration-300 ${stateClass[state]}`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 flex-col text-left focus-visible:ring-inset"
        aria-label={`${restaurant.name} 선택`}
      >
        <div className="relative w-full">
          <RestaurantPhoto restaurant={restaurant} className="aspect-[16/9] sm:aspect-[4/3]" />
          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <span key={c} className="rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  {c}
                </span>
              ))}
            </div>
            {open !== undefined && (
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${
                  open ? 'bg-good/90 text-white' : 'bg-black/55 text-white/80'
                }`}
              >
                {open ? '영업 중' : '영업 종료'}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
          <h3 className="line-clamp-2 text-xl font-bold leading-snug sm:text-[22px]">{restaurant.name}</h3>
          <RestaurantMeta restaurant={restaurant} />
          {restaurant.vicinity && <p className="truncate text-sm text-muted">{restaurant.vicinity}</p>}
        </div>
      </button>

      <div className="flex gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
        <Button variant="secondary" onClick={onReviews} aria-label={`${restaurant.name} 리뷰 분석`}>
          <MessageSquare className="h-4 w-4" />
          리뷰 분석
        </Button>
        <Button className="flex-1" onClick={onSelect}>
          이 집으로
          {hotkey && <kbd className="hidden rounded bg-white/20 px-1.5 text-xs font-medium lg:inline">{hotkey}</kbd>}
        </Button>
      </div>
    </article>
  );
}
