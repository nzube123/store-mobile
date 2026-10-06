# Cedar & Loom Mobile — Setup & Deployment Guide

A React Native storefront built with **Expo** and **TypeScript**, integrated with the store API for live catalogue, Google OAuth, Paystack payments, and Mailgun receipts.

## Features

✓ **Live catalogue** with search & category filtering  
✓ **Google OAuth sign-in** (browser-based, server-managed)  
✓ **Shopping bag** with quantity controls  
✓ **Secure checkout** powered by Paystack (via API)  
✓ **Email receipts** sent by Mailgun (server-side)  
✓ **TypeScript** for type safety  
✓ **Accessible UI** built with React Native  

## Quick Start

### Prerequisites

- **Node.js** 18+
- **pnpm** (or npm/yarn)
- A physical device or emulator (Android/iOS) to run the app

### Install & Run

```bash
pnpm install
cp .env.example .env
pnpm start
```

Then:
- Press `i` for iOS, `a` for Android, or `w` for web (Expo Go required for device testing)

### Environment Variables

Create a `.env` file at the project root:

```env
EXPO_PUBLIC_API_URL=https://store-app-exqx.onrender.com
```

Replace the URL if using a local or alternative API instance.

## Architecture

### Client (This App)

The mobile app handles:
- **Product discovery**: fetch, filter, search
- **Cart management**: add, quantity, remove
- **Account UI**: sign-in prompt, profile display
- **Checkout form**: name, email, address collection
- **Deep linking**: opens Google OAuth and Paystack URLs in the device browser

### Store API

The API handles:
- **Product catalogue**: `GET /api/products`
- **Authentication**: Google OAuth flow, session/cookie management
- **Cart & checkout**: `POST /api/orders/checkout` creates orders and returns Paystack authorization URLs
- **Payment**: Paystack integration (secret keys stay on server)
- **Receipts**: Mailgun sends order confirmations

**Secrets never included in the mobile bundle**: API keys, Stripe/Paystack secrets, and Mailgun credentials remain server-side only.

## Deployment

### Build for Production

```bash
# Create a production Expo build (requires Expo account)
pnpm install -g eas-cli
eas build --platform ios --profile production
eas build --platform android --profile production
```

Or use Expo's build cloud to generate app store binaries (APK/IPA).

### Configuration

Before building, update `app.json`:

```json
{
  "expo": {
    "name": "Cedar & Loom",
    "slug": "cedar-and-loom",
    "scheme": "cedarloom",
    "plugins": [
      "expo-web-browser"
    ]
  }
}
```

Google must continue to redirect to the server callback:
`https://store-app-exqx.onrender.com/api/auth/google/callback`.

For native sign-in, the API must then redirect to `cedarloom://auth` with a
short-lived one-time code and expose a code-exchange endpoint. The current API
does not provide that native flow, so a browser sign-in may not create a session
available to the app.

### App Store Submission

1. **iOS (App Store)**:
   - Build with `eas build --platform ios`
   - Submit the generated IPA via Xcode or App Store Connect
   - Requires Apple Developer account

2. **Android (Google Play)**:
   - Build with `eas build --platform android --profile production`
   - Submit the AAB via Google Play Console
   - Requires Google Play Developer account

## API Endpoints Used

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/products` | Fetch catalogue |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/google` | Start Google OAuth (browser) |
| POST | `/api/orders/checkout` | Create order & get Paystack link |

### Checkout Request Body

```typescript
{
  items: [
    { productId: "cmuyuewoq00047wvy4ewcgvih", quantity: 2 }
  ],
  customer: {
    name: "Jane Doe",
    email: "jane@example.com"
  },
  shippingAddress: "123 Main St, Lagos, LG 100001"
}
```

### Checkout Response

The API must return one of these (or nest it under `payment`):
- `authorizationUrl` / `authorization_url`
- `checkoutUrl` / `checkout_url`
- `paymentUrl` / `payment_url`
- `url`

Example:
```json
{
  "authorizationUrl": "https://checkout.paystack.com/...",
  "reference": "ref_xyz"
}
```

## Troubleshooting

### "Cannot connect to API"
- Verify `EXPO_PUBLIC_API_URL` is correct and reachable
- Check if the API is running and not rate-limiting
- On mobile, ensure device is on the same network (for local IPs)

### "Google sign-in not working"
- The live API redirects Google to its web callback and sets a browser-only `cedar.sid` cookie.
- The native app cannot reliably read that browser cookie. The API needs to redirect to `cedarloom://auth` with a one-time code and provide a native token-exchange endpoint.

### "Paystack link doesn't open"
- Verify the API returns a valid HTTPS URL
- Check that the Paystack account is configured on the backend
- Confirm the API's Paystack secret key is set

### TypeScript errors
```bash
pnpm typecheck
```

## Development Commands

```bash
# Start Expo CLI
pnpm start

# Start on Android
pnpm android

# Start on iOS
pnpm ios

# Type-check (no build)
pnpm typecheck

# Install dependencies
pnpm install
```

## Project Structure

```
store-mobile/
├── App.tsx              # Main app component & all screens
├── src/
│   └── api.ts           # API client & types
├── assets/
│   ├── icon.png         # Store icon
│   └── adaptive-icon.png # Android adaptive icon artwork
├── app.json             # Expo config
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── README.md            # Feature overview
```

## Design & Styling

The UI uses **React Native's built-in components** (no external styling library) with a cohesive neutral palette:

- **Primary**: Muted green (#345747) for CTAs
- **Paper**: Off-white (#f7f5f0) for backgrounds
- **Ink**: Dark charcoal (#24251f) for text
- **Accents**: Warm orange (#c16a42) for highlights

All styles are defined in `App.tsx` using `StyleSheet` for performance.

## Testing

The app can be tested in:
1. **Expo Go** (quick preview on device)
2. **Android Emulator** (Android Studio)
3. **iOS Simulator** (Xcode on macOS)
4. **Web** via `pnpm web` (limited feature set)

## License

Built as part of the HNG Internship program.

## Support

For issues or questions about the API integration, contact the store API team. For Expo-specific help, visit [docs.expo.dev](https://docs.expo.dev).
