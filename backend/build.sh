#!/bin/bash
echo "🚀 Building Ethio-Bridge Backend..."

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  npm run migrate
else
  echo "DATABASE_URL not set, skipping migrations"
fi

echo "✅ Build complete!"