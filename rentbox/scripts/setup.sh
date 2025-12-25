#!/bin/bash

echo "🚀 Setting up Rentbox Catalog..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
else
  echo "✓ Dependencies already installed"
fi

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npm run db:generate

# Push schema to database
echo "📊 Setting up database..."
npm run db:push

# Seed database
echo "🌱 Seeding database with categories and products..."
npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎉 Run 'npm run dev' to start the development server"
echo "📍 Visit http://localhost:3000/tooriistad"
echo ""
