import { Platform } from "react-native";

declare const process: { env: Record<string, string | undefined> };

const envUrl = typeof process !== "undefined" ? process.env.EXPO_PUBLIC_API_URL : undefined;
export const API_URL = (envUrl ?? "https://store-app-exqx.onrender.com").replace(
  /\/$/,
  "",
);

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

type ApiEnvelope<T> = {
  data?: T;
  error?: { message?: string };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

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

export async function getProducts(): Promise<Product[]> {
  const result = await request<{ items: Product[] }>("/api/products");
  if (!Array.isArray(result.items)) {
    throw new Error("The store returned an unexpected product list.");
  }
  return result.items;
}

export async function getCurrentUser(): Promise<StoreUser | null> {
  const result = await request<{ user: StoreUser | null }>("/api/auth/me");
  return result.user ?? null;
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
