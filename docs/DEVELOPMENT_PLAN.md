# Storige-Bookmoa 통합 개발 계획

마지막 업데이트: 2025-12-18

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

## Phase 4: 에디터 핵심 기능 ✅ 완료

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
  - [x] PDF 생성 및 업로드
  - [x] Worker 검증 작업 자동 생성
- [x] **내 작업에 저장 (handleSaveWork)** ✅
  - [x] 세션 데이터 저장
  - [x] 세션 상태 'editing'으로 변경
  - [x] **자동 저장** ✅
    - [x] useEmbedAutoSave 훅 (debounced 저장, 주기적 저장)
    - [x] 캔버스 변경 감지 자동 dirty 마킹
    - [x] 로컬 백업 (localStorage)
    - [x] 네트워크 복구 시 자동 동기화
    - [x] 페이지 이탈 시 경고
    - [x] AutoSaveIndicator 상태 표시 UI
- [x] **불러오기 (handleOpenWorkspace)** ✅
  - [x] 저장된 작업 목록 모달 (WorkspaceModal)
  - [x] 작업 불러오기 기능

### 4.3 관리자 기능 ✅ 완료
- [x] 관리자용 저장
  - [x] `useWorkSave.saveWorkForAdmin()` 훅 구현
  - [x] `EditorHeader.handleSaveForAdmin()` 연동
  - [x] SUPER_ADMIN 역할 정의 및 권한 추가
- [x] CMS 연동
  - [x] `sendMessageToCMS()` postMessage 통신
  - [x] ADMIN_EDITOR_SAVED, ADMIN_EDITOR_CLOSED, ADMIN_EDITOR_ERROR 이벤트

## Phase 5: Worker 통합 ✅ 완료

### 5.1 PDF 처리
- [x] 검증 작업 (Validation) ✅
  - [x] EditSession 완료 시 자동 생성
  - [x] Bull 큐 연동
  - [x] PDF 파일 검증 로직
- [x] 변환 작업 (Conversion) ✅
  - [x] Ghostscript 기반 블리드 적용
  - [x] 페이지 추가 (pdf-lib)
  - [x] 크기 조정 (Ghostscript)
  - [x] 미리보기 이미지 생성
- [x] 합성 작업 (Synthesis) ✅
  - [x] 표지+내지 병합 (Ghostscript/pdf-lib)
  - [x] 제본 유형별 처리 (perfect, saddle, hardcover)
  - [x] 미리보기 이미지 생성
  - [x] 책등 너비 계산 유틸리티

### 5.2 콜백 시스템 ✅
- [x] 작업 완료 콜백
  - [x] WorkerJob에 editSessionId 관계 추가
  - [x] EditSession에 workerStatus, workerError, callbackUrl 필드 추가
  - [x] WebhookService 구현 (재시도 로직 포함)
  - [x] Job 상태 변경 시 EditSession 자동 업데이트
  - [x] 검증 완료/실패 시 웹훅 콜백 전송
- [x] bookmoa 웹훅 수신
  - [x] webhook_callback.php 엔드포인트
  - [x] 주문 상태 업데이트 (storige_validation_status)
  - [x] 시그니처 검증

### 5.3 에디터-Worker 연동 ✅
- [x] 에디터 Files API 클라이언트 (`files.ts`)
- [x] PDF 생성 (ServicePlugin.saveMultiPagePDFAsBlob)
- [x] PDF 업로드 (filesApi.upload)
- [x] 세션 완료 시 Worker Job 자동 생성

## Phase 5.5: 쇼핑몰 Worker UX ✅ 완료

> 기획 문서: `docs/worker-ux-plan.md`

### 5.5.1 주문 화면 파일 업로드 ✅
- [x] 파일 업로드 UI 컴포넌트
  - [x] 표지/내지 파일 선택 (`file_upload.php`)
  - [x] 드래그 앤 드롭 지원
  - [x] 업로드 진행률 표시
  - [x] 파일 정보 미리보기 (파일명, 크기)
- [x] Storige Files API 연동
  - [x] `POST /api/files/upload` 호출 (`ajax/upload_file.php`)
  - [x] fileId 저장 및 관리
- [x] 주문 버튼 분기 로직
  - [x] 파일 첨부 상태에 따른 분기
  - [x] 디자인 의뢰 체크 여부 처리

### 5.5.2 파일 검증 UI ✅
- [x] 검증 진행 화면 (`validate.php`)
  - [x] 프로그레스 바 UI
  - [x] 검증 단계별 상태 표시 (업로드 → 무결성 → 사이즈 → 페이지 수 → 재단선)
  - [x] Worker Job 상태 폴링 (2초 간격)
- [x] 검증 API 연동
  - [x] `POST /api/worker-jobs` 호출
  - [x] `GET /api/worker-jobs/:jobId` 상태 조회 (`ajax/get_job_status.php`)

### 5.5.3 검증 결과 화면 ✅
- [x] 검증 성공 화면 (`validation_result.php`)
  - [x] 파일별 검증 결과 표시 (✓ 체크 마크)
  - [x] 메타데이터 표시 (페이지 수, 사이즈, 재단선 등)
  - [x] "주문 진행하기" 버튼
- [x] 검증 실패 화면
  - [x] 에러/경고 목록 표시
  - [x] 에러 상세 설명
  - [x] 액션 버튼: 파일 재업로드 / 자동 변환 요청 / 편집기로 수정

### 5.5.4 자동 변환 미리보기 ✅
- [x] Before/After 비교 UI (`auto_convert.php`)
  - [x] 원본 이미지 썸네일 (placeholder)
  - [x] 변환 후 이미지 썸네일 (재단선 표시)
  - [x] 변환 내역 목록 (사이즈 조정, 재단선 추가, 빈 페이지 추가 등)
- [x] 변환 승인 플로우
  - [x] "변환 승인 및 주문" 버튼
  - [x] "취소" 버튼
- [x] 썸네일 API 연동
  - [x] `GET /api/files/:fileId/thumbnail` (Ghostscript + Sharp)
  - [x] `POST /api/files/upload/external` (API Key 인증)

### 5.5.5 검증 에러코드 통일 ✅
- [x] Worker 에러코드 (`pdf-validator.service.ts`)
  - [x] `SIZE_MISMATCH` - 크기 불일치
  - [x] `BLEED_MISSING` - 재단선 누락 (warning)
  - [x] `PAGE_COUNT_INVALID` - 페이지 수 오류
  - [x] `FILE_CORRUPTED` - 파일 손상
  - [x] `UNSUPPORTED_FORMAT` - 파일 형식 미지원
  - [x] `FILE_TOO_LARGE` - 파일 크기 초과 (100MB)
  - [x] `PAGE_COUNT_EXCEEDED` - 최대 페이지 초과
  - [x] `SPINE_SIZE_MISMATCH` - 책등 사이즈 불일치
  - [x] `RESOLUTION_LOW` - 해상도 부족 (warning)
- [x] `autoFixable` 필드 구현
  - [x] 자동 변환 가능 여부 표시
  - [x] `fixMethod` 변환 방법 명시

### 5.5.6 Worker 안정화 ✅
- [x] 파일 경로 문제 수정 (`WORKER_STORAGE_PATH`)
- [x] API Key 인증 추가 (worker→api 통신)
- [x] Worker 단위 테스트 추가 (19 tests)

## Phase 6: 상품-템플릿셋 연동 ✅ 완료

> 기획 문서: `docs/product-templateset-linking-plan.md`

### 6.1 백엔드 구현 ✅
- [x] `ProductTemplateSet` 엔티티 생성
  - `apps/api/src/templates/entities/product-template-set.entity.ts`
- [x] Repository 구현 (조회/생성/수정/삭제)
- [x] Service 구현 (폴백 조회 로직 포함)
  - `apps/api/src/templates/product-template-sets.service.ts`
  - sortcode+stanSeqno 정확 매칭 → sortcode만 폴백
- [x] Controller 구현 (API 엔드포인트)
  - `apps/api/src/templates/product-template-sets.controller.ts`
  - `GET /product-template-sets/by-product` (외부용, API Key)
  - `GET/POST/PATCH/DELETE /product-template-sets` (관리자용)
  - `POST /product-template-sets/bulk` (일괄 생성)
- [x] DTO 정의 (Request/Response)
  - `apps/api/src/templates/dto/product-template-set.dto.ts`
- [x] API Key 인증 (외부 조회 API)
  - `@Public()` + `@UseGuards(ApiKeyGuard)`

### 6.2 Admin UI 구현 ✅
- [x] 연결 관리 페이지 (목록/추가/삭제)
  - `apps/admin/src/pages/ProductTemplateSets/ProductTemplateSetList.tsx`
- [x] 카테고리 셀렉터 (북모아 카테고리 자동완성)
  - bookmoa DB 연동으로 카테고리명 조회
- [x] 템플릿셋 선택 모달 (검색/필터/다중선택)
  - 템플릿셋 다중 선택 및 일괄 생성 지원
- [x] 순서/기본 설정 UI
  - 기본 템플릿 설정 (별표 토글)
  - 활성화 토글 (Switch)

### 6.3 bookmoa 연동 ✅
- [x] `storige_get_template_sets()` 헬퍼 함수
  - `bookmoa/front/storige/storige_common.php:369-382`
- [x] `edit.php` 수정 (템플릿셋 목록 전달)
  - `availableTemplateSets` 파라미터로 에디터에 전달
  - 기본 템플릿 자동 선택 로직
- [x] 에디터 템플릿 선택 UI
  - 에디터 설정에 templateSetId 전달

## Phase 7: Admin 기능 확장 ❌ 미시작

> PDF 기획서: `storige/admin-flow.pdf` 참조

### 7.1 라이브러리 에셋 확장 ❌

관리 대상 에셋: 폰트, 배경, 도형, 사진틀, 클립아트
- 폰트 제외 나머지는 계층형 카테고리 관리 필요

#### 7.1.1 타입 정의 추가 (`packages/types`)
- [ ] `LibraryShape` 인터페이스 추가
- [ ] `LibraryFrame` 인터페이스 추가
- [ ] `LibraryCategory` 인터페이스 추가 (계층형 카테고리)

#### 7.1.2 백엔드 구현 (`apps/api`)
- [ ] `LibraryCategory` 엔티티 (계층형)
- [ ] `LibraryShape` 엔티티
- [ ] `LibraryFrame` 엔티티
- [ ] Library 모듈 확장 (Service, Controller)
- [ ] API 엔드포인트
  - `GET/POST/PATCH/DELETE /api/library/categories`
  - `GET/POST/PATCH/DELETE /api/library/shapes`
  - `GET/POST/PATCH/DELETE /api/library/frames`

#### 7.1.3 Admin UI 구현 (`apps/admin`)
- [ ] `LibraryCategoryManagement.tsx` - 계층형 카테고리 관리
  - 트리 구조 UI (Ant Design Tree)
  - 드래그 앤 드롭 순서 변경
  - 카테고리 타입별 필터 (배경/도형/사진틀/클립아트)
- [ ] `ShapeList.tsx` - 도형 관리
  - 목록/업로드/삭제
  - 카테고리 필터
- [ ] `FrameList.tsx` - 사진틀 관리
  - 목록/업로드/삭제
  - 카테고리 필터
- [ ] `BackgroundList.tsx` 개선 - 카테고리 연결 추가
- [ ] `ClipartList.tsx` 개선 - 카테고리 연결 추가

### 7.2 편집데이터관리 ❌

> PDF 기획서 페이지 18 참조

- [ ] `EditSessionManagement.tsx` - 고객 편집 세션 관리 페이지
  - 주문번호, 편집코드, 편집명
  - 편집 시작일, 마지막 수정일, 편집 완료일
  - 작업상태 필터 (편집중/편집완료)
  - 고객명/아이디 검색
  - 수정/복사/삭제 기능
- [ ] Admin API 클라이언트 (`api/edit-sessions.ts`)
- [ ] 사이드바 메뉴 추가

### 7.3 사이드바 메뉴 구조 개편 ❌

최종 메뉴 구조:
```
📊 대시보드

📁 템플릿
   ├─ 템플릿분류 (카테고리)
   ├─ 템플릿관리
   ├─ 템플릿셋관리
   └─ 상품-템플릿 연결

🎨 라이브러리
   ├─ 카테고리관리 (계층형)
   ├─ 폰트
   ├─ 배경
   ├─ 도형 ← 신규
   ├─ 사진틀 ← 신규
   └─ 클립아트

📝 편집관리
   ├─ 편집데이터관리 ← 신규
   └─ 편집검토

🔧 워커작업관리
```

- [ ] `MainLayout.tsx` 메뉴 구조 변경
- [ ] `App.tsx` 라우트 추가

## Phase 8: 프로덕션 배포 ❌ 미시작

### 8.1 배포 준비
- [ ] 프로덕션 환경변수
- [ ] CDN 설정
- [ ] SSL 인증서

### 8.2 모니터링
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
| Phase 4: 에디터 기능 | ✅ 완료 | 100% |
| Phase 5: Worker 통합 | ✅ 완료 | 100% |
| Phase 5.5: 쇼핑몰 Worker UX | ✅ 완료 | 100% |
| Phase 6: 상품-템플릿셋 연동 | ✅ 완료 | 100% |
| Phase 7: Admin 기능 확장 | ❌ 미시작 | 0% |
| Phase 8: 배포 | ❌ 미시작 | 0% |

**전체 진행률: 약 85%**

## 다음 작업 우선순위

1. **Admin 기능 확장** (Phase 7)
   - 라이브러리 에셋 확장 (도형, 사진틀, 계층형 카테고리)
   - 편집데이터관리 페이지
   - 사이드바 메뉴 구조 개편

2. **마이페이지 편집 보관함** (docs/DEVELOPMENT_PLAN.md Phase 5 참조)
   - `bookmoa/front/mypage/edit_sessions.php` 구현
   - `bookmoa/front/mypage/edit_session_detail.php` 구현
   - 세션 목록 조회 및 재개 기능

3. **프로덕션 배포** (Phase 8)
   - 프로덕션 환경변수 설정
   - CDN 설정
   - SSL 인증서
   - 로깅 및 모니터링 구축

## 구현된 파일 목록 (Phase 5.5)

### bookmoa/front/storige/
- `file_upload.php` - 파일 업로드 UI (드래그 앤 드롭 지원)
- `validate.php` - 검증 진행 화면 (폴링 방식)
- `validation_result.php` - 검증 결과 화면
- `auto_convert.php` - 자동 변환 미리보기 (Before/After)
- `storige_common.php` - 공통 함수 (검증, 파일정보, 템플릿셋 조회 등)
- `ajax/upload_file.php` - 파일 업로드 API
- `ajax/get_job_status.php` - 작업 상태 조회 API

## 구현된 파일 목록 (Phase 6)

### storige/apps/api/src/templates/
- `entities/product-template-set.entity.ts` - 상품-템플릿셋 연결 엔티티
- `product-template-sets.controller.ts` - API 컨트롤러
- `product-template-sets.service.ts` - 비즈니스 로직 (폴백 조회 포함)
- `dto/product-template-set.dto.ts` - DTO 정의

### storige/apps/admin/src/
- `pages/ProductTemplateSets/ProductTemplateSetList.tsx` - Admin 연결 관리 UI
- `api/product-template-sets.ts` - Admin API 클라이언트
- `api/bookmoa.ts` - 북모아 카테고리 API 클라이언트

### bookmoa/front/storige/
- `storige_common.php` - `storige_get_template_sets()` 헬퍼 함수
- `edit.php` - 템플릿셋 목록 조회 및 에디터 전달
