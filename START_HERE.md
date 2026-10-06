# 🎯 START HERE — Cedar & Loom Mobile App

Welcome! This guide will get you up and running in minutes.

## ⚡ Quick Setup (5 minutes)

```bash
# 1. Install dependencies
pnpm install

# 2. Create config from template
cp .env.example .env

# 3. Validate everything
./preflight-check.sh

# 4. Start the app
pnpm start
```

**Output:**
```
› Metro waiting on exp://192.168.1.100:8081
› Scan the QR code above with Expo Go
```

## 📱 Run on Device/Simulator

After `pnpm start`, press:
- **`i`** for iOS Simulator
- **`a`** for Android Emulator
- **`w`** for Web preview
- **Scan QR** with Expo Go app (fastest option)

## 📚 Documentation

**For specific topics, check:**

| Document | Purpose |
|----------|---------|
| [QUICKSTART.md](QUICKSTART.md) | 6-step visual guide |
| [README.md](README.md) | Feature overview |
| [API_REFERENCE.md](API_REFERENCE.md) | Complete API docs |
| [BUILD_SUMMARY.md](BUILD_SUMMARY.md) | Architecture & implementation |
| [SETUP.md](SETUP.md) | Production deployment |

## 🔥 What You Get

✅ **Live catalogue** from API  
✅ **Search & filters**  
✅ **Shopping bag**  
✅ **Google sign-in** (browser-based)  
✅ **Secure checkout** with Paystack  
✅ **Email receipts** via Mailgun (backend)  
✅ **Full TypeScript** support  
✅ **iOS & Android** compatible  

## 🏗️ Project Structure

```
store-mobile/
├── App.tsx                   ← Main app (919 lines, all screens)
├── src/api.ts                ← API client (104 lines)
├── package.json              ← Dependencies
├── app.json                  ← Expo config
├── .env.example              ← Config template
├── preflight-check.sh        ← Setup validation
└── *.md                      ← Full documentation
```

## 🔌 API Integration

The app connects to: `https://store-app-exqx.onrender.com`

**Key endpoints:**
- `GET /api/products` — Live catalogue
- `GET /api/auth/me` — Check sign-in status
- `GET /api/auth/google` — Google OAuth
- `POST /api/orders/checkout` — Create order + get payment link

**Paystack & Mailgun:** Handled entirely by backend. Never on the mobile app.

## 🚀 Production Build

```bash
# Install EAS (Expo's build service)
pnpm install -g eas-cli

# Build for iOS (submits to App Store)
eas build --platform ios --profile production

# Build for Android (submits to Google Play)
eas build --platform android --profile production
```

See [SETUP.md](SETUP.md) for detailed steps.

## ✅ Troubleshooting

| Problem | Solution |
|---------|----------|
| Dependencies fail to install | Try: `rm -rf node_modules && pnpm install` |
| "Cannot connect to API" | Check `.env` has correct API URL, run `./preflight-check.sh` |
| Port already in use | Kill the process: `lsof -ti:8081 \| xargs kill -9` |
| TypeScript errors | Run: `pnpm typecheck` |
| Styles look wrong | Clear cache: `pnpm start --clear` |

For more, see [SETUP.md](SETUP.md) → **Troubleshooting**.

## 📝 Key Features

### 1. **Shop Screen**
- Product grid with images
- Search by name/category
- Filter by category
- Tap product for full details
- Add to bag button

### 2. **Bag Screen**
- List of added items
- Adjust quantities
- See subtotal
- Continue to checkout

### 3. **Account Screen**
- Google sign-in (browser opens)
- Display user info when signed in
- Security info about Paystack

### 4. **Checkout**
- Name, email, address form
- Order summary
- Opens Paystack in browser
- Completes payment off-app

## 💡 Tips

- **Pull to refresh** on Shop or Bag screens to update
- **Search is live** — starts filtering as you type
- **Tap product image** to see full details
- **Browser opens for OAuth/payments** — return to app when done
- **Cart persists** while you shop (until you place order)

## 🎓 Learning the Code

**Main entry point:** [App.tsx](App.tsx)
- All 4 screens are in one file (~920 lines)
- Uses React hooks (useState, useEffect, useMemo)
- StyleSheet for all styling
- No external libraries except Expo

**API calls:** [src/api.ts](src/api.ts)
- Type-safe fetch wrapper
- Credential handling
- Error messages

## 🤝 Need Help?

1. Read the relevant `.md` file (listed above)
2. Check [API_REFERENCE.md](API_REFERENCE.md) for endpoint questions
3. Run `./preflight-check.sh` to validate setup
4. Check console output in terminal when running `pnpm start`

## 🎉 Ready?

```bash
pnpm start
```

Then scan the QR code with **Expo Go** or press `i`/`a` for simulator.

**Happy building!** 🚀

---

**Built with:** Expo + React Native + TypeScript + pnpm  
**API:** https://store-app-exqx.onrender.com  
**Program:** HNG Internship 2026
