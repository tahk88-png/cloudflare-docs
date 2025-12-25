#!/bin/bash

echo "🚀 Rentbox Admin Panel - Quick Start Script"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
  echo "⚠️  Please edit .env with your database credentials before continuing!"
  echo "   DATABASE_URL, SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD"
  echo ""
  read -p "Press Enter after you've updated .env..."
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🗄️  Setting up database..."
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎉 You can now start the admin panel with:"
echo "   npm run dev"
echo ""
echo "📍 Admin panel will be available at:"
echo "   http://localhost:3001"
echo ""
echo "🔐 Login credentials:"
echo "   Email: admin@rentbox.ee (or your ADMIN_EMAIL)"
echo "   Password: admin123 (or your ADMIN_PASSWORD)"
echo ""
echo "⚠️  IMPORTANT: Change the default password after first login!"
echo ""
