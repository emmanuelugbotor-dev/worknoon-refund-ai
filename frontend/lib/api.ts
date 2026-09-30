const API = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing errors for empty responses
  }

  // Centralized authentication handling
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_token");

      // Tell the application that authentication has expired
      window.dispatchEvent(new Event("admin-auth-expired"));
    }

    throw new Error(
      data?.error?.message || "Your session has expired. Please sign in again.",
    );
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || "Request failed");
  }

  return data as T;
}
