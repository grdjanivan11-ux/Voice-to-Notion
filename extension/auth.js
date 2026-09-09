const SUPABASE_URL =
  "https://lxsveftgcjofmoloplwt.supabase.co";

/*
  SAFE CLIENT KEY.

  Replace this with the same
  sb_publishable_... value used by:

  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
*/
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Sc76JsyY7CUzY_EWjCfsFQ_KgslC2KB";

const AUTH_STORAGE_KEY =
  "voiceToNotionAuth";

async function saveAuthSession(session) {
  await chrome.storage.local.set({
    [AUTH_STORAGE_KEY]: session,
  });
}

async function getStoredAuthSession() {
  const result =
    await chrome.storage.local.get(
      AUTH_STORAGE_KEY
    );

  return (
    result[AUTH_STORAGE_KEY] ??
    null
  );
}

async function clearAuthSession() {
  await chrome.storage.local.remove(
    AUTH_STORAGE_KEY
  );
}

async function signInWithPassword(
  email,
  password
) {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",

      headers: {
        apikey:
          SUPABASE_PUBLISHABLE_KEY,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
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

  const session = {
    accessToken:
      data.access_token,

    refreshToken:
      data.refresh_token,

    expiresAt:
      Date.now() +
      data.expires_in * 1000,

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

async function refreshAuthSession() {
  const currentSession =
    await getStoredAuthSession();

  if (
    !currentSession?.refreshToken
  ) {
    return null;
  }

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",

      headers: {
        apikey:
          SUPABASE_PUBLISHABLE_KEY,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        refresh_token:
          currentSession.refreshToken,
      }),
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
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
      data.expires_in * 1000,

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
}

async function getValidAuthSession() {
  let session =
    await getStoredAuthSession();

  if (!session) {
    return null;
  }

  /*
    Refresh slightly before the
    access token actually expires.
  */

  const refreshBuffer =
    60 * 1000;

  if (
    !session.expiresAt ||
    Date.now() >=
      session.expiresAt -
        refreshBuffer
  ) {
    session =
      await refreshAuthSession();
  }

  return session;
}

async function signOutExtension() {
  const session =
    await getStoredAuthSession();

  /*
    Best-effort server logout.
    Local session is cleared either way.
  */

  if (session?.accessToken) {
    try {
      await fetch(
        `${SUPABASE_URL}/auth/v1/logout`,
        {
          method: "POST",

          headers: {
            apikey:
              SUPABASE_PUBLISHABLE_KEY,

            Authorization:
              `Bearer ${session.accessToken}`,
          },
        }
      );
    } catch (error) {
      console.error(
        "SUPABASE LOGOUT ERROR:",
        error
      );
    }
  }

  await clearAuthSession();
}

/*
  Expose functions to popup.js.
*/

window.voiceToNotionAuth = {
  signInWithPassword,
  getValidAuthSession,
  getStoredAuthSession,
  refreshAuthSession,
  signOutExtension,
};