const BASE = "";

// Module-level current space ID, set by SpaceContext on mount/switch
let currentSpaceId: number | null = null;

export function setCurrentSpaceId(id: number | null) {
  currentSpaceId = id;
}

function spaceHeaders(): Record<string, string> {
  return currentSpaceId !== null ? { "X-Space-Id": String(currentSpaceId) } : {};
}

async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...spaceHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  upload: async <T>(url: string, formData: FormData): Promise<T> => {
    const res = await fetch(`${BASE}${url}`, {
      method: "POST",
      credentials: "include",
      headers: spaceHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.error || `Upload failed: ${res.status}`);
    }
    return res.json();
  },
};
