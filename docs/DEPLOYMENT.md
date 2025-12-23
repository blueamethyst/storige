# Storige Deployment Guide

## 📋 목차

1. [시스템 요구사항](#시스템-요구사항)
2. [사전 준비](#사전-준비)
3. [로컬 개발 환경](#로컬-개발-환경)
4. [프로덕션 배포](#프로덕션-배포)
5. [환경 변수 설정](#환경-변수-설정)
6. [모니터링 및 로깅](#모니터링-및-로깅)
7. [문제 해결](#문제-해결)

---

## 시스템 요구사항

### 최소 사양

| 구성 요소 | 최소 사양 | 권장 사양 |
|----------|----------|----------|
| **CPU** | 4 Core | 8 Core |
| **RAM** | 8 GB | 16 GB |
| **Storage** | 50 GB SSD | 200 GB SSD |
| **OS** | Ubuntu 20.04+ | Ubuntu 22.04+ |

### 필수 소프트웨어

- **Docker**: 24.0+
- **Docker Compose**: 2.20+
- **Node.js**: 20.x (로컬 개발용)
- **pnpm**: 8.x (로컬 개발용)

---

## 사전 준비

### 1. Docker 설치

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose 설치
sudo apt-get install docker-compose-plugin

# 사용자 권한 설정
sudo usermod -aG docker $USER
```

### 2. 프로젝트 클론

```bash
git clone <repository-url> storige
cd storige
```

### 3. 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# .env 파일 편집
nano .env
```

**필수 설정 항목**:
```env
# Database
MYSQL_ROOT_PASSWORD=<strong-password>
DATABASE_NAME=storige
DATABASE_USER=storige
DATABASE_PASSWORD=<strong-password>

# JWT
JWT_SECRET=<random-32-char-string>
```

---

## 로컬 개발 환경

### 빠른 시작

```bash
# 스타트업 스크립트 실행
./scripts/dev-start.sh
```

### 수동 설정

#### 1. 의존성 설치

```bash
# pnpm 설치 (없는 경우)
npm install -g pnpm

# 프로젝트 의존성 설치
pnpm install
```

#### 2. 인프라 서비스 시작

```bash
# MySQL + Redis만 시작
docker-compose up -d mysql redis

# 서비스 상태 확인
docker-compose ps
```

#### 3. 개발 서버 시작

```bash
# 터미널 1: API 서버
cd apps/api
pnpm dev

# 터미널 2: Worker 서비스
cd apps/worker
pnpm dev

# 터미널 3: Editor (선택)
cd apps/editor
pnpm dev

# 터미널 4: Admin (선택)
cd apps/admin
pnpm dev
```

**또는 모든 서비스를 한 번에**:
```bash
pnpm dev
```

#### 4. 서비스 접속

- **API**: http://localhost:4000
- **Worker**: http://localhost:4001
- **Editor**: http://localhost:3000
- **Admin**: http://localhost:3001

---

## 프로덕션 배포

### 1. 빌드

```bash
# 모든 앱 빌드
pnpm build

# 개별 빌드
pnpm --filter @storige/api build
pnpm --filter @storige/worker build
pnpm --filter @storige/editor build
pnpm --filter @storige/admin build
```

### 2. Docker 이미지 빌드

```bash
# 모든 서비스 빌드
docker-compose build

# 개별 서비스 빌드
docker-compose build api
docker-compose build worker
docker-compose build editor
docker-compose build admin
```

### 3. 서비스 시작

```bash
# 전체 스택 시작 (백그라운드)
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그만 확인
docker-compose logs -f api
docker-compose logs -f worker
```

### 4. 서비스 상태 확인

```bash
# 컨테이너 상태
docker-compose ps

# 헬스체크
curl http://localhost:4000/api/health
curl http://localhost:4001/health
```

### 5. 서비스 중지

```bash
# 모든 서비스 중지
docker-compose down

# 볼륨까지 삭제 (데이터 삭제)
docker-compose down -v
```

---

## 환경 변수 설정

### API Server (.env 또는 docker-compose.yml)

```env
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://yourdomain.com

# Database
DATABASE_HOST=mysql
DATABASE_PORT=3306
DATABASE_USER=storige
DATABASE_PASSWORD=<secure-password>
DATABASE_NAME=storige

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET=<random-secure-string>
JWT_EXPIRES_IN=7d

# Storage
STORAGE_PATH=/app/storage
STORAGE_MAX_FILE_SIZE=52428800
```

### Worker Service

```env
NODE_ENV=production
PORT=4001

# Database (같은 MySQL 사용)
DATABASE_HOST=mysql
DATABASE_PORT=3306
DATABASE_USER=storige
DATABASE_PASSWORD=<secure-password>
DATABASE_NAME=storige

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# API
API_BASE_URL=http://api:4000/api

# Storage
STORAGE_PATH=/app/storage
MAX_FILE_SIZE=52428800

# Processing
MAX_RETRY_ATTEMPTS=3
GHOSTSCRIPT_PATH=/usr/bin/gs
```

---

## Nginx 설정 (선택)

### Reverse Proxy 설정

프로젝트에 포함된 Nginx 설정을 사용하거나, 외부 Nginx를 사용할 수 있습니다.

#### 포함된 Nginx 사용

```bash
# docker-compose.yml에 이미 포함되어 있음
docker-compose up -d nginx
```

#### 외부 Nginx 설정 예시

```nginx
# /etc/nginx/sites-available/storige
upstream api {
    server localhost:4000;
}

upstream editor {
    server localhost:3000;
}

upstream admin {
    server localhost:3001;
}

server {
    listen 80;
    server_name yourdomain.com;

    # API
    location /api/ {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # Editor
    location /editor/ {
        proxy_pass http://editor/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Admin
    location /admin/ {
        proxy_pass http://admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Storage (정적 파일)
    location /storage/ {
        alias /path/to/storige/storage/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 모니터링 및 로깅

### 로그 확인

```bash
# 전체 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f api
docker-compose logs -f worker

# 최근 100줄만
docker-compose logs --tail=100 api

# 실시간 로그 (타임스탬프 포함)
docker-compose logs -f --timestamps api
```

### 리소스 모니터링

```bash
# 컨테이너 리소스 사용량
docker stats

# 특정 컨테이너만
docker stats storige-api storige-worker
```

### Bull Queue 모니터링

Bull Board를 사용하여 큐 상태를 모니터링할 수 있습니다 (향후 추가 예정).

---

## 데이터베이스 관리

### 백업

```bash
# MySQL 백업
docker-compose exec mysql mysqldump -u root -p storige > backup_$(date +%Y%m%d).sql

# 또는 Docker 볼륨 백업
docker run --rm \
  --volumes-from storige-mysql \
  -v $(pwd):/backup \
  ubuntu tar cvf /backup/mysql_backup.tar /var/lib/mysql
```

### 복원

```bash
# SQL 파일에서 복원
docker-compose exec -T mysql mysql -u root -p storige < backup_20231201.sql

# 볼륨 복원
docker run --rm \
  --volumes-from storige-mysql \
  -v $(pwd):/backup \
  ubuntu bash -c "cd /var/lib/mysql && tar xvf /backup/mysql_backup.tar --strip 1"
```

---

## 스케일링

### Worker 서비스 스케일 아웃

```bash
# Worker 인스턴스 3개로 증가
docker-compose up -d --scale worker=3

# 확인
docker-compose ps worker
```

---

## 업데이트 및 배포

### Zero-Downtime 배포

```bash
# 1. 새 코드 pull
git pull origin main

# 2. 빌드
pnpm build
docker-compose build

# 3. 순차적 재시작 (Worker → API → Frontend)
docker-compose up -d worker
sleep 10
docker-compose up -d api
sleep 10
docker-compose up -d editor admin
```

---

## 문제 해결

### 1. 컨테이너가 시작되지 않음

```bash
# 로그 확인
docker-compose logs <service-name>

# 컨테이너 재시작
docker-compose restart <service-name>

# 컨테이너 재생성
docker-compose up -d --force-recreate <service-name>
```

### 2. MySQL 연결 실패

```bash
# MySQL 컨테이너 상태 확인
docker-compose exec mysql mysqladmin ping -h localhost

# 데이터베이스 존재 확인
docker-compose exec mysql mysql -u root -p -e "SHOW DATABASES;"

# 사용자 권한 확인
docker-compose exec mysql mysql -u root -p -e "SHOW GRANTS FOR 'storige'@'%';"
```

### 3. Redis 연결 실패

```bash
# Redis 연결 테스트
docker-compose exec redis redis-cli ping

# Redis 키 확인
docker-compose exec redis redis-cli KEYS "*"
```

### 4. Worker가 작업을 처리하지 않음

```bash
# Worker 로그 확인
docker-compose logs -f worker

# Redis 큐 확인
docker-compose exec redis redis-cli KEYS "bull:*"

# API 서버가 작업을 추가하는지 확인
curl -X POST http://localhost:4000/api/worker-jobs/validate \
  -H "Content-Type: application/json" \
  -d '{"fileUrl":"...","fileType":"cover",...}'
```

### 5. 디스크 공간 부족

```bash
# Docker 이미지 정리
docker system prune -a

# 사용하지 않는 볼륨 정리
docker volume prune

# 로그 파일 정리 (선택)
docker-compose down
rm -rf storage/logs/*
```

---

## 보안 체크리스트

- [ ] `.env` 파일의 비밀번호를 강력하게 설정
- [ ] JWT_SECRET을 랜덤한 긴 문자열로 설정
- [ ] CORS_ORIGIN을 특정 도메인으로 제한
- [ ] MySQL 외부 접근 차단 (필요시에만 허용)
- [ ] Redis 외부 접근 차단
- [ ] Nginx에서 SSL/TLS 설정 (Let's Encrypt 권장)
- [ ] 정기적인 보안 업데이트 적용
- [ ] 로그 파일 정기 삭제 설정

---

## 성능 최적화

### Docker 최적화

```yaml
# docker-compose.yml에 리소스 제한 추가
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### MySQL 최적화

```sql
-- my.cnf
[mysqld]
innodb_buffer_pool_size = 4G
max_connections = 200
query_cache_size = 64M
```

### Redis 최적화

```conf
# redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

---

## 다음 단계

- [ ] SSL 인증서 설정 (Let's Encrypt)
- [ ] 자동 백업 스크립트 설정
- [ ] 모니터링 도구 연동 (Grafana, Prometheus)
- [ ] CI/CD 파이프라인 구축
- [ ] 부하 테스트 수행

---

## 지원

문제가 발생하면 다음을 확인하세요:

1. **로그 파일**: `docker-compose logs -f`
2. **문서**: `README.md`, `PHASE6_COMPLETE.md`
3. **이슈 트래커**: GitHub Issues
