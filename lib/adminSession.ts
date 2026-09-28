// Client-side helpers for the admin session. Only call these from the browser.

let isRedirecting = false;
let isWatching = false;

export function clearAdminSession() {
  localStorage.removeItem("adminAccessToken");
  document.cookie = "adminAccessToken=; path=/; max-age=0; SameSite=Lax";
}

export function handleExpiredSession() {
  if (isRedirecting) return;
  isRedirecting = true;

  clearAdminSession();
  window.location.replace("/admin/login?expired=1");
}

// Watches every admin API call, so a 401 is handled here instead of on each page.
// Pages fetch before the layout's effects run, so this is started when the
// layout file loads rather than inside an effect.
export function watchAdminApi() {
  if (isWatching) return;
  isWatching = true;

  const originalFetch = window.fetch;

  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    const url = input instanceof Request ? input.url : String(input);
    const isAdminApi =
      url.includes("/api/admin/") && !url.includes("/api/admin/login");

    if (response.status === 401 && isAdminApi) {
      handleExpiredSession();
    }

    return response;
  };
}
