#!/bin/bash
# ===========================================
# Storige Platform - Ubuntu Server Setup Script
# Run this once on a fresh Ubuntu server
# ===========================================

set -e

echo "============================================"
echo " Storige Platform - Server Setup"
echo "============================================"

# ===========================================
# 1. Update system packages
# ===========================================
echo "[1/6] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# ===========================================
# 2. Install Node.js 20.x (LTS)
# ===========================================
echo "[2/6] Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
node --version
npm --version

# ===========================================
# 3. Install pnpm
# ===========================================
echo "[3/6] Installing pnpm..."
sudo npm install -g pnpm

# ===========================================
# 4. Install PM2
# ===========================================
echo "[4/6] Installing PM2..."
sudo npm install -g pm2

# Setup PM2 to start on boot
pm2 startup systemd -u $USER --hp $HOME
# Note: You may need to run the command that PM2 outputs

# ===========================================
# 5. Install serve (for static file serving)
# ===========================================
echo "[5/6] Installing serve..."
sudo npm install -g serve

# ===========================================
# 6. Install Ghostscript (for PDF processing)
# ===========================================
echo "[6/6] Installing Ghostscript..."
sudo apt install -y ghostscript

# Verify Ghostscript installation
gs --version

# ===========================================
# Done
# ===========================================
echo ""
echo "============================================"
echo " Server Setup Complete!"
echo "============================================"
echo ""
echo "Installed versions:"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo "  pnpm: $(pnpm --version)"
echo "  PM2: $(pm2 --version)"
echo "  Ghostscript: $(gs --version)"
echo ""
echo "Next steps:"
echo "  1. Clone the repository to the server"
echo "  2. Copy .env.production files to apps/api/ and apps/worker/"
echo "  3. Run: ./scripts/deploy.sh"
echo "  4. Run: pm2 save"
echo ""
echo "To enable PM2 on system startup, run the command that PM2 printed above."
