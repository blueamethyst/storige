# WowMall 플랫폼 PRD (Product Requirements Document)

**문서 버전**: 1.0
**작성일**: 2025-12-01
**상태**: 현행 시스템 기준

---

## 1. 제품 개요

### 1.1 제품명
**WowMall** - 멀티테넌트 이커머스 플랫폼

### 1.2 제품 비전
WowPress 인쇄 서비스와 연동하여 판매자(파트너)가 자신만의 온라인 상점을 개설하고, 고객에게 맞춤형 인쇄 상품을 제공할 수 있는 **헤드리스 커머스 플랫폼**

### 1.3 핵심 가치 제안
| 사용자 | 가치 제안 |
|--------|-----------|
| **판매자(Partner)** | 코딩 없이 자신만의 온라인 상점 개설, 맞춤형 디자인 템플릿 제공, 효율적인 상품/주문 관리 |
| **고객(Customer)** | 직관적인 디자인 에디터로 맞춤 상품 제작, 다양한 상점에서 쇼핑 경험 |
| **관리자(Admin)** | 플랫폼 전체 운영 및 모니터링, 파트너/상품 관리 |
| **디자이너(Designer)** | 웹 기반 고급 그래픽 에디터로 전문적인 디자인 작업 |

---

## 2. 시스템 아키텍처 요약

### 2.1 기술 스택
| 영역 | 기술 |
|------|------|
| **프론트엔드** | Vue 3, Nuxt 3, TypeScript, Vite, Pinia, Apollo Client |
| **에디터** | Fabric.js, Paper.js, OpenCV.js, Little CMS 2 (WASM) |
| **백엔드** | Kotlin 2.1.10, Spring Boot 3.4.3, WebFlux, Netflix DGS, R2DBC |
| **데이터베이스** | MariaDB (RDS), Redis Cluster |
| **인프라** | AWS EKS, Vercel, CloudFront, S3, ArgoCD |
| **외부 서비스** | WowPress API (인쇄), Nicepay (결제) |

### 2.2 애플리케이션 구성
```
WowMall 플랫폼
├── wowmall-admin     # 관리자 대시보드 (Vue 3 + Vite)
├── wowmall-partner   # 파트너/판매자 포털 (Vue 3 + Vite)
├── wowmall-shop      # 고객용 스토어프론트 (Nuxt 3 + SSR)
├── wowmall-editor    # 그래픽 디자인 에디터 (Vue 3 + Canvas)
└── wowmall-backend   # 백엔드 API 서버 (Kotlin + Spring Boot)
```

---

## 3. 사용자 역할 및 권한

### 3.1 역할 정의
| 역할 | 설명 | 주요 권한 |
|------|------|-----------|
| **SUPER_ADMIN** | 플랫폼 운영 관리자 | 전체 시스템 관리, 모든 스토어 접근, 글로벌 리소스 관리 |
| **SELLER** | 상점 운영 판매자 | 자기 스토어 관리, 상품/주문 관리, 템플릿 생성 |
| **CUSTOMER** | 일반 고객 | 상품 탐색 및 구매, 디자인 에디터 사용, 주문 조회 |

### 3.2 멀티테넌트 데이터 격리
- 모든 도메인 엔티티는 `storeId` 포함
- 판매자는 자기 스토어 데이터만 접근 가능
- 고객은 현재 방문 중인 스토어 데이터만 조회 가능

---

## 4. 핵심 도메인 및 기능

### 4.1 인증 (Auth Domain)
**목적**: 사용자 인증 및 권한 관리

| 기능 | 설명 |
|------|------|
| JWT 인증 | 토큰 기반 인증 시스템 |
| 사용자 관리 | 회원가입, 로그인, 프로필 관리 |
| 비밀번호 재설정 | 이메일 기반 비밀번호 복구 |
| 역할 기반 접근 제어 | RBAC 기반 권한 관리 |

### 4.2 카탈로그 (Catalog Domain)
**목적**: 상품 및 카테고리 관리

| 기능 | 설명 | 관련 Spec |
|------|------|-----------|
| 상품 관리 | 상품 CRUD, WowPress 연동 | - |
| 카테고리 관리 | 3단계 계층 구조 지원 | `004-support-category-level` |
| 카테고리 정렬 | 드래그앤드롭 순서 변경 | `342-category-drag-drop` |
| 상품 검색 | 부분 키워드 검색 (contains) | `002-wowmall-partner-equals` |
| 상품 일괄 삭제 | 최대 30개 일괄 삭제, 부분 성공 지원 | `003-partner-delete-product`, `002-add-delete-product` |

**카테고리 구조**:
- Level 1: 대분류 (예: 인쇄물)
- Level 2: 중분류 (예: 명함)
- Level 3: 소분류 (예: 일반명함)

### 4.3 주문 (Order Domain)
**목적**: 주문 처리 및 이행

| 기능 | 설명 | 관련 Spec |
|------|------|-----------|
| 주문 생성/조회 | 장바구니 → 주문 → 결제 흐름 | - |
| 파일 다운로드 | 주문 첨부 파일 다운로드 | `368-seller-download-order` |
| 파일 업로드 | 검수 후 수정 파일 업로드 | `367-seller-file-management`, `710-add-lineitem-media` |
| WowPress 연동 | 인쇄 주문 전송 및 상태 동기화 | - |

**파일 관리 요구사항**:
- 모든 파일 유형 지원 (제한 없음)
- 파일 크기 제한 없음
- Presigned URL 기반 접근 제어
- 실패 시 즉시 재시도 허용

### 4.4 결제 (Payment Domain)
**목적**: 결제 처리

| 기능 | 설명 |
|------|------|
| Nicepay 연동 | 결제 승인/취소 처리 |
| 결제 상태 관리 | 결제 성공/실패 상태 추적 |

### 4.5 상점 관리 (Store Domain)
**목적**: 멀티테넌트 상점 관리

| 기능 | 설명 |
|------|------|
| 상점 생성/설정 | 파트너별 상점 개설 및 설정 |
| 테마/브랜딩 | 상점별 커스텀 테마 적용 |
| 도메인 관리 | 서브도메인 또는 커스텀 도메인 |

### 4.6 고객 지원 (Support Domain)
**목적**: 고객 문의 및 FAQ 관리

| 기능 | 설명 | 관련 Spec |
|------|------|-----------|
| 티켓 관리 | 문의 접수 및 답변 | `001-user-story-wowmall`, `001-add-updateticketreply-deleteticketreply` |
| 댓글 수정/삭제 | 관리자 댓글 편집, Soft Delete | `001-user-story-wowmall` |
| FAQ 리치 에디터 | Quill 기반 WYSIWYG 편집기 | `345-faq-image`, `003-faq-content-quill` |

**FAQ 요구사항**:
- 최대 10,000자 콘텐츠
- FAQ당 최대 5개 이미지 (각 2MB 제한)
- 지원 형식: JPG, PNG, GIF, WebP
- XSS 방지를 위한 Delta 형식 검증

### 4.7 에디터 (Editor Domain)
**목적**: 그래픽 디자인 에디터

| 기능 | 설명 | 관련 Spec |
|------|------|-----------|
| 텍스트 편집 | 폰트, 크기, 정렬, 스타일 | - |
| 텍스트 벡터화 | 완벽한 위치 정확도 보장 | `001-perfect-text-vectorization` |
| 이미지 처리 | 배경 제거, 필터, 효과 | - |
| 색상 관리 | RGB/CMYK 변환 (WASM) | - |
| 템플릿 관리 | 판매자별 커스텀 템플릿 | `723-template-seller-design` |
| PDF 내보내기 | 인쇄용 PDF 생성 | - |

**텍스트 벡터화 요구사항** (spec 001-perfect-text-vectorization):
- 수평/수직 모두 0px 편차 목표 (최대 1px 허용)
- 모든 정렬 모드 지원 (left, center, right)
- 20+ Google 폰트 테스트 통과 필요
- 500자 텍스트 기준 500ms 이내 처리

**판매자 템플릿 권한** (spec 723-template-seller-design):
- 글로벌 템플릿: `storeId = null` (관리자 생성)
- 스토어 템플릿: `storeId = {store_id}` (판매자 생성)
- 판매자는 글로벌 템플릿 조회만 가능, 수정 불가

---

## 5. 주요 기능 상세

### 5.1 상품 일괄 삭제 (Bulk Delete)

**사용자 스토리**:
> 판매자로서, 나는 여러 상품을 선택하여 일괄 삭제할 수 있어야 한다.

**기능 요구사항**:
| ID | 요구사항 |
|----|----------|
| FR-001 | 상품별 체크박스로 개별 선택 가능 |
| FR-002 | 테이블 헤더의 "전체 선택"으로 현재 페이지 전체 선택 |
| FR-003 | 선택된 상품 수 표시 |
| FR-004 | 최소 1개 선택 시 "선택 삭제" 버튼 활성화 |
| FR-005 | 삭제 전 확인 다이얼로그 표시 |
| FR-006 | 부분 성공 지원 - 성공/실패 상세 리포트 |
| FR-007 | 최대 30개 제한 |
| FR-008 | 소유권 검증 - 자기 상품만 삭제 가능 |
| FR-009 | 페이지 이동 시 선택 상태 유지 |
| FR-010 | 100개 상품 기준 5초 이내 완료 |

### 5.2 카테고리 드래그앤드롭 정렬

**사용자 스토리**:
> 상점 파트너로서, 나는 카테고리를 드래그앤드롭으로 재정렬하여 고객에게 적합한 순서로 카탈로그를 구성하고 싶다.

**기능 요구사항**:
| ID | 요구사항 |
|----|----------|
| FR-001 | 카테고리 목록에서 드래그하여 위치 변경 가능 |
| FR-002 | 계층적 부모-자식 관계 유지 |
| FR-003 | 드래그 완료 시 즉시 순서 저장 |
| FR-004 | 드래그 중 시각적 피드백 (드래그 핸들, 드롭 영역) |
| FR-005 | 잘못된 드롭 방지 (부모를 자식 안으로 이동 등) |
| FR-006 | 같은 계층 내에서만 정렬 가능 |
| FR-007 | 낙관적 UI 업데이트 |

### 5.3 티켓 댓글 수정/삭제

**사용자 스토리**:
> 관리자로서, 나는 작성한 댓글을 수정하거나 삭제할 수 있어야 한다.

**기능 요구사항**:
| ID | 요구사항 |
|----|----------|
| FR-001 | 모든 관리자 댓글 수정 가능 |
| FR-002 | 모든 관리자 댓글 삭제 가능 |
| FR-003 | 삭제 전 확인 다이얼로그 |
| FR-004 | 수정 시 원본 생성 시간 유지 |
| FR-005 | "수정됨" 표시 및 수정 시간 표시 |
| FR-006 | 빈 내용 및 길이 제한 검증 |
| FR-007 | 종료된 티켓에서 수정/삭제 차단 |
| FR-008 | Soft Delete - "삭제된 댓글입니다" 표시 |

### 5.4 주문 파일 다운로드

**사용자 스토리**:
> 판매자로서, 고객이 업로드한 파일을 다운로드하여 주문 이행에 필요한 자료에 접근할 수 있어야 한다.

**기능 요구사항**:
| ID | 요구사항 |
|----|----------|
| FR-001 | 주문 관리에서 첨부 파일 목록 표시 |
| FR-002 | 접근 권한 있는 주문의 파일만 다운로드 가능 |
| FR-003 | 파일명, 크기, 업로드 날짜, 유형 메타데이터 표시 |
| FR-004 | Presigned URL 기반 접근 제어 |
| FR-005 | 타임아웃 없이 모든 크기 파일 다운로드 |
| FR-006 | 모든 파일 유형 지원 |
| FR-007 | 파일 없을 시 "파일을 사용할 수 없음" 오류 표시 |

---

## 6. 에디터 기능 상세

### 6.1 이미지 처리 파이프라인
```
래스터 이미지 → OpenCV Mat → 알파 채널 분리 → 이진 마스크
              → Distance Transform → 컨투어 추출 → SVG 경로 → Fabric 캔버스
```

**주요 기능**:
- 자동 칼선 생성 (내부/외부 오프셋)
- 배경 제거 및 마스킹
- 래스터 → 벡터 변환

### 6.2 이미지 필터/효과
| 유형 | 설명 | 예시 |
|------|------|------|
| **필터** | 단일 Fabric.js WebGL 필터 | BlackWhite, Vintage, Sepia |
| **효과** | 복합 필터 조합 | Gold (금박), Emboss (엠보싱), Cutting |
| **특수효과** | 오버레이 객체 기반 | ID 기반 연결, 히스토리 동기화 |

### 6.3 텍스트 기능
| 기능 | 설명 |
|------|------|
| 폰트 로딩 | CSS Font Loading API + FontFaceObserver |
| 한글 정규화 | NFD/NFC 유니코드 정규화 |
| 혼합 스타일 | 문자별 개별 스타일 지원 |
| 곡선 텍스트 | SVG Path 기반 곡선 배치 |
| 텍스트 벡터화 | opentype.js 기반 SVG 변환 |

### 6.4 WASM 색상 엔진
- **Little CMS 2 (v2.16)**: C 언어 색상 관리 엔진
- **WebAssembly 컴파일**: `-O3`, `-flto` 최적화
- **Black Point Compensation**: Photoshop 동일 결과 보장
- **ICC 프로파일**: Japan Color 2001 등 표준 프로파일 지원

---

## 7. 통합 및 외부 서비스

### 7.1 WowPress API
| 연동 | 설명 |
|------|------|
| 상품 동기화 | 인쇄 상품 정보 연동 |
| 주문 전송 | 인쇄 주문 이행 요청 |
| PDF 내보내기 | 인쇄용 PDF 생성 |

### 7.2 Nicepay
| 연동 | 설명 |
|------|------|
| 결제 승인 | 신용카드/간편결제 |
| 결제 취소 | 환불 처리 |
| 콜백 처리 | 결제 결과 수신 |

### 7.3 AWS 서비스
| 서비스 | 용도 |
|--------|------|
| S3 | 이미지/파일 저장 |
| CloudFront | CDN, 이미지 최적화 |
| Lambda@Edge | 이미지 리사이즈 |
| SES | 이메일 발송 |
| EKS | 백엔드 컨테이너 호스팅 |

---

## 8. 비기능 요구사항

### 8.1 성능
| 항목 | 목표 |
|------|------|
| 상품 일괄 삭제 (100개) | 5초 이내 |
| 텍스트 벡터화 (500자) | 500ms 이내 |
| 테스트 스위트 (20+ 폰트) | 60초 이내 |
| API 응답 시간 | P95 < 500ms |

### 8.2 보안
- JWT 기반 인증
- RBAC 권한 관리
- XSS/Injection 방지
- Presigned URL 파일 접근
- 스토어 간 데이터 격리

### 8.3 가용성
- Multi-AZ RDS 배포
- 고가용성 Redis Cluster
- ArgoCD 기반 롤백

---

## 9. 개발 및 배포

### 9.1 개발 환경
| 요구사항 | 버전 |
|----------|------|
| Node.js | ≥21 |
| pnpm | ≥9 |
| JDK | 17 |
| Kotlin | 2.1.10 |

### 9.2 CI/CD
- **CI**: GitHub Actions → 테스트 → Jib 빌드 → ECR 푸시
- **CD**: ArgoCD → EKS 동기화 → 롤링 업데이트

### 9.3 배포 환경
| 앱 | 플랫폼 | 방식 |
|----|--------|------|
| Admin/Partner | Vercel | Static CDN |
| Shop | Vercel | Serverless SSR |
| Editor | Vercel | Static CDN |
| Backend | AWS EKS | Container |

---

## 10. 로드맵 (구현된 기능 기준)

### Phase 1: 핵심 기능 (완료)
- 멀티테넌트 상점 관리
- 상품/카테고리 CRUD
- 기본 주문 프로세스
- WowPress 연동

### Phase 2: 관리 기능 강화 (진행 중)
- 상품 일괄 삭제
- 카테고리 드래그앤드롭
- 티켓 댓글 수정/삭제
- FAQ 리치 에디터
- 주문 파일 관리

### Phase 3: 에디터 고도화 (진행 중)
- 텍스트 벡터화 정확도 개선
- 판매자 디자인 템플릿
- WASM 색상 엔진

---

## 부록 A: Spec 문서 목록

### Frontend (webeasy/)
| Spec ID | 제목 | 상태 |
|---------|------|------|
| 001 | Admin Comment Edit/Delete | Draft |
| 002 | Product Search Enhancement | Draft |
| 003 | Partner Bulk Product Deletion | Ready |
| 342 | Category Drag-Drop Ordering | Draft |
| 345 | FAQ Rich Editor | Draft |
| 367 | Seller File Management | Draft |
| 368 | Seller Download Order | Draft |

### Backend (webeasy-backend/)
| Spec ID | 제목 | 상태 |
|---------|------|------|
| 001 | Update/Delete Ticket Reply Mutations | Draft |
| 002 | Delete Product Bulk Mutation | Ready |
| 003 | FAQ Content Quill Format | Draft |
| 004 | Support Category Level 3 | Draft |
| 710 | Add LineItem Media Mutation | Draft |
| 723 | Template Seller Design | Draft |

### Editor (webeasy-editor/)
| Spec ID | 제목 | 상태 |
|---------|------|------|
| 001 | Perfect Text Vectorization | Draft |

---

## 부록 B: 용어 정의

| 용어 | 정의 |
|------|------|
| **멀티테넌트** | 단일 플랫폼에서 여러 상점이 독립적으로 운영되는 구조 |
| **헤드리스 커머스** | 프론트엔드와 백엔드가 API로 분리된 아키텍처 |
| **WowPress** | 인쇄 서비스 제공 외부 API |
| **Soft Delete** | 데이터를 실제 삭제하지 않고 삭제 표시만 하는 방식 |
| **Presigned URL** | 임시 접근 권한이 포함된 S3 URL |
| **DGS** | Netflix DGS Framework (GraphQL) |
| **Komapper** | Kotlin 네이티브 R2DBC ORM |
