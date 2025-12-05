# Storige Setup Guide

## 📋 Prerequisites

- **Node.js**: >= 20.0.0
- **pnpm**: >= 9.0.0
- **Docker**: Latest version (for production deployment)
- **Docker Compose**: Latest version (for production deployment)
- **MySQL**: 8.0 (or use Docker)
- **Redis**: 7.2 (or use Docker)

## 🚀 Quick Start (Development)

### 1. Install Dependencies

```bash
# Install pnpm globally if you haven't
npm install -g pnpm@9.15.0

# Install project dependencies
pnpm install
```

### 2. Setup Environment Variables

```bash
# Copy example env files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env

# Edit .env files with your configuration
```

### 3. Setup Database

**Option A: Using Docker**
```bash
# Start MySQL and Redis with Docker Compose
docker-compose up -d mysql redis

# Wait for MySQL to be ready
docker-compose logs -f mysql
```

**Option B: Local Installation**
```bash
# Start your local MySQL and Redis
# Import database schema
mysql -u root -p storige < docker/mysql/init.sql
```

### 4. Start Development Servers

```bash
# Start all services in development mode
pnpm dev

# Or start individual services
pnpm --filter @storige/api dev      # API Server (port 4000)
pnpm --filter @storige/worker dev   # Worker Service (port 4001)
pnpm --filter @storige/editor dev   # Editor Frontend (port 3000)
pnpm --filter @storige/admin dev    # Admin Frontend (port 3001)
```

### 5. Access Applications

- **Editor**: http://localhost:3000
- **Admin**: http://localhost:3001
- **API**: http://localhost:4000
- **API Docs**: http://localhost:4000/api/docs

## 🐳 Production Deployment (Docker)

### 1. Configure Environment

```bash
# Copy and edit environment file
cp .env.example .env

# Update with production values:
# - Strong passwords
# - Secure JWT secret
# - Appropriate CORS settings
```

### 2. Build and Start

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 3. Access via Nginx

- **Editor**: http://localhost/editor/
- **Admin**: http://localhost/admin/
- **API**: http://localhost/api/
- **Storage**: http://localhost/storage/

### 4. Common Docker Commands

```bash
# Stop all services
docker-compose down

# Restart a specific service
docker-compose restart api

# View logs for specific service
docker-compose logs -f worker

# Rebuild after code changes
docker-compose up -d --build api

# Clean up everything (including volumes)
docker-compose down -v
```

## 📦 Project Structure

```
storige/
├── apps/
│   ├── api/                 # NestJS REST API Server
│   ├── worker/              # NestJS PDF Worker Service
│   ├── editor/              # React Editor (Vite)
│   └── admin/               # React Admin (Vite + Ant Design)
├── packages/
│   ├── types/               # Shared TypeScript Types
│   ├── ui/                  # Shared React Components
│   └── canvas-core/         # Fabric.js Canvas Engine
├── docker/
│   ├── nginx/               # Nginx Configuration
│   ├── mysql/               # MySQL Init Scripts
│   ├── api/                 # API Dockerfile
│   ├── worker/              # Worker Dockerfile
│   ├── editor/              # Editor Dockerfile
│   └── admin/               # Admin Dockerfile
├── storage/                 # File Storage Directory
├── docker-compose.yml       # Docker Orchestration
├── pnpm-workspace.yaml      # Monorepo Configuration
└── turbo.json              # Build Orchestration
```

## 🔧 Development Scripts

```bash
# Install dependencies
pnpm install

# Development mode (all services)
pnpm dev

# Build all apps
pnpm build

# Lint all code
pnpm lint

# Run tests
pnpm test

# Format code
pnpm format

# Clean build artifacts
pnpm clean
```

## 🗄️ Database Management

### Initial Setup

The database schema is automatically created when you start MySQL with Docker Compose.

### Manual Migration

```bash
# Import schema manually
docker-compose exec mysql mysql -u root -p storige < /docker-entrypoint-initdb.d/init.sql

# Or from host
mysql -h localhost -P 3306 -u root -p storige < docker/mysql/init.sql
```

### Backup & Restore

```bash
# Backup
docker-compose exec mysql mysqldump -u root -p storige > backup.sql

# Restore
docker-compose exec -T mysql mysql -u root -p storige < backup.sql
```

## 🔐 Security Checklist

Before deploying to production:

- [ ] Change default passwords in `.env`
- [ ] Generate strong JWT secret
- [ ] Configure appropriate CORS origins
- [ ] Setup SSL certificates for Nginx
- [ ] Review and restrict database user permissions
- [ ] Enable firewall rules
- [ ] Setup backup strategy
- [ ] Configure monitoring and logging

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :4000

# Kill the process
kill -9 <PID>
```

### Docker Build Fails

```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

### Database Connection Failed

```bash
# Check if MySQL is running
docker-compose ps mysql

# View MySQL logs
docker-compose logs mysql

# Verify environment variables
docker-compose exec api env | grep DATABASE
```

### Worker Not Processing Jobs

```bash
# Check Redis connection
docker-compose exec redis redis-cli ping

# View worker logs
docker-compose logs -f worker

# Check Redis queue status
docker-compose exec redis redis-cli LLEN bull:pdf-validation:wait
```

## 📚 Additional Resources

- [Architecture Plan](./.claude/plans/snuggly-soaring-piglet.md)
- [Product Requirements](./PRD.md)
- [API Documentation](http://localhost:4000/api/docs) (after starting API)
- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
- [Fabric.js Documentation](http://fabricjs.com/docs/)

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review logs: `docker-compose logs -f <service-name>`
3. Check environment variables
4. Verify all services are running: `docker-compose ps`
