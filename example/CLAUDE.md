# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WowMall은 **멀티 테넌트 이커머스 플랫폼**입니다. 프론트엔드(Vercel)와 백엔드(AWS EKS)가 분리된 **헤드리스 커머스** 아키텍처를 채택하고 있습니다.

이 작업공간은 세 개의 주요 저장소로 구성됩니다:

| 저장소 | 설명 | 기술 스택 |
|--------|------|-----------|
| `webeasy/` | 프론트엔드 (Admin, Partner, Shop) | Vue 3, Nuxt 3, pnpm workspaces |
| `webeasy-editor/` | 그래픽 디자인 에디터 | Vue 3, Fabric.js, OpenCV.js, WASM |
| `webeasy-backend/` | 백엔드 API 서버 | Kotlin, Spring Boot 3, WebFlux, GraphQL |

## Architecture Documentation

자세한 아키텍처 문서는 `webeasy/` 디렉토리에 있습니다:
- [SYSTEM-ARCHITECTURE.md](./webeasy/SYSTEM-ARCHITECTURE.md) - 전체 시스템 개요
- [FRONTEND-ARCHITECTURE.md](./webeasy/FRONTEND-ARCHITECTURE.md) - 프론트엔드 아키텍처
- [EDITOR-ARCHITECTURE.md](./webeasy/EDITOR-ARCHITECTURE.md) - 에디터 아키텍처
- [BACKEND-ARCHITECTURE.md](./webeasy/BACKEND-ARCHITECTURE.md) - 백엔드 아키텍처

## Essential Commands

### Frontend (webeasy/)
```bash
cd webeasy
pnpm install
pnpm dev:admin    # Admin 대시보드 (포트 3001)
pnpm dev:partner  # Partner 포털 (포트 3001)
pnpm dev:shop     # Shop 스토어프론트 (포트 3000)
pnpm codegen      # GraphQL 타입 생성
pnpm build        # 전체 빌드
pnpm test         # 테스트 실행
```

### Editor (webeasy-editor/)
```bash
cd webeasy-editor
pnpm install
pnpm dev          # 개발 서버 (포트 3002)
pnpm dev:prod     # 프로덕션 환경 개발
pnpm codegen      # GraphQL 타입 생성
pnpm build        # 프로덕션 빌드
```

### Backend (webeasy-backend/)
```bash
cd webeasy-backend
./gradlew bootRun              # 개발 서버 실행
./gradlew build                # 빌드
./gradlew test                 # 테스트 실행
./gradlew flywayMigrate        # DB 마이그레이션
```

## Development Requirements

- **Node.js**: ≥21
- **pnpm**: ≥9 (프론트엔드/에디터)
- **JDK**: 17 (백엔드)
- **Kotlin**: 2.1.10 (백엔드)

## GraphQL Workflow

1. GraphQL 스키마는 Apollo Studio에서 관리
2. 각 패키지의 `.graphql` 파일에 operations 정의
3. `pnpm codegen` 실행하여 TypeScript 타입 생성
4. 생성된 composables/hooks 사용

## Project-Specific Guidance

각 서브 프로젝트에는 자체 CLAUDE.md가 있습니다:
- `webeasy/CLAUDE.md` - 프론트엔드 개발 가이드
- `webeasy-editor/CLAUDE.md` - 에디터 개발 가이드

해당 디렉토리에서 작업할 때는 해당 CLAUDE.md를 참조하세요.

## Key Integration Points

### API 통신
- 프론트엔드 → 백엔드: GraphQL (Apollo Client) + REST
- Vercel Rewrites: `/api/*` → AWS ALB

### 외부 서비스
- **WowPress API**: 인쇄 주문 및 상품 연동
- **Nicepay**: 결제 게이트웨이
- **AWS S3/CloudFront**: 이미지 및 파일 저장/배포

### 에디터 ↔ 백엔드
- 디자인 데이터 저장/로드: GraphQL
- PDF 내보내기: WowPress API
- 색상 변환: WASM (Little CMS 2)
