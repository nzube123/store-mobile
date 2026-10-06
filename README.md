# Cedar & Loom

A React Native storefront built with Expo and TypeScript. It reads its catalogue
from the configured store API and keeps Google OAuth, order creation, Paystack, and
email delivery on the server.

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
environment. The default is `https://store-app-exqx.onrender.com`.

## Connected API features

- `GET /api/products` loads the live catalogue.
- `GET /api/auth/me` restores the signed-in account.
- `GET /api/auth/google` starts the API's Google OAuth flow in the device
  browser. The current API returns a web session cookie, which the mobile app
  cannot reliably access; native sign-in needs an API token-exchange/deep-link
  flow.
- `POST /api/orders/checkout` creates the order and returns the secure Paystack
  authorization URL. The app opens that URL in the device browser.

The app sends cart product IDs/quantities and delivery/contact details to the
checkout endpoint. The API should validate stock and calculate the final total
before initializing payment. Paystack secret keys and Mailgun credentials must
remain configured on the API; they are never included in the mobile bundle.
Order confirmation and receipt email delivery are handled by the API.

## Useful commands

- `pnpm start` — start Expo
- `pnpm android` — start Expo for Android
- `pnpm ios` — start Expo for iOS
- `pnpm typecheck` — run the TypeScript check
