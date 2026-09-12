const SUPABASE_URL =
  "https://lxsveftgcjofmoloplwt.supabase.co";

/*
  This is the PUBLIC browser key.
  Never put the service-role key here.
*/
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Sc76JsyY7CUzY_EWjCfsFQ_KgslC2KB";

const AUTH_STORAGE_KEY =
  "voiceToNotionAuth";

let refreshPromise = null;

/*
  STORAGE
*/

async function saveAuthSession(
  session
) {
  await chrome.storage.local.set({
    [AUTH_STORAGE_KEY]:
      session,
  });
}

async function getStoredAuthSession() {
  const result =
    await chrome.storage.local.get(
      AUTH_STORAGE_KEY
    );

  return (
    result[
      AUTH_STORAGE_KEY
    ] ?? null
  );
}

async function clearAuthSession() {
  await chrome.storage.local.remove(
    AUTH_STORAGE_KEY
  );
}

/*
  AUTH ERRORS
*/

function createAuthError(
  message,
  code
) {
  const error =
    new Error(message);

  error.code =
    code;

  return error;
}

/*
  LOGIN
*/

async function signInWithPassword(
  email,
  password
) {
  /*
    Remove any previous local session
    before logging into another account.
  */

  await clearAuthSession();

  const response =
    await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method:
          "POST",

        headers: {
          apikey:
            SUPABASE_PUBLISHABLE_KEY,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            email,
            password,
          }),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.error_description ||
        data.msg ||
        data.message ||
        "Could not log in."
    );
  }

  if (
    !data.access_token ||
    !data.refresh_token
  ) {
    throw new Error(
      "Supabase returned an incomplete login session."
    );
  }

  const session = {
    accessToken:
      data.access_token,

    refreshToken:
      data.refresh_token,

    expiresAt:
      Date.now() +
      data.expires_in *
        1000,

    user: {
      id:
        data.user?.id ??
        null,

      email:
        data.user?.email ??
        email,
    },
  };

  await saveAuthSession(
    session
  );

  return session;
}

/*
  REFRESH SESSION
*/

async function refreshAuthSession() {
  /*
    Prevent two API requests from
    refreshing at the same time.
  */

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise =
    performRefresh();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise =
      null;
  }
}

async function performRefresh() {
  const currentSession =
    await getStoredAuthSession();

  if (
    !currentSession?.refreshToken
  ) {
    await clearAuthSession();

    return null;
  }

  try {
    const response =
      await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
        {
          method:
            "POST",

          headers: {
            apikey:
              SUPABASE_PUBLISHABLE_KEY,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              refresh_token:
                currentSession.refreshToken,
            }),
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.access_token ||
      !data.refresh_token
    ) {
      console.error(
        "SESSION REFRESH FAILED:",
        data
      );

      await clearAuthSession();

      return null;
    }

    const refreshedSession = {
      accessToken:
        data.access_token,

      refreshToken:
        data.refresh_token,

      expiresAt:
        Date.now() +
        data.expires_in *
          1000,

      user: {
        id:
          data.user?.id ??
          currentSession.user?.id ??
          null,

        email:
          data.user?.email ??
          currentSession.user?.email ??
          null,
      },
    };

    await saveAuthSession(
      refreshedSession
    );

    return refreshedSession;
  } catch (error) {
    console.error(
      "SESSION REFRESH ERROR:",
      error
    );

    await clearAuthSession();

    return null;
  }
}

/*
  GET CURRENT VALID SESSION
*/

async function getValidAuthSession() {
  let session =
    await getStoredAuthSession();

  if (!session) {
    return null;
  }

  /*
    Refresh one minute before
    the token expires.
  */

  const refreshBuffer =
    60 * 1000;

  const shouldRefresh =
    !session.expiresAt ||
    Date.now() >=
      session.expiresAt -
        refreshBuffer;

  if (shouldRefresh) {
    session =
      await refreshAuthSession();
  }

  return session;
}

/*
  AUTHENTICATED BACKEND REQUEST

  1. Get session
  2. Send request
  3. If server returns 401:
       refresh token
  4. Retry exactly once
  5. If still 401:
       clear session
*/

async function authenticatedFetch(
  url,
  options = {}
) {
  let session =
    await getValidAuthSession();

  if (!session?.accessToken) {
    throw createAuthError(
      "Please log in to Voice to Notion.",
      "AUTH_REQUIRED"
    );
  }

  const firstResponse =
    await sendAuthenticatedRequest(
      url,
      options,
      session.accessToken
    );

  if (
    firstResponse.status !==
    401
  ) {
    return firstResponse;
  }

  console.warn(
    "Backend returned 401. Refreshing session and retrying once."
  );

  session =
    await refreshAuthSession();

  if (!session?.accessToken) {
    await clearAuthSession();

    throw createAuthError(
      "Your session expired. Please log in again.",
      "AUTH_EXPIRED"
    );
  }

  const retryResponse =
    await sendAuthenticatedRequest(
      url,
      options,
      session.accessToken
    );

  if (
    retryResponse.status ===
    401
  ) {
    await clearAuthSession();

    throw createAuthError(
      "Your session expired. Please log in again.",
      "AUTH_EXPIRED"
    );
  }

  return retryResponse;
}

async function sendAuthenticatedRequest(
  url,
  options,
  accessToken
) {
  const headers =
    new Headers(
      options.headers ||
        {}
    );

  headers.set(
    "Authorization",
    `Bearer ${accessToken}`
  );

  return fetch(
    url,
    {
      ...options,
      headers,
    }
  );
}

/*
  LOGOUT
*/

async function signOutExtension() {
  const session =
    await getStoredAuthSession();

  /*
    Best effort server logout.
    We clear Chrome storage regardless.
  */

  if (
    session?.accessToken
  ) {
    try {
      await fetch(
        `${SUPABASE_URL}/auth/v1/logout`,
        {
          method:
            "POST",

          headers: {
            apikey:
              SUPABASE_PUBLISHABLE_KEY,

            Authorization:
              `Bearer ${session.accessToken}`,
          },
        }
      );
    } catch (error) {
      console.warn(
        "SUPABASE LOGOUT REQUEST FAILED:",
        error
      );
    }
  }

  await clearAuthSession();
}

/*
  EXPOSE TO POPUP.JS
*/

window.voiceToNotionAuth = {
  signInWithPassword,
  getValidAuthSession,
  getStoredAuthSession,
  refreshAuthSession,
  authenticatedFetch,
  signOutExtension,
};