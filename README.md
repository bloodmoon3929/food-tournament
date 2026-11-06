# 🍽️ 맛집 이상형 월드컵

[![CI/CD Pipeline](https://github.com/gnbup/food-tournament/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/gnbup/food-tournament/actions/workflows/ci-cd.yml)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue)](https://gnbup.github.io/food-tournament/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.3-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)

현재 위치 기반으로 주변 맛집들을 찾아서 이상형 월드컵을 진행하는 Next.js 웹 애플리케이션입니다.
 
## ✨ 주요 기능

- 📍 **현재 위치 기반 맛집 검색**: GPS를 이용한 정확한 위치 파악
- 🗺️ **Google Places API 연동**: 실제 맛집 데이터와 사진, 평점 정보
- 🏆 **토너먼트 시스템**: 16강부터 결승까지 단계별 진행
- 📱 **반응형 디자인**: 모바일과 데스크톱 모두 최적화
- 🎨 **현대적인 UI**: Tailwind CSS와 Framer Motion을 활용한 매끄러운 애니메이션

## 🚀 시작하기

### 1. 의존성 설치
```bash
npm install
# 또는
yarn install
```

### 2. Google Maps API 키 설정
1. [Google Cloud Console](https://console.cloud.google.com/)에서 새 프로젝트 생성
2. Maps JavaScript API와 Places API 활성화
3. API 키 생성
4. `.env.local` 파일에서 API 키 설정:
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 3. 개발 서버 실행
```bash
npm run dev
# 또는
yarn dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어보세요.

## 🛠️ 기술 스택

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **API**: Google Maps JavaScript API, Google Places API
- **Animation**: CSS Transitions

## 📱 사용 방법

1. **위치 허용**: 브라우저에서 위치 접근 권한을 허용해주세요
2. **반경 설정**: 검색할 반경을 조절하세요 (500m ~ 10km)
3. **맛집 검색**: "주변 맛집 찾기" 버튼을 클릭하세요
4. **토너먼트 시작**: 두 맛집 중 하나를 선택하며 진행하세요
5. **결과 확인**: 최종 우승 맛집을 확인하고 방문해보세요!

## 🔧 API 설정 가이드

### Google Maps API 설정
1. Google Cloud Console에서 프로젝트 생성
2. 다음 API들을 활성화:
   - Maps JavaScript API
   - Places API
3. API 키 생성 및 도메인 제한 설정
4. 환경 변수 파일에 키 추가

### 맛집 판정 기준

별점만 보면 "5.0 (리뷰 2개)"가 "4.4 (리뷰 1,200개)"보다 위에 옵니다. 그래서 `src/lib/ranking.ts`에서

1. **리뷰 10개 이상 · 별점 3.5 초과**인 곳만 후보로 남기고
2. 리뷰 수를 반영한 **베이지안 평균 점수**로 줄을 세웁니다.
   `점수 = (리뷰수 × 별점 + 30 × 주변 평균별점) / (리뷰수 + 30)`
   리뷰가 적을수록 주변 평균 쪽으로 보정되고, 많을수록 실제 별점에 가까워집니다.
3. 점수 상위 N곳으로 N강 대진을 만듭니다. 네이버에서만 찾은 곳(별점 없음)은 자리가 모자랄 때만 들어갑니다.

### 리뷰 분석

카드의 **리뷰 분석** 버튼이나 우승 화면에서 Google 리뷰(최대 5개)와 네이버 블로그 후기(최대 10개)를 모아 분석합니다.
프록시에 리뷰 AI가 설정되어 있으면 AI 요약, 없으면 키워드 기반으로 장점/단점/자주 나온 메뉴/긍정 비율을 보여줍니다.

### 맛집 검색 방식 (20개 제한 해결)

예전에는 Google Places `nearbySearch`를 한 번만 호출해서 **반경과 상관없이 최대 20개**까지만 검색됐습니다.
지금은 `src/lib/restaurant-search.ts`에서 다음과 같이 검색합니다.

1. **Google 페이지네이션**: 한 번의 검색에서 다음 페이지까지 받아 최대 60개
2. **구역 분할 검색**: 반경이 1km보다 크면 바깥 6방향 + 중심 소구역으로 나눠 추가 검색 (충분히 모이면 중단)
3. **네이버 지역 검색 보충 (선택)**: 주변 동네 이름 × 음식 키워드(맛집/한식/중식/일식/양식/분식/고기)로 검색해서
   Google에 없는 가게를 추가합니다. 같은 가게(200m 이내 + 이름 일치)는 Google 정보를 쓰고 네이버 카테고리만 붙입니다.

검색 결과는 반경을 바꿀 때 한 번만 가져와서 개수 표시와 토너먼트 시작에 그대로 재사용합니다.

### API 프록시 설정 (선택: 네이버 검색 · 리뷰 AI 분석)

네이버 검색 API는 Client Secret이 필요하고 브라우저 CORS를 허용하지 않아 GitHub Pages에서 직접 부를 수 없습니다.
`proxy/`의 Cloudflare Worker를 배포해서 사용합니다. 설정하지 않으면 Google 검색과 키워드 기반 리뷰 분석만 사용합니다.

```bash
cd proxy
npx wrangler secret put NAVER_CLIENT_ID
npx wrangler secret put NAVER_CLIENT_SECRET
npx wrangler secret put REVIEW_AI_KEY   # 리뷰 분석 AI 키
npx wrangler deploy
```

- 리뷰 AI는 `wrangler.toml`의 `REVIEW_AI_URL`(OpenAI 호환 Chat Completions 주소)과 `REVIEW_AI_MODEL`을 채워야 켜집니다.
- 로컬 개발은 `proxy/.dev.vars`에 키를 넣고 `npx wrangler dev` (git에서 제외됨, `.dev.vars.example` 참고).

- `wrangler.toml`의 `ALLOWED_ORIGINS`에 사이트 주소를 넣어주세요.
- 배포된 Worker 주소를 GitHub 리포지토리 **Settings > Secrets and variables > Actions > Variables**에
  `NEXT_PUBLIC_PROXY_URL`로 등록합니다 (로컬은 `.env.local`).
- 동네 이름을 얻기 위해 Google **Geocoding API**도 활성화해야 합니다.

### API 사용량 최적화
- 검색 결과를 평점 3.5 이상으로 필터링
- 구역 분할 검색은 맛집이 충분히 모이면 중단
- 장소 상세(getDetails) 호출 제거
- 이미지 크기 최적화 (400x400)

## 🌟 주요 컴포넌트

```
src/
  app/                 page.tsx (화면 전환), layout.tsx, globals.css (색상 토큰, 다크 모드)
  components/
    setup/             LocationSetup, LocationField, RadiusSlider, BracketPicker, SearchSummary
    tournament/        Tournament, RoundHeader, MatchView, RestaurantCard, WinnerView,
                       ReviewSheet, ReviewAnalysisView, RestaurantPhoto, RestaurantMeta
    ui/                Button, Spinner
  hooks/               useTournament (대진 진행), useReviewAnalysis
  lib/                 restaurant-search (Google+네이버 검색), ranking (맛집 점수), reviews (리뷰 분석),
                       google-maps, menu-info, proxy, format, types
proxy/                 Cloudflare Worker (네이버 검색, 리뷰 AI)
```

## 🎨 디자인 특징

- 따뜻한 크림/토마토 색 조합, 시스템 설정에 따른 **다크 모드**
- Pretendard 글꼴, 모바일 우선 반응형
- 카드 선택 애니메이션, 키보드 ← → 선택
- 우승 화면에서 우승까지의 경기 기록, 지도 길찾기, 같은 후보로 다시 하기

## 📝 TODO

- [ ] 맛집 상세 정보 모달
- [ ] 즐겨찾기 기능
- [ ] 결과 공유 기능
- [ ] 맛집 카테고리 필터
- [ ] 영업시간 표시
- [ ] 길찾기 연동

## 🤝 기여하기

1. 프로젝트를 포크하세요
2. 새 브랜치를 만드세요 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋하세요 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시하세요 (`git push origin feature/amazing-feature`)
5. Pull Request를 열어주세요

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.

## 🚀 CI/CD 및 배포

이 프로젝트는 GitHub Actions를 사용하여 자동화된 CI/CD 파이프라인을 구축했습니다.

### 파이프라인 단계

1. **CI (지속적 통합)**
   - 여러 Node.js 버전(18.x, 20.x)에서 테스트
   - ESLint 코드 린팅 검사
   - TypeScript 타입 체크
   - 빌드 테스트
   - 단위 테스트 실행

2. **CD (지속적 배포)**
   - main 브랜치에 push시 자동 배포
   - GitHub Pages로 자동 배포
   - 정적 사이트 생성 및 호스팅

3. **보안 검사**
   - Trivy를 사용한 취약점 스캔
   - GitHub Security 탭에 결과 업로드

### GitHub Secrets 설정

배포를 위해 다음 Secrets를 설정해야 합니다:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Secrets 설정 방법:**
1. GitHub 리포지토리로 이동
2. Settings > Secrets and variables > Actions
3. "New repository secret" 클릭
4. Name: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
5. Secret: 발급받은 Google Maps API 키 입력

### GitHub Pages 설정

1. 리포지토리 Settings > Pages
2. Source: "GitHub Actions" 선택
3. 자동으로 배포 URL 생성: `https://gnbup.github.io/food-tournament/`

## ⚠️ 주의사항

- Google Maps API는 유료 서비스입니다. 사용량을 확인하세요.
- 위치 정보는 HTTPS 환경에서만 정상 작동합니다.
- 브라우저 호환성을 확인해주세요 (최신 Chrome, Firefox, Safari 권장)
