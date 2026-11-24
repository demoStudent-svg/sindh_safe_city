   (function () {
  const config = Object.freeze({
    baseUrl: "http://localhost:5000/api",
    tokenKey: "sindhSafeCityToken",
    userKey: "sindhSafeCityUser"
  });

  function getToken() {
    return localStorage.getItem(config.tokenKey);
  }

  function saveSession(token, user) {
    localStorage.setItem(config.tokenKey, token);
    localStorage.setItem(config.userKey, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(config.tokenKey);
    localStorage.removeItem(config.userKey);
  }

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    if (options.body !== undefined) headers.set("Content-Type", "application/json");
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    let response;
    try {
      response = await fetch(`${config.baseUrl}${path}`, {
        ...options,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body)
      });
    } catch (error) {
      throw new Error("Cannot reach the API. Start the backend and check the API URL.");
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error("The API returned an unreadable response.");
    }
    if (!response.ok || payload.success === false) {
      if (response.status === 401 && !options.allowUnauthorized) {
        clearSession();
        if (!window.location.pathname.endsWith("/login.html") && !window.location.pathname.endsWith("login.html")) {
          window.location.href = "login.html";
        }
      }
      const details = payload.errors?.map(item => item.message).filter(Boolean).join(" ");
      throw new Error(details || payload.message || `Request failed (${response.status}).`);
    }
    return payload;
  }

  window.SafeCityAPI = Object.freeze({
    baseUrl: config.baseUrl,
    getToken,
    saveSession,
    clearSession,
    get: path => request(path),
    post: (path, body, options = {}) => request(path, { method: "POST", body, ...options }),
    put: (path, body) => request(path, { method: "PUT", body }),
    patch: (path, body) => request(path, { method: "PATCH", body }),
    delete: path => request(path, { method: "DELETE" })
  });
})();
