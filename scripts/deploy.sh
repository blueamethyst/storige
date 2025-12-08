#!/bin/bash
# ===========================================
# Storige Platform - Development Server Deploy Script
# Ubuntu + PM2
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN} Storige Platform - Deploy Script${NC}"
echo -e "${GREEN}============================================${NC}"

# Get project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo -e "${YELLOW}Project root: $PROJECT_ROOT${NC}"

# ===========================================
# 1. Install dependencies
# ===========================================
echo -e "\n${GREEN}[1/5] Installing dependencies...${NC}"
pnpm install

# ===========================================
# 2. Build shared packages first
# ===========================================
echo -e "\n${GREEN}[2/5] Building shared packages...${NC}"
echo "  - Building types..."
pnpm --filter @storige/types build

echo "  - Building canvas-core..."
pnpm --filter @storige/canvas-core build

# ===========================================
# 3. Build all applications
# ===========================================
echo -e "\n${GREEN}[3/5] Building applications...${NC}"

echo "  - Building API..."
pnpm --filter @storige/api build

echo "  - Building Worker..."
pnpm --filter @storige/worker build

echo "  - Building Editor..."
pnpm --filter @storige/editor build

echo "  - Building Admin..."
pnpm --filter @storige/admin build

# ===========================================
# 4. Create logs directory
# ===========================================
echo -e "\n${GREEN}[4/5] Setting up directories...${NC}"
mkdir -p logs
mkdir -p apps/api/storage

# ===========================================
# 5. Start/Restart PM2 processes
# ===========================================
echo -e "\n${GREEN}[5/5] Starting PM2 processes...${NC}"

# Install serve globally if not exists
if ! command -v serve &> /dev/null; then
    echo "  - Installing 'serve' package..."
    npm install -g serve
fi

# Stop all existing processes (ignore errors if not running)
pm2 stop ecosystem.config.js 2>/dev/null || true
pm2 delete ecosystem.config.js 2>/dev/null || true

# Start all processes
pm2 start ecosystem.config.js

# Save PM2 process list (for auto-restart on reboot)
pm2 save

# ===========================================
# Done
# ===========================================
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN} Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Services running:"
echo "  - API:    http://localhost:4000"
echo "  - Editor: http://localhost:3000"
echo "  - Admin:  http://localhost:3001"
echo "  - Worker: http://localhost:4001"
echo ""
echo "PM2 Commands:"
echo "  pm2 status           - Check process status"
echo "  pm2 logs             - View all logs"
echo "  pm2 logs storige-api - View API logs"
echo "  pm2 restart all      - Restart all processes"
echo "  pm2 stop all         - Stop all processes"
echo ""
pm2 status
