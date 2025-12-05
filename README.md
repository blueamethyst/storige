# Storige - Print Shopping Mall System

React + NestJS 기반 인쇄 쇼핑몰 워커 & 편집기 통합 시스템

## 📋 프로젝트 개요

- **Frontend**: React 18 + Vite + Fabric.js
- **Backend**: NestJS 10 + TypeORM + MySQL
- **Worker**: NestJS + Bull + pdf-lib
- **Infrastructure**: Docker Compose + Nginx
- **Monorepo**: pnpm + Turborepo

## 🏗️ 아키텍처

```
storige/
├── apps/
│   ├── editor/              # React 편집기 (고객용)
│   ├── admin/               # React 관리자 (템플릿 관리)
│   ├── api/                 # NestJS 백엔드 (REST API)
│   └── worker/              # NestJS 워커 (PDF 검증/변환/합성)
└── packages/
    ├── types/               # 공통 TypeScript 타입
    ├── ui/                  # 공통 UI 컴포넌트
    └── canvas-core/         # 캔버스 엔진 (Fabric.js 래퍼)
```

## 🚀 시작하기

### 필수 요구사항

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker & Docker Compose (프로덕션 배포용)

### 설치

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행 (전체)
pnpm dev

# 개별 실행
pnpm --filter @storige/editor dev
pnpm --filter @storige/admin dev
pnpm --filter @storige/api dev
pnpm --filter @storige/worker dev
```

### 빌드

```bash
# 전체 빌드
pnpm build

# 개별 빌드
pnpm --filter @storige/api build
```

## 🐳 Docker 배포

```bash
# 환경 변수 설정
cp .env.example .env

# Docker Compose 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

## 📦 서비스 포트

| 서비스 | 포트 | 설명 |
|--------|------|------|
| Nginx | 80/443 | 리버스 프록시 |
| Editor | 3000 | 편집기 (개발) |
| Admin | 3001 | 관리자 (개발) |
| API | 4000 | REST API |
| Worker | 4001 | PDF 워커 |
| MySQL | 3306 | 데이터베이스 |
| Redis | 6379 | 큐 & 캐시 |

## 📚 문서

- [Architecture Plan](./.claude/plans/snuggly-soaring-piglet.md)
- [PRD](./PRD.md)

## 🛠️ 개발 스택

### Frontend
- React 18
- TypeScript
- Vite
- Fabric.js
- Zustand (Editor)
- Ant Design (Admin)
- TailwindCSS

### Backend
- NestJS 10
- TypeORM
- MySQL 8.0
- Redis
- Bull (Queue)
- JWT Authentication

### Worker
- NestJS 10
- Bull (Consumer)
- pdf-lib
- Sharp
- Ghostscript

## 📝 라이센스

Proprietary - All rights reserved
