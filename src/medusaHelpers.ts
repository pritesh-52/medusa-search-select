import type { FetchOptionsFn, SearchSelectOption } from "./types";

/**
 * Minimal shape of the Medusa JS Client's product list response, kept loose
 * on purpose so this works whether you're using @medusajs/medusa-js,
 * @medusajs/js-sdk, or a plain fetch call against the Store/Admin API.
 */
export interface MedusaProductLike {
  id: string;
  title: string;
  thumbnail?: string | null;
  [key: string]: unknown;
}

export interface MedusaCustomerLike {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  [key: string]: unknown;
}

/**
 * Builds a `fetchOptions` function that queries a Medusa Store/Admin REST
 * endpoint for products and maps the results into SearchSelectOption[].
 *
 * Example:
 *   const fetchOptions = createMedusaProductFetcher({
 *     baseUrl: "https://your-medusa-backend.com",
 *     limit: 10,
 *   });
 *   <SearchSelect fetchOptions={fetchOptions} onChange={...} />
 */
export function createMedusaProductFetcher(config: {
  baseUrl: string;
  /** e.g. "/store/products" (default) or "/admin/products" */
  path?: string;
  limit?: number;
  /** Extra headers, e.g. { "x-publishable-api-key": "pk_..." } */
  headers?: Record<string, string>;
}): FetchOptionsFn<MedusaProductLike> {
  const { baseUrl, path = "/store/products", limit = 10, headers = {} } = config;

  return async (query, signal) => {
    const url = new URL(path, baseUrl);
    if (query) url.searchParams.set("q", query);
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), {
      signal,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });

    if (!res.ok) {
      throw new Error(`Medusa request failed with status ${res.status}`);
    }

    const data = await res.json();
    const products: MedusaProductLike[] = data.products ?? [];

    return products.map((p): SearchSelectOption<MedusaProductLike> => ({
      value: p.id,
      label: p.title,
      data: p,
    }));
  };
}

/** Same idea, but for customers via the Admin API. */
export function createMedusaCustomerFetcher(config: {
  baseUrl: string;
  path?: string;
  limit?: number;
  headers?: Record<string, string>;
}): FetchOptionsFn<MedusaCustomerLike> {
  const { baseUrl, path = "/admin/customers", limit = 10, headers = {} } = config;

  return async (query, signal) => {
    const url = new URL(path, baseUrl);
    if (query) url.searchParams.set("q", query);
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), {
      signal,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });

    if (!res.ok) {
      throw new Error(`Medusa request failed with status ${res.status}`);
    }

    const data = await res.json();
    const customers: MedusaCustomerLike[] = data.customers ?? [];

    return customers.map((c): SearchSelectOption<MedusaCustomerLike> => ({
      value: c.id,
      label: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email,
      data: c,
    }));
  };
}
