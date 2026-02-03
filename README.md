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
2. **반경 설정**: 검색할 반경을 조절하세요 (500m ~ 5km)
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

### API 사용량 최적화
- 검색 결과를 평점 3.5 이상으로 필터링
- 최대 16개 맛집으로 제한
- 이미지 크기 최적화 (400x400)

## 🌟 주요 컴포넌트

- `LocationSetup`: 위치 설정 및 맛집 검색
- `Tournament`: 토너먼트 진행 및 결과 표시
- `PlacesService`: Google Places API 래퍼 클래스

## 🎨 디자인 특징

- **글래스모피즘 효과**: 반투명 배경과 블러 효과
- **그라디언트**: 핑크-바이올렛 그라디언트 활용
- **호버 애니메이션**: 카드 확대 및 이미지 줌 효과
- **반응형**: 모바일 우선 디자인

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
