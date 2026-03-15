export function getSafeRedirectTarget(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export function buildAuthHref(
  pathname: string,
  options?: {
    email?: string | null;
    redirectTo?: string | null;
  },
) {
  const params = new URLSearchParams();

  if (options?.redirectTo) {
    params.set("redirectTo", options.redirectTo);
  }

  if (options?.email) {
    params.set("email", options.email);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
