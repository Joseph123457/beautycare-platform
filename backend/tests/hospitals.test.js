/**
 * 병원 API 테스트
 *
 * 테스트 항목:
 *   1. 위치 기반 검색 API 정상 동작 확인
 *   2. 같은 위치로 여러 번 검색 시 순서가 다른지 확인 (랜덤 부스트 검증)
 *   3. 카테고리 필터 작동 확인
 *   4. 없는 병원 ID 조회 시 404 반환 확인
 *
 * 사전 조건:
 *   - TEST_DATABASE_URL로 접속 가능한 테스트 DB
 *   - 마이그레이션 + 시드 데이터 실행 완료 (병원 10개 등록 상태)
 */
const { api } = require('./helpers');

// 강남역 좌표 (시드 데이터 병원들의 중심 위치)
const GANGNAM_LAT = 37.4979;
const GANGNAM_LNG = 127.0276;

describe('병원 API (hospitals)', () => {

  // ─────────────────────────────────────────────────────────
  // 1. 위치 기반 검색 API 정상 동작 확인
  // ─────────────────────────────────────────────────────────
  describe('위치 기반 검색 API 정상 동작', () => {
    it('위도/경도로 검색하면 주변 병원 목록을 반환한다', async () => {
      const res = await api.get('/api/hospitals/search')
        .query({ lat: GANGNAM_LAT, lng: GANGNAM_LNG, radius: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('검색 결과에 필수 필드가 포함되어 있다', async () => {
      const res = await api.get('/api/hospitals/search')
        .query({ lat: GANGNAM_LAT, lng: GANGNAM_LNG, radius: 10 });

      const hospital = res.body.data[0];

      // 필수 필드 확인
      expect(hospital).toHaveProperty('hospital_id');
      expect(hospital).toHaveProperty('name');
      expect(hospital).toHaveProperty('category');
      expect(hospital).toHaveProperty('address');
      expect(hospital).toHaveProperty('distance_km');
      expect(hospital).toHaveProperty('total_score');
      expect(hospital).toHaveProperty('avg_rating');
    });

    it('위도/경도 없이 검색하면 400 에러를 반환한다', async () => {
      const res = await api.get('/api/hospitals/search');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('페이지네이션이 정상 동작한다', async () => {
      const res = await api.get('/api/hospitals/search')
        .query({ lat: GANGNAM_LAT, lng: GANGNAM_LNG, radius: 50, page: 1, limit: 3 });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(3);
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('page', 1);
      expect(res.body.meta).toHaveProperty('limit', 3);
      expect(res.body.meta).toHaveProperty('totalPages');
    });
  });

  // ─────────────────────────────────────────────────────────
  // 2. 같은 위치로 3번 검색 시 순서가 다른지 확인 (랜덤 부스트)
  // ─────────────────────────────────────────────────────────
  describe('랜덤 부스트에 의해 검색 순서가 변경되는지 확인', () => {
    it('동일한 위치로 여러 번 검색하면 랜덤 부스트로 순서가 달라야 한다', async () => {
      const results = [];

      // 넓은 반경(50km)으로 모든 병원을 포함하여 5번 검색
      for (let i = 0; i < 5; i++) {
        const res = await api.get('/api/hospitals/search')
          .query({ lat: GANGNAM_LAT, lng: GANGNAM_LNG, radius: 50 });

        // hospital_id 순서를 문자열로 변환하여 비교
        const order = res.body.data.map((h) => h.hospital_id).join(',');
        results.push(order);
      }

      // 공정 노출 알고리즘의 랜덤 부스트(20%)로 인해
      // 최소 2개의 서로 다른 순서가 나타나야 한다
      const uniqueOrders = new Set(results);
      expect(uniqueOrders.size).toBeGreaterThanOrEqual(2);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 3. 카테고리 필터 작동 확인
  // ─────────────────────────────────────────────────────────
  describe('카테고리 필터 작동 확인', () => {
    it('성형외과 카테고리로 필터링하면 성형외과만 반환된다', async () => {
      const res = await api.get('/api/hospitals/search')
        .query({ lat: GANGNAM_LAT, lng: GANGNAM_LNG, radius: 50, category: '성형외과' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);

      // 모든 결과가 성형외과인지 확인
      res.body.data.forEach((hospital) => {
        expect(hospital.category).toBe('성형외과');
      });
    });

    it('피부과 카테고리로 필터링하면 피부과만 반환된다', async () => {
      const res = await api.get('/api/hospitals/search')
        .query({ lat: GANGNAM_LAT, lng: GANGNAM_LNG, radius: 50, category: '피부과' });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);

      res.body.data.forEach((hospital) => {
        expect(hospital.category).toBe('피부과');
      });
    });

    it('잘못된 카테고리로 검색하면 400 에러를 반환한다', async () => {
      const res = await api.get('/api/hospitals/search')
        .query({ lat: GANGNAM_LAT, lng: GANGNAM_LNG, category: '없는카테고리' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 4. 없는 병원 ID 조회 시 404 반환 확인
  // ─────────────────────────────────────────────────────────
  describe('없는 병원 ID 조회 시 404 반환', () => {
    it('존재하지 않는 병원 ID로 상세 조회하면 404를 반환한다', async () => {
      const res = await api.get('/api/hospitals/99999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('찾을 수 없습니다');
    });

    it('존재하는 병원 ID로 상세 조회하면 정상 데이터를 반환한다', async () => {
      // 시드 데이터의 첫 번째 병원 (hospital_id = 1)
      const res = await api.get('/api/hospitals/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('hospital');
      expect(res.body.data).toHaveProperty('reviews');
      expect(res.body.data).toHaveProperty('availability');
      expect(res.body.data.hospital.hospital_id).toBe(1);
    });
  });
});
