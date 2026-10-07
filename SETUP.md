# Cedar & Loom Mobile — Setup & Deployment Guide

A React Native storefront built with **Expo** and **TypeScript**, integrated with the store API for live catalogue, Google OAuth, Paystack payments, and Mailgun receipts.

## Features

✓ **Live catalogue** with search & category filtering
✓ **Native Google sign-in** with secure API token exchange
✓ **Shopping bag** with quantity controls
✓ **Secure checkout** powered by Paystack (via API)
✓ **Email receipts** sent by Mailgun (server-side)
✓ **TypeScript** for type safety
✓ **Accessible UI** built with React Native

## Quick Start

### Prerequisites

- **Node.js** 18+
- **pnpm** (or npm/yarn)
- A physical device or emulator (Android/iOS) and an Expo development build;
  native Google Sign-In is not available in Expo Go

### Install & Run

```bash
pnpm install
cp .env.example .env
pnpm start
```

Then create a development build before testing native Google Sign-In.

### Environment Variables

Create a `.env` file at the project root:

```env
EXPO_PUBLIC_API_URL=https://store-app-exqx.onrender.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
```

Replace the API URL if using another environment. Google client IDs are public
OAuth identifiers, not secrets. Do not add a Google client secret to the app.

## Architecture

### Client (This App)

The mobile app handles:
- **Product discovery**: fetch, filter, search
- **Cart management**: add, quantity, remove
- **Account UI**: sign-in prompt, profile display
- **Checkout form**: name, email, address collection
- **Native authentication**: Google Sign-In returns an ID token, exchanged with
  the API for app credentials
- **Secure credentials**: Expo SecureStore persists app access and refresh tokens
- **Checkout**: opens Paystack URLs in the device browser

### Store API

The API handles:
- **Product catalogue**: `GET /api/products`
- **Authentication**: `POST /api/auth/google/mobile` exchanges the Google ID
  token for application credentials; protected requests use Bearer tokens
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

### Google OAuth Configuration

The app uses native Google Sign-In with the existing scheme `cedarloom`,
Android package `com.cedarandloom.store`, and iOS bundle ID
`com.cedarandloom.store`. Supply the public Google web and iOS client IDs as
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in
the local environment and EAS build environment. The app config derives the
iOS URL scheme from the iOS client ID.

Create an Android OAuth client in Google Cloud Console for package
`com.cedarandloom.store` and every signing certificate SHA-1 used by local,
EAS, and Google Play builds. A client secret is not needed by the app and must
never be configured as an Expo public variable. Rebuild the native app after
changing OAuth IDs or native configuration.

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
| POST | `/api/auth/google/mobile` | Exchange Google ID token for app credentials |
| POST | `/api/auth/refresh` | Refresh app access token when supported |
| GET | `/api/auth/me` | Get current user using Bearer token |
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
- Confirm the web client ID and iOS client ID are set as public environment variables.
- Confirm the Android OAuth client uses package `com.cedarandloom.store` and the SHA-1 fingerprint of the installed build's signing certificate.
- Use a development or production build; native Google Sign-In does not work in Expo Go.

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

Native Google Sign-In requires a custom development/production build; Expo Go
does not include the required native module. Supported targets include:
1. **Android Emulator** (Android Studio)
2. **iOS Simulator** (Xcode on macOS)
3. **Web** via `pnpm web` (limited feature set)

## License

Built as part of the HNG Internship program.

## Support

For issues or questions about the API integration, contact the store API team. For Expo-specific help, visit [docs.expo.dev](https://docs.expo.dev).
