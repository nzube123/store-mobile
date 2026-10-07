#!/usr/bin/env bash
# Quick Start Guide
# This file is for documentation. Run commands manually or copy-paste them.

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════════════╗
║                     KINDRED STORE MOBILE APP                               ║
║                      Quick Start Guide                                     ║
╚════════════════════════════════════════════════════════════════════════════╝

📱 A production-ready Expo storefront with Google OAuth, Paystack, & Mailgun.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  INSTALL DEPENDENCIES

    pnpm install

2️⃣  CREATE ENVIRONMENT CONFIG

    cp .env.example .env

    # .env should contain:
    # EXPO_PUBLIC_API_URL=https://store-app-exqx.onrender.com

3️⃣  VALIDATE SETUP

    ./preflight-check.sh

    # Expected output:
    # ✓ Node.js vXX.X.X
    # ✓ pnpm X.XX.X
    # ✓ Dependencies installed
    # ✓ TypeScript checks passed
    # ✓ API URL: https://store-app-exqx.onrender.com
    # ✓ API is reachable
    # ✅ Ready to start! Run: pnpm start

4️⃣  START DEVELOPMENT SERVER

    pnpm start

    # You'll see:
    # › Metro waiting on exp://XXXX
    # › Press 's' for a signed QR code
    # › Press 'i' for iOS
    # › Press 'a' for Android
    # › Press 'w' for web
    # › Press 'q' to quit

5️⃣  OPEN ON DEVICE OR SIMULATOR

    • iOS Simulator (macOS): Press 'i'
    • Android Emulator: Press 'a'
    • Install an EAS preview/development build to run the native app
    • Web preview: Press 'w' (limited features)

6️⃣  TEST THE APP

    ✓ Browse products
    ✓ Search by name or category
    ✓ Tap a product for details
    ✓ Add items to your bag
    ✓ Tap the bag icon to view cart
    ✓ Sign in with Google (Account tab)
    ✓ Complete checkout form
    ✓ See Paystack payment link

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 DOCUMENTATION

    README.md          → Feature overview
    BUILD_SUMMARY.md   → Complete architecture & details
    SETUP.md           → Deployment & troubleshooting
    API_REFERENCE.md   → Full API endpoint documentation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛠️  USEFUL COMMANDS

    pnpm start          Start Expo development server
    pnpm ios            Start on iOS Simulator
    pnpm android        Start on Android Emulator
    pnpm web            Start web preview
    pnpm typecheck      Validate TypeScript
    pnpm install        Install/update dependencies

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 PROJECT STRUCTURE

    App.tsx                 Main app component (all screens)
    src/api.ts              API client & types
    app.json                Expo configuration
    package.json            Dependencies
    pnpm-lock.yaml          Lockfile
    tsconfig.json           TypeScript config
    .env                    Environment variables
    .env.example            Environment template
    .gitignore              Git exclusions
    README.md               Feature overview
    BUILD_SUMMARY.md        Complete build details
    SETUP.md                Deployment guide
    API_REFERENCE.md        API endpoint docs
    preflight-check.sh      Setup validation script

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 API INTEGRATION

    GET  /api/products           Fetch live catalogue
    POST /api/auth/google/mobile Exchange Google ID token for app token
    GET  /api/auth/me            Restore signed-in account
    POST /api/orders/checkout    Create order & get payment URL

    For full details: see API_REFERENCE.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 BUILDING FOR PRODUCTION

    # Install Expo's build CLI
    pnpm install -g eas-cli

    # Build for iOS (App Store)
    eas build --platform ios --profile production

    # Build for Android (Google Play)
    eas build --platform android --profile production

    For details: see SETUP.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  TROUBLESHOOTING

    Issue: "Cannot connect to API"
    → Check .env file has correct EXPO_PUBLIC_API_URL
    → Run: ./preflight-check.sh

    Issue: "Module not found"
    → Run: pnpm install
    → Or: rm -rf node_modules pnpm-lock.yaml && pnpm install

    Issue: "TypeScript errors"
    → Run: pnpm typecheck

    Issue: "Google sign-in fails"
    → Set the public Google client IDs in .env
    → Check Android package name and signing-certificate SHA-1 in Google Cloud
    → Use a native development/production build, not Expo Go

    Issue: "Paystack link doesn't open"
    → Verify API returns valid HTTPS URL
    → Check Paystack account configured on backend

    For more: see SETUP.md → Troubleshooting

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ YOU'RE ALL SET!

    Run: pnpm start

    Then open the app on your device or simulator.

    Happy coding! 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Built with Expo, React Native, and TypeScript
Part of the HNG Internship Program

EOF
