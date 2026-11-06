'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Restaurant } from '@/lib/types';
import RestaurantMeta from './RestaurantMeta';
import ReviewAnalysisView from './ReviewAnalysisView';

interface Props {
  restaurant: Restaurant | null;
  onClose: () => void;
}

/** 모바일은 아래에서 올라오는 시트, 데스크톱은 가운데 대화상자 */
export default function ReviewSheet({ restaurant, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!restaurant) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [restaurant, onClose]);

  return (
    <AnimatePresence>
      {restaurant && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-title"
            className="relative flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-surface shadow-lift sm:max-w-lg sm:rounded-3xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="flex items-start gap-3 border-b border-line p-5">
              <div className="min-w-0 flex-1 space-y-1.5 pr-2">
                <p className="text-xs font-semibold text-accent">리뷰 분석</p>
                <h2 id="review-title" className="truncate text-xl font-bold">
                  {restaurant.name}
                </h2>
                <RestaurantMeta restaurant={restaurant} />
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-muted hover:text-ink"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <ReviewAnalysisView restaurant={restaurant} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
