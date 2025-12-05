# 에디터 개선안 (Editor Improvement Proposals)

> **문서 버전**: 1.0
> **작성일**: 2025-12-03
> **상위 문서**: [EDITOR-ARCHITECTURE.md](./EDITOR-ARCHITECTURE.md)

---

## 개요

이 문서는 에디터의 개선 항목들을 요약하고 관리합니다. 각 개선안의 상세 설계는 별도 문서로 관리됩니다.

---

## 개선안 목록

| # | 개선안 | 우선순위 | 상태 | 상세 문서 |
|---|--------|---------|------|----------|
| 1 | [이중 저장 방식](#1-이중-저장-방식) | 높음 | 제안 | [상세](./improvements/EDITOR-IMPROVEMENT-001-DUAL-STORAGE.md) |
| 2 | [템플릿 S3 경로 분리](#2-템플릿-s3-경로-분리) | 중간 | 제안 | [상세](./improvements/EDITOR-IMPROVEMENT-002-S3-PATH-SEPARATION.md) |
| 3 | [canvas-core Vue 의존성 제거](#3-canvas-core-vue-의존성-제거) | 중간 | 제안 | [상세](./improvements/EDITOR-IMPROVEMENT-003-VUE-DEPENDENCY-REMOVAL.md) |
| 4 | [PDF 출력 DPI 개선](#4-pdf-출력-dpi-개선) | 🔴 높음 | 제안 | [상세](./improvements/EDITOR-IMPROVEMENT-004-PDF-DPI.md) |
| 5 | [서버 사이드 PDF 생성](#5-서버-사이드-pdf-생성) | 🔴 높음 | 제안 | [상세](./improvements/EDITOR-IMPROVEMENT-005-SERVER-PDF.md) |

---

## 1. 이중 저장 방식

**문제**: 템플릿 파일에 이미지가 Base64로 내장되어 파일 크기가 수십~수백 MB에 달함

**해결**: 주문 파일은 Base64 유지, 템플릿은 Asset Reference 방식으로 분리

**효과**: 템플릿 JSON 크기 99% 감소, 로딩 시간 90% 단축

> [상세 설계 →](./improvements/EDITOR-IMPROVEMENT-001-DUAL-STORAGE.md)

---

## 2. 템플릿 S3 경로 분리

**문제**: 관리자 템플릿이 개인 사용자 폴더(`users/{adminId}/documents/`)에 저장됨

**해결**: 템플릿 전용 경로 분리 (`protected/global/templates/`, `protected/stores/{storeId}/templates/`)

**효과**: 계정 독립성 확보, 권한 관리 단순화, 백업/마이그레이션 용이

> [상세 설계 →](./improvements/EDITOR-IMPROVEMENT-002-S3-PATH-SEPARATION.md)

---

## 3. canvas-core Vue 의존성 제거

**문제**: `@pf/canvas-core`에 불필요한 Vue 의존성 존재 (vue-demi 미사용, @vueuse/core 2개 함수만 사용)

**해결**: vue-demi 제거, @vueuse/core 함수를 네이티브 API로 대체

**효과**: Framework-agnostic 패키지화, 번들 크기 감소

> [상세 설계 →](./improvements/EDITOR-IMPROVEMENT-003-VUE-DEPENDENCY-REMOVAL.md)

---

## 4. PDF 출력 DPI 개선

**문제**: PDF 저장 시 DPI가 72로 하드코딩되어 인쇄 품질 부적합 (`AppNav.vue:207`)

**해결**: 하드코딩 제거 후 설정값 사용, 기본 DPI를 300으로 상향

**효과**: 상업 인쇄 품질 기준 충족

> [상세 설계 →](./improvements/EDITOR-IMPROVEMENT-004-PDF-DPI.md)

---

## 5. 서버 사이드 PDF 생성

**문제**: 클라이언트(브라우저)에서 PDF 생성 시 대용량 이미지 OOM, UI 블로킹, 72 DPI 고정, CMYK 미지원

**해결**: 서버 사이드 PDF 생성 (Puppeteer + Chromium), SQS 큐 기반 비동기 처리

**효과**: 브라우저 부담 제거, 인쇄 품질(300 DPI, CMYK) 지원, 안정적인 대용량 처리

> [상세 설계 →](./improvements/EDITOR-IMPROVEMENT-005-SERVER-PDF.md)

---

## 문서 관리 규칙

### 개선안 추가 시

1. 이 문서의 **개선안 목록** 테이블에 항목 추가
2. 간략한 요약 섹션 작성 (문제, 해결, 효과)
3. 상세 설계 문서는 `improvements/EDITOR-IMPROVEMENT-{번호}-{이름}.md` 형식으로 생성

### 파일명 규칙

```
improvements/
├── EDITOR-IMPROVEMENT-001-DUAL-STORAGE.md
├── EDITOR-IMPROVEMENT-002-S3-PATH-SEPARATION.md
├── EDITOR-IMPROVEMENT-003-VUE-DEPENDENCY-REMOVAL.md
├── EDITOR-IMPROVEMENT-004-PDF-DPI.md
├── EDITOR-IMPROVEMENT-005-SERVER-PDF.md
└── EDITOR-IMPROVEMENT-006-{다음개선안}.md
```

---

## 관련 문서

- [EDITOR-ARCHITECTURE.md](./EDITOR-ARCHITECTURE.md) - 에디터 아키텍처
- [GRAPHQL-API-DESIGN.md](./GRAPHQL-API-DESIGN.md) - GraphQL API 설계
