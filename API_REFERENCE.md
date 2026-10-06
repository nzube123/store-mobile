# Cedar & Loom Store API Reference

Base URL: `https://store-app-exqx.onrender.com` (or custom via `EXPO_PUBLIC_API_URL` in `.env`)

## Authentication

### GET /api/auth/me
**No parameters**

Returns the currently authenticated user (from session cookie), or `user: null` if not signed in.

**Response:**
```json
{
  "data": {
    "user": {
      "id": "user-id",
      "name": "User Name",
      "email": "user@example.com",
      "picture": "https://...",
      "image": "https://..."
    }
  }
}
```

**Error (not signed in):**
```json
{
  "data": {
    "user": null
  }
}
```

**Code:**
```typescript
import { getCurrentUser } from './src/api';

const user = await getCurrentUser();
if (user) {
  console.log(`Signed in as ${user.name}`);
} else {
  console.log('Not signed in');
}
```

---

### GET /api/auth/google
**No parameters**

Initiates Google OAuth flow. Returns a 302 redirect to Google's OAuth consent screen.

The mobile app opens this URL in the device's browser. The live API redirects Google back to its web callback (`/api/auth/google/callback`) and sets an `HttpOnly`, `Secure` session cookie (`cedar.sid`). The cookie belongs to the browser; React Native's `fetch` session is separate, so `/api/auth/me` may still return `user: null` after successful browser sign-in.

**Native sign-in requirement:** the API needs to redirect from its Google callback to the app's registered deep link with a short-lived, one-time authorization code. The app must exchange that code over HTTPS for a native session/token. The current API does not expose a mobile exchange endpoint.

On Android, opening the browser returns control to JavaScript as soon as the
custom tab opens, not when the user finishes sign-in. The app waits for the
user to return before checking the session; a missing session then indicates
the API's native-token limitation above, not necessarily a failed Google login.

**Code:**
```typescript
import * as WebBrowser from 'expo-web-browser';
import { API_URL, getCurrentUser } from './src/api';

async function signInWithGoogle() {
  await WebBrowser.openBrowserAsync(`${API_URL}/api/auth/google`);
  const user = await getCurrentUser();
  if (user) {
    console.log(`Welcome, ${user.name}!`);
  } else {
    console.error('The API mobile token-exchange flow is not available.');
  }
}
```

---

## Products

### GET /api/products
**Query Parameters:**
- `page` (optional, default: 1) - Pagination page number
- `limit` (optional, default: 12) - Items per page
- `category` (optional) - Filter by category name
- `search` (optional) - Search by name or description

**Response:**
```json
{
  "data": {
    "items": [
      {
        "id": "cmuyuewoq00047wvy4ewcgvih",
        "name": "Amber Glass Candle",
        "slug": "amber-glass-candle",
        "description": "A slow-burning soy wax candle with notes of cedar, bergamot, and quiet evenings.",
        "price": 38000,
        "image": "https://images.unsplash.com/photo-1603006905003-be475563bc59?...",
        "category": "Home Fragrance",
        "stock": 30,
        "createdAt": "2026-10-08T01:13:34.202Z",
        "updatedAt": "2026-10-08T01:13:34.202Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 12,
      "total": 8,
      "pages": 1
    }
  }
}
```

**Price:** in Nigerian Naira (₦), so `38000` = ₦38,000

**Code:**
```typescript
import { getProducts } from './src/api';

const products = await getProducts();
products.forEach(product => {
  console.log(`${product.name} - ₦${product.price.toLocaleString('en-NG')}`);
});
```

---

## Orders & Checkout

### POST /api/orders/checkout
**Authentication:** Required (user must be signed in)

**Request Body:**
```json
{
  "items": [
    {
      "productId": "cmuyuewoq00047wvy4ewcgvih",
      "quantity": 2
    }
  ],
  "customer": {
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "shippingAddress": "123 Main Street, Lagos, Lagos State, Nigeria"
}
```

**Response (Success):**
```json
{
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/...",
    "reference": "ref_abc123xyz"
  }
}
```

Or any of these variations (app checks for all):
- `authorization_url`
- `checkoutUrl` / `checkout_url`
- `paymentUrl` / `payment_url`
- `url`

**Response (Error - Not Signed In):**
```json
{
  "error": {
    "message": "Please sign in to continue.",
    "code": "UNAUTHENTICATED"
  }
}
```
HTTP Status: 401

**Response (Error - Validation):**
```json
{
  "error": {
    "message": "Invalid request body.",
    "code": "VALIDATION_ERROR"
  }
}
```
HTTP Status: 400

**Code:**
```typescript
import { startCheckout } from './src/api';
import * as WebBrowser from 'expo-web-browser';

async function checkout(items, customer, address) {
  const result = await startCheckout({
    items: items.map(({ id, quantity }) => ({ productId: id, quantity })),
    customer,
    shippingAddress: address,
  });

  // Extract payment URL from any possible field
  const paymentUrl = 
    result.authorizationUrl ||
    result.authorization_url ||
    result.checkoutUrl ||
    result.checkout_url ||
    result.paymentUrl ||
    result.payment_url ||
    result.url;

  if (paymentUrl) {
    await WebBrowser.openBrowserAsync(paymentUrl);
  }
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE"
  }
}
```

**Common Error Codes:**
- `NOT_FOUND` - Endpoint doesn't exist (HTTP 404)
- `UNAUTHENTICATED` - User not signed in (HTTP 401)
- `VALIDATION_ERROR` - Invalid request (HTTP 400)
- `INTERNAL_ERROR` - Server error (HTTP 500)

**App Handling:**
```typescript
try {
  const products = await getProducts();
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message); // Already formatted by API client
  }
}
```

---

## Data Types

### Product
```typescript
type Product = {
  id: string;           // Unique product ID
  name: string;         // Display name
  slug: string;         // URL-safe name (lowercase, hyphens)
  description: string;  // Full product description
  price: number;        // Price in Nigerian Naira (₦)
  image: string;        // Product image URL (HTTPS)
  category: string;     // Category name (e.g., "Home Fragrance")
  stock: number;        // Available quantity (≥0)
  createdAt: string;    // ISO 8601 timestamp
  updatedAt: string;    // ISO 8601 timestamp
};
```

### User
```typescript
type StoreUser = {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
  picture?: string;    // Same as image (from Google OAuth)
};
```

### Checkout Details
```typescript
type CheckoutDetails = {
  items: { productId: string; quantity: number }[];
  customer: { name: string; email: string };
  shippingAddress: string;
};
```

---

## Rate Limiting

The API enforces rate limiting per IP:
- **180 requests per 15 minutes** (standard)

Response headers include:
```
ratelimit: 180-in-15min; r=168
ratelimit-policy: 180-in-15min; q=180; w=900
```

The app should respect these limits and show a user-friendly message if 429 (Too Many Requests) is returned.

---

## CORS & Credentials

The app sends requests with:
```
credentials: "include"
```

This allows the API to read/write httpOnly session cookies set during OAuth.

**Required CORS headers from API:**
```
access-control-allow-credentials: true
access-control-allow-origin: <app-origin>
```

---

## Paystack Integration Notes

**The app does NOT handle payment directly.** Instead:

1. App sends checkout request to API
2. API validates cart, calculates totals, creates order
3. API initializes Paystack payment and returns authorization URL
4. App opens URL in browser
5. User completes payment on Paystack
6. Paystack webhook notifies API of success
7. API sends receipt email via Mailgun
8. App returns with success message

**Never send Paystack secret keys from mobile app.** They remain backend-only.

---

## Example: Full Checkout Flow

```typescript
import { startCheckout } from './src/api';
import * as WebBrowser from 'expo-web-browser';

async function handleCheckout(
  cartItems: CartItem[],
  customerName: string,
  customerEmail: string,
  shippingAddress: string
) {
  try {
    // Send order to API
    const result = await startCheckout({
      items: cartItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      customer: {
        name: customerName,
        email: customerEmail,
      },
      shippingAddress,
    });

    // Extract payment URL (check multiple possible field names)
    const paymentUrl =
      result.authorizationUrl ??
      result.authorization_url ??
      result.checkoutUrl ??
      result.checkout_url ??
      result.paymentUrl ??
      result.payment_url ??
      result.url;

    if (!paymentUrl) {
      throw new Error('No payment URL returned from API');
    }

    // Open Paystack in browser
    await WebBrowser.openBrowserAsync(paymentUrl);

    // User completes payment (or cancels), returns to app
    // Show success message and clear cart
    setNotice('Order placed! Check your email for receipt.');
    setCart([]);

  } catch (error) {
    setError(
      error instanceof Error 
        ? error.message 
        : 'Checkout failed. Please try again.'
    );
  }
}
```

---

## Testing with cURL

```bash
# Get products
curl https://store-app-exqx.onrender.com/api/products

# Check if signed in (unauthenticated)
curl -b "" https://store-app-exqx.onrender.com/api/auth/me

# Attempt checkout without auth (should fail)
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"items":[],"customer":{"name":"test","email":"test@example.com"},"shippingAddress":"test"}' \
  https://store-app-exqx.onrender.com/api/orders/checkout
```

---

**Last Updated:** October 2026  
**API Version:** 1.0  
**App Version:** 1.0.0
