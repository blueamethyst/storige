# WowMall 시스템 아키텍처 (System Architecture)

이 문서는 WowMall 플랫폼의 전체 시스템 아키텍처를 기술합니다.

---

## 상세 문서

| 영역 | 문서 | 설명 |
|------|------|------|
| **프론트엔드** | [FRONTEND-ARCHITECTURE.md](./FRONTEND-ARCHITECTURE.md) | Admin, Partner, Shop 애플리케이션 아키텍처 |
| **에디터** | [EDITOR-ARCHITECTURE.md](./EDITOR-ARCHITECTURE.md) | 그래픽 디자인 에디터 아키텍처 |
| **백엔드** | [BACKEND-ARCHITECTURE.md](./BACKEND-ARCHITECTURE.md) | Spring Boot 백엔드 아키텍처 |

---

## 1. 시스템 개요

WowMall은 와우프레스 API 연동을 기반으로 하는 **멀티 테넌트(Multi-tenant) 이커머스 플랫폼**입니다.
프론트엔드(Vercel)와 백엔드(AWS EKS)가 분리되어 GraphQL 및 REST API로 통신하는 **헤드리스 커머스(Headless Commerce)** 아키텍처를 채택하고 있습니다.

---

## 2. 시스템 컨텍스트 (C4 Level 1)

```mermaid
C4Context
    title System Context Diagram for WowMall Platform

    Person(customer, "고객 (Customer)", "상품을 구매하는 최종 사용자")
    Person(partner, "파트너 (Partner)", "자신의 상점을 관리하는 상점주")
    Person(admin, "관리자 (Administrator)", "플랫폼 운영자")
    Person(designer, "디자이너 (Designer)", "디자인을 생성하는 사용자")

    System_Boundary(wowmall, "WowMall 플랫폼") {
        System(frontend, "프론트엔드 애플리케이션", "Vercel 호스팅 웹 앱 (Shop, Admin, Partner, Editor)")
        System(backend, "코어 백엔드", "Spring Boot (EKS) + 레거시 API")
    }

    System_Ext(wowpress, "WowPress API", "인쇄 및 주문 이행 서비스")
    System_Ext(pg, "결제 게이트웨이", "Nicepay")
    System_Ext(aws, "AWS 서비스", "S3, CloudFront, SES")

    Rel(customer, frontend, "상품 탐색 및 구매")
    Rel(partner, frontend, "상점 관리")
    Rel(admin, frontend, "플랫폼 관리")
    Rel(designer, frontend, "디자인 생성")

    Rel(frontend, backend, "API 호출 (GraphQL/REST)")
    Rel(backend, wowpress, "주문 및 상품 연동")
    Rel(backend, pg, "결제 처리")
    Rel(backend, aws, "자산 및 이메일")
```

---

## 3. 전체 시스템 다이어그램 (Container Level)

```mermaid
graph TB
    subgraph "Frontend Layer (Vercel)"
        direction TB
        subgraph "E-commerce Apps"
            ADMIN[wowmall-admin<br/>Vue 3 + Vite]
            PARTNER[wowmall-partner<br/>Vue 3 + Vite]
            SHOP[wowmall-shop<br/>Nuxt 3 + Nitro]
        end
        subgraph "Editor App"
            EDITOR[wowmall-editor<br/>Vue 3 + Canvas]
        end
        EDGE[Vercel Edge Network<br/>Rewrites / Caching]
    end

    subgraph "AWS Content Delivery & Storage"
        subgraph "Image Optimization"
            CF_IMG[CloudFront Image CDN]
            LAMBDA[Lambda-Edge<br/>Resize/Optimize]
            S3_IMG[S3 Bucket<br/>Original Images]
            S3_OPT[S3 Bucket<br/>Optimized Images]
        end

        subgraph "Static Assets"
            CF_STATIC[CloudFront File CDN]
            S3_STATIC[S3 Bucket<br/>User Uploads/Files]
        end
    end

    subgraph "Application Layer (AWS EKS)"
        ALB[Application Load Balancer]
        subgraph "Kubernetes Pods"
            APP1[WowMall App<br/>Spring Boot/GraphQL/REST]
            APP2[WowMall App<br/>Spring Boot/GraphQL/REST]
        end
    end

    subgraph "Data Layer"
        RDS[(RDS MariaDB<br/>주 데이터베이스)]
        REDIS[(Redis Cluster<br/>캐시/세션)]
    end

    subgraph "External Services"
        WP[WowPress API<br/>인쇄 서비스]
        NP[Nicepay<br/>결제 서비스]
    end

    %% User Entry Points
    User[Users] -->|Web Access| ADMIN & PARTNER & SHOP & EDITOR

    %% Asset Access
    User -->|Image Request| CF_IMG
    User -->|File Request| CF_STATIC

    %% Frontend Internal Flow
    ADMIN & PARTNER & SHOP & EDITOR -->|/api/*| EDGE

    %% Frontend to Backend
    EDGE -->|GraphQL & REST API| ALB

    %% Image Processing Flow
    CF_IMG -->|Cache Miss| LAMBDA
    LAMBDA -->|Read| S3_IMG
    LAMBDA -->|Write| S3_OPT
    CF_IMG -->|Read| S3_OPT

    %% Static File Flow
    CF_STATIC -->|Read| S3_STATIC

    %% Application Flow
    ALB --> APP1 & APP2
    APP1 & APP2 -->|R2DBC| RDS
    APP1 & APP2 -->|Redisson| REDIS

    %% External Integration
    APP1 & APP2 -->|API Call| WP
    APP1 & APP2 -->|API Call| NP

    %% Styling
    classDef frontend fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef app fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef data fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef external fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px
    classDef cdn fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class ADMIN,PARTNER,SHOP,EDITOR,EDGE frontend
    class ALB,APP1,APP2 app
    class RDS,REDIS data
    class WP,NP external
    class CF_IMG,LAMBDA,S3_IMG,S3_OPT,CF_STATIC,S3_STATIC cdn
```

---

## 4. 모노레포 구조 (Monorepo Structure)

| 영역 | 패키지명 | 경로 | 설명 |
|------|----------|------|------|
| **E-commerce Frontend** | `wowmall-admin` | `/wowmall-admin` | 관리자용 대시보드 (SPA) |
| | `wowmall-partner` | `/wowmall-partner` | 파트너용 포털 (SPA) |
| | `wowmall-shop` | `/wowmall-shop` | 고객용 스토어프론트 (SSR) |
| **Editor** | `@wowmall/editor` | `/apps/web` | 그래픽 디자인 에디터 (SPA) |
| | `@pf/canvas-core` | `/packages/canvas-core` | 캔버스 엔진 및 그래픽 처리 |
| | `@pf/color-runtime` | `/packages/color-runtime` | WASM 기반 색상 변환 |
| **Shared** | `wowmall-core` | `/wowmall-core` | 공통 비즈니스 로직, 타입, API 클라이언트 |

---

## 5. 기술 스택 요약

| 영역 | 기술 |
|------|------|
| **프론트엔드** | Vue 3, Nuxt 3, TypeScript, Vite, Pinia, Apollo Client |
| **에디터** | Fabric.js, Paper.js, OpenCV.js, Little CMS 2 (WASM) |
| **백엔드** | Kotlin, Spring Boot 3, WebFlux, Netflix DGS, R2DBC |
| **데이터** | MariaDB (RDS), Redis Cluster |
| **인프라** | AWS EKS, Vercel, CloudFront, S3, ArgoCD |
| **외부 서비스** | WowPress API, Nicepay |
