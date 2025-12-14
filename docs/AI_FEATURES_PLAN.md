# AI 기반 템플릿 추천/생성 시스템

> 작성일: 2024-12-14
> 버전: 1.0 (PoC 구현 완료)
> 상태: 개발 완료, 테스트 대기

---

## 1. 개요

### 1.1 목적

사용자 경험 향상을 위한 AI 기반 부가 기능 제공:

1. **템플릿 추천**: 사용자 취향/행동 기반 ML 추천
2. **템플릿 생성**: 프롬프트 기반 AI 템플릿 자동 생성

### 1.2 기능 활성화

AI 기능은 **기본 비활성화** 상태이며, 환경변수로 제어합니다:

```bash
# API (.env)
AI_ENABLED=false  # true로 변경하여 활성화

# Frontend (.env)
VITE_AI_ENABLED=false  # true로 변경하여 활성화
```

### 1.3 기술 스택

| 구성요소 | 기술 | 용도 |
|---------|------|------|
| LLM | Claude 3.5 Sonnet | 레이아웃 구조 생성 |
| 이미지 생성 | FLUX.1 Pro (Replicate) | 템플릿 이미지 생성 |
| 벡터 유사도 | 코사인 유사도 (128차원) | ML 추천 알고리즘 |
| Queue | Bull (Redis) | 비동기 생성 작업 처리 |

---

## 2. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Editor)                       │
├─────────────────────────────────────────────────────────────┤
│  [LazyAiPanel]                                              │
│  ├─ RecommendationPanel   # 추천 UI                         │
│  │   ├─ 선호도 설정                                         │
│  │   ├─ 추천 목록 (점수, 이유)                               │
│  │   └─ 좋아요/싫어요 피드백                                 │
│  │                                                          │
│  └─ GenerationPanel       # 생성 UI                         │
│      ├─ 프롬프트 입력                                       │
│      ├─ 옵션 선택 (스타일, 색상, 페이지 수)                   │
│      ├─ 생성 진행률                                         │
│      └─ 결과 미리보기/수락/거절                              │
│                                                              │
│  * VITE_AI_ENABLED=false 시 tree-shaking으로 번들 미포함     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                      API Layer (NestJS)                        │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  AiModule (AI_ENABLED=true 시에만 로드)                        │
│  ├─ AiController                                               │
│  │   ├─ POST /ai/recommendations    # 추천 조회               │
│  │   ├─ POST /ai/preferences        # 선호도 저장             │
│  │   ├─ POST /ai/feedback           # 피드백 제출             │
│  │   ├─ POST /ai/generate           # 생성 시작               │
│  │   ├─ GET  /ai/generate/:id       # 생성 상태 조회          │
│  │   ├─ POST /ai/generate/:id/accept  # 결과 수락             │
│  │   └─ POST /ai/generate/:id/reject  # 결과 거절             │
│  │                                                             │
│  ├─ Services                                                   │
│  │   ├─ RecommendationService     # ML 추천 로직              │
│  │   ├─ GenerationService         # 템플릿 생성 로직          │
│  │   └─ FeatureExtractionService  # 템플릿 특성 추출          │
│  │                                                             │
│  └─ Providers                                                  │
│      ├─ LlmService       # Claude API 연동                    │
│      └─ FluxImageService # Replicate FLUX API 연동            │
│                                                                │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                      Data Layer (MariaDB)                       │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  template_features     # 템플릿 특성 벡터 (128차원)             │
│  ├─ templateId (PK, FK → templates)                            │
│  ├─ dominantColors[]   # 주요 색상                             │
│  ├─ colorHarmony       # 색상 조화 (monochrome, complementary) │
│  ├─ complexity         # 복잡도 (minimal, moderate, complex)   │
│  ├─ mood               # 분위기 (professional, casual, etc.)   │
│  ├─ featureVector[]    # ML 임베딩 벡터                        │
│  └─ selectionCount     # 선택 횟수 (인기도)                    │
│                                                                 │
│  user_preferences      # 사용자 선호도                         │
│  ├─ userId (PK, FK → users)                                    │
│  ├─ preferredStyles[]  # 선호 스타일                           │
│  ├─ preferredColors    # 선호 색상 팔레트                      │
│  ├─ industryCategory   # 업종                                  │
│  └─ preferenceVector[] # ML 임베딩 벡터                        │
│                                                                 │
│  ai_generations        # 생성 작업 기록                        │
│  ├─ id (PK)                                                    │
│  ├─ userId (FK → users)                                        │
│  ├─ prompt             # 사용자 입력 프롬프트                  │
│  ├─ options            # 생성 옵션 (JSON)                      │
│  ├─ status             # 상태 (pending → completed/failed)     │
│  ├─ progress           # 진행률 (0-100)                        │
│  ├─ generatedTemplateSetId  # 생성된 템플릿셋                  │
│  └─ userAccepted       # 사용자 수락 여부                      │
│                                                                 │
│  user_interactions     # 사용자 상호작용 로그                  │
│  ├─ userId, templateSetId                                      │
│  ├─ interactionType    # view, select, edit, complete          │
│  └─ feedback           # like, dislike                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 기능 상세

### 3.1 ML 기반 템플릿 추천

#### 알고리즘

```
추천 점수 = (벡터 유사도 × 0.5) + (선호도 매칭 × 0.3) + (인기도 × 0.2)

1. 벡터 유사도 (50%)
   - 사용자 preferenceVector와 템플릿 featureVector의 코사인 유사도

2. 선호도 매칭 (30%)
   - 명시적 선호도 (스타일, 색상, 분위기) 일치 여부

3. 인기도 (20%)
   - 선택 횟수, 평점, 완료율 기반
```

#### 특성 벡터 구조 (128차원)

| 구간 | 차원 | 내용 |
|-----|-----|------|
| 0-31 | 32 | 색상 특성 (상위 8개 색상 RGB + 존재 플래그) |
| 32-47 | 16 | 레이아웃 특성 (요소 수, 텍스트/이미지/여백 비율, 대칭성) |
| 48-63 | 16 | 스타일 특성 (복잡도, 분위기 원핫 인코딩) |
| 64-127 | 64 | 예약 (향후 확장용) |

#### API 사용 예시

```typescript
// 추천 요청
POST /api/ai/recommendations
{
  "preferences": {
    "preferredStyles": ["minimal", "modern"],
    "preferredColors": { "primary": "#3B82F6" },
    "preferredMood": "professional"
  },
  "templateType": "book",
  "limit": 10
}

// 응답
{
  "recommendations": [
    {
      "templateSetId": "uuid-1",
      "name": "미니멀 회사소개서",
      "score": 0.92,
      "reasons": ["선호 스타일 일치", "인기 템플릿"],
      "thumbnailUrl": "..."
    }
  ],
  "preferenceSource": "input"
}
```

---

### 3.2 AI 템플릿 생성

#### 생성 파이프라인

```
1. 요청 접수 (POST /ai/generate)
   └─ Bull Queue에 작업 추가
   └─ 상태: pending, progress: 0%

2. 레이아웃 생성 (Claude 3.5 Sonnet)
   └─ 프롬프트 → JSON 레이아웃 계획
   └─ 상태: layout, progress: 10-30%

3. 이미지 생성 (FLUX.1 Pro)
   └─ 페이지별 이미지 프롬프트 → 이미지 URL
   └─ 병렬 처리 (최대 3개씩)
   └─ 상태: images, progress: 30-70%

4. 템플릿 조립
   └─ 레이아웃 + 이미지 → Fabric.js Canvas 데이터
   └─ Template 엔티티 생성
   └─ 상태: assembly, progress: 70-85%

5. 템플릿셋 생성
   └─ TemplateSet 엔티티 생성
   └─ 상태: completed, progress: 100%
```

#### LLM 프롬프트 구조

```
시스템 프롬프트:
- 역할: 인쇄물 템플릿 디자이너
- 출력: JSON 형식 레이아웃 계획

사용자 프롬프트:
- 요청 내용 (prompt)
- 템플릿 타입 (book/leaflet)
- 페이지 수, 스타일, 색상 테마
- 크기 (width × height mm)

출력:
{
  "pages": [
    {
      "pageNumber": 1,
      "pageType": "cover",
      "layout": {
        "sections": [
          { "type": "text", "content": "...", "position": {...}, "style": {...} },
          { "type": "image", "imagePrompt": "...", "position": {...} },
          { "type": "shape", "shapeType": "rect", "position": {...} }
        ]
      },
      "backgroundColor": "#FFFFFF"
    }
  ],
  "colorPalette": { "primary": "#3B82F6", ... },
  "fonts": { "heading": "Pretendard", "body": "Noto Sans KR" }
}
```

#### API 사용 예시

```typescript
// 생성 시작
POST /api/ai/generate
{
  "prompt": "IT 스타트업 회사 소개서, 미니멀하고 블루 톤",
  "options": {
    "templateType": "book",
    "pageCount": 12,
    "style": "minimal",
    "colorScheme": "blue",
    "dimensions": { "width": 210, "height": 297 },
    "includeImages": true
  }
}

// 응답
{
  "generationId": "uuid",
  "status": "pending",
  "estimatedTime": 45,
  "statusUrl": "/api/ai/generate/uuid"
}

// 상태 폴링
GET /api/ai/generate/{id}
{
  "status": "images",
  "progress": 50,
  "statusMessage": "이미지 생성 중..."
}

// 완료 후 수락
POST /api/ai/generate/{id}/accept
{
  "name": "내 회사 소개서",
  "rating": 5
}
```

---

## 4. 파일 구조

```
storige/apps/api/src/ai/
├── ai.module.ts                    # AI 모듈 정의
├── ai.controller.ts                # API 엔드포인트
│
├── entities/
│   ├── template-features.entity.ts # 템플릿 특성 저장
│   ├── user-preference.entity.ts   # 사용자 선호도
│   ├── ai-generation.entity.ts     # 생성 작업 기록
│   └── user-interaction.entity.ts  # 상호작용 로그
│
├── dto/
│   ├── recommendation.dto.ts       # 추천 API DTO
│   └── generation.dto.ts           # 생성 API DTO
│
├── providers/
│   ├── llm.service.ts              # Claude API 연동
│   └── flux-image.service.ts       # FLUX 이미지 생성
│
├── services/
│   ├── feature-extraction.service.ts  # 템플릿 특성 추출
│   ├── recommendation.service.ts      # ML 추천 로직
│   └── generation.service.ts          # 템플릿 생성 로직
│
└── processors/
    └── generation.processor.ts     # Bull Queue 프로세서

storige/apps/editor/src/
├── config/
│   └── features.ts                 # 기능 플래그 설정
│
├── api/
│   └── ai.ts                       # AI API 클라이언트
│
└── components/AiPanel/
    ├── index.ts                    # 모듈 export
    ├── LazyAiPanel.tsx             # Lazy loading 래퍼
    ├── AiPanel.tsx                 # 통합 패널 (탭)
    ├── RecommendationPanel.tsx     # 추천 UI
    └── GenerationPanel.tsx         # 생성 UI
```

---

## 5. 환경 변수

### 5.1 API 서버

```bash
# AI 기능 활성화 (필수)
AI_ENABLED=false                    # true: 활성화, false: 비활성화

# Claude API (레이아웃 생성)
ANTHROPIC_API_KEY=sk-ant-...        # Anthropic API 키
LLM_MODEL=claude-3-5-sonnet-20241022  # 사용할 모델

# Replicate API (이미지 생성)
REPLICATE_API_TOKEN=r8_...          # Replicate API 토큰
FLUX_USE_SCHNELL=false              # true: 저가형 모델, false: Pro 모델
```

### 5.2 Frontend

```bash
# AI 기능 활성화 (필수)
VITE_AI_ENABLED=false               # true: 활성화, false: 비활성화
```

---

## 6. 비용 추정

### 6.1 API 비용 (월간, 2,000건 생성 기준)

| 항목 | 단가 | 월간 사용량 | 월간 비용 |
|-----|------|-----------|----------|
| Claude 3.5 Sonnet (Input) | $3/1M tokens | ~4M tokens | $12 |
| Claude 3.5 Sonnet (Output) | $15/1M tokens | ~6M tokens | $90 |
| FLUX.1 Pro | $0.05/장 | 4,000장 | $200 |
| **합계** | | | **~$300/월** |

### 6.2 비용 최적화 옵션

| 옵션 | 변경 내용 | 예상 비용 |
|-----|----------|----------|
| 기본 | Claude Sonnet + FLUX Pro | $300/월 |
| 비용 절감 1 | FLUX Schnell 사용 | ~$100/월 |
| 비용 절감 2 | 이미지 생성 비활성화 | ~$100/월 |

---

## 7. API 엔드포인트

| 메서드 | 엔드포인트 | 설명 | 인증 |
|--------|-----------|------|------|
| POST | `/api/ai/recommendations` | 개인화 추천 조회 | Bearer |
| POST | `/api/ai/preferences` | 선호도 저장 | Bearer |
| POST | `/api/ai/feedback` | 피드백 제출 | Bearer |
| POST | `/api/ai/generate` | 템플릿 생성 시작 | Bearer |
| GET | `/api/ai/generate/:id` | 생성 상태 조회 | Bearer |
| POST | `/api/ai/generate/:id/accept` | 결과 수락 | Bearer |
| POST | `/api/ai/generate/:id/reject` | 결과 거절 | Bearer |
| GET | `/api/ai/generate/history` | 생성 이력 조회 | Bearer |
| POST | `/api/ai/admin/extract-features` | 전체 특성 추출 (관리자) | Bearer |
| POST | `/api/ai/admin/extract-features/:id` | 단일 특성 추출 (관리자) | Bearer |

---

## 8. 프론트엔드 사용법

### 8.1 컴포넌트 사용 (권장)

```tsx
import { LazyAiPanel, useAiEnabled } from '@/components/AiPanel';

function Editor() {
  const aiEnabled = useAiEnabled();

  return (
    <div>
      {/* AI 비활성화 시 null 반환, 번들 미포함 */}
      <LazyAiPanel
        templateType="book"
        dimensions={{ width: 210, height: 297 }}
        onSelectTemplate={(id) => handleSelectTemplate(id)}
        onGenerated={(id) => handleTemplateGenerated(id)}
      />
    </div>
  );
}
```

### 8.2 조건부 렌더링

```tsx
import { useAiEnabled } from '@/components/AiPanel';

function SomeComponent() {
  const aiEnabled = useAiEnabled();

  if (!aiEnabled) {
    return null;  // AI 비활성화 시 렌더링 안 함
  }

  return <AiFeatureButton />;
}
```

### 8.3 API 직접 호출

```tsx
import { aiApi } from '@/api';

// AI 활성화 확인
if (aiApi.isEnabled()) {
  const recommendations = await aiApi.getRecommendations({
    templateType: 'book',
    limit: 10
  });
}
```

---

## 9. 설정 및 실행

### 9.1 패키지 설치

```bash
cd storige/apps/api
pnpm install
```

### 9.2 환경 변수 설정

```bash
# API
cp .env.example .env.development
# AI_ENABLED=true, API 키 설정

# Frontend
cp apps/editor/.env.example apps/editor/.env
# VITE_AI_ENABLED=true 설정
```

### 9.3 서버 실행

```bash
# API (DB 테이블 자동 생성)
pnpm --filter @storige/api dev

# Frontend
pnpm --filter @storige/editor dev
```

### 9.4 기존 템플릿 특성 추출

```bash
# 관리자 토큰으로 API 호출
curl -X POST http://localhost:4000/api/ai/admin/extract-features \
  -H "Authorization: Bearer <admin_token>"
```

---

## 10. 향후 계획

### Phase 2: 추천 고도화

- [ ] 협업 필터링 추가 (유사 사용자 기반)
- [ ] 실시간 행동 분석
- [ ] A/B 테스트 프레임워크
- [ ] 벡터 DB 도입 (pgvector)

### Phase 3: 생성 고도화

- [ ] 다중 이미지 모델 라우팅 (FLUX/Recraft/Ideogram)
- [ ] 스타일 파인튜닝
- [ ] 생성 품질 피드백 루프
- [ ] 템플릿 버전 관리

### Phase 4: 관리자 도구

- [ ] AI 사용량 대시보드
- [ ] 비용 모니터링
- [ ] 모델 성능 메트릭
- [ ] 프롬프트 관리

---

## 11. 트러블슈팅

### 11.1 AI 기능이 동작하지 않음

```bash
# 환경변수 확인
echo $AI_ENABLED           # API
echo $VITE_AI_ENABLED      # Frontend

# API 키 확인
echo $ANTHROPIC_API_KEY
echo $REPLICATE_API_TOKEN
```

### 11.2 생성 작업 실패

```bash
# Bull Queue 상태 확인 (Redis)
redis-cli
> KEYS bull:ai-generation:*

# 로그 확인
# apps/api/logs 또는 콘솔 출력
```

### 11.3 추천 결과가 부정확함

```bash
# 템플릿 특성 재추출
curl -X POST http://localhost:4000/api/ai/admin/extract-features \
  -H "Authorization: Bearer <token>"
```

---

## 12. 참고 자료

- [Anthropic Claude API 문서](https://docs.anthropic.com/)
- [Replicate FLUX 모델](https://replicate.com/black-forest-labs/flux-1.1-pro)
- [Fabric.js 문서](http://fabricjs.com/docs/)
- [Bull Queue 문서](https://docs.bullmq.io/)
