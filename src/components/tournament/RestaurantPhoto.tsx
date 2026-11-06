'use client';

import { useState } from 'react';
import Image from 'next/image';
import { UtensilsCrossed } from 'lucide-react';
import { Restaurant } from '@/lib/types';

export default function RestaurantPhoto({ restaurant, className = '' }: { restaurant: Restaurant; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = restaurant.photos?.[0];

  return (
    <div className={`relative overflow-hidden bg-sunken ${className}`}>
      {src && !failed ? (
        <Image
          src={src}
          alt={restaurant.name}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-accent-soft to-sunken">
          <div className="flex flex-col items-center gap-2 text-accent/70">
            <UtensilsCrossed className="h-10 w-10" strokeWidth={1.5} />
            <span className="text-sm font-medium">{restaurant.menu?.categories?.[0] || '음식점'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
