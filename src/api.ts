import * as SecureStore from "expo-secure-store";

declare const process: { env: Record<string, string | undefined> };

const envUrl =
  typeof process !== "undefined" ? process.env.EXPO_PUBLIC_API_URL : undefined;
export const API_URL = (envUrl ?? "https://store-app-exqx.onrender.com").replace(
  /\/$/,
  "",
);
export const GOOGLE_WEB_CLIENT_ID =
  typeof process !== "undefined"
    ? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
    : undefined;
export const GOOGLE_IOS_CLIENT_ID =
  typeof process !== "undefined"
    ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
    : undefined;

const AUTH_STORAGE_KEY = "cedarloom.auth.credentials";

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
};

export type StoreUser = {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
  picture?: string;
};

type AuthCredentials = {
  accessToken: string;
  refreshToken?: string;
};

type ApiEnvelope<T> = {
  data?: T;
  error?: { message?: string };
};

type AuthResponse = {
  accessToken?: string;
  access_token?: string;
  token?: string;
  refreshToken?: string;
  refresh_token?: string;
  user?: StoreUser | null;
  tokens?: AuthResponse;
  credentials?: AuthResponse;
};

let onAuthenticationExpired: (() => void) | undefined;
let refreshInProgress: Promise<AuthCredentials> | undefined;
let authenticationRevision = 0;

export function setAuthenticationExpiredHandler(handler?: () => void): void {
  onAuthenticationExpired = handler;
}

async function readCredentials(): Promise<AuthCredentials | null> {
  const stored = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
  if (!stored) return null;

  try {
    const credentials = JSON.parse(stored) as Partial<AuthCredentials>;
    if (typeof credentials.accessToken !== "string" || !credentials.accessToken) {
      throw new Error("Stored authentication credentials are invalid.");
    }
    return {
      accessToken: credentials.accessToken,
      ...(typeof credentials.refreshToken === "string"
        ? { refreshToken: credentials.refreshToken }
        : {}),
    };
  } catch {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
    throw new Error("Stored authentication credentials are invalid. Please sign in again.");
  }
}

async function storeCredentials(credentials: AuthCredentials): Promise<void> {
  await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(credentials));
}

export async function clearAuthentication(): Promise<void> {
  authenticationRevision += 1;
  await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
}

async function decodeResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let body: ApiEnvelope<T> | T;
  try {
    body = raw ? (JSON.parse(raw) as ApiEnvelope<T> | T) : ({} as T);
  } catch {
    throw new Error("The store returned an unreadable response. Please try again.");
  }

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? body.error?.message
        : undefined;
    throw new Error(message ?? `Request failed (${response.status}). Please try again.`);
  }

  if (typeof body === "object" && body !== null && "data" in body) {
    return body.data as T;
  }
  return body as T;
}

function normalizeCredentials(response: AuthResponse): AuthCredentials {
  const result = response.credentials ?? response.tokens ?? response;
  const accessToken = result.accessToken ?? result.access_token ?? result.token;
  const refreshToken = result.refreshToken ?? result.refresh_token;
  if (!accessToken) {
    throw new Error("The store did not return an application access token.");
  }
  return {
    accessToken,
    ...(refreshToken ? { refreshToken } : {}),
  };
}

async function performTokenRefresh(): Promise<AuthCredentials> {
  const revision = authenticationRevision;
  const current = await readCredentials();
  if (!current?.refreshToken) {
    throw new Error("No refresh token is available.");
  }

  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  });
  const result = await decodeResponse<AuthResponse>(response);
  const refreshed = normalizeCredentials(result);
  if (!refreshed.refreshToken) refreshed.refreshToken = current.refreshToken;
  if (revision !== authenticationRevision) {
    throw new Error("The authentication session changed during token refresh.");
  }
  await storeCredentials(refreshed);
  return refreshed;
}

function refreshCredentials(): Promise<AuthCredentials> {
  if (!refreshInProgress) {
    refreshInProgress = performTokenRefresh().finally(() => {
      refreshInProgress = undefined;
    });
  }
  return refreshInProgress;
}

async function request<T>(
  path: string,
  init?: RequestInit,
  allowRefresh = true,
  authenticated = true,
): Promise<T> {
  const credentials = authenticated ? await readCredentials() : null;
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  if (credentials?.accessToken) {
    headers.set("Authorization", `Bearer ${credentials.accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "omit",
    headers,
  });

  if (response.status === 401 && credentials?.accessToken) {
    if (allowRefresh) {
      try {
        await refreshCredentials();
        return request<T>(path, init, false);
      } catch {
        await clearAuthentication();
        onAuthenticationExpired?.();
        throw new Error("Your session has expired. Please sign in again.");
      }
    } else {
      await clearAuthentication();
      onAuthenticationExpired?.();
    }
  }

  return decodeResponse<T>(response);
}

export async function getProducts(): Promise<Product[]> {
  const result = await request<{ items: Product[] }>("/api/products");
  if (!Array.isArray(result.items)) {
    throw new Error("The store returned an unexpected product list.");
  }
  return result.items;
}

export async function getCurrentUser(): Promise<StoreUser | null> {
  if (!(await readCredentials())) return null;
  const result = await request<{ user: StoreUser | null }>("/api/auth/me");
  const user = result.user ?? null;
  if (!user) await clearAuthentication();
  return user;
}

export async function exchangeGoogleIdToken(idToken: string): Promise<StoreUser> {
  const revision = authenticationRevision;
  const response = await request<AuthResponse>(
    "/api/auth/google/mobile",
    {
      method: "POST",
      body: JSON.stringify({ idToken }),
    },
    false,
    false,
  );
  const credentials = normalizeCredentials(response);
  if (revision !== authenticationRevision) {
    throw new Error("The sign-in request was cancelled. Please try again.");
  }
  await storeCredentials(credentials);

  if (response.user) return response.user;
  const user = await getCurrentUser();
  if (!user) {
    await clearAuthentication();
    throw new Error("The store did not return an authenticated user.");
  }
  return user;
}

export type CheckoutDetails = {
  items: { productId: string; quantity: number }[];
  customer: { name: string; email: string };
  shippingAddress: string;
};

export type CheckoutResult = {
  authorizationUrl?: string;
  authorization_url?: string;
  checkoutUrl?: string;
  checkout_url?: string;
  paymentUrl?: string;
  payment_url?: string;
  url?: string;
  reference?: string;
  payment?: CheckoutResult;
};

export function startCheckout(details: CheckoutDetails): Promise<CheckoutResult> {
  return request<CheckoutResult>("/api/orders/checkout", {
    method: "POST",
    body: JSON.stringify(details),
  });
}

export async function signOut(): Promise<void> {
  await clearAuthentication();
}
