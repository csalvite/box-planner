const inviteRedirectStorageKey = "box-planner-pending-invite-redirect";

export function isInviteRedirect(value?: string | null): value is string {
  return Boolean(value?.startsWith("/invite?token="));
}

export function getSafeRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export function getPendingInviteRedirect() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(inviteRedirectStorageKey);
}

export function setPendingInviteRedirect(value: string) {
  if (typeof window === "undefined" || !isInviteRedirect(value)) {
    return;
  }

  window.localStorage.setItem(inviteRedirectStorageKey, value);
}

export function clearPendingInviteRedirect() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(inviteRedirectStorageKey);
}
