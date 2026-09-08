import {
  createHmac,
} from "node:crypto";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  request: Request
) {
  try {
    const clientId =
      process.env.NOTION_OAUTH_CLIENT_ID;

    const clientSecret =
      process.env.NOTION_OAUTH_CLIENT_SECRET;

    const redirectUri =
      process.env.NOTION_OAUTH_REDIRECT_URI;

    if (
      !clientId ||
      !clientSecret ||
      !redirectUri
    ) {
      return NextResponse.json(
        {
          error:
            "Notion OAuth environment variables are missing.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      READ SUPABASE ACCESS TOKEN
    */

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const accessToken =
      authorization.slice(
        "Bearer ".length
      );

    /*
      VERIFY LOGGED-IN USER
    */

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !user
    ) {
      console.error(
        "SUPABASE USER VERIFY ERROR:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "Your login session is invalid or expired.",
        },
        {
          status: 401,
        }
      );
    }

    /*
      BUILD SIGNED OAUTH STATE

      Format:

      timestamp.nonce.userId.signature
    */

    const timestamp =
      Date.now();

    const nonce =
      crypto.randomUUID();

    const payload =
      `${timestamp}.${nonce}.${user.id}`;

    const signature =
      createHmac(
        "sha256",
        clientSecret
      )
        .update(payload)
        .digest("hex");

    const state =
      `${payload}.${signature}`;

    /*
      BUILD NOTION AUTHORIZE URL
    */

    const authorizationUrl =
      new URL(
        "https://api.notion.com/v1/oauth/authorize"
      );

    authorizationUrl.searchParams.set(
      "client_id",
      clientId
    );

    authorizationUrl.searchParams.set(
      "redirect_uri",
      redirectUri
    );

    authorizationUrl.searchParams.set(
      "response_type",
      "code"
    );

    authorizationUrl.searchParams.set(
      "owner",
      "user"
    );

    authorizationUrl.searchParams.set(
      "state",
      state
    );

    /*
      IMPORTANT:
      Return URL as JSON instead of redirecting.

      The browser first calls this route
      with its Supabase access token.
    */

    return NextResponse.json({
      success: true,
      authorizationUrl:
        authorizationUrl.toString(),
    });
  } catch (error) {
    console.error(
      "NOTION OAUTH START ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not start Notion OAuth.",
      },
      {
        status: 500,
      }
    );
  }
}