# Cedar & Loom

A React Native storefront built with Expo and TypeScript. It reads its catalogue
from the configured store API and uses native Google Sign-In with an API token
exchange. Order creation, Paystack, and email delivery remain on the server.

The app is branded **Cedar & Loom** and includes a custom botanical icon for
iOS and Android.

The shop screen follows the reference storefront's editorial direction: warm
neutral surfaces, serif headlines, botanical lifestyle photography, and a
story-led collection section, adapted for mobile browsing.

## Run locally

```sh
pnpm install
cp .env.example .env
pnpm start
```

Set `EXPO_PUBLIC_API_URL` in `.env` to the API origin when using another
environment. The default is `https://store-app-exqx.onrender.com`. See
[`.env.example`](./.env.example) for the public Google OAuth client IDs required
to enable sign-in.

## Connected API features

- `GET /api/products` loads the live catalogue.
- Native Google Sign-In obtains a Google ID token and sends it to
  `POST /api/auth/google/mobile`; the API returns the app's access token (and
  optional refresh token).
- `GET /api/auth/me` restores the signed-in account with a Bearer access token.
- Access and refresh tokens are stored with Expo SecureStore. Expired access
  tokens are refreshed through `POST /api/auth/refresh`; refresh failure signs
  the user out.
- `POST /api/orders/checkout` creates the order and returns the secure Paystack
  authorization URL. The app opens that URL in the device browser.

The app sends cart product IDs/quantities and delivery/contact details to the
checkout endpoint. The API should validate stock and calculate the final total
before initializing payment. Paystack secret keys and Mailgun credentials must
remain configured on the API; they are never included in the mobile bundle.
Order confirmation and receipt email delivery are handled by the API.

Google OAuth client IDs are public configuration, not secrets. Configure an
Android OAuth client for package `com.cedarandloom.store` and each applicable
SHA-1 signing certificate (including EAS and Google Play App Signing). Native
Google Sign-In requires an Expo development or production build; it does not
run in Expo Go. Never add a Google client secret to this app.

## Useful commands

- `pnpm start` — start Expo
- `pnpm android` — start Expo for Android
- `pnpm ios` — start Expo for iOS
- `pnpm typecheck` — run the TypeScript check
