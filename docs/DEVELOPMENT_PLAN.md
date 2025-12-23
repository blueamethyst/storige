# Storige 개발 계획서

> 기준: EDITOR.md, ADMIN_SCREENS.md, EDITOR_SCREENS.md

---

## 현재 상태 요약

| 영역 | 구현율 | 상태 |
|------|--------|------|
| API 백엔드 | 98% | Phase 2 완료 - 템플릿/템플릿셋 연관 관리, 템플릿 교체 API, 저장 검증 API |
| 에디터 프론트엔드 | 95% | Phase 4 완료 - 책등편집, 잠금/권한, 읽기전용, 에러처리 구현 |
| Canvas Core | 95% | Phase 6 완료 - 21개 플러그인, 사용자 요소 보존, 잠금 플러그인 추가 |
| 관리자 대시보드 | 95% | Phase 5 완료 - 템플릿셋관리, 상품관리, 편집검토, 상품-템플릿셋 연결 구현 |
| Worker | 100% | Phase 5.5 완료 - Worker 상태/진행률 표시, 결과 확인 UI |
| 타입 정의 | 95% | Phase 1 완료, 책등/권한 타입 포함 |
| 외부 시스템 연동 | 100% | Phase 8 완료 - PHP 임베딩, 토큰 우선순위 로직, 공개 API |
| 북모아 상품 연동 | 100% | Phase 9 완료 - 상품-템플릿셋 1:N 연결, 카테고리 자동완성, 외부 API |
| Docker 개발환경 | 100% | Phase 10 완료 - Apache 환경, 원격 DB 연결, 개발 모드 테스트 |

---

## Phase 1: 타입 및 데이터 구조 정비

**목표**: 기획서의 데이터 구조를 코드에 반영

### 1.1 타입 정의 추가 (`packages/types`)

```
packages/types/src/
├── template.ts      # 템플릿 관련 타입 강화
├── template-set.ts  # 템플릿셋 타입 추가
├── editor.ts        # 에디터 상태 타입
└── spine.ts         # 책등 관련 타입
```

**작업 항목**:

- [x] `TemplateType` 열거형 추가 (`wing` | `cover` | `spine` | `page`)
- [x] `TemplateSetType` 열거형 추가 (`book` | `leaflet`)
- [x] `TemplateRef` 인터페이스 추가 (templateId, required)
- [x] `EditStatus` 열거형 추가 (`draft` | `review` | `submitted`)
- [x] `PaperType` 종이 종류 타입 추가
- [x] `BindingType` 제본 방식 타입 추가
- [x] `SpineConfig` 책등 설정 타입 추가
- [x] `SpineCalculationResult` 및 `calculateSpineWidth` 함수 추가
- [x] `PAPER_THICKNESS`, `BINDING_MARGIN`, `BINDING_CONSTRAINTS` 상수 추가
- [x] `UserPermissions` 및 `ROLE_PERMISSIONS` 권한 타입 추가

### 1.2 API Entity 수정 (`apps/api`)

**작업 항목**:

- [x] `Template` 엔티티에 `type` 필드 추가 (wing/cover/spine/page)
- [x] `Template` 엔티티에 `editable`, `deleteable` 필드 추가
- [x] `TemplateSet` 엔티티에 `type` 필드 추가 (book/leaflet)
- [x] `TemplateSet` 엔티티에 `canAddPage`, `pageCountRange` 필드 추가
- [x] `TemplateSetItem`에 `required` 필드 추가
- [x] `EditSession`에 `status` 필드 추가 (draft/review/submitted)
- [x] `EditSession`에 `lockedBy`, `lockedAt` 필드 추가

---

## Phase 2: API 비즈니스 로직 구현

**목표**: 템플릿/템플릿셋 관리 및 편집 세션 API 완성

### 2.1 템플릿 모듈 강화 (`apps/api/src/templates`)

**작업 항목**:

- [x] 템플릿 타입별 필터링 API (목록에서 타입 표시 및 필터 구현)
- [x] 템플릿 복제 API (`POST /templates/:id/copy`)
- [x] 소프트 삭제 구현 (`isDeleted` 플래그 사용)
- [x] 템플릿 코드 자동 생성 (`TMPL-XXXXXXXX` 형식)
- [x] 편집 코드 자동 생성 및 수정 (`EDIT-XXXXXXXX` 형식)
- [x] 편집 코드 중복 검사 API (`GET /templates/check-edit-code/:editCode`)
- [x] 삭제 시 템플릿셋 연관 확인 로직 (`templates.service.ts`, `templates.controller.ts`)
  - 템플릿 사용 중인 템플릿셋 조회 API (`GET /templates/:id/template-sets`)
  - 삭제 시 사용 중인 템플릿셋 확인 및 경고
  - force 옵션으로 강제 삭제 지원 (템플릿셋에서 참조 자동 제거)

### 2.2 템플릿셋 모듈 (`apps/api/src/templates`)

> 참고: 템플릿셋은 templates 모듈 내에 통합 구현됨

```
apps/api/src/templates/
├── template-sets.controller.ts  ✅
├── template-sets.service.ts     ✅
├── dto/
│   └── template-set.dto.ts      ✅
└── entities/
    └── template-set.entity.ts   ✅
```

**작업 항목**:

- [x] 템플릿셋 CRUD API
- [x] 템플릿셋 타입/판형 필터링
- [x] 템플릿 구성 관리 (순서 포함)
- [x] 템플릿 추가/제거/순서변경 API
- [x] 내지 수량 범위 검증 로직
- [x] 소프트 삭제 및 연관 상품 확인

### 2.3 상품-템플릿셋 연결 (`apps/api/src/products`)

**작업 항목**:

- [x] Product 엔티티에 templateSetId 필드 및 ManyToOne 관계 추가
- [x] 상품에 템플릿셋 연결/해제 API (`products.controller.ts`)
- [x] 연결된 템플릿셋 목록 조회 API (`template-sets.service.ts`의 `getProducts`)

### 2.4 편집 세션 모듈 (`apps/api/src/editor`)

> 참고: 편집 세션 모듈은 editor 모듈 내에 구현됨

```
apps/api/src/editor/
├── editor.module.ts           ✅
├── editor.controller.ts       ✅
├── editor.service.ts          ✅
├── dto/
│   └── edit-session.dto.ts    ✅
└── entities/
    └── edit-session.entity.ts ✅
```

**작업 항목**:

- [x] 편집 세션 생성 API (템플릿셋 기반)
- [x] 캔버스 데이터 저장 API (자동저장용)
- [x] 페이지 추가/삭제/순서변경 API
- [x] 템플릿 교체 API (사용자 요소 보존) (`editor.service.ts`의 `replaceTemplate`, `replaceTemplateSet`)
  - 특정 페이지 또는 같은 타입 전체 페이지 교체
  - isUserAdded: true 요소 보존
- [x] 편집 잠금 획득/해제 API (30분 만료)
- [x] 상태 변경 API (draft → review → submitted)
- [x] 편집 이력 기록 (EditHistory 엔티티)
- [x] 저장 검증 API (`GET /editor/sessions/:id/validate`)
  - 필수 페이지 누락 확인
  - 내지 수량 범위 검증
  - 빈 페이지 경고

### 2.5 책등 계산 API (`apps/api/src/products`)

> 참고: 책등 계산 API는 products 모듈 내에 구현됨

```
apps/api/src/products/
├── spine.controller.ts    ✅
├── spine.service.ts       ✅
└── dto/
    └── spine.dto.ts       ✅
```

**작업 항목**:

- [x] 책등 폭 계산 API (`POST /products/spine/calculate`)
- [x] 용지 종류 목록 API (`GET /products/spine/paper-types`)
- [x] 제본 방식 목록 API (`GET /products/spine/binding-types`)
- [x] 커스텀 두께/여유분 지원
- [x] 제본 제한 조건 경고 (최소/최대 페이지, 배수)

---

## Phase 3: 에디터 핵심 기능 구현

**목표**: 페이지 관리, 템플릿 교체, 자동저장 구현

### 3.1 상태 관리 강화 (`apps/editor/src/stores`) ✅

**작업 항목**:

- [x] `useEditorStore` 신규 생성 (템플릿셋/페이지 상태)
- [x] `useSaveStore` 신규 생성 (저장 상태 관리)
- [x] 페이지 목록 상태 관리
- [x] 현재 페이지 인덱스 관리
- [x] 편집 상태 (draft/review/submitted) 관리
- [x] 저장 상태 (saved/saving/failed) 관리

### 3.2 API 연동 (`apps/editor/src/api`) ✅

**작업 항목**:

- [x] 편집 세션 API 클라이언트
- [x] 템플릿/템플릿셋 API 클라이언트
- [x] 자동저장 로직 구현 (debounce)
- [x] 로컬 임시저장 (localStorage) 연동
- [x] 네트워크 복구 시 자동 동기화

### 3.3 페이지 관리 UI (`apps/editor/src/components`) ✅

```
apps/editor/src/components/
├── PagePanel/
│   ├── PagePanel.tsx           # 페이지 패널 컨테이너
│   ├── PageList.tsx            # 페이지 목록
│   ├── PageItem.tsx            # 페이지 아이템 (드래그 가능)
│   ├── PageThumbnail.tsx       # 썸네일
│   └── PageActions.tsx         # 추가/삭제 버튼
├── PageNavigation/
│   ├── PageNavigation.tsx      # 이전/다음 버튼
│   └── PageCounter.tsx         # 페이지 카운터
└── modals/
    ├── PageDeleteModal.tsx     # 삭제 확인
    └── PageLimitModal.tsx      # 수량 제한 알림
```

**작업 항목**:

- [x] 페이지 패널 컴포넌트
- [x] 페이지 썸네일 표시 (캔버스 스크린샷)
- [x] 페이지 타입 표시 (wing/cover/spine/page)
- [x] 내지(page) 드래그 순서 변경 (react-dnd)
- [x] 페이지 추가/삭제 버튼
- [x] 이전/다음 네비게이션
- [x] 삭제 확인 모달
- [x] 수량 제한 알림 모달

### 3.4 템플릿 교체 UI ✅

```
apps/editor/src/components/
├── TemplatePanel/
│   ├── TemplatePanel.tsx       # 템플릿 패널
│   ├── TemplateSetTab.tsx      # 템플릿셋 탭
│   ├── SingleTemplateTab.tsx   # 낱장 탭
│   ├── TemplateCard.tsx        # 템플릿 카드
│   └── TemplateSetCard.tsx     # 템플릿셋 카드
└── modals/
    └── TemplateReplaceModal.tsx # 교체 확인 모달
```

**작업 항목**:

- [x] 템플릿 패널 (탭: 템플릿셋/낱장)
- [x] 템플릿셋 목록 (같은 타입/판형 필터)
- [x] 낱장 템플릿 목록 (현재 페이지 타입 필터)
- [x] 템플릿셋 교체 확인 모달
- [x] 낱장 교체 확인 모달
- [x] 사용자 요소 보존 로직 연동

### 3.5 헤더 기능 강화 ✅

**작업 항목**:

- [x] 저장 상태 표시 (저장됨/저장중/실패)
- [x] 작업명 편집 기능
- [x] 편집완료 버튼 및 확인 모달
- [x] 불러오기 기능

---

## Phase 4: 에디터 고급 기능 구현 ✅

**목표**: 책등 편집, 권한 관리, 동시 편집 방지

### 4.1 책등 편집 기능 ✅

```
apps/editor/src/components/
└── SpineEditor/
    ├── SpineEditor.tsx         # 책등 편집 화면
    ├── SpinePreview.tsx        # 미리보기 (표지+책등+표지)
    ├── SpineSettings.tsx       # 설정 패널
    └── SpineCalculator.tsx     # 폭 계산 결과
```

**작업 항목**:

- [x] 책등 편집 뷰 컴포넌트
- [x] 앞표지-책등-뒤표지 통합 미리보기
- [x] 종이 종류 선택
- [x] 제본 방식 선택
- [x] 책등 폭 자동 계산
- [x] 블리드/안전영역 가이드라인

### 4.2 권한 및 잠금 ✅

**작업 항목**:

- [x] 요소 잠금/해제 UI
- [x] 잠금 요소 편집 불가 처리
- [x] 관리자/디자이너 잠금 해제 권한
- [x] 편집 상태별 UI 제어 (draft/review/submitted)

### 4.3 동시 편집 방지 ✅

**작업 항목**:

- [x] 편집 잠금 확인 로직
- [x] 잠금 모달 (읽기전용 옵션)
- [x] 읽기전용 모드 UI
- [x] 잠금 하트비트 (주기적 갱신)

### 4.4 에러 처리 ✅

**작업 항목**:

- [x] 저장 실패 모달 (재시도/나중에)
- [x] 템플릿 로드 실패 화면
- [x] 이미지 업로드 실패 처리
- [x] 페이지 이탈 경고 (저장 실패 시)

---

## Phase 5: 관리자 대시보드 구현 ✅

**목표**: 템플릿셋 관리, 상품 연결, 편집 검토 기능

### 5.1 템플릿 관리 강화 (`apps/admin/src/pages/templates`) ✅

**작업 항목**:

- [x] 템플릿 생성/편집 폼 (에디터 iframe 연동)
- [x] 템플릿 타입 선택 (wing/cover/spine/page) - 목록에서 타입 표시 및 필터
- [x] 썸네일 자동 생성 및 표시 (로드 실패 시 placeholder 표시)
- [x] 에디터 연동 (디자인 편집) - iframe 기반 TemplateEditor
- [x] 템플릿 복제 기능
- [x] 템플릿 삭제 (소프트 삭제)
- [x] 활성화 상태 토글 (Switch 컴포넌트)
- [x] 편집 코드 인라인 수정 (중복 검사 포함)
- [x] 템플릿 코드 자동 생성 표시
- [x] 삭제 확인 모달 (연관 템플릿셋 표시)

### 5.2 템플릿셋 관리 (`apps/admin/src/pages/template-sets`) ✅

```
apps/admin/src/pages/template-sets/
├── TemplateSetList.tsx         # 목록
├── TemplateSetForm.tsx         # 생성/편집 폼
├── TemplateComposition.tsx     # 템플릿 구성 (드래그 정렬)
├── TemplateAddModal.tsx        # 템플릿 추가 모달
└── TemplateSetDeleteModal.tsx  # 삭제 확인 모달
```

**작업 항목**:

- [x] 템플릿셋 목록 페이지 (타입/판형 필터)
- [x] 템플릿셋 생성/편집 폼
- [x] 템플릿 구성 UI (드래그로 순서 변경)
- [x] 템플릿 추가 모달 (같은 판형 필터)
- [x] 내지 설정 (추가 허용, 수량 범위)
- [x] 필수 페이지 설정
- [x] 삭제 확인 모달 (연관 상품 표시)

### 5.3 상품 관리 강화 (`apps/admin/src/pages/products`) ✅

**작업 항목**:

- [x] 상품 목록 페이지
- [x] 상품 편집 - 템플릿셋 연결 탭
- [x] 템플릿셋 연결/해제 모달

### 5.4 편집 검토 (`apps/admin/src/pages/reviews`) ✅

```
apps/admin/src/pages/reviews/
├── ReviewList.tsx              # 검토 목록
├── ReviewDetail.tsx            # 검토 상세
├── PagePreview.tsx             # 페이지 미리보기
├── EditHistory.tsx             # 수정 이력
└── RejectModal.tsx             # 반려 모달
```

**작업 항목**:

- [x] 편집 검토 목록 (상태별 필터)
- [x] 검토 상세 페이지
- [x] 페이지 썸네일 미리보기
- [x] 페이지 확대 보기
- [x] 수정 이력 표시
- [x] 에디터에서 열기 버튼
- [x] 승인/반려 처리
- [x] 반려 사유 입력 모달

---

## Phase 6: Canvas Core 보완 ✅

**목표**: 기획서 요구사항에 맞는 플러그인 추가

### 6.1 페이지 관리 ✅

> 참고: 다중 캔버스 관리는 에디터 레벨(useEditorStore)에서 처리됨

**작업 항목**:

- [x] 다중 캔버스 관리 (에디터 스토어에서 페이지별 상태 관리)
- [x] 페이지 전환 시 상태 저장/복원 (useEditorStore.setCurrentPageIndex)
- [x] 페이지 간 요소 복사 (CopyPlugin 활용)

### 6.2 템플릿 플러그인 강화 ✅

**작업 항목**:

- [x] 사용자 요소 식별 (`isUserAdded` 플래그)
- [x] 템플릿 교체 시 사용자 요소 보존 로직 (`replaceTemplate` 메서드)
- [x] 템플릿 요소 vs 사용자 요소 구분 (`isTemplateElement`, `isUserAddedElement`)

### 6.3 잠금 플러그인 ✅

> 참고: LockPlugin 신규 생성 (`packages/canvas-core/src/plugins/LockPlugin.ts`)

**작업 항목**:

- [x] 요소 잠금/해제 기능 (권한 레벨별: user/designer/admin/system)
- [x] 잠금 요소 선택/편집 차단
- [x] 권한별 잠금 해제 (UserRole에 따른 해제 가능 레벨 제어)

### 6.4 가이드라인 플러그인 강화 ✅

> 참고: 블리드/안전영역은 WorkspacePlugin에서 구현됨

**작업 항목**:

- [x] 블리드 영역 시각화 (cutBorder - 재단선)
- [x] 안전 영역 시각화 (safeSizeBorder - 안전 영역)
- [x] 책등 중심선 표시 (RulerPlugin centerGuidelineH/V)

---

## Phase 7: 통합 테스트 및 최적화

**목표**: 품질 보증 및 성능 최적화

### 7.1 테스트 ✅

**작업 항목**:

- [x] API 단위 테스트 (Jest) - 55개 테스트 완료
  - TemplatesService (12개 테스트)
  - TemplateSetsService (22개 테스트)
  - ProductsService (11개 테스트)
  - EditorService (10개 테스트)
- [x] API 통합 테스트 (E2E) - 21개 테스트 완료
  - templates.e2e-spec.ts (템플릿 CRUD)
  - template-sets.e2e-spec.ts (템플릿셋 관리)
- [x] 에디터 컴포넌트 테스트 (Vitest) - 84개 테스트 완료
  - button.test.tsx (8개 테스트)
  - useSaveStore.test.ts (21개 테스트)
  - useEditorStore.test.ts (33개 테스트)
  - SaveStatus.test.tsx (22개 테스트)
- [x] E2E 테스트 (Playwright) - 설정 완료 + 수동 검증
  - editor.spec.ts (에디터 로딩, 네비게이션, 반응형)
  - playwright.config.ts
- [x] 캔버스 플러그인 테스트 (Vitest) - 158개 테스트 완료
  - LockPlugin.test.ts (33개 테스트) - 권한 기반 잠금/해제
  - HistoryPlugin.test.ts (32개 테스트) - Undo/Redo 히스토리
  - TemplatePlugin.test.ts (31개 테스트) - 템플릿 요소 관리
  - WorkspacePlugin.test.ts (36개 테스트) - 워크스페이스/줌/경계선
  - FontPlugin.test.ts (23개 테스트) - 폰트 위치 계산
  - canvas.test.ts (3개 테스트) - 캔버스 유틸리티

### 7.2 성능 최적화

**작업 항목**:

- [ ] 캔버스 렌더링 최적화
- [ ] 이미지 지연 로딩
- [ ] 번들 사이즈 최적화
- [ ] API 응답 캐싱

### 7.3 문서화

**작업 항목**:

- [ ] API 문서 (Swagger)
- [ ] 컴포넌트 문서 (Storybook)
- [ ] 배포 가이드

---

## 작업 우선순위 및 의존성

```
Phase 1 (타입 정의)
    │
    ├──► Phase 2 (API 구현)
    │       │
    │       ├──► Phase 3 (에디터 핵심)
    │       │       │
    │       │       └──► Phase 4 (에디터 고급)
    │       │
    │       └──► Phase 5 (관리자)
    │
    └──► Phase 6 (Canvas Core)
                │
                └──► Phase 7 (테스트/최적화)
```

---

## 상세 작업 목록 (체크리스트)

### Phase 1: 타입 정의 (1주) ✅

| 작업 | 파일 | 상태 |
|------|------|------|
| TemplateType 열거형 | packages/types/src/index.ts | [x] |
| TemplateSetType 열거형 | packages/types/src/index.ts | [x] |
| TemplateRef 인터페이스 | packages/types/src/index.ts | [x] |
| EditStatus 열거형 | packages/types/src/index.ts | [x] |
| PaperType 타입 | packages/types/src/index.ts | [x] |
| BindingType 타입 | packages/types/src/index.ts | [x] |
| SpineConfig 인터페이스 | packages/types/src/index.ts | [x] |
| calculateSpineWidth 함수 | packages/types/src/index.ts | [x] |
| UserPermissions 타입 | packages/types/src/index.ts | [x] |

### Phase 2: API 구현 (2-3주)

| 작업 | 모듈 | 상태 |
|------|------|------|
| Template entity 수정 | templates | [x] |
| 템플릿 코드/편집코드 자동생성 | templates | [x] |
| 편집코드 중복검사 API | templates | [x] |
| 템플릿 소프트삭제 | templates | [x] |
| 템플릿 복제 API | templates | [x] |
| TemplateSet entity 수정 | templates | [x] |
| TemplateSet CRUD | templates | [x] |
| 템플릿 구성 관리 API | templates | [x] |
| 상품-템플릿셋 연결 | products | [x] |
| 편집 세션 CRUD | editor | [x] |
| 페이지 관리 API | editor | [x] |
| 템플릿 교체 API | editor | [x] |
| 편집 잠금 API | editor | [x] |
| 상태 변경 API | editor | [x] |
| 책등 계산 API | products | [x] |

### Phase 3: 에디터 핵심 (2-3주) ✅

| 작업 | 컴포넌트 | 상태 |
|------|----------|------|
| useEditorStore | stores | [x] |
| useSaveStore | stores | [x] |
| 세션 API 클라이언트 | api | [x] |
| 자동저장 로직 | hooks | [x] |
| PagePanel | components | [x] |
| PageItem (드래그) | components | [x] |
| PageNavigation | components | [x] |
| 페이지 삭제 모달 | modals | [x] |
| 수량 제한 모달 | modals | [x] |
| TemplatePanel | components | [x] |
| 템플릿셋 교체 모달 | modals | [x] |
| 저장 상태 표시 | EditorHeader | [x] |
| 편집완료 모달 | modals | [x] |

### Phase 4: 에디터 고급 (2주) ✅

| 작업 | 컴포넌트 | 상태 |
|------|----------|------|
| SpineEditor | components | [x] |
| SpinePreview | components | [x] |
| SpineSettings | components | [x] |
| 요소 잠금 UI | ControlBar | [x] |
| 잠금 로직 | canvas-core | [x] |
| 편집 잠금 확인 | hooks | [x] |
| 읽기전용 모드 | EditorView | [x] |
| 저장 실패 모달 | modals | [x] |

### Phase 5: 관리자 (2-3주) ✅

| 작업 | 페이지 | 상태 |
|------|--------|------|
| 템플릿 목록 강화 | templates | [x] |
| 템플릿 타입 표시/필터 | templates | [x] |
| 템플릿 활성화 토글 | templates | [x] |
| 편집코드 인라인 수정 | templates | [x] |
| 썸네일 표시 (placeholder 포함) | templates | [x] |
| 템플릿 에디터 (iframe) | templates | [x] |
| 템플릿셋 목록 | template-sets | [x] |
| 템플릿셋 폼 | template-sets | [x] |
| 템플릿 구성 UI | template-sets | [x] |
| 상품 목록 | products | [x] |
| 템플릿셋 연결 | products | [x] |
| 검토 목록 | reviews | [x] |
| 검토 상세 | reviews | [x] |
| 반려 모달 | reviews | [x] |

### Phase 6: Canvas Core (1-2주) ✅

| 작업 | 플러그인 | 상태 |
|------|----------|------|
| 다중 캔버스 관리 | useEditorStore | [x] |
| 사용자 요소 보존 | TemplatePlugin | [x] |
| 잠금 플러그인 | LockPlugin | [x] |
| 블리드 시각화 | WorkspacePlugin | [x] |

### Phase 7: 테스트 (1-2주) ✅

| 작업 | 대상 | 상태 |
|------|------|------|
| API 단위 테스트 (55개) | api | [x] |
| API 통합 테스트 (21개) | api | [x] |
| 컴포넌트 테스트 (84개) | editor | [x] |
| E2E 테스트 (Playwright) | editor | [x] |
| 캔버스 플러그인 테스트 (158개) | canvas-core | [x] |
| 성능 최적화 | 전체 | [ ] |

---

## 예상 일정

| Phase | 기간 | 누적 |
|-------|------|------|
| Phase 1 | 1주 | 1주 |
| Phase 2 | 2-3주 | 3-4주 |
| Phase 3 | 2-3주 | 5-7주 |
| Phase 4 | 2주 | 7-9주 |
| Phase 5 | 2-3주 | 9-12주 |
| Phase 6 | 1-2주 | 10-14주 |
| Phase 7 | 1-2주 | 11-16주 |

**총 예상 기간**: 11-16주 (3-4개월)

---

## 다음 단계

1. **즉시 시작**: Phase 1 타입 정의
2. **우선 구현**: Phase 2 API 중 템플릿셋 CRUD
3. **병렬 진행**: Phase 3 에디터와 Phase 5 관리자 동시 개발 가능

---

## Phase 8: 외부 시스템 연동 (PHP 쇼핑몰 등)

**목표**: 외부 PHP 쇼핑몰 등에서 에디터를 임베딩하여 사용

### 8.1 에디터 임베딩 번들

**파일**: `apps/editor/src/embed.tsx`, `apps/editor/vite.embed.config.ts`

```bash
# 임베딩용 번들 빌드
pnpm --filter @storige/editor build:embed
# 출력: apps/editor/dist-embed/editor-bundle.iife.js
```

**번들 사용 예시**:
```html
<div id="editor-root"></div>
<script src="/assets/js/editor-bundle.iife.js"></script>
<script>
  const editor = window.StorigeEditor.create({
    templateSetId: 'ts-001',
    productId: 'PROD-001',
    token: 'jwt-token-from-php',
    apiBaseUrl: 'http://localhost:4000/api',
    onComplete: (result) => console.log('완료:', result),
    onError: (error) => console.error('에러:', error)
  });
  editor.mount('editor-root');
</script>
```

### 8.2 토큰 연동 로직

**토큰 우선순위**:
1. **파라미터 토큰** (`token` 옵션) - 최우선 사용
2. **localStorage** (`auth_token`) - 파라미터 없을 때 폴백
3. **에러 발생** - 둘 다 없으면 `onError` 콜백 호출

**구현 상세** (`embed.tsx`):
```typescript
// 토큰 우선순위 처리
let effectiveToken: string | null = null

if (token) {
  // 1. 파라미터로 전달된 토큰 우선 사용
  effectiveToken = token
  localStorage.setItem('auth_token', token)
} else {
  // 2. localStorage에서 토큰 확인
  effectiveToken = localStorage.getItem('auth_token')
}

// 3. 토큰이 없으면 에러 발생
if (!effectiveToken) {
  const error = new Error('접근 권한이 없습니다.')
  onError?.(error)
  return
}
```

### 8.3 PHP 연동 예시

**JWT 토큰 발급** (`config.php`):
```php
function getEditorToken($userId) {
    $secret = getenv('JWT_SECRET') ?: 'your-secret-key';
    $payload = [
        'sub' => $userId,
        'iat' => time(),
        'exp' => time() + 7200,  // 2시간
    ];
    return generateJWT($payload, $secret);
}
```

**에디터 페이지** (`editor.php`):
```php
$token = getEditorToken($_SESSION['user_id']);
$apiBaseUrl = 'http://localhost:4000/api';  // 브라우저에서 접근하는 URL
?>
<script>
const config = {
    templateSetId: '<?= $templateSetId ?>',
    productId: '<?= $productId ?>',
    token: '<?= $token ?>',
    apiBaseUrl: '<?= $apiBaseUrl ?>',
    onReady: () => console.log('에디터 준비 완료'),
    onComplete: (result) => {
        // 편집 완료 후 콜백 페이지로 이동
        location.href = '/callback.php?sessionId=' + result.sessionId;
    },
    onError: (error) => {
        alert('에러: ' + error.message);
    }
};
window.StorigeEditor.create(config).mount('editor-root');
</script>
```

### 8.4 API 인증

**모든 API는 JWT 토큰 인증 필요** (`@ApiBearerAuth()` 데코레이터 적용):

템플릿셋 API:
- `GET /api/template-sets` - 템플릿셋 목록
- `GET /api/template-sets/:id` - 템플릿셋 상세
- `GET /api/template-sets/:id/with-templates` - 템플릿 포함 상세
- `GET /api/template-sets/compatible` - 호환 템플릿셋 조회
- `GET /api/template-sets/:id/products` - 연결된 상품 목록
- `POST /api/template-sets` - 템플릿셋 생성
- `PUT /api/template-sets/:id` - 템플릿셋 수정
- `DELETE /api/template-sets/:id` - 템플릿셋 삭제

편집 세션 API:
- `POST /api/editor/sessions` - 편집 세션 생성
- `PUT /api/editor/sessions/:id` - 편집 세션 저장
- `GET /api/editor/sessions/:id` - 편집 세션 조회

> **중요**: PHP 쇼핑몰에서 에디터 사용 시 반드시 유효한 JWT 토큰을 `token` 파라미터로 전달해야 합니다.

### 8.5 EditorConfig 인터페이스

```typescript
interface EditorConfig {
  templateSetId: string       // 템플릿셋 ID (필수)
  productId: string           // 상품 ID (필수)
  token: string               // JWT 인증 토큰 (필수 - 우선순위 1)
  apiBaseUrl?: string         // API 기본 URL
  sessionId?: string          // 기존 편집 세션 ID (재편집시)
  options?: {
    pages?: number            // 초기 페이지 수
    coverWing?: { front: number; back: number }  // 날개
    paper?: { type: string; weight: number }     // 용지
  }
  onReady?: () => void                          // 준비 완료
  onComplete?: (result: EditorResult) => void   // 편집 완료
  onCancel?: () => void                         // 편집 취소
  onSave?: (result: SaveResult) => void         // 저장 완료
  onError?: (error: Error) => void              // 에러 발생
}
```

### 8.6 작업 항목

| 작업 | 파일 | 상태 |
|------|------|------|
| 임베딩 번들 빌드 설정 | vite.embed.config.ts | [x] |
| 임베딩 진입점 컴포넌트 | embed.tsx | [x] |
| 토큰 우선순위 로직 | embed.tsx | [x] |
| API 클라이언트 baseUrl 설정 | api/client.ts | [x] |
| 템플릿셋 공개 API | template-sets.controller.ts | [x] |
| PHP 테스트 환경 | test-php/ | [x] |
| 콜백 처리 예시 | test-php/php/callback.php | [x] |

---

## 부록: 파일 구조 변경 계획

### packages/types/src/

```
index.ts
├── user.ts           (기존)
├── template.ts       (수정 필요)
├── template-set.ts   (신규)
├── editor.ts         (수정 필요)
├── spine.ts          (신규)
├── canvas.ts         (기존)
└── worker.ts         (기존)
```

### apps/api/src/

```
├── auth/             (기존)
├── templates/        (수정 필요)
├── template-sets/    (신규)
├── products/         (수정 필요)
├── editor-sessions/  (수정 필요)
├── spine/            (신규)
├── library/          (기존)
├── storage/          (기존)
└── worker-jobs/      (기존)
```

### apps/editor/src/

```
├── api/
│   ├── index.ts      (기존)
│   ├── sessions.ts   (신규)
│   └── templates.ts  (신규)
├── stores/
│   ├── useAppStore.ts    (기존)
│   ├── useEditorStore.ts (신규)
│   └── useSaveStore.ts   (신규)
├── components/
│   ├── editor/           (기존)
│   ├── PagePanel/        (신규)
│   ├── TemplatePanel/    (신규)
│   ├── SpineEditor/      (신규)
│   └── modals/           (신규)
└── hooks/
    ├── useAutoSave.ts    (신규)
    └── useEditLock.ts    (신규)
```

### apps/admin/src/pages/

```
├── dashboard/        (기존)
├── templates/        (수정 필요)
├── template-sets/    (신규)
├── products/         (신규)
├── reviews/          (신규)
├── categories/       (기존)
└── library/          (기존)
```
