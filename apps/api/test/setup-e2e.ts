/**
 * E2E 테스트 환경 설정
 */

// 테스트 타임아웃 설정
jest.setTimeout(30000);

// Mock 환경 변수
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-testing';
process.env.JWT_EXPIRES_IN = '1h';

// 콘솔 출력 정리 (선택적)
beforeAll(() => {
  // 테스트 시작 전 초기화
});

afterAll(() => {
  // 테스트 종료 후 정리
});
