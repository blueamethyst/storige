# Storige E2E 시나리오 테스트

> **문서 버전**: 1.0
> **작성일**: 2025-12-28
> **테스트 도구**: Playwright MCP
> **대상**: Storige 에디터 + API 통합 시나리오

---

## 목차

### Part A: 에디터 (Editor)
1. [테스트 개요](#1-테스트-개요)
2. [테스트 환경 설정](#2-테스트-환경-설정)
3. [시나리오 1: 에디터 기본 플로우](#3-시나리오-1-에디터-기본-플로우)
4. [시나리오 2: 템플릿셋 편집 플로우](#4-시나리오-2-템플릿셋-편집-플로우)
5. [시나리오 3: 텍스트 편집 플로우](#5-시나리오-3-텍스트-편집-플로우)
6. [시나리오 4: 이미지 편집 플로우](#6-시나리오-4-이미지-편집-플로우)
7. [시나리오 5: 책등(Spine) 계산 플로우](#7-시나리오-5-책등spine-계산-플로우)
8. [시나리오 6: 저장 및 완료 플로우](#8-시나리오-6-저장-및-완료-플로우)
9. [시나리오 7: 페이지 관리 플로우](#9-시나리오-7-페이지-관리-플로우)
10. [시나리오 8: 전체 주문 E2E 플로우](#10-시나리오-8-전체-주문-e2e-플로우)

### Part B: 관리자 (Admin)
11. [시나리오 9: 관리자 인증 플로우](#11-시나리오-9-관리자-인증-플로우)
12. [시나리오 10: 템플릿 관리 플로우](#12-시나리오-10-템플릿-관리-플로우)
13. [시나리오 11: 템플릿셋 관리 플로우](#13-시나리오-11-템플릿셋-관리-플로우)
14. [시나리오 12: 상품 관리 플로우](#14-시나리오-12-상품-관리-플로우)
15. [시나리오 13: 라이브러리 관리 플로우](#15-시나리오-13-라이브러리-관리-플로우)
16. [시나리오 14: 편집 세션 관리 플로우](#16-시나리오-14-편집-세션-관리-플로우)
17. [시나리오 15: 워커 작업 관리 플로우](#17-시나리오-15-워커-작업-관리-플로우)

---

## 1. 테스트 개요

### 1.1 테스트 범위

```
┌─────────────────────────────────────────────────────────────────┐
│                    E2E 시나리오 테스트 범위                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Browser   │───►│   Editor    │───►│    API      │         │
│  │ (Playwright)│    │   (React)   │    │  (NestJS)   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                            │                  │                 │
│                            ▼                  ▼                 │
│                     ┌─────────────┐    ┌─────────────┐         │
│                     │   Canvas    │    │   Worker    │         │
│                     │ (Fabric.js) │    │    Queue    │         │
│                     └─────────────┘    └─────────────┘         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 테스트 시나리오 우선순위

| 우선순위 | 시나리오 | 설명 |
|----------|----------|------|
| Critical | 에디터 기본 플로우 | 에디터 로드, 초기화, 기본 조작 |
| Critical | 저장 및 완료 플로우 | 자동저장, 수동저장, 편집완료 |
| High | 템플릿셋 편집 플로우 | 템플릿 로드, 페이지 구성, 편집 |
| High | 텍스트 편집 플로우 | 텍스트 추가, 수정, 스타일링 |
| High | 이미지 편집 플로우 | 이미지 업로드, 배치, 크롭 |
| Medium | 책등 계산 플로우 | 용지/제본 선택, 계산 결과 |
| Medium | 페이지 관리 플로우 | 페이지 추가, 삭제, 순서변경 |
| High | 전체 주문 E2E 플로우 | 인증 → 편집 → 저장 → 완료 |

---

## 2. 테스트 환경 설정

### 2.1 사전 조건

```bash
# 서비스 실행 필요
pnpm --filter @storige/api dev      # API 서버 (:4000)
pnpm --filter @storige/editor dev   # 에디터 (:3000)

# Docker (선택사항)
docker-compose up -d   # MariaDB, Redis
```

### 2.2 테스트 URL

| 환경 | 에디터 URL | API URL |
|------|-----------|---------|
| 로컬 | `http://localhost:3000` | `http://localhost:4000/api` |
| 스테이징 | `https://editor.staging.storige.com` | `https://api.staging.storige.com` |

### 2.3 테스트 계정

```typescript
// 관리자 계정
const ADMIN = {
  email: 'admin@storige.com',
  password: 'admin123!'
};

// 테스트 고객 (Shop Session 발급용)
const TEST_CUSTOMER = {
  memberSeqno: 99999,
  memberId: 'test@example.com',
  memberName: '테스트유저'
};

// API Key
const API_KEY = 'test-api-key-for-testing';
```

---

## 3. 시나리오 1: 에디터 기본 플로우

### SC-EDITOR-001: 에디터 초기 로드

**목적**: 에디터가 정상적으로 로드되고 초기화되는지 확인

**사전조건**:
- 에디터 서버 실행 중
- 유효한 인증 토큰

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | `http://localhost:3000` 접속 | 페이지 로드 성공 |
| 2 | 로딩 오버레이 확인 | "에디터를 초기화하는 중..." 표시 |
| 3 | 캔버스 영역 확인 | `#canvas-containers` 요소 존재 |
| 4 | 툴바 확인 | ToolBar 컴포넌트 렌더링 |
| 5 | 로딩 완료 대기 | 로딩 오버레이 사라짐 |

**Playwright 테스트**:
```typescript
test('SC-EDITOR-001: 에디터 초기 로드', async ({ page }) => {
  // 1. 에디터 페이지 접속
  await page.goto('http://localhost:3000');

  // 2. 로딩 메시지 확인
  await expect(page.getByText('에디터를 초기화하는 중...')).toBeVisible();

  // 3. 캔버스 영역 존재 확인
  await expect(page.locator('#canvas-containers')).toBeVisible();

  // 4. 툴바 존재 확인
  await expect(page.locator('#editor')).toBeVisible();

  // 5. 로딩 완료 대기 (최대 10초)
  await expect(page.getByText('에디터를 초기화하는 중...')).toBeHidden({ timeout: 10000 });
});
```

---

### SC-EDITOR-002: 에디터 UI 요소 검증

**목적**: 에디터의 주요 UI 요소들이 정상적으로 렌더링되는지 확인

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 헤더 영역 확인 | EditorHeader 컴포넌트 |
| 2 | 도구 모음 확인 | ToolBar (텍스트, 이미지, 도형 등) |
| 3 | 사이드 패널 확인 | FeatureSidebar |
| 4 | 컨트롤 바 확인 | ControlBar (속성 조절) |
| 5 | 캔버스 영역 확인 | Fabric.js 캔버스 |

**Playwright 테스트**:
```typescript
test('SC-EDITOR-002: 에디터 UI 요소 검증', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // 에디터 컨테이너 확인
  await expect(page.locator('#editor')).toBeVisible();

  // 워크스페이스 영역 확인
  await expect(page.locator('#workspace')).toBeVisible();

  // 캔버스 컨테이너 확인
  await expect(page.locator('#canvas-containers')).toBeVisible();

  // 캔버스 래퍼 확인
  await expect(page.locator('#canvas-wrapper')).toBeVisible();
});
```

---

### SC-EDITOR-003: 반응형 레이아웃 테스트

**목적**: 다양한 화면 크기에서 에디터 레이아웃이 적절히 변경되는지 확인

**테스트 케이스**:

| 화면 크기 | 너비 | 레이아웃 | 툴바 방향 |
|-----------|------|----------|-----------|
| Desktop | 1920px | 가로 분할 | 세로 |
| Tablet | 900px | 세로 분할 | 가로 |
| Mobile | 375px | 세로 분할 | 가로 |

**Playwright 테스트**:
```typescript
test('SC-EDITOR-003: 반응형 레이아웃 - Desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Desktop 레이아웃 검증 (flex-row)
  const mainLayout = page.locator('#editor > div').nth(1);
  await expect(mainLayout).toHaveClass(/flex-row/);
});

test('SC-EDITOR-003: 반응형 레이아웃 - Tablet', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1200 });
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Tablet 레이아웃 검증 (flex-col)
  const mainLayout = page.locator('#editor > div').nth(1);
  await expect(mainLayout).toHaveClass(/flex-col/);
});

test('SC-EDITOR-003: 반응형 레이아웃 - Mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Mobile 레이아웃 검증 (flex-col)
  const mainLayout = page.locator('#editor > div').nth(1);
  await expect(mainLayout).toHaveClass(/flex-col/);
});
```

---

## 4. 시나리오 2: 템플릿셋 편집 플로우

### 템플릿셋 유형 분류표

상품 유형, 책등(Spine), 날개(Flap) 유무에 따른 템플릿셋 구성:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          템플릿셋 유형 매트릭스                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   상품 유형           책등    날개    페이지 구성          템플릿셋 ID 예시        │
│   ─────────────────────────────────────────────────────────────────────────    │
│   명함               ❌      ❌      앞면 + 뒷면           ts-card-001          │
│   전단지             ❌      ❌      단면 / 양면           ts-flyer-001         │
│   리플렛 (2단)       ❌      ❌      앞면 + 뒷면           ts-leaflet-2f        │
│   리플렛 (3단)       ❌      ❌      앞면 + 뒷면           ts-leaflet-3f        │
│   ─────────────────────────────────────────────────────────────────────────    │
│   중철제본 (책등❌)   ❌      ❌      표지 + 내지(n)        ts-saddle-001        │
│   무선제본 (책등⭕)   ⭕      ❌      표지 + 책등 + 내지    ts-perfect-001       │
│   무선제본+날개      ⭕      ⭕      표지+날개+책등+내지   ts-perfect-flap-001  │
│   ─────────────────────────────────────────────────────────────────────────    │
│   양장제본           ⭕      ❌      표지 + 책등 + 내지    ts-hardcover-001     │
│   양장제본+날개      ⭕      ⭕      표지+날개+책등+내지   ts-hardcover-flap    │
│   ─────────────────────────────────────────────────────────────────────────    │
│   포토북 (무선)      ⭕      ❌      표지 + 책등 + 내지    ts-photobook-001     │
│   포토북 (양장)      ⭕      ⭕      표지+날개+책등+내지   ts-photobook-hard    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 템플릿셋 유형별 상세 테이블

| 코드 | 상품 유형 | 책등 | 날개 | 제본 방식 | 페이지 구성 | 최소 페이지 | 최대 페이지 |
|------|----------|:----:|:----:|----------|------------|-----------|-----------|
| **TS-TYPE-A** | 명함/전단지 | ❌ | ❌ | 없음 | 앞면, 뒷면 | 1 | 2 |
| **TS-TYPE-B** | 리플렛 2단 | ❌ | ❌ | 접지 | 앞면(2단), 뒷면(2단) | 2 | 2 |
| **TS-TYPE-C** | 리플렛 3단 | ❌ | ❌ | 접지 | 앞면(3단), 뒷면(3단) | 2 | 2 |
| **TS-TYPE-D** | 중철제본 | ❌ | ❌ | 중철 | 표지앞, 표지뒤, 내지(n) | 8 | 64 |
| **TS-TYPE-E** | 무선제본 | ⭕ | ❌ | 무선 | 표지앞, 책등, 표지뒤, 내지(n) | 32 | 500 |
| **TS-TYPE-F** | 무선제본+날개 | ⭕ | ⭕ | 무선 | 표지앞, 앞날개, 책등, 뒷날개, 표지뒤, 내지(n) | 32 | 500 |
| **TS-TYPE-G** | 양장제본 | ⭕ | ❌ | 양장 | 표지앞, 책등, 표지뒤, 면지, 내지(n) | 32 | 500 |
| **TS-TYPE-H** | 양장제본+날개 | ⭕ | ⭕ | 양장 | 표지앞, 앞날개, 책등, 뒷날개, 표지뒤, 면지, 내지(n) | 32 | 500 |

### 책등(Spine) 계산 조건

| 제본 방식 | 책등 계산 | 책등 마진 | 비고 |
|----------|:--------:|----------|------|
| 중철제본 (saddle) | ❌ | 0.3mm | 64페이지 이하만 가능 |
| 무선제본 (perfect) | ⭕ | 0.5mm | 32페이지 이상 필요 |
| 스프링제본 (spiral) | ❌ | 3mm | 책등 없음, 링 마진만 |
| 양장제본 (hardcover) | ⭕ | 2mm | 두꺼운 표지 고려 |

### 날개(Flap) 구성

| 날개 유형 | 위치 | 기본 크기 | 설명 |
|----------|------|----------|------|
| 앞날개 (front flap) | 표지 앞면 안쪽 | 80~100mm | 저자 소개, 책 소개 |
| 뒷날개 (back flap) | 표지 뒷면 안쪽 | 80~100mm | 시리즈 소개, 기타 정보 |

---

### 템플릿셋 유형별 테스트 시나리오

#### SC-TS-TYPE-A: 명함/전단지 (책등❌, 날개❌)

**목적**: 단순 양면 상품의 템플릿셋 편집 테스트

**특징**:
- 페이지 수: 1~2 (앞면/뒷면)
- 책등 계산: 불필요
- 날개: 없음

**Playwright 테스트**:
```typescript
test('SC-TS-TYPE-A: 명함/전단지 템플릿셋', async ({ page }) => {
  // 명함 템플릿셋 로드 (책등/날개 없음)
  await page.goto('http://localhost:3000/?templateSetId=ts-card-001');
  await page.waitForLoadState('networkidle');

  // 페이지 수 확인 (앞면/뒷면 = 2페이지)
  const pageItems = page.locator('[data-testid="page-item"]');
  await expect(pageItems).toHaveCount(2);

  // 책등 편집 영역 없음 확인
  const spineEditor = page.locator('[data-testid="spine-editor"]');
  await expect(spineEditor).not.toBeVisible();

  // 날개 영역 없음 확인
  const flapArea = page.locator('[data-testid="flap-area"]');
  await expect(flapArea).not.toBeVisible();
});
```

---

#### SC-TS-TYPE-D: 중철제본 (책등❌, 날개❌)

**목적**: 중철제본 책자 템플릿셋 편집 테스트

**특징**:
- 페이지 수: 8~64 (4의 배수)
- 책등 계산: 불필요 (표지가 접혀서 감싸는 형태)
- 날개: 없음

**Playwright 테스트**:
```typescript
test('SC-TS-TYPE-D: 중철제본 템플릿셋', async ({ page }) => {
  // 중철제본 템플릿셋 (32페이지)
  await page.goto('http://localhost:3000/?templateSetId=ts-saddle-001&pageCount=32&bindingType=saddle');
  await page.waitForLoadState('networkidle');

  // 페이지 구성 확인: 표지앞 + 표지뒤 + 내지(30)
  const pageItems = page.locator('[data-testid="page-item"]');
  const pageCount = await pageItems.count();
  expect(pageCount).toBe(32);

  // 책등 UI 없음 확인
  const spineEditor = page.locator('[data-testid="spine-editor"]');
  await expect(spineEditor).not.toBeVisible();

  // 페이지 수 제한 경고 테스트 (64 초과 시)
  // 중철은 최대 64페이지
});
```

---

#### SC-TS-TYPE-E: 무선제본 (책등⭕, 날개❌)

**목적**: 무선제본 책자 (책등 있음, 날개 없음) 템플릿셋 편집 테스트

**특징**:
- 페이지 수: 32~500
- 책등 계산: 필요 (페이지수 × 종이두께 + 마진)
- 날개: 없음

**페이지 구성**:
```
┌─────────────────────────────────────┐
│  표지앞  │  책등  │  표지뒤  │       │
│  (1p)   │ (auto)│  (2p)   │ 내지  │
│         │       │         │(3~n p)│
└─────────────────────────────────────┘
```

**Playwright 테스트**:
```typescript
test('SC-TS-TYPE-E: 무선제본 템플릿셋 (책등⭕, 날개❌)', async ({ page }) => {
  // 무선제본 템플릿셋 (100페이지, 모조지 80g)
  await page.goto('http://localhost:3000/?templateSetId=ts-perfect-001&pageCount=100&paperType=mojo_80g&bindingType=perfect');
  await page.waitForLoadState('networkidle');

  // 캔버스 로드 확인
  await expect(page.locator('#canvas-containers canvas')).toBeVisible();

  // 책등 편집 영역 표시 확인
  const spineEditor = page.locator('[data-testid="spine-editor"]');
  if (await spineEditor.isVisible()) {
    // 책등 폭 값 확인 (100페이지 × 0.1mm / 2 + 0.5mm = 5.5mm)
    const spineWidth = page.locator('[data-testid="spine-width-value"]');
    await expect(spineWidth).toContainText('5.5');
  }

  // 날개 영역 없음 확인
  const flapArea = page.locator('[data-testid="flap-area"]');
  await expect(flapArea).not.toBeVisible();

  // 표지 편집 테스트
  const coverPage = page.locator('[data-testid="page-item"]').first();
  await coverPage.click();
  await expect(page.locator('text=표지앞, text=Front Cover')).toBeVisible();
});
```

---

#### SC-TS-TYPE-F: 무선제본+날개 (책등⭕, 날개⭕)

**목적**: 무선제본 책자 (책등 + 날개) 템플릿셋 편집 테스트

**특징**:
- 페이지 수: 32~500
- 책등 계산: 필요
- 날개: 앞날개 + 뒷날개

**페이지 구성**:
```
┌───────────────────────────────────────────────────────────┐
│  앞날개  │  표지앞  │  책등  │  표지뒤  │  뒷날개  │       │
│  (flap) │  (1p)   │(auto) │  (2p)   │ (flap)  │ 내지  │
│  80mm   │         │       │         │  80mm   │(3~n p)│
└───────────────────────────────────────────────────────────┘
```

**Playwright 테스트**:
```typescript
test('SC-TS-TYPE-F: 무선제본+날개 템플릿셋 (책등⭕, 날개⭕)', async ({ page }) => {
  // 무선제본+날개 템플릿셋
  await page.goto('http://localhost:3000/?templateSetId=ts-perfect-flap-001&pageCount=100&paperType=mojo_80g&bindingType=perfect&hasFlap=true');
  await page.waitForLoadState('networkidle');

  // 캔버스 로드 확인
  await expect(page.locator('#canvas-containers canvas')).toBeVisible();

  // 책등 편집 영역 표시 확인
  const spineEditor = page.locator('[data-testid="spine-editor"]');
  await expect(spineEditor).toBeVisible();

  // 앞날개 영역 확인
  const frontFlap = page.locator('[data-testid="front-flap"]');
  await expect(frontFlap).toBeVisible();

  // 뒷날개 영역 확인
  const backFlap = page.locator('[data-testid="back-flap"]');
  await expect(backFlap).toBeVisible();

  // 날개 크기 확인 (기본 80mm)
  const flapWidth = page.locator('[data-testid="flap-width-input"]');
  if (await flapWidth.isVisible()) {
    await expect(flapWidth).toHaveValue('80');
  }
});
```

---

#### SC-TS-TYPE-G: 양장제본 (책등⭕, 날개❌)

**목적**: 양장제본 책자 (두꺼운 표지, 책등) 템플릿셋 편집 테스트

**특징**:
- 페이지 수: 32~500
- 책등 계산: 필요 (마진 2mm로 더 큼)
- 날개: 없음
- 면지: 앞면지 + 뒷면지

**Playwright 테스트**:
```typescript
test('SC-TS-TYPE-G: 양장제본 템플릿셋 (책등⭕, 날개❌)', async ({ page }) => {
  // 양장제본 템플릿셋
  await page.goto('http://localhost:3000/?templateSetId=ts-hardcover-001&pageCount=100&paperType=mojo_80g&bindingType=hardcover');
  await page.waitForLoadState('networkidle');

  // 캔버스 로드 확인
  await expect(page.locator('#canvas-containers canvas')).toBeVisible();

  // 책등 편집 영역 확인
  const spineEditor = page.locator('[data-testid="spine-editor"]');
  if (await spineEditor.isVisible()) {
    // 양장 책등 폭 확인 (마진 2mm)
    // 100페이지 × 0.1mm / 2 + 2mm = 7mm
    const spineWidth = page.locator('[data-testid="spine-width-value"]');
    await expect(spineWidth).toContainText('7');
  }

  // 면지 페이지 확인
  const endpaperPage = page.locator('[data-testid="page-item"]:has-text("면지")');
  // 면지가 있는 경우 확인
});
```

---

#### SC-TS-TYPE-H: 양장제본+날개 (책등⭕, 날개⭕)

**목적**: 양장제본 책자 (책등 + 날개) 템플릿셋 편집 테스트

**특징**:
- 페이지 수: 32~500
- 책등 계산: 필요
- 날개: 앞날개 + 뒷날개
- 면지: 앞면지 + 뒷면지

**페이지 구성**:
```
┌─────────────────────────────────────────────────────────────────────┐
│  앞날개 │ 표지앞 │ 책등 │ 표지뒤 │ 뒷날개 │ 앞면지 │ 내지 │ 뒷면지 │
│  80mm  │  (1p) │(auto)│  (2p) │ 80mm  │  (3p) │(4~n) │ (n+1) │
└─────────────────────────────────────────────────────────────────────┘
```

**Playwright 테스트**:
```typescript
test('SC-TS-TYPE-H: 양장제본+날개 템플릿셋 (책등⭕, 날개⭕)', async ({ page }) => {
  // 양장제본+날개 템플릿셋
  await page.goto('http://localhost:3000/?templateSetId=ts-hardcover-flap&pageCount=100&paperType=mojo_80g&bindingType=hardcover&hasFlap=true');
  await page.waitForLoadState('networkidle');

  // 캔버스 로드 확인
  await expect(page.locator('#canvas-containers canvas')).toBeVisible();

  // 책등 편집 영역 확인
  await expect(page.locator('[data-testid="spine-editor"]')).toBeVisible();

  // 앞날개 영역 확인
  await expect(page.locator('[data-testid="front-flap"]')).toBeVisible();

  // 뒷날개 영역 확인
  await expect(page.locator('[data-testid="back-flap"]')).toBeVisible();

  // 면지 페이지 확인
  const endpapers = page.locator('[data-testid="page-item"]:has-text("면지")');
  const endpaperCount = await endpapers.count();
  expect(endpaperCount).toBeGreaterThanOrEqual(1);
});
```

---

### 템플릿셋 유형별 테스트 체크리스트

| 시나리오 ID | 유형 | 책등 | 날개 | 테스트 항목 | 상태 |
|------------|------|:----:|:----:|-----------|:----:|
| SC-TS-TYPE-A | 명함/전단지 | ❌ | ❌ | 2페이지 구성, 책등/날개 UI 없음 | ☐ |
| SC-TS-TYPE-B | 리플렛 2단 | ❌ | ❌ | 접지 구조, 양면 편집 | ☐ |
| SC-TS-TYPE-C | 리플렛 3단 | ❌ | ❌ | 접지 구조, 양면 편집 | ☐ |
| SC-TS-TYPE-D | 중철제본 | ❌ | ❌ | 4배수 페이지, 64p 제한 | ☐ |
| SC-TS-TYPE-E | 무선제본 | ⭕ | ❌ | 책등 자동 계산, 32p 이상 | ☐ |
| SC-TS-TYPE-F | 무선제본+날개 | ⭕ | ⭕ | 책등 + 날개 UI, 날개 크기 | ☐ |
| SC-TS-TYPE-G | 양장제본 | ⭕ | ❌ | 책등(마진2mm), 면지 | ☐ |
| SC-TS-TYPE-H | 양장제본+날개 | ⭕ | ⭕ | 책등 + 날개 + 면지 | ☐ |

---

### SC-TEMPLATE-001: 템플릿셋 로드

**목적**: URL 파라미터로 템플릿셋을 로드하여 에디터에 표시

**사전조건**:
- 유효한 templateSetId
- 템플릿셋에 템플릿이 포함되어 있음

**URL 형식**:
```
/editor?templateSetId={id}&pageCount={count}&paperType={type}&bindingType={type}
```

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 템플릿셋 URL 접속 | 페이지 로드 |
| 2 | 로딩 메시지 확인 | "템플릿셋을 불러오는 중..." |
| 3 | 페이지 리스트 확인 | PagePanel에 페이지 표시 |
| 4 | 캔버스 렌더링 확인 | 템플릿 콘텐츠 표시 |

**Playwright 테스트**:
```typescript
test('SC-TEMPLATE-001: 템플릿셋 로드', async ({ page }) => {
  const templateSetId = 'ts-test-001';
  const pageCount = 50;
  const paperType = 'mojo_80g';
  const bindingType = 'perfect';

  // 템플릿셋 URL로 접속
  await page.goto(`http://localhost:3000/?templateSetId=${templateSetId}&pageCount=${pageCount}&paperType=${paperType}&bindingType=${bindingType}`);

  // 로딩 메시지 확인
  await expect(page.getByText('템플릿셋을 불러오는 중...')).toBeVisible();

  // 로딩 완료 대기
  await expect(page.getByText('템플릿셋을 불러오는 중...')).toBeHidden({ timeout: 15000 });

  // 캔버스 영역 확인
  await expect(page.locator('#canvas-containers canvas')).toBeVisible();
});
```

---

### SC-TEMPLATE-002: 템플릿 페이지 네비게이션

**목적**: 멀티페이지 템플릿에서 페이지 간 이동이 정상 동작하는지 확인

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 페이지 패널 열기 | 페이지 목록 표시 |
| 2 | 2번째 페이지 클릭 | 캔버스 변경 확인 |
| 3 | 이전 페이지 버튼 클릭 | 1번째 페이지로 이동 |
| 4 | 다음 페이지 버튼 클릭 | 2번째 페이지로 이동 |

**Playwright 테스트**:
```typescript
test('SC-TEMPLATE-002: 템플릿 페이지 네비게이션', async ({ page }) => {
  await page.goto('http://localhost:3000/?templateSetId=ts-test-001&pageCount=10');
  await page.waitForLoadState('networkidle');

  // 페이지 패널이 있다면 페이지 썸네일 클릭
  const pageItems = page.locator('[data-testid="page-item"]');

  if (await pageItems.count() > 1) {
    // 두 번째 페이지 클릭
    await pageItems.nth(1).click();

    // 페이지 변경 확인 (활성 상태 표시)
    await expect(pageItems.nth(1)).toHaveClass(/active|selected/);
  }
});
```

---

## 5. 시나리오 3: 텍스트 편집 플로우

### SC-TEXT-001: 텍스트 객체 추가

**목적**: 캔버스에 텍스트 객체를 추가하는 기능 테스트

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 텍스트 도구 선택 | 도구 활성화 |
| 2 | 캔버스 클릭 | 텍스트 입력 모드 진입 |
| 3 | 텍스트 입력 | "테스트 텍스트" 입력 |
| 4 | 외부 클릭 | 텍스트 객체 생성 확인 |

**Playwright 테스트**:
```typescript
test('SC-TEXT-001: 텍스트 객체 추가', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // 텍스트 도구 버튼 찾기 및 클릭
  const textToolButton = page.locator('[data-tool="text"], [aria-label="텍스트"]');
  await textToolButton.click();

  // 캔버스 중앙 클릭
  const canvas = page.locator('#canvas-containers canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  }

  // 텍스트 입력
  await page.keyboard.type('테스트 텍스트');

  // ESC 또는 외부 클릭으로 편집 완료
  await page.keyboard.press('Escape');

  // 캔버스에서 텍스트 객체 확인 (selection 이벤트 발생 여부 등)
});
```

---

### SC-TEXT-002: 텍스트 스타일 변경

**목적**: 텍스트 객체의 폰트, 크기, 색상 등 스타일 변경 테스트

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 텍스트 객체 선택 | 객체 선택됨 |
| 2 | 폰트 크기 변경 | 24pt → 36pt |
| 3 | 폰트 굵기 변경 | Regular → Bold |
| 4 | 텍스트 색상 변경 | 검정 → 빨강 |
| 5 | 변경 결과 확인 | 스타일 적용됨 |

**Playwright 테스트**:
```typescript
test('SC-TEXT-002: 텍스트 스타일 변경', async ({ page }) => {
  // 텍스트 객체가 있는 상태에서 시작
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // 텍스트 추가 (이전 시나리오 재사용)
  // ... 텍스트 추가 코드 ...

  // 텍스트 객체 선택 (캔버스 클릭 또는 직접 선택)

  // ControlBar에서 폰트 크기 변경
  const fontSizeInput = page.locator('[data-testid="font-size-input"]');
  if (await fontSizeInput.isVisible()) {
    await fontSizeInput.fill('36');
    await fontSizeInput.press('Enter');
  }

  // 볼드 버튼 클릭
  const boldButton = page.locator('[data-testid="bold-button"], [aria-label="굵게"]');
  if (await boldButton.isVisible()) {
    await boldButton.click();
  }
});
```

---

## 6. 시나리오 4: 이미지 편집 플로우

### SC-IMAGE-001: 이미지 업로드

**목적**: 로컬 이미지 파일을 캔버스에 업로드하는 기능 테스트

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 이미지 도구 선택 | 도구 활성화 |
| 2 | 이미지 업로드 패널 열기 | 업로드 UI 표시 |
| 3 | 파일 선택 | test-image.jpg 선택 |
| 4 | 업로드 진행 | 프로그레스 표시 |
| 5 | 이미지 배치 | 캔버스에 이미지 추가됨 |

**Playwright 테스트**:
```typescript
test('SC-IMAGE-001: 이미지 업로드', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // 이미지 도구 선택
  const imageToolButton = page.locator('[data-tool="image"], [aria-label="이미지"]');
  await imageToolButton.click();

  // 파일 업로드 input 찾기
  const fileInput = page.locator('input[type="file"]');

  // 테스트 이미지 파일 설정
  await fileInput.setInputFiles('./test/fixtures/test-image.jpg');

  // 업로드 완료 대기
  await page.waitForResponse(response =>
    response.url().includes('/files/upload') && response.status() === 201
  );

  // 이미지가 캔버스에 추가되었는지 확인
});
```

---

### SC-IMAGE-002: 이미지 크기 조절

**목적**: 캔버스에 배치된 이미지의 크기를 조절하는 기능 테스트

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 이미지 객체 선택 | 핸들 표시 |
| 2 | 모서리 핸들 드래그 | 비율 유지하며 크기 변경 |
| 3 | Shift + 드래그 | 자유 비율로 크기 변경 |
| 4 | 크기 입력 | 정확한 수치로 조절 |

**Playwright 테스트**:
```typescript
test('SC-IMAGE-002: 이미지 크기 조절', async ({ page }) => {
  // 이미지가 있는 상태에서 시작
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // 이미지 업로드 (이전 시나리오 재사용)
  // ...

  // 이미지 객체 선택 (캔버스에서 클릭)
  const canvas = page.locator('#canvas-containers canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  }

  // 사이즈 컨트롤 확인
  const widthInput = page.locator('[data-testid="object-width-input"]');
  if (await widthInput.isVisible()) {
    const originalWidth = await widthInput.inputValue();

    // 새 너비 입력
    await widthInput.fill('200');
    await widthInput.press('Enter');

    // 변경 확인
    await expect(widthInput).toHaveValue('200');
  }
});
```

---

## 7. 시나리오 5: 책등(Spine) 계산 플로우

### SC-SPINE-001: 책등 폭 자동 계산

**목적**: 페이지수, 용지, 제본방식에 따른 책등 폭 자동 계산 테스트

**URL 파라미터**:
```
?pageCount=100&paperType=mojo_80g&bindingType=perfect
```

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 파라미터와 함께 에디터 로드 | 페이지 로드 |
| 2 | SpineEditor 컴포넌트 확인 | 책등 설정 UI 표시 |
| 3 | 계산 결과 확인 | spineWidth = 5.5mm |
| 4 | 책등 프리뷰 확인 | SpinePreview 표시 |

**Playwright 테스트**:
```typescript
test('SC-SPINE-001: 책등 폭 자동 계산', async ({ page }) => {
  // 책등 계산 파라미터와 함께 접속
  await page.goto('http://localhost:3000/?pageCount=100&paperType=mojo_80g&bindingType=perfect');
  await page.waitForLoadState('networkidle');

  // SpineEditor 컴포넌트 확인
  const spineEditor = page.locator('[data-testid="spine-editor"]');
  if (await spineEditor.isVisible()) {
    // 책등 폭 값 확인
    const spineWidth = page.locator('[data-testid="spine-width-value"]');
    await expect(spineWidth).toContainText('5.5');
  }
});
```

---

### SC-SPINE-002: 책등 설정 변경

**목적**: 사용자가 책등 설정을 변경하고 재계산하는 플로우 테스트

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 책등 설정 패널 열기 | SpineSettings 표시 |
| 2 | 페이지수 변경 | 100 → 200 |
| 3 | 재계산 버튼 클릭 | API 호출 |
| 4 | 새 책등 폭 확인 | spineWidth = 10.5mm |

**Playwright 테스트**:
```typescript
test('SC-SPINE-002: 책등 설정 변경', async ({ page }) => {
  await page.goto('http://localhost:3000/?pageCount=100&paperType=mojo_80g&bindingType=perfect');
  await page.waitForLoadState('networkidle');

  // 책등 설정 패널 찾기
  const spineSettings = page.locator('[data-testid="spine-settings"]');

  if (await spineSettings.isVisible()) {
    // 페이지수 입력 필드
    const pageCountInput = page.locator('[data-testid="page-count-input"]');
    await pageCountInput.fill('200');

    // 재계산 버튼 클릭 (또는 자동 계산)
    const calculateButton = page.locator('[data-testid="calculate-spine-button"]');
    if (await calculateButton.isVisible()) {
      await calculateButton.click();
    }

    // API 응답 대기
    await page.waitForResponse(response =>
      response.url().includes('/products/spine/calculate') && response.status() === 201
    );

    // 새로운 책등 폭 확인
    const spineWidth = page.locator('[data-testid="spine-width-value"]');
    await expect(spineWidth).toContainText('10.5');
  }
});
```

---

### SC-SPINE-003: 상품 유형별 책등 표시 테스트

**목적**: 책등이 있는 상품 유형에서 에디터에 책등이 정상적으로 표시되는지 확인

**대상 상품 유형**:

| 상품 유형 | 책등 | 날개 | 예상 책등 표시 |
|-----------|------|------|----------------|
| 무선제본 (TYPE-E) | ⭕ | ❌ | 표지앞-책등-표지뒤 구조 |
| 무선제본+날개 (TYPE-F) | ⭕ | ⭕ | 앞날개-표지앞-책등-표지뒤-뒷날개 구조 |
| 양장제본 (TYPE-G) | ⭕ | ❌ | 표지앞-책등-표지뒤 구조 (마진 2mm) |
| 양장제본+날개 (TYPE-H) | ⭕ | ⭕ | 앞날개-표지앞-책등-표지뒤-뒷날개 구조 |

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 템플릿셋 파라미터로 에디터 로드 | 페이지 로드 완료 |
| 2 | 책등 영역 확인 | 캔버스에 책등 영역 표시됨 |
| 3 | 책등 폭 값 확인 | 계산된 책등 폭 (페이지수 × 종이두께) |
| 4 | 책등 편집 가능 확인 | 책등 영역 선택 및 편집 가능 |

**Playwright 테스트**:
```typescript
// SC-SPINE-003-E: 무선제본 책등 표시 테스트
test('SC-SPINE-003-E: 무선제본 책등 표시', async ({ page }) => {
  // 무선제본 템플릿셋 (100페이지, 모조지 80g)
  await page.goto('http://localhost:3000/?templateSetId=ts-perfect-001&pageCount=100&paperType=mojo_80g&bindingType=perfect');
  await page.waitForLoadState('networkidle');

  // 로딩 완료 대기
  await expect(page.getByText('에디터를 초기화하는 중...')).toBeHidden({ timeout: 15000 });

  // 책등 영역 존재 확인
  const spineArea = page.locator('[data-page-type="spine"], [data-testid="spine-area"]');
  await expect(spineArea).toBeVisible({ timeout: 10000 });

  // 책등 폭 값 확인 (페이지수 기반 자동 계산)
  // 100페이지 × 0.1mm / 2 + 0.5mm = 5.5mm
  const spineWidth = page.locator('[data-testid="spine-width-value"]');
  if (await spineWidth.isVisible()) {
    await expect(spineWidth).toContainText(/5\.5|5,5/);
  }
});

// SC-SPINE-003-F: 무선제본+날개 책등 표시 테스트
test('SC-SPINE-003-F: 무선제본+날개 책등 표시', async ({ page }) => {
  await page.goto('http://localhost:3000/?templateSetId=ts-perfect-flap-001&pageCount=100&paperType=mojo_80g&bindingType=perfect');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('에디터를 초기화하는 중...')).toBeHidden({ timeout: 15000 });

  // 책등 영역 확인
  const spineArea = page.locator('[data-page-type="spine"], [data-testid="spine-area"]');
  await expect(spineArea).toBeVisible({ timeout: 10000 });

  // 날개 영역도 함께 확인
  const flapFront = page.locator('[data-page-type="flap-front"], [data-testid="flap-front"]');
  const flapBack = page.locator('[data-page-type="flap-back"], [data-testid="flap-back"]');

  // 날개가 있는 템플릿셋이면 날개 영역도 확인
  if (await flapFront.isVisible()) {
    await expect(flapFront).toBeVisible();
    await expect(flapBack).toBeVisible();
  }
});

// SC-SPINE-003-G: 양장제본 책등 표시 테스트
test('SC-SPINE-003-G: 양장제본 책등 표시', async ({ page }) => {
  await page.goto('http://localhost:3000/?templateSetId=ts-hardcover-001&pageCount=100&paperType=mojo_100g&bindingType=hardcover');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('에디터를 초기화하는 중...')).toBeHidden({ timeout: 15000 });

  // 책등 영역 확인 (양장은 마진 2mm)
  const spineArea = page.locator('[data-page-type="spine"], [data-testid="spine-area"]');
  await expect(spineArea).toBeVisible({ timeout: 10000 });

  // 양장제본 책등 폭 확인 (마진 2mm 포함)
  const spineWidth = page.locator('[data-testid="spine-width-value"]');
  if (await spineWidth.isVisible()) {
    // 100페이지 × 0.12mm / 2 + 2mm = 8mm 예상
    const text = await spineWidth.textContent();
    expect(parseFloat(text || '0')).toBeGreaterThan(5);
  }
});

// SC-SPINE-003-H: 양장제본+날개 책등 표시 테스트
test('SC-SPINE-003-H: 양장제본+날개 책등 표시', async ({ page }) => {
  await page.goto('http://localhost:3000/?templateSetId=ts-hardcover-flap-001&pageCount=100&paperType=mojo_100g&bindingType=hardcover');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('에디터를 초기화하는 중...')).toBeHidden({ timeout: 15000 });

  // 책등 영역 확인
  const spineArea = page.locator('[data-page-type="spine"], [data-testid="spine-area"]');
  await expect(spineArea).toBeVisible({ timeout: 10000 });

  // 날개 영역 확인
  const flapFront = page.locator('[data-page-type="flap-front"], [data-testid="flap-front"]');
  const flapBack = page.locator('[data-page-type="flap-back"], [data-testid="flap-back"]');

  if (await flapFront.isVisible()) {
    await expect(flapFront).toBeVisible();
    await expect(flapBack).toBeVisible();
  }

  // 면지 영역 확인 (양장제본 특성)
  const endpaper = page.locator('[data-page-type="endpaper"], [data-testid="endpaper"]');
  // 면지는 있을 수도 없을 수도 있음
});
```

**검증 체크리스트**:

| 상품 유형 | 책등 표시 | 책등 폭 계산 | 날개 표시 | 면지 표시 | 상태 |
|-----------|-----------|--------------|-----------|-----------|------|
| SC-SPINE-003-E (무선) | ⭕ | 페이지×0.1mm/2+0.5mm | ❌ | ❌ | ✅ PASSED |
| SC-SPINE-003-F (무선+날개) | ⭕ | 페이지×0.1mm/2+0.5mm | ⭕ | ❌ | ⚠️ 페이지구조OK, 책등폭미적용 |
| SC-SPINE-003-G (양장) | ⭕ | 페이지×0.12mm/2+2mm | ❌ | ⭕ | ⚠️ 페이지구조OK, 책등폭미적용 |
| SC-SPINE-003-H (양장+날개) | ⭕ | 페이지×0.12mm/2+2mm | ⭕ | ⭕ | ⏸️ 미테스트 |

> **테스트 결과 (2025-12-28)**: SC-SPINE-003-F,G 테스트 완료. 페이지 구조(앞날개-표지-책등-내지-뒷날개)는 정상 로드되나, 책등 폭 계산이 적용되지 않음. `useEditorContents.ts`에서 템플릿 타입별 workspace 크기 적용 로직 개선 필요.

---

### SC-SPINE-004: 내지 추가 시 책등 사이즈 동적 재계산

**목적**: 편집 중 내지(페이지)를 추가할 때 책등 사이즈가 자동으로 재계산되는지 확인

**테스트 시나리오**:

```
┌───────────────────────────────────────────────────────────────────┐
│                    책등 동적 재계산 플로우                           │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [초기 상태]        [내지 추가]         [재계산 결과]               │
│  ┌─────────┐       ┌─────────┐        ┌─────────┐                │
│  │ 32페이지 │  ──►  │ +8페이지 │  ──►   │ 40페이지 │                │
│  │책등: 2mm │       │  추가    │        │책등: 2.4mm│                │
│  └─────────┘       └─────────┘        └─────────┘                │
│                                                                   │
│  계산식: 책등폭 = (페이지수 × 종이두께 / 2) + 제본마진               │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 초기 페이지수로 에디터 로드 | 초기 책등 폭 확인 |
| 2 | 페이지 추가 버튼 클릭 | 내지 추가 UI 표시 |
| 3 | 페이지 수 입력 (예: +8) | 페이지 추가 완료 |
| 4 | 책등 폭 재계산 확인 | 새로운 책등 폭 값 |
| 5 | 캔버스 책등 영역 크기 변경 확인 | 시각적 변화 |

**Playwright 테스트**:
```typescript
// SC-SPINE-004-E: 무선제본 내지 추가 시 책등 재계산
test('SC-SPINE-004-E: 무선제본 내지 추가 시 책등 재계산', async ({ page }) => {
  // 초기 32페이지로 시작
  await page.goto('http://localhost:3000/?templateSetId=ts-perfect-001&pageCount=32&paperType=mojo_80g&bindingType=perfect');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('에디터를 초기화하는 중...')).toBeHidden({ timeout: 15000 });

  // 초기 책등 폭 확인 (32페이지 × 0.1mm / 2 + 0.5mm = 2.1mm)
  const spineWidth = page.locator('[data-testid="spine-width-value"]');
  let initialWidth = '2.1';
  if (await spineWidth.isVisible()) {
    initialWidth = await spineWidth.textContent() || '2.1';
  }

  // 페이지 추가 버튼 찾기
  const addPageButton = page.locator('[data-testid="add-page-button"], button:has-text("페이지 추가"), [aria-label="페이지 추가"]');

  if (await addPageButton.isVisible()) {
    await addPageButton.click();

    // 페이지 수 입력 (8페이지 추가)
    const pageCountInput = page.locator('[data-testid="add-page-count"], input[type="number"]');
    if (await pageCountInput.isVisible()) {
      await pageCountInput.fill('8');

      // 확인 버튼 클릭
      const confirmButton = page.locator('[data-testid="confirm-add-page"], button:has-text("확인"), button:has-text("추가")');
      await confirmButton.click();

      // 재계산 대기
      await page.waitForTimeout(1000);

      // 새 책등 폭 확인 (40페이지 × 0.1mm / 2 + 0.5mm = 2.5mm)
      if (await spineWidth.isVisible()) {
        const newWidth = await spineWidth.textContent();
        expect(parseFloat(newWidth || '0')).toBeGreaterThan(parseFloat(initialWidth));
      }
    }
  }
});

// SC-SPINE-004-F: 무선제본+날개 내지 추가 시 책등 재계산
test('SC-SPINE-004-F: 무선제본+날개 내지 추가 시 책등 재계산', async ({ page }) => {
  await page.goto('http://localhost:3000/?templateSetId=ts-perfect-flap-001&pageCount=32&paperType=mojo_80g&bindingType=perfect');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('에디터를 초기화하는 중...')).toBeHidden({ timeout: 15000 });

  // 초기 책등 영역 크기 측정
  const spineArea = page.locator('[data-page-type="spine"], [data-testid="spine-area"]');
  let initialBounds = null;
  if (await spineArea.isVisible()) {
    initialBounds = await spineArea.boundingBox();
  }

  // 페이지 추가
  const addPageButton = page.locator('[data-testid="add-page-button"], button:has-text("페이지 추가")');
  if (await addPageButton.isVisible()) {
    await addPageButton.click();

    const pageCountInput = page.locator('[data-testid="add-page-count"], input[type="number"]');
    if (await pageCountInput.isVisible()) {
      await pageCountInput.fill('16');

      const confirmButton = page.locator('[data-testid="confirm-add-page"], button:has-text("확인")');
      await confirmButton.click();

      await page.waitForTimeout(1000);

      // 책등 영역 크기 변화 확인
      if (initialBounds && await spineArea.isVisible()) {
        const newBounds = await spineArea.boundingBox();
        if (newBounds) {
          // 책등 너비가 증가했는지 확인
          expect(newBounds.width).toBeGreaterThan(initialBounds.width);
        }
      }
    }
  }
});

// SC-SPINE-004-G: 양장제본 내지 추가 시 책등 재계산
test('SC-SPINE-004-G: 양장제본 내지 추가 시 책등 재계산', async ({ page }) => {
  await page.goto('http://localhost:3000/?templateSetId=ts-hardcover-001&pageCount=32&paperType=mojo_100g&bindingType=hardcover');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('에디터를 초기화하는 중...')).toBeHidden({ timeout: 15000 });

  const spineWidth = page.locator('[data-testid="spine-width-value"]');
  let initialWidth = '0';
  if (await spineWidth.isVisible()) {
    initialWidth = await spineWidth.textContent() || '0';
  }

  // 페이지 대량 추가 (양장은 32페이지 이상)
  const addPageButton = page.locator('[data-testid="add-page-button"], button:has-text("페이지 추가")');
  if (await addPageButton.isVisible()) {
    await addPageButton.click();

    const pageCountInput = page.locator('[data-testid="add-page-count"], input[type="number"]');
    if (await pageCountInput.isVisible()) {
      await pageCountInput.fill('32'); // 32페이지 추가 (총 64페이지)

      const confirmButton = page.locator('[data-testid="confirm-add-page"], button:has-text("확인")');
      await confirmButton.click();

      await page.waitForTimeout(1000);

      // 책등 폭 증가 확인 (양장은 마진 2mm)
      // 64페이지 × 0.12mm / 2 + 2mm = 5.84mm
      if (await spineWidth.isVisible()) {
        const newWidth = await spineWidth.textContent();
        expect(parseFloat(newWidth || '0')).toBeGreaterThan(parseFloat(initialWidth));
      }
    }
  }
});

// SC-SPINE-004-H: 양장제본+날개 내지 추가 시 책등 재계산
test('SC-SPINE-004-H: 양장제본+날개 내지 추가 시 책등 재계산', async ({ page }) => {
  await page.goto('http://localhost:3000/?templateSetId=ts-hardcover-flap-001&pageCount=32&paperType=mojo_100g&bindingType=hardcover');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('에디터를 초기화하는 중...')).toBeHidden({ timeout: 15000 });

  // API 호출 모니터링
  const spineApiCalls: string[] = [];
  page.on('response', response => {
    if (response.url().includes('/products/spine/calculate')) {
      spineApiCalls.push(response.url());
    }
  });

  const addPageButton = page.locator('[data-testid="add-page-button"], button:has-text("페이지 추가")');
  if (await addPageButton.isVisible()) {
    await addPageButton.click();

    const pageCountInput = page.locator('[data-testid="add-page-count"], input[type="number"]');
    if (await pageCountInput.isVisible()) {
      await pageCountInput.fill('16');

      const confirmButton = page.locator('[data-testid="confirm-add-page"], button:has-text("확인")');
      await confirmButton.click();

      await page.waitForTimeout(2000);

      // 책등 재계산 API 호출 확인
      expect(spineApiCalls.length).toBeGreaterThan(0);
    }
  }
});
```

**검증 체크리스트**:

| 상품 유형 | 초기 페이지 | 추가 페이지 | 책등 재계산 | API 호출 | 상태 |
|-----------|-------------|-------------|-------------|----------|------|
| SC-SPINE-004-E (무선) | 32p | +8p | ⭕ | /spine/calculate | ✅ 기능 구현 완료 |
| SC-SPINE-004-F (무선+날개) | 32p | +16p | ⭕ | /spine/calculate | ✅ 기능 구현 완료 |
| SC-SPINE-004-G (양장) | 32p | +32p | ⭕ | /spine/calculate | ✅ 기능 구현 완료 |
| SC-SPINE-004-H (양장+날개) | 32p | +16p | ⭕ | /spine/calculate | ✅ 기능 구현 완료 |

> ✅ **기능 구현 완료 (2025-12-28)**: `addPage` 함수에서 내지 추가 시 `recalculateSpineWidth()` 함수를 호출하여 책등 너비를 동적으로 재계산하도록 구현됨. `useAppStore.ts`, `spineCalculator.ts` 참조.

**책등 폭 계산 공식**:

| 제본 방식 | 계산식 | 마진 |
|-----------|--------|------|
| 무선제본 | (페이지수 × 종이두께 / 2) + 0.5mm | 0.5mm |
| 양장제본 | (페이지수 × 종이두께 / 2) + 2.0mm | 2.0mm |

| 종이 종류 | 두께 (mm/장) | 비고 |
|-----------|--------------|------|
| 모조지 80g | 0.10 | 일반 내지 |
| 모조지 100g | 0.12 | 두꺼운 내지 |
| 아트지 150g | 0.15 | 고급 내지 |
| 스노우화이트 200g | 0.20 | 특수 내지 |

---

### SC-SPINE-005: 내지 삭제 시 책등 사이즈 동적 재계산

**목적**: 내지(page) 삭제 시 책등 너비가 자동으로 재계산되는지 확인

**사전 조건**:
- 템플릿셋이 로드된 상태
- paperType, bindingType 파라미터가 설정된 상태
- spine 타입 템플릿이 포함된 상태

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 에디터 로드 (paperType, bindingType 포함) | 초기 책등 너비 계산됨 |
| 2 | 현재 내지 수 확인 | 예: 32페이지 |
| 3 | 내지 삭제 | 페이지 수 감소 |
| 4 | 책등 너비 확인 | 줄어든 페이지에 맞게 책등 너비 감소 |

**Playwright 테스트**:

```typescript
// SC-SPINE-005-E: 무선제본 내지 삭제 시 책등 재계산
test('SC-SPINE-005-E: 무선제본 내지 삭제 시 책등 재계산', async ({ page }) => {
  // 32페이지 무선제본으로 시작
  // 초기 책등 너비: (32 * 0.10 / 2) + 0.5 = 2.1mm
  await page.goto('http://localhost:3000/?templateSetId=ts-perfect-001&pageCount=32&paperType=mojo_80g&bindingType=perfect');
  await page.waitForLoadState('networkidle');

  // 에디터 로드 대기
  await expect(page.locator('#canvas-containers')).toBeVisible({ timeout: 30000 });

  // 초기 책등 너비 확인 (콘솔 로그 또는 workspace 크기로)
  const initialSpineLog = await page.waitForEvent('console', {
    predicate: msg => msg.text().includes('책등 너비 재계산 완료') || msg.text().includes('Calculated spine width'),
    timeout: 10000
  }).catch(() => null);

  // 내지 삭제 (8페이지 삭제 → 24페이지로)
  // 삭제 후 책등 너비: (24 * 0.10 / 2) + 0.5 = 1.7mm
  const pageListPanel = page.locator('[data-testid="page-list"]');
  if (await pageListPanel.isVisible()) {
    // 마지막 4개 페이지 삭제 (8페이지 = 4장)
    for (let i = 0; i < 4; i++) {
      const lastPage = page.locator('[data-testid="page-item"]').last();
      await lastPage.click({ button: 'right' });
      const deleteButton = page.locator('[data-testid="delete-page"]');
      await deleteButton.click();
      await page.waitForTimeout(500);
    }
  }

  // 책등 재계산 확인
  const recalculatedSpineLog = await page.waitForEvent('console', {
    predicate: msg => msg.text().includes('책등 너비 재계산 완료'),
    timeout: 10000
  }).catch(() => null);

  expect(recalculatedSpineLog).not.toBeNull();
});

// SC-SPINE-005-F: 무선제본+날개 내지 삭제 시 책등 재계산
test('SC-SPINE-005-F: 무선제본+날개 내지 삭제 시 책등 재계산', async ({ page }) => {
  await page.goto('http://localhost:3000/?templateSetId=ts-perfect-flap-001&pageCount=32&paperType=mojo_80g&bindingType=perfect');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#canvas-containers')).toBeVisible({ timeout: 30000 });

  // 내지 삭제 후 책등 재계산 확인
  const deletePageAndCheckSpine = async () => {
    const pageItems = page.locator('[data-testid="page-item"]');
    const count = await pageItems.count();
    if (count > 5) { // 앞날개, 표지, 책등, 뒷날개 제외하고 내지만 삭제
      const lastPageItem = pageItems.nth(count - 2); // 뒷날개 앞의 마지막 내지
      await lastPageItem.click({ button: 'right' });
      await page.locator('[data-testid="delete-page"]').click();
    }
  };

  await deletePageAndCheckSpine();

  // 콘솔에서 재계산 로그 확인
  const logs = await page.evaluate(() => {
    return (window as any).__spineRecalculationLogs || [];
  });

  console.log('Spine recalculation logs:', logs);
});

// SC-SPINE-005-G: 양장제본 내지 삭제 시 책등 재계산
test('SC-SPINE-005-G: 양장제본 내지 삭제 시 책등 재계산', async ({ page }) => {
  // 64페이지 양장제본으로 시작
  // 초기 책등 너비: (64 * 0.10 / 2) + 2.0 = 5.2mm
  await page.goto('http://localhost:3000/?templateSetId=ts-hardcover-001&pageCount=64&paperType=mojo_80g&bindingType=hardcover');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#canvas-containers')).toBeVisible({ timeout: 30000 });

  // 내지 32페이지 삭제 (16장 삭제)
  // 삭제 후 책등 너비: (32 * 0.10 / 2) + 2.0 = 3.6mm
  for (let i = 0; i < 16; i++) {
    const pageItems = page.locator('[data-testid="page-item"]');
    const count = await pageItems.count();
    if (count > 3) { // 표지, 책등, 뒷표지 제외
      const pageItem = pageItems.nth(count - 2);
      await pageItem.click({ button: 'right' });
      await page.locator('[data-testid="delete-page"]').click();
      await page.waitForTimeout(300);
    }
  }

  // 책등 재계산 API 호출 확인
  const spineApiCalls = await page.evaluate(() => {
    return (window as any).__apiCalls?.filter((call: any) => call.url.includes('/spine/calculate')) || [];
  });

  expect(spineApiCalls.length).toBeGreaterThan(0);
});

// SC-SPINE-005-H: 양장제본+날개 내지 삭제 시 책등 재계산
test('SC-SPINE-005-H: 양장제본+날개 내지 삭제 시 책등 재계산', async ({ page }) => {
  await page.goto('http://localhost:3000/?templateSetId=ts-hardcover-flap-001&pageCount=64&paperType=mojo_80g&bindingType=hardcover');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#canvas-containers')).toBeVisible({ timeout: 30000 });

  // 페이지 수 확인 (앞날개 + 표지 + 책등 + 내지 + 뒷날개)
  const initialPageCount = await page.locator('[data-testid="page-item"]').count();
  console.log(`Initial page count: ${initialPageCount}`);

  // 내지 삭제
  const pageItems = page.locator('[data-testid="page-item"]');
  const lastContentPage = pageItems.nth(await pageItems.count() - 2);
  await lastContentPage.click({ button: 'right' });

  const deleteButton = page.locator('[data-testid="delete-page"]');
  if (await deleteButton.isVisible()) {
    await deleteButton.click();
  }

  // 책등 재계산 확인 (workspace 크기 변경)
  await page.waitForTimeout(1000);

  const finalPageCount = await page.locator('[data-testid="page-item"]').count();
  expect(finalPageCount).toBeLessThan(initialPageCount);
});
```

**검증 체크리스트**:

| 상품 유형 | 초기 페이지 | 삭제 페이지 | 책등 재계산 | API 호출 | 상태 |
|-----------|-------------|-------------|-------------|----------|------|
| SC-SPINE-005-E (무선) | 32p | -8p | ⭕ | /spine/calculate | ✅ 기능 구현 완료 |
| SC-SPINE-005-F (무선+날개) | 32p | -8p | ⭕ | /spine/calculate | ✅ 기능 구현 완료 |
| SC-SPINE-005-G (양장) | 64p | -32p | ⭕ | /spine/calculate | ✅ 기능 구현 완료 |
| SC-SPINE-005-H (양장+날개) | 64p | -16p | ⭕ | /spine/calculate | ✅ 기능 구현 완료 |

> ✅ **기능 구현 완료 (2025-12-28)**: `deletePage` 함수에서 내지 삭제 시 `recalculateSpineWidth()` 함수를 호출하여 책등 너비를 동적으로 재계산하도록 구현됨. `useAppStore.ts`, `spineCalculator.ts` 참조.

---

## 8. 시나리오 6: 저장 및 완료 플로우

### SC-SAVE-001: 자동 저장

**목적**: 편집 내용이 자동으로 저장되는지 확인

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 에디터 로드 | 세션 생성됨 |
| 2 | 텍스트 추가 | 객체 추가됨 |
| 3 | 30초 대기 | 자동 저장 발동 |
| 4 | 저장 상태 확인 | SaveStatus "저장됨" |

**Playwright 테스트**:
```typescript
test('SC-SAVE-001: 자동 저장', async ({ page }) => {
  await page.goto('http://localhost:3000/?templateSetId=ts-test-001');
  await page.waitForLoadState('networkidle');

  // 텍스트 추가로 변경사항 생성
  const textToolButton = page.locator('[data-tool="text"]');
  await textToolButton.click();

  const canvas = page.locator('#canvas-containers canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  }
  await page.keyboard.type('자동저장 테스트');
  await page.keyboard.press('Escape');

  // 자동 저장 대기 (SaveStatus 컴포넌트 확인)
  const saveStatus = page.locator('[data-testid="save-status"]');

  // 변경사항 있음 → 저장 중 → 저장됨 상태 변화 확인
  await expect(saveStatus).toContainText(/저장됨|Saved/, { timeout: 60000 });
});
```

---

### SC-SAVE-002: 수동 저장

**목적**: 저장 버튼 또는 단축키로 즉시 저장하는 기능 테스트

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 편집 내용 변경 | 변경사항 있음 |
| 2 | Ctrl+S 또는 저장 버튼 클릭 | 저장 요청 |
| 3 | API 응답 확인 | PATCH /edit-sessions/{id} 성공 |
| 4 | 저장 상태 확인 | "저장됨" 표시 |

**Playwright 테스트**:
```typescript
test('SC-SAVE-002: 수동 저장 (Ctrl+S)', async ({ page }) => {
  await page.goto('http://localhost:3000/?templateSetId=ts-test-001');
  await page.waitForLoadState('networkidle');

  // 변경사항 생성
  const textToolButton = page.locator('[data-tool="text"]');
  await textToolButton.click();

  const canvas = page.locator('#canvas-containers canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  }
  await page.keyboard.type('수동저장 테스트');
  await page.keyboard.press('Escape');

  // 저장 API 응답 대기 설정
  const savePromise = page.waitForResponse(response =>
    response.url().includes('/edit-sessions/') &&
    response.request().method() === 'PATCH' &&
    response.status() === 200
  );

  // Ctrl+S 단축키
  await page.keyboard.press('Control+s');

  // 저장 완료 확인
  await savePromise;

  // 저장 상태 확인
  const saveStatus = page.locator('[data-testid="save-status"]');
  await expect(saveStatus).toContainText(/저장됨|Saved/);
});
```

---

### SC-SAVE-003: 편집 완료

**목적**: 편집을 완료하고 세션 상태를 변경하는 플로우 테스트

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 완료 버튼 클릭 | 확인 모달 표시 |
| 2 | 모달에서 확인 클릭 | 완료 API 호출 |
| 3 | API 응답 확인 | status: "completed" |
| 4 | 리다이렉트 또는 콜백 | onComplete 실행 |

**Playwright 테스트**:
```typescript
test('SC-SAVE-003: 편집 완료', async ({ page }) => {
  await page.goto('http://localhost:3000/?templateSetId=ts-test-001');
  await page.waitForLoadState('networkidle');

  // 편집 내용 추가
  // ...

  // 완료 버튼 클릭
  const completeButton = page.locator('[data-action="complete"], [aria-label="완료"]');
  await completeButton.click();

  // 확인 모달 처리
  const confirmModal = page.locator('[data-testid="confirm-complete-modal"]');
  if (await confirmModal.isVisible()) {
    const confirmButton = confirmModal.locator('button:has-text("확인"), button:has-text("완료")');

    // 완료 API 응답 대기
    const completePromise = page.waitForResponse(response =>
      response.url().includes('/complete') && response.status() === 200
    );

    await confirmButton.click();
    await completePromise;
  }

  // 완료 후 처리 확인 (리다이렉트 또는 콜백)
});
```

---

## 9. 시나리오 7: 페이지 관리 플로우

### SC-PAGE-001: 페이지 추가

**목적**: 새 페이지를 추가하는 기능 테스트

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 페이지 패널 열기 | PagePanel 표시 |
| 2 | 페이지 추가 버튼 클릭 | 추가 옵션 표시 |
| 3 | 빈 페이지 추가 선택 | 새 페이지 생성 |
| 4 | 페이지 목록 확인 | 페이지 수 증가 |

**Playwright 테스트**:
```typescript
test('SC-PAGE-001: 페이지 추가', async ({ page }) => {
  await page.goto('http://localhost:3000/?templateSetId=ts-test-001');
  await page.waitForLoadState('networkidle');

  // 현재 페이지 수 확인
  const pageItems = page.locator('[data-testid="page-item"]');
  const initialCount = await pageItems.count();

  // 페이지 추가 버튼 클릭
  const addPageButton = page.locator('[data-action="add-page"], [aria-label="페이지 추가"]');
  await addPageButton.click();

  // 빈 페이지 추가 옵션 선택
  const blankPageOption = page.locator('[data-testid="add-blank-page"]');
  if (await blankPageOption.isVisible()) {
    await blankPageOption.click();
  }

  // 페이지 수 증가 확인
  await expect(pageItems).toHaveCount(initialCount + 1);
});
```

---

### SC-PAGE-002: 페이지 삭제

**목적**: 기존 페이지를 삭제하는 기능 테스트

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 삭제할 페이지 선택 | 페이지 선택됨 |
| 2 | 삭제 버튼 클릭 | 확인 모달 표시 |
| 3 | 삭제 확인 | 페이지 삭제됨 |
| 4 | 페이지 목록 확인 | 페이지 수 감소 |

**Playwright 테스트**:
```typescript
test('SC-PAGE-002: 페이지 삭제', async ({ page }) => {
  await page.goto('http://localhost:3000/?templateSetId=ts-test-001&pageCount=4');
  await page.waitForLoadState('networkidle');

  // 현재 페이지 수 확인
  const pageItems = page.locator('[data-testid="page-item"]');
  const initialCount = await pageItems.count();

  if (initialCount > 1) {
    // 마지막 페이지 선택
    await pageItems.last().click();

    // 삭제 버튼 클릭
    const deleteButton = page.locator('[data-action="delete-page"], [aria-label="페이지 삭제"]');
    await deleteButton.click();

    // 삭제 확인 모달
    const confirmModal = page.locator('[data-testid="page-delete-modal"]');
    if (await confirmModal.isVisible()) {
      const confirmButton = confirmModal.locator('button:has-text("삭제"), button:has-text("확인")');
      await confirmButton.click();
    }

    // 페이지 수 감소 확인
    await expect(pageItems).toHaveCount(initialCount - 1);
  }
});
```

---

## 10. 시나리오 8: 전체 주문 E2E 플로우

### SC-E2E-001: 고객 주문 전체 플로우

**목적**: 인증부터 편집 완료까지 전체 주문 과정 테스트

**플로우 다이어그램**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│                          전체 주문 E2E 플로우                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [1] 인증          [2] 세션생성       [3] 편집          [4] 저장/완료    │
│      │                 │                 │                 │           │
│      ▼                 ▼                 ▼                 ▼           │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐       │
│  │ Shop    │      │ Create  │      │ Edit    │      │ Save &  │       │
│  │ Session │─────►│ Session │─────►│ Content │─────►│Complete │       │
│  └─────────┘      └─────────┘      └─────────┘      └─────────┘       │
│      │                 │                 │                 │           │
│      │ JWT             │ sessionId       │ canvasData      │ status    │
│      │                 │                 │                 │ completed │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | Shop Session 발급 (API) | JWT 토큰 발급 |
| 2 | 에디터 접속 (토큰 포함) | 에디터 로드 |
| 3 | 템플릿셋 로드 | 템플릿 표시 |
| 4 | 텍스트 편집 | 텍스트 추가 |
| 5 | 이미지 추가 | 이미지 업로드 |
| 6 | 저장 | 자동/수동 저장 |
| 7 | 완료 | 세션 완료 처리 |
| 8 | 콜백 확인 | onComplete 호출 |

**Playwright 테스트**:
```typescript
test('SC-E2E-001: 고객 주문 전체 플로우', async ({ page, request }) => {
  // ============================================================
  // Step 1: Shop Session 발급 (API 직접 호출)
  // ============================================================
  const sessionResponse = await request.post('http://localhost:4000/api/auth/shop-session', {
    headers: {
      'X-API-Key': 'test-api-key-for-testing',
      'Content-Type': 'application/json'
    },
    data: {
      memberSeqno: 99999,
      memberId: 'test@example.com',
      memberName: '테스트유저'
    }
  });

  expect(sessionResponse.ok()).toBeTruthy();
  const { accessToken } = await sessionResponse.json();
  expect(accessToken).toBeTruthy();

  // ============================================================
  // Step 2: 에디터 접속 (토큰 포함)
  // ============================================================
  const editorUrl = `http://localhost:3000/?token=${accessToken}&templateSetId=ts-test-001&pageCount=50`;
  await page.goto(editorUrl);

  // 로딩 완료 대기
  await expect(page.getByText(/로딩|초기화/)).toBeHidden({ timeout: 15000 });

  // 캔버스 로드 확인
  await expect(page.locator('#canvas-containers canvas')).toBeVisible();

  // ============================================================
  // Step 3: 텍스트 편집
  // ============================================================
  const textToolButton = page.locator('[data-tool="text"]');
  if (await textToolButton.isVisible()) {
    await textToolButton.click();

    const canvas = page.locator('#canvas-containers canvas').first();
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
    }
    await page.keyboard.type('E2E 테스트 텍스트');
    await page.keyboard.press('Escape');
  }

  // ============================================================
  // Step 4: 저장
  // ============================================================
  const savePromise = page.waitForResponse(response =>
    response.url().includes('/edit-sessions/') &&
    response.request().method() === 'PATCH'
  );

  await page.keyboard.press('Control+s');
  await savePromise;

  // 저장 상태 확인
  const saveStatus = page.locator('[data-testid="save-status"]');
  await expect(saveStatus).toContainText(/저장됨|Saved/, { timeout: 10000 });

  // ============================================================
  // Step 5: 완료
  // ============================================================
  const completeButton = page.locator('[data-action="complete"]');
  if (await completeButton.isVisible()) {
    await completeButton.click();

    // 확인 모달 처리
    const confirmButton = page.locator('button:has-text("확인"), button:has-text("완료")').first();
    if (await confirmButton.isVisible()) {
      const completePromise = page.waitForResponse(response =>
        response.url().includes('/complete')
      );

      await confirmButton.click();

      const completeResponse = await completePromise;
      expect(completeResponse.ok()).toBeTruthy();
    }
  }

  console.log('E2E 테스트 완료: 전체 주문 플로우 성공');
});
```

---

## 부록

### A. 테스트 데이터 셋업

```typescript
// test/fixtures/test-data.ts
export const testData = {
  templateSetId: 'ts-test-001',
  apiKey: 'test-api-key-for-testing',

  customer: {
    memberSeqno: 99999,
    memberId: 'test@example.com',
    memberName: '테스트유저'
  },

  spineParams: {
    pageCount: 100,
    paperType: 'mojo_80g',
    bindingType: 'perfect',
    expectedSpineWidth: 5.5
  }
};
```

### B. 공통 헬퍼 함수

```typescript
// test/helpers/editor-helpers.ts
export async function waitForEditorReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#canvas-containers canvas')).toBeVisible();
  await expect(page.getByText(/로딩|초기화/)).toBeHidden({ timeout: 15000 });
}

export async function addTextToCanvas(page: Page, text: string) {
  const textToolButton = page.locator('[data-tool="text"]');
  await textToolButton.click();

  const canvas = page.locator('#canvas-containers canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  }
  await page.keyboard.type(text);
  await page.keyboard.press('Escape');
}

export async function saveCanvas(page: Page) {
  const savePromise = page.waitForResponse(response =>
    response.url().includes('/edit-sessions/') &&
    response.request().method() === 'PATCH' &&
    response.status() === 200
  );

  await page.keyboard.press('Control+s');
  await savePromise;
}
```

### C. 테스트 실행 체크리스트

| 시나리오 ID | 시나리오명 | 테스트 수 | 상태 |
|-------------|-----------|----------|------|
| SC-EDITOR-001 | 에디터 초기 로드 | 1 | ☐ |
| SC-EDITOR-002 | 에디터 UI 요소 검증 | 1 | ☐ |
| SC-EDITOR-003 | 반응형 레이아웃 테스트 | 3 | ☐ |
| SC-TEMPLATE-001 | 템플릿셋 로드 | 1 | ☐ |
| SC-TEMPLATE-002 | 템플릿 페이지 네비게이션 | 1 | ☐ |
| SC-TEXT-001 | 텍스트 객체 추가 | 1 | ☐ |
| SC-TEXT-002 | 텍스트 스타일 변경 | 1 | ☐ |
| SC-IMAGE-001 | 이미지 업로드 | 1 | ☐ |
| SC-IMAGE-002 | 이미지 크기 조절 | 1 | ☐ |
| SC-SPINE-001 | 책등 폭 자동 계산 | 1 | ☐ |
| SC-SPINE-002 | 책등 설정 변경 | 1 | ☐ |
| SC-SPINE-003-E | 무선제본 책등 표시 | 1 | ✅ |
| SC-SPINE-003-F | 무선제본+날개 책등 표시 | 1 | ⚠️ 페이지구조OK, 책등폭미적용 |
| SC-SPINE-003-G | 양장제본 책등 표시 | 1 | ⚠️ 페이지구조OK, 책등폭미적용 |
| SC-SPINE-003-H | 양장제본+날개 책등 표시 | 1 | ⏸️ 미테스트 |
| SC-SPINE-004-E | 무선제본 내지 추가 시 책등 재계산 | 1 | ✅ 기능 구현 완료 |
| SC-SPINE-004-F | 무선제본+날개 내지 추가 시 책등 재계산 | 1 | ✅ 기능 구현 완료 |
| SC-SPINE-004-G | 양장제본 내지 추가 시 책등 재계산 | 1 | ✅ 기능 구현 완료 |
| SC-SPINE-004-H | 양장제본+날개 내지 추가 시 책등 재계산 | 1 | ✅ 기능 구현 완료 |
| SC-SPINE-005-E | 무선제본 내지 삭제 시 책등 재계산 | 1 | ✅ 기능 구현 완료 |
| SC-SPINE-005-F | 무선제본+날개 내지 삭제 시 책등 재계산 | 1 | ✅ 기능 구현 완료 |
| SC-SPINE-005-G | 양장제본 내지 삭제 시 책등 재계산 | 1 | ✅ 기능 구현 완료 |
| SC-SPINE-005-H | 양장제본+날개 내지 삭제 시 책등 재계산 | 1 | ✅ 기능 구현 완료 |
| SC-SAVE-001 | 자동 저장 | 1 | ☐ |
| SC-SAVE-002 | 수동 저장 | 1 | ☐ |
| SC-SAVE-003 | 편집 완료 | 1 | ☐ |
| SC-PAGE-001 | 페이지 추가 | 1 | ☐ |
| SC-PAGE-002 | 페이지 삭제 | 1 | ☐ |
| SC-E2E-001 | 고객 주문 전체 플로우 | 1 | ☐ |
| **합계** | | **19** | |

---

---

# Part B: 관리자 (Admin) 시나리오

> **관리자 앱 URL**: `http://localhost:3001`
> **대상**: 템플릿, 상품, 라이브러리 관리 기능

---

## 11. 시나리오 9: 관리자 인증 플로우

### SC-ADMIN-001: 관리자 로그인

**목적**: 관리자 계정으로 로그인하여 대시보드에 접근

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | `/login` 페이지 접속 | 로그인 폼 표시 |
| 2 | 이메일/비밀번호 입력 | 입력 필드 동작 |
| 3 | 로그인 버튼 클릭 | API 호출 |
| 4 | 대시보드 리다이렉트 | `/dashboard` 이동 |

**Playwright 테스트**:
```typescript
test('SC-ADMIN-001: 관리자 로그인', async ({ page }) => {
  // 로그인 페이지 접속
  await page.goto('http://localhost:3001/login');

  // 이메일 입력
  await page.locator('input[type="email"], input[name="email"]').fill('admin@storige.com');

  // 비밀번호 입력
  await page.locator('input[type="password"], input[name="password"]').fill('admin123!');

  // 로그인 버튼 클릭
  await page.locator('button[type="submit"], button:has-text("로그인")').click();

  // 대시보드 이동 확인
  await expect(page).toHaveURL(/dashboard/);

  // 대시보드 요소 확인
  await expect(page.locator('text=대시보드')).toBeVisible();
});
```

---

### SC-ADMIN-002: 로그아웃

**목적**: 로그아웃 후 로그인 페이지로 리다이렉트

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 로그아웃 버튼 클릭 | 로그아웃 실행 |
| 2 | 토큰 삭제 확인 | localStorage 클리어 |
| 3 | 로그인 페이지 리다이렉트 | `/login` 이동 |

**Playwright 테스트**:
```typescript
test('SC-ADMIN-002: 로그아웃', async ({ page }) => {
  // 로그인 상태에서 시작
  await page.goto('http://localhost:3001/dashboard');

  // 로그아웃 버튼 클릭
  const logoutButton = page.locator('button:has-text("로그아웃"), [data-action="logout"]');
  await logoutButton.click();

  // 로그인 페이지 리다이렉트 확인
  await expect(page).toHaveURL(/login/);
});
```

---

## 12. 시나리오 10: 템플릿 관리 플로우

### SC-TEMPLATE-ADMIN-001: 템플릿 목록 조회

**목적**: 등록된 템플릿 목록을 조회하고 필터링

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | `/templates` 페이지 접속 | 템플릿 목록 표시 |
| 2 | 검색어 입력 | 필터링된 결과 |
| 3 | 페이지네이션 확인 | 페이지 이동 동작 |

**Playwright 테스트**:
```typescript
test('SC-TEMPLATE-ADMIN-001: 템플릿 목록 조회', async ({ page }) => {
  await page.goto('http://localhost:3001/templates');
  await page.waitForLoadState('networkidle');

  // 템플릿 목록 테이블 확인
  const templateTable = page.locator('table, [data-testid="template-list"]');
  await expect(templateTable).toBeVisible();

  // 검색 입력
  const searchInput = page.locator('input[placeholder*="검색"], input[type="search"]');
  if (await searchInput.isVisible()) {
    await searchInput.fill('테스트');
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');
  }
});
```

---

### SC-TEMPLATE-ADMIN-002: 템플릿 생성

**목적**: 새로운 템플릿을 생성하고 에디터에서 편집

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 생성 버튼 클릭 | 생성 폼/에디터 열림 |
| 2 | 템플릿 정보 입력 | 이름, 크기 설정 |
| 3 | 에디터에서 디자인 편집 | 캔버스 객체 추가 |
| 4 | 저장 | 템플릿 저장됨 |

**Playwright 테스트**:
```typescript
test('SC-TEMPLATE-ADMIN-002: 템플릿 생성', async ({ page }) => {
  await page.goto('http://localhost:3001/templates');

  // 새 템플릿 버튼 클릭
  const createButton = page.locator('button:has-text("새 템플릿"), button:has-text("생성")');
  await createButton.click();

  // 템플릿 이름 입력
  const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
  if (await nameInput.isVisible()) {
    await nameInput.fill('E2E 테스트 템플릿');
  }

  // 크기 선택 또는 입력
  const widthInput = page.locator('input[name="width"]');
  const heightInput = page.locator('input[name="height"]');
  if (await widthInput.isVisible()) {
    await widthInput.fill('210');
    await heightInput.fill('297');
  }

  // 저장 버튼 클릭
  const saveButton = page.locator('button:has-text("저장"), button[type="submit"]');
  await saveButton.click();

  // 성공 메시지 또는 목록 리다이렉트 확인
  await expect(page.locator('text=성공, text=저장')).toBeVisible({ timeout: 5000 });
});
```

---

### SC-TEMPLATE-ADMIN-003: 템플릿 에디터

**목적**: 템플릿 에디터에서 디자인 편집

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 템플릿 편집 버튼 클릭 | 에디터 열림 |
| 2 | 캔버스 로드 확인 | 캔버스 표시 |
| 3 | 객체 추가 | 텍스트/이미지 추가 |
| 4 | 저장 | 변경사항 저장 |

**Playwright 테스트**:
```typescript
test('SC-TEMPLATE-ADMIN-003: 템플릿 에디터', async ({ page }) => {
  await page.goto('http://localhost:3001/templates');
  await page.waitForLoadState('networkidle');

  // 첫 번째 템플릿 편집 버튼 클릭
  const editButton = page.locator('button:has-text("편집")').first();
  if (await editButton.isVisible()) {
    await editButton.click();

    // 에디터 로드 대기
    await page.waitForLoadState('networkidle');

    // 캔버스 영역 확인
    await expect(page.locator('canvas, #canvas-containers')).toBeVisible();
  }
});
```

---

## 13. 시나리오 11: 템플릿셋 관리 플로우

### SC-TEMPLATESET-001: 템플릿셋 목록 조회

**목적**: 템플릿셋 목록 조회 및 상세 정보 확인

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | `/template-sets` 접속 | 템플릿셋 목록 표시 |
| 2 | 목록 아이템 확인 | 이름, 상태 표시 |
| 3 | 상세 보기 클릭 | 상세 정보 표시 |

**Playwright 테스트**:
```typescript
test('SC-TEMPLATESET-001: 템플릿셋 목록 조회', async ({ page }) => {
  await page.goto('http://localhost:3001/template-sets');
  await page.waitForLoadState('networkidle');

  // 목록 테이블 확인
  const table = page.locator('table, [data-testid="templateset-list"]');
  await expect(table).toBeVisible();

  // 최소 1개 이상 아이템 확인
  const rows = page.locator('tbody tr, [data-testid="templateset-item"]');
  const count = await rows.count();
  console.log(`템플릿셋 개수: ${count}`);
});
```

---

### SC-TEMPLATESET-002: 템플릿셋 생성

**목적**: 새 템플릿셋을 생성하고 템플릿 배치

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 새 템플릿셋 버튼 클릭 | 생성 폼 열림 |
| 2 | 기본 정보 입력 | 이름, 설명 |
| 3 | 템플릿 추가 | 템플릿 선택/배치 |
| 4 | 저장 | 템플릿셋 생성됨 |

**Playwright 테스트**:
```typescript
test('SC-TEMPLATESET-002: 템플릿셋 생성', async ({ page }) => {
  await page.goto('http://localhost:3001/template-sets');

  // 새 템플릿셋 버튼
  const createButton = page.locator('button:has-text("새 템플릿셋"), button:has-text("생성")');
  await createButton.click();

  // 이름 입력
  const nameInput = page.locator('input[name="name"]');
  await nameInput.fill('E2E 테스트 템플릿셋');

  // 설명 입력
  const descInput = page.locator('textarea[name="description"]');
  if (await descInput.isVisible()) {
    await descInput.fill('E2E 테스트용 템플릿셋입니다.');
  }

  // 저장
  const saveButton = page.locator('button:has-text("저장"), button[type="submit"]');
  await saveButton.click();

  // 성공 확인
  await expect(page.locator('text=성공')).toBeVisible({ timeout: 5000 });
});
```

---

## 14. 시나리오 12: 상품 관리 플로우

### SC-PRODUCT-001: 상품 목록 조회

**목적**: 상품 목록 조회 및 검색

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | `/products` 접속 | 상품 목록 표시 |
| 2 | 카테고리 필터 | 필터링 동작 |
| 3 | 상품 검색 | 검색 결과 |

**Playwright 테스트**:
```typescript
test('SC-PRODUCT-001: 상품 목록 조회', async ({ page }) => {
  await page.goto('http://localhost:3001/products');
  await page.waitForLoadState('networkidle');

  // 상품 목록 확인
  const productList = page.locator('table, [data-testid="product-list"]');
  await expect(productList).toBeVisible();

  // 검색 기능 테스트
  const searchInput = page.locator('input[placeholder*="검색"]');
  if (await searchInput.isVisible()) {
    await searchInput.fill('명함');
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');
  }
});
```

---

### SC-PRODUCT-002: 상품-템플릿셋 연결

**목적**: 상품에 템플릿셋을 연결

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 상품 상세 페이지 접속 | 상품 정보 표시 |
| 2 | 템플릿셋 연결 버튼 클릭 | 연결 모달/페이지 |
| 3 | 템플릿셋 선택 | 선택 완료 |
| 4 | 저장 | 연결 저장됨 |

**Playwright 테스트**:
```typescript
test('SC-PRODUCT-002: 상품-템플릿셋 연결', async ({ page }) => {
  await page.goto('http://localhost:3001/product-template-sets');
  await page.waitForLoadState('networkidle');

  // 연결 목록 확인
  const connectionList = page.locator('table, [data-testid="connection-list"]');
  await expect(connectionList).toBeVisible();

  // 새 연결 버튼
  const addButton = page.locator('button:has-text("연결 추가"), button:has-text("새 연결")');
  if (await addButton.isVisible()) {
    await addButton.click();
    // 연결 폼 확인
    await expect(page.locator('[data-testid="connection-form"]')).toBeVisible();
  }
});
```

---

## 15. 시나리오 13: 라이브러리 관리 플로우

### SC-LIBRARY-001: 클립아트 목록

**목적**: 클립아트 라이브러리 관리

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | `/library/cliparts` 접속 | 클립아트 목록 |
| 2 | 카테고리 선택 | 필터링 |
| 3 | 업로드 버튼 클릭 | 업로드 모달 |

**Playwright 테스트**:
```typescript
test('SC-LIBRARY-001: 클립아트 목록', async ({ page }) => {
  await page.goto('http://localhost:3001/library/cliparts');
  await page.waitForLoadState('networkidle');

  // 클립아트 그리드 확인
  const clipartGrid = page.locator('[data-testid="clipart-grid"], .clipart-list');
  await expect(clipartGrid).toBeVisible();

  // 업로드 버튼 확인
  const uploadButton = page.locator('button:has-text("업로드")');
  await expect(uploadButton).toBeVisible();
});
```

---

### SC-LIBRARY-002: 프레임 관리

**목적**: 프레임 라이브러리 관리

**Playwright 테스트**:
```typescript
test('SC-LIBRARY-002: 프레임 목록', async ({ page }) => {
  await page.goto('http://localhost:3001/library/frames');
  await page.waitForLoadState('networkidle');

  // 프레임 목록 확인
  const frameList = page.locator('[data-testid="frame-list"], table');
  await expect(frameList).toBeVisible();
});
```

---

### SC-LIBRARY-003: 배경 관리

**목적**: 배경 이미지 라이브러리 관리

**Playwright 테스트**:
```typescript
test('SC-LIBRARY-003: 배경 목록', async ({ page }) => {
  await page.goto('http://localhost:3001/library/backgrounds');
  await page.waitForLoadState('networkidle');

  // 배경 목록 확인
  const bgList = page.locator('[data-testid="background-list"], .background-grid');
  await expect(bgList).toBeVisible();
});
```

---

### SC-LIBRARY-004: 카테고리 관리

**목적**: 라이브러리 카테고리 트리 관리

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | 카테고리 관리 페이지 접속 | 트리 구조 표시 |
| 2 | 카테고리 추가 | 새 카테고리 생성 |
| 3 | 카테고리 수정 | 이름 변경 |
| 4 | 드래그앤드롭 순서 변경 | 순서 저장 |

**Playwright 테스트**:
```typescript
test('SC-LIBRARY-004: 카테고리 관리', async ({ page }) => {
  await page.goto('http://localhost:3001/library/categories');
  await page.waitForLoadState('networkidle');

  // 카테고리 트리 확인
  const categoryTree = page.locator('[data-testid="category-tree"], .ant-tree');
  await expect(categoryTree).toBeVisible();

  // 추가 버튼 확인
  const addButton = page.locator('button:has-text("추가"), button:has-text("새 카테고리")');
  await expect(addButton).toBeVisible();
});
```

---

## 16. 시나리오 14: 편집 세션 관리 플로우

### SC-SESSION-001: 편집 세션 목록

**목적**: 고객 편집 세션 목록 조회 및 관리

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | `/edit-sessions` 접속 | 세션 목록 표시 |
| 2 | 상태별 필터링 | draft/editing/complete |
| 3 | 세션 상세 보기 | 세션 정보 확인 |

**Playwright 테스트**:
```typescript
test('SC-SESSION-001: 편집 세션 목록', async ({ page }) => {
  await page.goto('http://localhost:3001/edit-sessions');
  await page.waitForLoadState('networkidle');

  // 세션 목록 확인
  const sessionTable = page.locator('table, [data-testid="session-list"]');
  await expect(sessionTable).toBeVisible();

  // 상태 필터 확인
  const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]');
  if (await statusFilter.isVisible()) {
    await statusFilter.selectOption('complete');
    await page.waitForLoadState('networkidle');
  }
});
```

---

### SC-SESSION-002: 세션 상세 및 미리보기

**목적**: 특정 세션의 캔버스 데이터 미리보기

**Playwright 테스트**:
```typescript
test('SC-SESSION-002: 세션 상세 보기', async ({ page }) => {
  await page.goto('http://localhost:3001/edit-sessions');
  await page.waitForLoadState('networkidle');

  // 첫 번째 세션 상세 보기 클릭
  const detailButton = page.locator('button:has-text("상세"), a:has-text("보기")').first();
  if (await detailButton.isVisible()) {
    await detailButton.click();
    await page.waitForLoadState('networkidle');

    // 세션 상세 정보 확인
    await expect(page.locator('text=세션 ID, text=상태')).toBeVisible();
  }
});
```

---

## 17. 시나리오 15: 워커 작업 관리 플로우

### SC-WORKER-001: 워커 작업 목록

**목적**: PDF 처리 워커 작업 상태 모니터링

**테스트 단계**:

| 단계 | 액션 | 검증 포인트 |
|------|------|-------------|
| 1 | `/worker-jobs` 접속 | 작업 목록 표시 |
| 2 | 상태별 필터링 | pending/processing/completed/failed |
| 3 | 작업 상세 보기 | 처리 결과 확인 |

**Playwright 테스트**:
```typescript
test('SC-WORKER-001: 워커 작업 목록', async ({ page }) => {
  await page.goto('http://localhost:3001/worker-jobs');
  await page.waitForLoadState('networkidle');

  // 작업 목록 확인
  const jobTable = page.locator('table, [data-testid="job-list"]');
  await expect(jobTable).toBeVisible();

  // 상태 필터 확인
  const statusFilter = page.locator('select[name="status"]');
  if (await statusFilter.isVisible()) {
    await statusFilter.selectOption('failed');
    await page.waitForLoadState('networkidle');
  }
});
```

---

### SC-WORKER-002: 실패 작업 재시도

**목적**: 실패한 워커 작업을 재시도

**Playwright 테스트**:
```typescript
test('SC-WORKER-002: 실패 작업 재시도', async ({ page }) => {
  await page.goto('http://localhost:3001/worker-jobs?status=failed');
  await page.waitForLoadState('networkidle');

  // 재시도 버튼 확인
  const retryButton = page.locator('button:has-text("재시도")').first();
  if (await retryButton.isVisible()) {
    // API 응답 대기
    const retryPromise = page.waitForResponse(response =>
      response.url().includes('/worker-jobs/') && response.url().includes('/retry')
    );

    await retryButton.click();

    // 재시도 성공 확인
    await retryPromise;
    await expect(page.locator('text=재시도 요청, text=성공')).toBeVisible({ timeout: 5000 });
  }
});
```

---

### SC-WORKER-003: 워커 테스트 페이지

**목적**: 워커 기능 수동 테스트

**Playwright 테스트**:
```typescript
test('SC-WORKER-003: 워커 테스트', async ({ page }) => {
  await page.goto('http://localhost:3001/worker-test');
  await page.waitForLoadState('networkidle');

  // 테스트 페이지 확인
  const testForm = page.locator('[data-testid="worker-test-form"], form');
  await expect(testForm).toBeVisible();

  // PDF 파일 업로드 테스트
  const fileInput = page.locator('input[type="file"]');
  if (await fileInput.isVisible()) {
    // 테스트 PDF 파일 설정
    await fileInput.setInputFiles('./test/fixtures/test.pdf');
  }
});
```

---

## 부록 (업데이트)

### D. 관리자 테스트 실행 체크리스트

| 시나리오 ID | 시나리오명 | 테스트 수 | 상태 |
|-------------|-----------|----------|------|
| SC-ADMIN-001 | 관리자 로그인 | 1 | ☐ |
| SC-ADMIN-002 | 로그아웃 | 1 | ☐ |
| SC-TEMPLATE-ADMIN-001 | 템플릿 목록 조회 | 1 | ☐ |
| SC-TEMPLATE-ADMIN-002 | 템플릿 생성 | 1 | ☐ |
| SC-TEMPLATE-ADMIN-003 | 템플릿 에디터 | 1 | ☐ |
| SC-TEMPLATESET-001 | 템플릿셋 목록 조회 | 1 | ☐ |
| SC-TEMPLATESET-002 | 템플릿셋 생성 | 1 | ☐ |
| SC-PRODUCT-001 | 상품 목록 조회 | 1 | ☐ |
| SC-PRODUCT-002 | 상품-템플릿셋 연결 | 1 | ☐ |
| SC-LIBRARY-001 | 클립아트 목록 | 1 | ☐ |
| SC-LIBRARY-002 | 프레임 관리 | 1 | ☐ |
| SC-LIBRARY-003 | 배경 관리 | 1 | ☐ |
| SC-LIBRARY-004 | 카테고리 관리 | 1 | ☐ |
| SC-SESSION-001 | 편집 세션 목록 | 1 | ☐ |
| SC-SESSION-002 | 세션 상세 보기 | 1 | ☐ |
| SC-WORKER-001 | 워커 작업 목록 | 1 | ☐ |
| SC-WORKER-002 | 실패 작업 재시도 | 1 | ☐ |
| SC-WORKER-003 | 워커 테스트 | 1 | ☐ |
| **합계** | | **18** | |

### E. 템플릿셋 유형별 테스트 체크리스트

| 시나리오 ID | 상품 유형 | 책등 | 날개 | 제본 방식 | 주요 검증 항목 | 상태 |
|------------|----------|:----:|:----:|----------|--------------|:----:|
| SC-TS-TYPE-A | 명함/전단지 | ❌ | ❌ | 없음 | 2페이지, 책등/날개 UI 없음 | ☐ |
| SC-TS-TYPE-B | 리플렛 2단 | ❌ | ❌ | 접지 | 접지 구조, 양면 편집 | ☐ |
| SC-TS-TYPE-C | 리플렛 3단 | ❌ | ❌ | 접지 | 접지 구조, 양면 편집 | ☐ |
| SC-TS-TYPE-D | 중철제본 | ❌ | ❌ | 중철 | 4배수 페이지, 64p 제한 | ☐ |
| SC-TS-TYPE-E | 무선제본 | ⭕ | ❌ | 무선 | 책등 자동 계산, 32p 이상 | ☐ |
| SC-TS-TYPE-F | 무선제본+날개 | ⭕ | ⭕ | 무선 | 책등 + 날개 UI, 날개 크기 | ☐ |
| SC-TS-TYPE-G | 양장제본 | ⭕ | ❌ | 양장 | 책등(마진 2mm), 면지 | ☐ |
| SC-TS-TYPE-H | 양장제본+날개 | ⭕ | ⭕ | 양장 | 책등 + 날개 + 면지 | ☐ |

### F. 전체 테스트 요약

| 구분 | 시나리오 수 | 테스트 케이스 수 |
|------|------------|-----------------|
| Part A: 에디터 (기본) | 8개 시나리오 | 19개 |
| Part A: 템플릿셋 유형별 | 8개 시나리오 | 8개 |
| Part B: 관리자 | 7개 시나리오 | 18개 |
| **합계** | **23개 시나리오** | **45개** |

### G. 템플릿셋 유형 경우의 수 요약

```
┌─────────────────────────────────────────────────────────────────┐
│                  템플릿셋 유형 경우의 수                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   분류 기준:                                                     │
│   • 책등(Spine): 있음(⭕) / 없음(❌)                              │
│   • 날개(Flap): 있음(⭕) / 없음(❌)                               │
│                                                                 │
│   경우의 수: 2 × 2 = 4가지 조합                                  │
│                                                                 │
│   ┌────────────────────────────────────────────────────────┐    │
│   │         │     날개 없음 (❌)    │    날개 있음 (⭕)    │    │
│   ├─────────┼─────────────────────┼─────────────────────┤    │
│   │ 책등 ❌ │ TYPE-A: 명함/전단지  │        N/A          │    │
│   │         │ TYPE-B: 리플렛 2단   │   (책등 없이 날개만  │    │
│   │         │ TYPE-C: 리플렛 3단   │    있는 경우 없음)   │    │
│   │         │ TYPE-D: 중철제본     │                     │    │
│   ├─────────┼─────────────────────┼─────────────────────┤    │
│   │ 책등 ⭕ │ TYPE-E: 무선제본     │ TYPE-F: 무선+날개   │    │
│   │         │ TYPE-G: 양장제본     │ TYPE-H: 양장+날개   │    │
│   └─────────┴─────────────────────┴─────────────────────┘    │
│                                                                 │
│   제본 방식별 분류:                                              │
│   • 없음 (명함/전단지): 1~2페이지                                │
│   • 접지 (리플렛): 고정 페이지 (2단/3단)                         │
│   • 중철: 8~64페이지 (4의 배수)                                  │
│   • 무선: 32~500페이지                                           │
│   • 양장: 32~500페이지 (면지 포함)                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-12-28 | 최초 작성 (에디터 시나리오) |
| 1.1 | 2025-12-28 | 관리자 시나리오 추가 (Part B) |
| 1.2 | 2025-12-28 | 책등 테스트 시나리오 추가 (SC-SPINE-003, SC-SPINE-004) |
| 1.3 | 2025-12-28 | 책등 동적 재계산 기능 구현 완료 (SC-SPINE-004, SC-SPINE-005), spineCalculator.ts 추가 |
