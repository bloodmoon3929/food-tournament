'use client';

export const RestaurantCardSkeleton = () => (
  <div className="glass-effect rounded-2xl p-6 animate-pulse">
    {/* 이미지 스켈레톤 */}
    <div className="w-full h-32 sm:h-40 mb-4 rounded-xl bg-gray-300/30"></div>
    
    {/* 제목 스켈레톤 */}
    <div className="text-center space-y-3">
      <div className="h-6 bg-gray-300/30 rounded-lg mx-auto w-3/4"></div>
      
      {/* 평점 스켈레톤 */}
      <div className="flex items-center justify-center space-x-4">
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 bg-yellow-400/30 rounded"></div>
          <div className="h-4 bg-gray-300/30 rounded w-8"></div>
        </div>
        <div className="h-4 bg-gray-300/30 rounded w-12"></div>
      </div>
      
      {/* 주소 스켈레톤 */}
      <div className="h-3 bg-gray-300/30 rounded w-2/3 mx-auto"></div>
      
      {/* 메뉴 카테고리 스켈레톤 */}
      <div className="flex justify-center space-x-2 mt-2">
        <div className="h-6 bg-gray-300/30 rounded-full w-12"></div>
        <div className="h-6 bg-gray-300/30 rounded-full w-16"></div>
      </div>
      
      {/* 가격 스켈레톤 */}
      <div className="h-4 bg-gray-300/30 rounded w-16 mx-auto"></div>
    </div>
  </div>
);

export const TournamentSkeleton = () => (
  <div className="max-w-6xl mx-auto px-4">
    {/* 라운드 정보 스켈레톤 */}
    <div className="text-center mb-8">
      <div className="glass-effect rounded-2xl p-4 inline-block">
        <div className="h-8 bg-gray-300/30 rounded w-24 mx-auto mb-2"></div>
        <div className="h-4 bg-gray-300/30 rounded w-16 mx-auto"></div>
      </div>
    </div>

    {/* VS 매치 스켈레톤 - 모바일/데스크톱 대응 */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 items-center">
      {/* 첫 번째 카드 */}
      <div className="order-1">
        <RestaurantCardSkeleton />
      </div>
      
      {/* VS 섹션 */}
      <div className="order-2 text-center py-4 lg:py-0">
        <div className="text-4xl lg:text-6xl mb-4">⚡</div>
        <div className="text-2xl lg:text-3xl font-bold gradient-text">VS</div>
        <div className="h-4 bg-gray-300/30 rounded w-32 mx-auto mt-2"></div>
      </div>
      
      {/* 두 번째 카드 */}
      <div className="order-3">
        <RestaurantCardSkeleton />
      </div>
    </div>

    {/* 진행률 스켈레톤 */}
    <div className="mt-8">
      <div className="glass-effect rounded-xl p-4">
        <div className="flex justify-between mb-2">
          <div className="h-4 bg-gray-300/30 rounded w-12"></div>
          <div className="h-4 bg-gray-300/30 rounded w-16"></div>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div className="bg-gradient-to-r from-pink-500/50 to-violet-500/50 h-2 rounded-full w-1/3"></div>
        </div>
      </div>
    </div>
  </div>
);