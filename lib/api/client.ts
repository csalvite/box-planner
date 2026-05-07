export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type ApiFetchOptions = Omit<RequestInit, "headers"> & {
  accessToken?: string | null;
  headers?: HeadersInit;
};

function getApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL no está configurada");
  }

  return apiUrl.replace(/\/$/, "");
}

function getErrorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const message = record.message ?? record.error;

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (Array.isArray(message)) {
      const messages = message.filter(
        (currentMessage): currentMessage is string =>
          typeof currentMessage === "string" && currentMessage.trim().length > 0,
      );

      if (messages.length > 0) {
        return messages.join(". ");
      }
    }
  }

  return `La API respondió con estado ${status}`;
}

async function readResponse(response: Response) {
  const contentType = response.headers.get("content-type");

  if (response.status === 204) {
    return undefined;
  }

  if (contentType?.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export async function apiFetch<T>(
  path: string,
  { accessToken, headers, ...init }: ApiFetchOptions = {},
) {
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }

  if (init.body && !(init.body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: requestHeaders,
  });

  const payload = await readResponse(response);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(payload, response.status), response.status, payload);
  }

  return payload as T;
}
