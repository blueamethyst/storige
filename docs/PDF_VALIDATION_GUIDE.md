# PDF 검증 시스템 운영 가이드

## 개요

이 문서는 Storige Worker의 PDF 검증 기능에 대한 운영 가이드입니다.

---

## 면책 조항

> **중요**: 본 자동 검수 시스템은 기술적 검증을 보조하는 도구입니다.

| 구분 | 설명 |
|------|------|
| **자동 검수 범위** | PDF 구조, 색상 모드, 페이지 규격, 제본 규칙 등 기술적 항목 |
| **자동 검수 한계** | 디자인 품질, 색상 정확도, 최종 인쇄물 품질 보장 불가 |
| **최종 책임** | 인쇄소 QC 및 고객 최종 확인 |

### 고객 안내 문구 (권장)

```
본 검수 시스템은 기술적 규격 검증을 자동화한 것으로,
실제 인쇄 품질을 보장하지 않습니다.
최종 확인은 인쇄소 담당자가 진행합니다.
```

---

## 에러 코드 (차단)

에러가 발생하면 접수가 차단되며, 고객은 파일을 수정 후 재업로드해야 합니다.

| 코드 | 설명 | 원인 | 해결 방법 |
|------|------|------|----------|
| `UNSUPPORTED_FORMAT` | 지원하지 않는 파일 형식 | PDF가 아니거나 손상된 헤더 | PDF 형식으로 저장 |
| `FILE_CORRUPTED` | 손상된 파일 | 파일 업로드 중 손상 또는 잘못된 PDF | 파일 재생성 |
| `FILE_TOO_LARGE` | 파일 크기 초과 | 100MB 초과 | 이미지 해상도 줄이기, 압축 |
| `PAGE_COUNT_INVALID` | 페이지 수 오류 | 제본 방식에 맞지 않는 페이지 수 | 4의 배수로 조정 (사철) |
| `PAGE_COUNT_EXCEEDED` | 페이지 수 초과 | 사철 64페이지 초과 등 | 무선 제본으로 변경 |
| `SIZE_MISMATCH` | 페이지 사이즈 불일치 | 주문 규격과 PDF 크기 다름 | PDF 크기 조정 |
| `SPINE_SIZE_MISMATCH` | 책등 사이즈 불일치 | 표지 너비가 맞지 않음 | 책등 포함 표지 재생성 |
| `SADDLE_STITCH_INVALID` | 사철 제본 규격 오류 | 페이지 수가 4의 배수 아님 | 빈 페이지 추가 |
| `POST_PROCESS_CMYK` | 후가공 파일 CMYK 사용 | 후가공 파일에 CMYK 색상 | 별색(Spot Color)만 사용 |
| `SPREAD_SIZE_MISMATCH` | 스프레드 사이즈 불일치 | 펼침면 크기가 맞지 않음 | 정확한 크기로 조정 |

### 자동 수정 가능 에러

| 코드 | 수정 방법 | 설명 |
|------|----------|------|
| `PAGE_COUNT_INVALID` | `addBlankPages` | 빈 페이지 추가로 4의 배수 맞춤 |
| `SIZE_MISMATCH` | `resizeWithPadding` | 패딩 추가로 크기 조정 |
| `SPINE_SIZE_MISMATCH` | `adjustSpine` | 책등 크기 자동 조정 |

---

## 경고 코드 (주의)

경고는 접수를 차단하지 않지만, 인쇄 품질에 영향을 줄 수 있습니다.

| 코드 | 설명 | 원인 | 권장 조치 |
|------|------|------|----------|
| `PAGE_COUNT_MISMATCH` | 페이지 수 불일치 | 주문한 페이지 수와 PDF가 다름 | 고객 확인 요청 |
| `BLEED_MISSING` | 재단 여백 없음 | 3mm 여백이 없음 | 여백 추가 권장 |
| `RESOLUTION_LOW` | 해상도 낮음 | 300DPI 미만 | 고해상도 이미지 사용 |
| `LANDSCAPE_PAGE` | 가로형 페이지 | 세로형 대신 가로형 | 의도 확인 |
| `CENTER_OBJECT_CHECK` | 중앙부 객체 확인 | 사철 제본 접지 부분 | 중요 내용 배치 확인 |
| `CMYK_STRUCTURE_DETECTED` | CMYK 구조 감지 | CMYK 색상 공간 사용 | RGB 변환 권장 (웹 용도) |
| `MIXED_PDF` | 혼합 PDF | 표지+내지 다른 규격 | 분리 업로드 권장 |
| `TRANSPARENCY_DETECTED` | 투명도 감지 | 투명 효과 사용 | 평면화(Flatten) 권장 |
| `OVERPRINT_DETECTED` | 오버프린트 감지 | 오버프린트 설정 | 인쇄 결과 확인 |

---

## 제본 방식별 규칙

### 무선 제본 (Perfect Binding)

| 항목 | 규칙 |
|------|------|
| 페이지 수 | 4의 배수 필수 |
| 최대 페이지 | 제한 없음 |
| 책등 | 페이지 수 × 종이 두께 |

### 사철 제본 (Saddle Stitch)

| 항목 | 규칙 |
|------|------|
| 페이지 수 | 4의 배수 필수 |
| 최대 페이지 | 64페이지 |
| 책등 | 없음 |

### 스프링 제본 (Spring)

| 항목 | 규칙 |
|------|------|
| 페이지 수 | 제한 없음 |
| 최대 페이지 | 제한 없음 |
| 책등 | 없음 |

---

## 스프레드(펼침면) 감지

스프레드 형식은 페이지 너비가 단면의 2배인 PDF입니다.

### 감지 기준 (점수 기반)

| 조건 | 점수 |
|------|------|
| 규격 기반 (너비 = 단면 × 2) | +60점 |
| 높이 일치 | +20점 |
| 비율 > 1.25 | +15점 |
| 페이지 일관성 (표준편차 < 1mm) | +10점 |

- **70점 이상**: 스프레드로 판정
- **신뢰도**: 80점 이상 high, 60점 이상 medium, 그 외 low

### 혼합 PDF 처리

표지(단면)와 내지(펼침면)가 혼합된 경우:
- `MIXED_PDF` 경고 발생
- 페이지 그룹 정보 제공

---

## 색상 모드 감지

### 2단계 검증 프로세스

1. **1차 구조적 감지** (빠름)
   - PDF 바이트에서 `/DeviceCMYK`, `/ICCBased /N 4` 검색
   - CMYK 구조가 없으면 RGB로 확정

2. **2차 Ghostscript inkcov** (정확함)
   - 1차에서 CMYK 구조 감지 시 실행
   - 실제 잉크 사용량 분석
   - CMY > 0.001 이면 CMYK 사용으로 판정

### 후가공 파일 색상 규칙

| 허용 여부 | 색상 모드 | 설명 |
|----------|----------|------|
| ✅ 허용 | Spot Color (별색) | 칼선, 박 등 후가공 전용 |
| ❌ 불허 | CMYK | 인쇄색과 혼동 위험 |
| ❌ 불허 | K (Black) 단독 | 칼선 오인 가능 |

---

## Ghostscript 리소스 관리

### 설정 값

| 항목 | 기본값 | 설명 |
|------|--------|------|
| `GS_TIMEOUT` | 5000ms | 실행 타임아웃 |
| `GS_MAX_PAGES` | 50 | inkcov 최대 페이지 |
| `GS_CONCURRENCY` | 2 | 동시 실행 제한 |
| `LARGE_FILE_THRESHOLD` | 50MB | 대형 파일 기준 |

### 폴백 정책

| 상황 | 처리 |
|------|------|
| CMYK 구조 없음 | GS 생략, RGB 확정 |
| GS 성공 | GS 결과 사용 (신뢰도 high) |
| GS 실패/타임아웃 | 구조 기반 추정 (신뢰도 low), 경고 추가 |

### 모니터링 포인트

```bash
# Ghostscript 프로세스 확인
ps aux | grep gs

# 메모리 사용량 확인
docker stats storige-worker-1

# Bull Queue 모니터링
redis-cli LLEN bull:validation:active
redis-cli LLEN bull:validation:waiting
```

---

## 환경 변수

```env
# Worker 설정
WORKER_STORAGE_PATH=../api        # 스토리지 경로
API_BASE_URL=http://localhost:4000  # API 서버 주소

# Bull Queue 설정
REDIS_HOST=localhost
REDIS_PORT=6379

# 검증 설정
MAX_FILE_SIZE=104857600           # 100MB
GS_TIMEOUT=5000                   # 5초
GS_MAX_PAGES=50
```

---

## Bull Queue 설정

### concurrency 설정

```typescript
// validation.processor.ts
@Processor('validation')
export class ValidationProcessor {
  constructor(
    @InjectQueue('validation') private queue: Queue,
  ) {
    // concurrency: 동시 처리 작업 수
    this.queue.process(2, this.process.bind(this));
  }
}
```

### 권장 설정

| 환경 | concurrency | 이유 |
|------|-------------|------|
| 개발 | 1 | 디버깅 용이 |
| 스테이징 | 2 | GS 리소스 보호 |
| 프로덕션 | 2~4 | 서버 사양에 따라 조정 |

---

## Docker 배포

### Ghostscript 확인

```dockerfile
# Dockerfile.worker
FROM node:20-alpine

# Ghostscript 설치
RUN apk add --no-cache ghostscript

# 버전 확인
RUN gs --version
```

### 확인 명령

```bash
# 컨테이너 내 GS 확인
docker exec storige-worker-1 gs --version

# 기능 테스트
docker exec storige-worker-1 gs -q -dNODISPLAY -c "(Hello) print quit"
```

---

## 트러블슈팅

### GS 타임아웃 발생

```
원인: 대형 파일 또는 복잡한 PDF
해결:
1. GS_TIMEOUT 증가 (최대 30초)
2. 파일 크기 제한 강화
3. 대형 파일은 구조 기반만 사용
```

### CMYK 오탐지

```
원인: ICC 프로파일이 포함된 RGB 파일
해결:
1. 2차 inkcov 분석으로 확인
2. CMY 사용량이 0이면 RGB로 판정
```

### 메모리 부족

```
원인: 동시 처리 작업 과다
해결:
1. concurrency 감소 (2 → 1)
2. 대형 파일 GS 분석 생략
3. 컨테이너 메모리 증가
```

---

## 참고 문서

- [PDF 검증 기능 확장 검토서](./PDF_VALIDATION_REVIEW.md)
- [PDF 검증 WBS](./PDF_VALIDATION_WBS.md)
- [QA 체크리스트](../apps/worker/test/QA_CHECKLIST.md)
