# Storige-Bookmoa 통합 개발 계획

마지막 업데이트: 2025-12-14

## Phase 1: 기반 인프라 구축 ✅ 완료

### 1.1 인증 시스템 ✅
- [x] API Key 인증 (서버 간 통신)
  - `api-key.guard.ts`
  - `api-key.strategy.ts`
  - `api-key.decorator.ts`
- [x] JWT 쿠키 인증 (브라우저 세션)
  - `jwt-cookie.guard.ts`
  - `jwt-cookie.strategy.ts`
- [x] Shop Session 엔드포인트
  - `POST /api/auth/shop-session`
  - bookmoa 회원 정보로 JWT 토큰 발급
- [x] JWT Strategy 수정
  - `source: 'shop'` 토큰은 DB 조회 없이 처리

### 1.2 API 모듈 ✅
- [x] Edit Sessions 모듈
  - 편집 세션 CRUD
  - `edit-sessions.controller.ts`
  - `edit-sessions.service.ts`
- [x] Files 모듈
  - 파일 업로드 처리
  - `files.controller.ts`
  - `files.service.ts`
- [x] Bookmoa 엔티티
  - `member.entity.ts`
  - `order.entity.ts`

### 1.3 TypeORM 설정 ✅
- [x] 인덱스 데코레이터 수정 (relation name 사용)
- [x] bookmoa 엔티티 별도 분리
- [x] 테이블 이름 충돌 해결

## Phase 2: 에디터 번들 및 임베딩 ✅ 완료

### 2.1 에디터 번들 빌드 ✅
- [x] Vite IIFE 빌드 설정
- [x] `editor-bundle.iife.js` 생성
- [x] `editor-bundle.css` 생성
- [x] StorigeEditor 글로벌 객체 노출

### 2.2 임베드 에디터 ✅
- [x] `embed.tsx` 구현
  - 설정 기반 초기화
  - 토큰 파라미터 지원
  - 콜백 함수 (onReady, onComplete, onCancel, onError)
- [x] API 클라이언트 개선
  - Bearer 토큰 인증
  - 에러 핸들링

### 2.3 bookmoa PHP 연동 ✅
- [x] `edit.php` - 메인 에디터 페이지
- [x] `editor_test.php` - 독립 테스트 페이지
- [x] `api_test.php` - API 연결 테스트
- [x] `storige_common.php` - 공통 유틸리티
- [x] nginx 프록시 설정 (`/storige-api`)

## Phase 3: Docker 환경 ✅ 완료

### 3.1 bookmoa Docker ✅
- [x] `docker-compose.dev.yml`
- [x] nginx 설정 (API 프록시)
- [x] PHP 환경변수 전달
- [x] storige 네트워크 연결

### 3.2 storige Docker ✅
- [x] API Dockerfile 업데이트
- [x] Worker Dockerfile 업데이트
- [x] nginx 설정 업데이트

## Phase 4: 에디터 핵심 기능 🔄 진행중

### 4.1 캔버스 편집 ✅
- [x] 텍스트 추가/편집
- [x] 이미지 업로드
- [x] 템플릿 로드
- [x] 페이지 관리
- [x] 파일 업로드 취소 버그 수정

### 4.2 저장 기능 ✅ 완료
- [x] **편집완료 (handleFinish)** ✅
  - [x] 캔버스 데이터 저장
  - [x] 세션 상태 'complete'로 변경
  - [x] 쇼핑몰 콜백 호출 (onComplete)
  - [ ] 썸네일 생성 (Worker 연동 후)
  - [ ] PDF 생성 요청 (Worker 연동 후)
- [x] **내 작업에 저장 (handleSaveWork)** ✅
  - [x] 세션 데이터 저장
  - [x] 세션 상태 'editing'으로 변경
  - [ ] 자동 저장
- [x] **불러오기 (handleOpenWorkspace)** ✅
  - [x] 저장된 작업 목록 모달 (WorkspaceModal)
  - [x] 작업 불러오기 기능

### 4.3 관리자 기능 ❌ 미완료
- [ ] 관리자용 저장
- [ ] CMS 연동

## Phase 5: Worker 통합 ❌ 미시작

### 5.1 PDF 처리
- [ ] 검증 작업 (Validation)
- [ ] 변환 작업 (Conversion)
- [ ] 합성 작업 (Synthesis)

### 5.2 콜백 시스템
- [ ] 작업 완료 콜백
- [ ] bookmoa 주문 상태 업데이트

## Phase 6: 프로덕션 배포 ❌ 미시작

### 6.1 배포 준비
- [ ] 프로덕션 환경변수
- [ ] CDN 설정
- [ ] SSL 인증서

### 6.2 모니터링
- [ ] 로깅 설정
- [ ] 에러 추적
- [ ] 성능 모니터링

---

## 진행률 요약

| Phase | 상태 | 진행률 |
|-------|------|--------|
| Phase 1: 기반 인프라 | ✅ 완료 | 100% |
| Phase 2: 에디터 번들 | ✅ 완료 | 100% |
| Phase 3: Docker 환경 | ✅ 완료 | 100% |
| Phase 4: 에디터 기능 | 🔄 진행중 | 90% |
| Phase 5: Worker 통합 | ❌ 미시작 | 0% |
| Phase 6: 배포 | ❌ 미시작 | 0% |

**전체 진행률: 약 70%**

## 다음 작업 우선순위

1. **Worker 통합** (Phase 5)
   - PDF 생성 파이프라인 연결
   - 썸네일 생성 연동

2. **자동 저장 구현** (Phase 4.2)
   - 주기적 자동 저장
   - 로컬 백업

3. **관리자 기능** (Phase 4.3)
   - 관리자용 저장 로직
   - CMS 연동
