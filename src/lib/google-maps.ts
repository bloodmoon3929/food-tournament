/// <reference types="google.maps" />
import { LocationData } from './types';

/** Google Maps JS API (places 라이브러리) 로드 */
export const loadGoogleMapsAPI = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&language=ko`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps API를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });

/** 브라우저 GPS 위치 */
export const getCurrentLocation = (): Promise<LocationData> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('이 브라우저는 위치 정보를 지원하지 않습니다.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => reject(new Error(`위치 정보를 가져올 수 없습니다: ${error.message}`)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

let placesService: google.maps.places.PlacesService | null = null;

/** 화면에 지도를 띄우지 않고 쓰는 PlacesService (싱글톤) */
export const getPlacesService = (): google.maps.places.PlacesService => {
  if (typeof window === 'undefined' || !window.google?.maps?.places) {
    throw new Error('Google Maps API가 준비되지 않았습니다.');
  }
  if (!placesService) {
    placesService = new google.maps.places.PlacesService(document.createElement('div'));
  }
  return placesService;
};

/** 주소/장소명 → 좌표 (Google Geocoder) */
export const geocodeAddress = (address: string): Promise<LocationData> =>
  new Promise((resolve, reject) => {
    new google.maps.Geocoder().geocode({ address, region: 'kr', language: 'ko' }, (results, status) => {
      const first = results?.[0];
      if (status !== google.maps.GeocoderStatus.OK || !first) {
        reject(new Error('위치를 찾지 못했어요. 주소나 역 이름으로 다시 입력해 주세요.'));
        return;
      }
      resolve({
        lat: first.geometry.location.lat(),
        lng: first.geometry.location.lng(),
        address: first.formatted_address.replace(/^대한민국\s*/, ''),
      });
    });
  });
