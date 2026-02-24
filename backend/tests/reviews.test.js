/**
 * 리뷰 API 테스트
 *
 * 테스트 항목:
 *   1. 예약 완료(DONE) 사용자만 리뷰 작성 가능 확인
 *   2. 예약 없는 사용자(타인의 예약) 리뷰 작성 시 403 에러 반환
 *   3. 랜덤 순서 조회 시 매번 다른 순서 반환 확인
 *
 * 사전 조건:
 *   - TEST_DATABASE_URL로 접속 가능한 테스트 DB
 *   - 마이그레이션 + 시드 데이터 실행 완료
 *   - patient1@test.com (user_id=1), patient2@test.com (user_id=2) 계정 존재
 *   - 병원 1 (hospital_id=1)에 승인된 리뷰 3개 이상 존재
 */
const { pool } = require('../src/config/database');
const { login, authPost, api } = require('./helpers');

// 시드 데이터 비밀번호 (006_seed_data.sql 참조)
const SEED_PASSWORD = 'test1234';

describe('리뷰 API (reviews)', () => {
  let patient1Token;  // user_id=1 (patient1@test.com)
  let patient2Token;  // user_id=2 (patient2@test.com)

  let testReservationDone;     // DONE 상태 테스트 예약
  let testReservationPending;  // PENDING 상태 테스트 예약
  let createdReviewId;         // 테스트에서 생성된 리뷰 ID

  // ─── 테스트 데이터 준비 ─────────────────────────────────
  beforeAll(async () => {
    // 시드 데이터의 환자 계정으로 로그인
    const [res1, res2] = await Promise.all([
      login('patient1@test.com', SEED_PASSWORD),
      login('patient2@test.com', SEED_PASSWORD),
    ]);

    patient1Token = res1.body.data.accessToken;
    patient2Token = res2.body.data.accessToken;

    // 리뷰가 없는 DONE 상태 테스트 예약 생성 (patient1 → 병원1)
    const doneResult = await pool.query(
      `INSERT INTO reservations (hospital_id, user_id, treatment_name, reserved_at, status)
       VALUES (1, 1, '테스트 시술 - DONE', NOW() - INTERVAL '7 days', 'DONE')
       RETURNING reservation_id`
    );
    testReservationDone = doneResult.rows[0].reservation_id;

    // PENDING 상태 테스트 예약 생성 (patient1 → 병원1)
    const pendingResult = await pool.query(
      `INSERT INTO reservations (hospital_id, user_id, treatment_name, reserved_at, status)
       VALUES (1, 1, '테스트 시술 - PENDING', NOW() + INTERVAL '7 days', 'PENDING')
       RETURNING reservation_id`
    );
    testReservationPending = pendingResult.rows[0].reservation_id;
  });

  // ─── 테스트 데이터 정리 ─────────────────────────────────
  afterAll(async () => {
    // 생성된 리뷰 삭제
    if (createdReviewId) {
      await pool.query('DELETE FROM reviews WHERE review_id = $1', [createdReviewId]);
    }
    // 테스트 예약 삭제
    if (testReservationDone) {
      await pool.query('DELETE FROM reservations WHERE reservation_id = $1', [testReservationDone]);
    }
    if (testReservationPending) {
      await pool.query('DELETE FROM reservations WHERE reservation_id = $1', [testReservationPending]);
    }
  });

  // ─────────────────────────────────────────────────────────
  // 1. 예약 완료(DONE) 사용자만 리뷰 작성 가능 확인
  // ─────────────────────────────────────────────────────────
  describe('예약 완료(DONE) 사용자만 리뷰 작성 가능', () => {
    it('DONE 상태 예약에 리뷰를 작성하면 201 성공한다', async () => {
      const res = await authPost('/api/reviews', patient1Token, {
        reservation_id: testReservationDone,
        rating: 5,
        content: 'Jest 테스트에서 작성한 리뷰입니다. 매우 만족스러운 시술이었습니다.',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('review_id');
      expect(res.body.data.rating).toBe(5);

      // 정리용으로 리뷰 ID 저장
      createdReviewId = res.body.data.review_id;
    });

    it('PENDING 상태 예약에 리뷰를 작성하면 400 에러를 반환한다', async () => {
      const res = await authPost('/api/reviews', patient1Token, {
        reservation_id: testReservationPending,
        rating: 4,
        content: 'PENDING 상태 예약에 대한 리뷰 작성 시도 테스트입니다.',
      });

      // 시술 완료(DONE) 상태가 아니므로 400
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('이미 리뷰가 존재하는 예약에 중복 작성하면 409 에러를 반환한다', async () => {
      const res = await authPost('/api/reviews', patient1Token, {
        reservation_id: testReservationDone,
        rating: 3,
        content: '중복 리뷰 작성 시도입니다. 이 요청은 실패해야 합니다.',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 2. 예약 없는 사용자 리뷰 작성 시 403 에러 반환
  // ─────────────────────────────────────────────────────────
  describe('타인의 예약으로 리뷰 작성 시 403 에러 반환', () => {
    it('다른 사용자의 예약 ID로 리뷰를 작성하면 403을 반환한다', async () => {
      // patient2가 patient1의 예약(testReservationPending)으로 리뷰 작성 시도
      // 소유자 검증이 상태 검증보다 먼저 수행되므로 403 반환
      const res = await authPost('/api/reviews', patient2Token, {
        reservation_id: testReservationPending,
        rating: 4,
        content: '타인의 예약에 대한 리뷰 작성 시도입니다. 403이 반환되어야 합니다.',
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('본인의 예약');
    });

    it('존재하지 않는 예약 ID로 리뷰를 작성하면 404를 반환한다', async () => {
      const res = await authPost('/api/reviews', patient1Token, {
        reservation_id: 999999,
        rating: 3,
        content: '존재하지 않는 예약에 대한 리뷰 작성 시도입니다.',
      });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 3. 랜덤 순서 조회 시 매번 다른 순서 반환 확인
  // ─────────────────────────────────────────────────────────
  describe('랜덤 순서 조회 시 다른 순서 반환 확인', () => {
    it('sort=random으로 여러 번 조회하면 순서가 달라야 한다', async () => {
      const results = [];

      // 병원 1의 리뷰를 랜덤 정렬로 10번 조회
      for (let i = 0; i < 10; i++) {
        const res = await api.get('/api/hospitals/1/reviews')
          .query({ sort: 'random', limit: 10 });

        expect(res.status).toBe(200);

        // review_id 순서를 문자열로 변환하여 비교
        const order = res.body.data.reviews.map((r) => r.review_id).join(',');
        results.push(order);
      }

      // PostgreSQL의 ORDER BY RANDOM()에 의해
      // 최소 2개의 서로 다른 순서가 나타나야 한다
      const uniqueOrders = new Set(results);
      expect(uniqueOrders.size).toBeGreaterThanOrEqual(2);
    });

    it('sort=latest로 조회하면 최신순으로 정렬된다', async () => {
      const res = await api.get('/api/hospitals/1/reviews')
        .query({ sort: 'latest' });

      expect(res.status).toBe(200);

      const reviews = res.body.data.reviews;
      if (reviews.length >= 2) {
        // 최신순: 첫 번째 리뷰의 생성일이 두 번째보다 같거나 이후여야 함
        const date1 = new Date(reviews[0].created_at);
        const date2 = new Date(reviews[1].created_at);
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });
  });
});
