# Storige Operations Guide

운영 및 유지보수 가이드입니다.

---

## 📋 목차

1. [일일 운영](#일일-운영)
2. [모니터링](#모니터링)
3. [백업 및 복구](#백업-및-복구)
4. [트러블슈팅](#트러블슈팅)
5. [성능 튜닝](#성능-튜닝)
6. [보안 관리](#보안-관리)

---

## 일일 운영

### 서비스 상태 확인

```bash
# 모든 서비스 상태
docker-compose ps

# 헬스체크
curl http://localhost:4000/api/health
curl http://localhost:4001/health

# 리소스 사용량
docker stats --no-stream
```

### 로그 모니터링

```bash
# 실시간 로그 (전체)
docker-compose logs -f

# 에러 로그만 필터링
docker-compose logs | grep -i error

# 최근 1시간 로그
docker-compose logs --since 1h
```

### Worker 큐 상태 확인

```bash
# Redis 큐 확인
docker-compose exec redis redis-cli KEYS "bull:*"

# 큐 길이 확인
docker-compose exec redis redis-cli LLEN "bull:pdf-validation:wait"
docker-compose exec redis redis-cli LLEN "bull:pdf-conversion:wait"
docker-compose exec redis redis-cli LLEN "bull:pdf-synthesis:wait"

# 실패한 작업 확인
docker-compose exec redis redis-cli LLEN "bull:pdf-validation:failed"
```

---

## 모니터링

### 시스템 리소스

#### CPU 사용률

```bash
# 실시간 모니터링
docker stats

# 특정 컨테이너만
docker stats storige-api storige-worker
```

#### 메모리 사용률

```bash
# 메모리 사용량 확인
docker stats --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

#### 디스크 사용량

```bash
# Docker 볼륨 사용량
docker system df -v

# Storage 디렉토리 사용량
du -sh ./storage/*
```

### 데이터베이스 모니터링

#### MySQL 상태

```bash
# 연결 수 확인
docker-compose exec mysql mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"

# 슬로우 쿼리 확인
docker-compose exec mysql mysql -u root -p -e "SHOW VARIABLES LIKE 'slow_query%';"

# 테이블 크기 확인
docker-compose exec mysql mysql -u root -p storige -e "
SELECT
    table_name AS 'Table',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.TABLES
WHERE table_schema = 'storige'
ORDER BY (data_length + index_length) DESC;
"
```

#### Redis 상태

```bash
# 메모리 사용량
docker-compose exec redis redis-cli INFO memory

# 키 개수
docker-compose exec redis redis-cli DBSIZE

# 통계
docker-compose exec redis redis-cli INFO stats
```

### 애플리케이션 메트릭

#### API 서버 메트릭

```bash
# 헬스체크 (응답 시간 포함)
time curl http://localhost:4000/api/health

# 활성 작업 수
curl http://localhost:4000/api/worker-jobs/stats
```

#### Worker 서비스 메트릭

```bash
# 처리 중인 작업 수
docker-compose exec redis redis-cli LLEN "bull:pdf-validation:active"

# 완료된 작업 수 (최근 24시간)
# DB 쿼리 필요
docker-compose exec mysql mysql -u root -p storige -e "
SELECT
    job_type,
    status,
    COUNT(*) as count
FROM worker_jobs
WHERE created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY job_type, status;
"
```

---

## 백업 및 복구

### 자동 백업 스크립트

#### 데이터베이스 백업

```bash
#!/bin/bash
# scripts/backup-db.sh

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mysql_backup_$DATE.sql"

mkdir -p $BACKUP_DIR

# MySQL 백업
docker-compose exec -T mysql mysqldump \
    -u root \
    -p${MYSQL_ROOT_PASSWORD} \
    --single-transaction \
    --routines \
    --triggers \
    storige > $BACKUP_FILE

# 압축
gzip $BACKUP_FILE

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "mysql_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

#### 파일 백업

```bash
#!/bin/bash
# scripts/backup-storage.sh

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/storage_backup_$DATE.tar.gz"

mkdir -p $BACKUP_DIR

# Storage 디렉토리 백업
tar -czf $BACKUP_FILE ./storage

# 30일 이상 된 백업 삭제
find $BACKUP_DIR -name "storage_backup_*.tar.gz" -mtime +30 -delete

echo "Storage backup completed: $BACKUP_FILE"
```

#### Cron 설정

```bash
# crontab -e

# 매일 새벽 2시에 DB 백업
0 2 * * * /path/to/storige/scripts/backup-db.sh

# 매주 일요일 3시에 Storage 백업
0 3 * * 0 /path/to/storige/scripts/backup-storage.sh
```

### 복구

#### 데이터베이스 복구

```bash
# 백업 파일 압축 해제
gunzip mysql_backup_20231201_020000.sql.gz

# 복구
docker-compose exec -T mysql mysql -u root -p storige < mysql_backup_20231201_020000.sql
```

#### 파일 복구

```bash
# Storage 디렉토리 복구
tar -xzf storage_backup_20231201_030000.tar.gz
```

---

## 트러블슈팅

### 일반적인 문제

#### 1. 서비스가 응답하지 않음

```bash
# 컨테이너 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs --tail=100 api

# 재시작
docker-compose restart api
```

#### 2. 높은 메모리 사용률

```bash
# 메모리 사용률 확인
docker stats --no-stream

# 메모리 누수 의심되는 경우 재시작
docker-compose restart api worker

# 또는 전체 재시작
docker-compose restart
```

#### 3. 디스크 공간 부족

```bash
# 디스크 사용량 확인
df -h

# Docker 정리
docker system prune -a

# 오래된 로그 파일 삭제
find ./storage/logs -name "*.log" -mtime +30 -delete

# 오래된 temp 파일 삭제
find ./storage/temp -name "*.pdf" -mtime +7 -delete
```

#### 4. Worker가 작업을 처리하지 않음

```bash
# Worker 로그 확인
docker-compose logs -f worker

# Redis 연결 확인
docker-compose exec worker sh -c 'redis-cli -h redis ping'

# 큐 상태 확인
docker-compose exec redis redis-cli LLEN "bull:pdf-validation:wait"

# Worker 재시작
docker-compose restart worker
```

#### 5. MySQL 연결 실패

```bash
# MySQL 컨테이너 상태
docker-compose ps mysql

# MySQL 로그
docker-compose logs mysql

# 연결 테스트
docker-compose exec mysql mysqladmin ping -h localhost

# 최대 연결 수 확인
docker-compose exec mysql mysql -u root -p -e "SHOW VARIABLES LIKE 'max_connections';"
docker-compose exec mysql mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"
```

### 성능 문제

#### API 응답 속도 느림

```bash
# 1. 데이터베이스 슬로우 쿼리 확인
docker-compose exec mysql mysql -u root -p -e "SET GLOBAL slow_query_log = 'ON';"
docker-compose exec mysql mysql -u root -p -e "SET GLOBAL long_query_time = 1;"

# 2. 로그에서 슬로우 쿼리 찾기
docker-compose logs api | grep "slow query"

# 3. 인덱스 최적화 필요 여부 확인
```

#### Worker 처리 속도 느림

```bash
# 1. Worker 인스턴스 수 증가
docker-compose up -d --scale worker=3

# 2. Redis 메모리 확인
docker-compose exec redis redis-cli INFO memory

# 3. 파일 I/O 병목 확인
docker stats storige-worker
```

---

## 성능 튜닝

### MySQL 최적화

#### 설정 파일 (docker/mysql/my.cnf)

```ini
[mysqld]
# 기본 설정
max_connections = 200
connect_timeout = 10
wait_timeout = 600

# InnoDB 설정
innodb_buffer_pool_size = 4G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# 쿼리 캐시
query_cache_type = 1
query_cache_size = 64M
query_cache_limit = 2M

# 로깅
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow-query.log
long_query_time = 2
```

#### 인덱스 최적화

```sql
-- 자주 조회되는 컬럼에 인덱스 추가
CREATE INDEX idx_created_at ON worker_jobs(created_at);
CREATE INDEX idx_status_type ON worker_jobs(status, job_type);

-- 사용하지 않는 인덱스 확인
SELECT * FROM sys.schema_unused_indexes;
```

### Redis 최적화

#### 설정 파일 (docker/redis/redis.conf)

```conf
# 메모리 설정
maxmemory 2gb
maxmemory-policy allkeys-lru

# 지속성 설정 (성능 우선)
save ""
appendonly no

# 네트워크 설정
tcp-backlog 511
timeout 0
tcp-keepalive 300
```

### Worker 최적화

#### Concurrency 설정

```typescript
// apps/worker/src/processors/validation.processor.ts
@Processor('pdf-validation', {
  concurrency: 5, // 동시 처리 작업 수
})
```

#### 재시도 전략

```typescript
// Bull Queue 설정
BullModule.registerQueue({
  name: 'pdf-validation',
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true, // 완료된 작업 자동 삭제
    removeOnFail: false,    // 실패한 작업 보관
  },
})
```

---

## 보안 관리

### 정기 보안 점검

#### 1. 비밀번호 강도 확인

```bash
# .env 파일 권한 확인
ls -la .env
# 출력: -rw------- (600 권한 권장)

# 비밀번호 복잡도 확인 (최소 16자, 대소문자+숫자+특수문자)
```

#### 2. 외부 노출 포트 확인

```bash
# 열린 포트 확인
netstat -tuln | grep LISTEN

# 방화벽 설정 확인 (UFW)
sudo ufw status
```

#### 3. Docker 보안 설정

```bash
# Docker 데몬 보안 설정 확인
docker info | grep "Security Options"

# 컨테이너 권한 확인 (root로 실행되는지)
docker-compose exec api whoami
```

#### 4. 의존성 보안 취약점 검사

```bash
# npm audit
cd apps/api && pnpm audit
cd apps/worker && pnpm audit

# Docker 이미지 스캔
docker scan storige-api
docker scan storige-worker
```

### 접근 제어

#### 1. MySQL 외부 접근 차단

```yaml
# docker-compose.yml
mysql:
  ports:
    # 외부 포트 바인딩 제거
    # - "3306:3306"  # 주석 처리
  networks:
    - storige-network  # 내부 네트워크만 사용
```

#### 2. Redis 비밀번호 설정

```conf
# docker/redis/redis.conf
requirepass your_strong_password
```

```yaml
# docker-compose.yml
redis:
  command: redis-server --requirepass your_strong_password
```

```env
# .env
REDIS_PASSWORD=your_strong_password
```

#### 3. API CORS 설정

```typescript
// apps/api/src/main.ts
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
});
```

---

## 로그 관리

### 로그 로테이션

#### Docker 로그 설정

```yaml
# docker-compose.yml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### 애플리케이션 로그 로테이션

```bash
# logrotate 설정
sudo nano /etc/logrotate.d/storige
```

```conf
/path/to/storige/storage/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

---

## 알림 설정

### Slack 알림 (향후 구현)

```typescript
// apps/worker/src/services/notification.service.ts
async sendSlackAlert(message: string) {
  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    text: `🚨 Storige Alert: ${message}`,
  });
}
```

### 이메일 알림 (향후 구현)

```typescript
// Worker 작업 실패 시 이메일 전송
if (status === 'FAILED') {
  await this.notificationService.sendEmail({
    to: 'admin@example.com',
    subject: 'Worker Job Failed',
    body: `Job ${jobId} failed: ${errorMessage}`,
  });
}
```

---

## 정기 유지보수 체크리스트

### 일일 체크리스트

- [ ] 서비스 상태 확인
- [ ] 에러 로그 확인
- [ ] 디스크 사용량 확인
- [ ] Worker 큐 상태 확인

### 주간 체크리스트

- [ ] 데이터베이스 백업 확인
- [ ] 슬로우 쿼리 검토
- [ ] 실패한 작업 재처리
- [ ] 임시 파일 정리

### 월간 체크리스트

- [ ] 보안 업데이트 적용
- [ ] 의존성 업데이트 검토
- [ ] 성능 메트릭 분석
- [ ] 백업 복구 테스트
- [ ] 디스크 공간 확보

---

## 비상 연락망

### 에스컬레이션 절차

1. **레벨 1**: 자동 재시작 시도
2. **레벨 2**: 운영 담당자 알림
3. **레벨 3**: 개발 팀 연락
4. **레벨 4**: 시스템 관리자 연락

---

## 참고 문서

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 배포 가이드
- [PHASE6_COMPLETE.md](./PHASE6_COMPLETE.md) - Worker 서비스 문서
- [README.md](./README.md) - 프로젝트 개요

---

## 변경 이력

- **2025-12-04**: 초기 문서 작성
