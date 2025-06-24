/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages 배포를 위한 설정
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true, // GitHub Pages에서 이미지 최적화 비활성화
    domains: ['maps.googleapis.com', 'lh3.googleusercontent.com', 'places.googleapis.com'],
  },
  env: {
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  },
  // 기본 경로 설정 (리포지토리 이름에 맞게 수정 필요)
  basePath: process.env.NODE_ENV === 'production' ? '/food-tournament' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/food-tournament/' : '',
}

module.exports = nextConfig