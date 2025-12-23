# Storige Quick Reference

## 🚀 Development Commands

```bash
# Install
pnpm install

# Development (all services)
pnpm dev

# Development (individual)
pnpm --filter @storige/api dev      # http://localhost:4000
pnpm --filter @storige/worker dev   # http://localhost:4001
pnpm --filter @storige/editor dev   # http://localhost:3000
pnpm --filter @storige/admin dev    # http://localhost:3001

# Build
pnpm build

# Lint
pnpm lint

# Format
pnpm format
```

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service]

# Rebuild
docker-compose up -d --build [service]

# Status
docker-compose ps
```

## 📦 Services

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| Editor | 3000 | http://localhost:3000 | Customer editor |
| Admin | 3001 | http://localhost:3001 | Admin dashboard |
| API | 4000 | http://localhost:4000 | REST API |
| API Docs | 4000 | http://localhost:4000/api/docs | Swagger docs |
| Worker | 4001 | http://localhost:4001 | PDF processor |
| MySQL | 3306 | localhost:3306 | Database |
| Redis | 6379 | localhost:6379 | Queue/Cache |

## 📁 Project Structure

```
storige/
├── apps/
│   ├── api/        # NestJS REST API
│   ├── worker/     # NestJS Worker
│   ├── editor/     # React Editor
│   └── admin/      # React Admin
├── packages/
│   ├── types/      # Shared types
│   ├── ui/         # Shared components
│   └── canvas-core/# Canvas engine
└── docker/         # Docker configs
```

## 🔧 Environment Variables

Edit these files:
- `.env` - Docker Compose
- `apps/api/.env` - API config
- `apps/worker/.env` - Worker config

## 🗄️ Database

```bash
# Access MySQL (Docker)
docker-compose exec mysql mysql -u root -p storige

# Import schema
mysql -h localhost -P 3306 -u root -p storige < docker/mysql/init.sql

# Backup
docker-compose exec mysql mysqldump -u root -p storige > backup.sql
```

## 📚 Documentation

- [SETUP.md](./SETUP.md) - Complete setup guide
- [README.md](./README.md) - Project overview
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - Current status
- [Architecture Plan](./.claude/plans/snuggly-soaring-piglet.md) - Detailed architecture
- [PRD.md](./PRD.md) - Product requirements
