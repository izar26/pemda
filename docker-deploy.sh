#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo " Starting Docker Deployment for Pemda (pentest2)"
echo "=========================================================="

# 1. Install Docker & Docker Compose if not yet installed
if ! command -v docker &> /dev/null; then
    echo "[1/6] Installing Docker & Docker Compose plugin..."
    sudo apt-get update -y
    sudo apt-get install -y docker.io docker-compose-v2 curl git
    sudo systemctl enable --now docker
    sudo usermod -aG docker "$USER" || true
    echo "Docker installed successfully."
else
    echo "[1/6] Docker already installed: $(docker --version)"
fi

# 2. Prepare Environment File
echo "[2/6] Configuring environment..."
if [ ! -f .env.docker ]; then
    cp .env.docker.example .env.docker
    echo "Created .env.docker from example."
fi

# Sync to backend/.env so Laravel Dotenv loader picks it up
cp -f .env.docker backend/.env

# Ensure storage directories exist with proper write permissions
mkdir -p backend/storage/framework/{sessions,views,cache}
mkdir -p backend/storage/logs
mkdir -p backend/storage/app/public
mkdir -p backend/bootstrap/cache
chmod -R 777 backend/storage backend/bootstrap/cache

# 3. Build & Run Containers
echo "[3/6] Building and starting Docker containers..."
sudo docker compose build
sudo docker compose up -d

echo "Waiting for PostgreSQL to be ready..."
until sudo docker compose exec -T postgres pg_isready -U pemda_user -d pemda &> /dev/null; do
    sleep 2
done
echo "PostgreSQL is ready!"

# 4. Install PHP Dependencies inside container
echo "[4/6] Installing production dependencies via Composer..."
sudo docker compose exec -T backend composer install --no-dev --optimize-autoloader --no-interaction

# 5. Execute Laravel Setup
echo "[5/6] Running migrations, seeders, and optimizations..."
# Generate APP_KEY if empty
if ! grep -q "^APP_KEY=base64:" backend/.env; then
    sudo docker compose exec -T backend php artisan key:generate --force
fi

sudo docker compose exec -T backend php artisan storage:link || true
sudo docker compose exec -T backend php artisan migrate --force
sudo docker compose exec -T backend php artisan db:seed --force
sudo docker compose exec -T backend php artisan optimize

# Fix directory ownership
sudo docker compose exec -T backend chown -R www-data:www-data storage bootstrap/cache
sudo docker compose exec -T backend chmod -R 775 storage bootstrap/cache

# 6. Verification
echo "[6/6] Verifying containers and service health..."
sudo docker compose ps

echo "Pinging API endpoint..."
curl -sS -I http://localhost/api/ping || true

echo "=========================================================="
echo " Deployment Complete! "
echo " Portal: https://pentest2.cianjurkab.go.id"
echo " Superadmin: superadmin@pemda.go.id / Password@123"
echo "=========================================================="
