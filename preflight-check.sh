#!/usr/bin/env bash
# Development helper: Test API connectivity and app readiness

echo "🏪 Cedar & Loom Mobile — Pre-flight Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org"
  exit 1
fi
echo "✓ Node.js $(node --version)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  echo "❌ pnpm not found. Install with: npm i -g pnpm"
  exit 1
fi
echo "✓ pnpm $(pnpm --version)"

# Check dependencies
if [ ! -d "node_modules" ]; then
  echo "⚠ Dependencies not installed. Run: pnpm install"
  exit 1
fi
echo "✓ Dependencies installed"

# Check TypeScript
if ! pnpm typecheck > /dev/null 2>&1; then
  echo "❌ TypeScript errors found:"
  pnpm typecheck
  exit 1
fi
echo "✓ TypeScript checks passed"

# Check .env
if [ ! -f ".env" ]; then
  echo "⚠ .env not found. Creating from .env.example..."
  cp .env.example .env
fi
API_URL=$(grep EXPO_PUBLIC_API_URL .env | cut -d= -f2)
echo "✓ API URL: $API_URL"

# Test API connectivity
echo ""
echo "Testing API connectivity..."
if timeout 10 curl -s "$API_URL/api/products" | grep -q '"data"'; then
  echo "✓ API is reachable"
else
  echo "⚠ API may be unreachable or slow (this is not critical for local development)"
fi

echo ""
echo "✅ Ready to start! Run: pnpm start"
