import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/usage";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

/* =========================================================
   VOICE TO NOTION
   C9.4 — ONBOARDING STATE
   ========================================================= */

type OnboardingRow = {
  user_id:
    string;

  completed:
    boolean;

  current_step:
    number;

  completed_at:
    string | null;

  created_at:
    string;

  updated_at:
    string;
};

type OnboardingAction =
  | {
      action:
        "set_step";

      step:
        number;
    }
  | {
      action:
        "complete";
    }
  | {
      action:
        "reset";
    };

/* =========================================================
   ENSURE ONBOARDING ROW
   ========================================================= */

async function ensureOnboardingRow(
  userId:
    string
): Promise<OnboardingRow> {
  const {
    data:
      existing,
    error:
      lookupError,
  } =
    await supabaseAdmin
      .from(
        "user_onboarding"
      )
      .select(
        `
          user_id,
          completed,
          current_step,
          completed_at,
          created_at,
          updated_at
        `
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

  if (
    lookupError
  ) {
    console.error(
      "ONBOARDING LOOKUP ERROR:",
      lookupError
    );

    throw new Error(
      "Could not load onboarding."
    );
  }

  if (
    existing
  ) {
    return existing as OnboardingRow;
  }

  const {
    error:
      insertError,
  } =
    await supabaseAdmin
      .from(
        "user_onboarding"
      )
      .upsert(
        {
          user_id:
            userId,

          completed:
            false,

          current_step:
            1,

          completed_at:
            null,

          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            "user_id",

          ignoreDuplicates:
            true,
        }
      );

  if (
    insertError
  ) {
    console.error(
      "ONBOARDING CREATE ERROR:",
      insertError
    );

    throw new Error(
      "Could not initialize onboarding."
    );
  }

  const {
    data:
      created,
    error:
      createdError,
  } =
    await supabaseAdmin
      .from(
        "user_onboarding"
      )
      .select(
        `
          user_id,
          completed,
          current_step,
          completed_at,
          created_at,
          updated_at
        `
      )
      .eq(
        "user_id",
        userId
      )
      .single();

  if (
    createdError ||
    !created
  ) {
    console.error(
      "ONBOARDING CREATED ROW LOAD ERROR:",
      createdError
    );

    throw new Error(
      "Could not load initialized onboarding."
    );
  }

  return created as OnboardingRow;
}

/* =========================================================
   GET
   ========================================================= */

export async function GET(
  request:
    Request
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (
      !user
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "Authentication required.",
        },
        {
          status:
            401,
        }
      );
    }

    const onboarding =
      await ensureOnboardingRow(
        user.id
      );

    return NextResponse.json({
      success:
        true,

      onboarding: {
        completed:
          onboarding.completed,

        currentStep:
          onboarding.current_step,

        completedAt:
          onboarding.completed_at,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "ONBOARDING GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "Could not load onboarding.",
      },
      {
        status:
          500,
      }
    );
  }
}

/* =========================================================
   PATCH
   ========================================================= */

export async function PATCH(
  request:
    Request
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (
      !user
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            "Authentication required.",
        },
        {
          status:
            401,
        }
      );
    }

    await ensureOnboardingRow(
      user.id
    );

    const body =
      (await request.json()) as
        Partial<OnboardingAction>;

    const now =
      new Date()
        .toISOString();

    /* =====================================================
       STEP
       ===================================================== */

    if (
      body.action ===
      "set_step"
    ) {
      const step =
        Number(
          body.step
        );

      if (
        !Number.isInteger(
          step
        ) ||
        step <
          1 ||
        step >
          3
      ) {
        return NextResponse.json(
          {
            success:
              false,

            error:
              "Invalid onboarding step.",
          },
          {
            status:
              400,
          }
        );
      }

      const {
        error,
      } =
        await supabaseAdmin
          .from(
            "user_onboarding"
          )
          .update({
            current_step:
              step,

            updated_at:
              now,
          })
          .eq(
            "user_id",
            user.id
          );

      if (
        error
      ) {
        console.error(
          "ONBOARDING STEP UPDATE ERROR:",
          error
        );

        throw new Error(
          "Could not save onboarding step."
        );
      }

      return NextResponse.json({
        success:
          true,

        onboarding: {
          completed:
            false,

          currentStep:
            step,

          completedAt:
            null,
        },
      });
    }

    /* =====================================================
       COMPLETE
       ===================================================== */

    if (
      body.action ===
      "complete"
    ) {
      const {
        error,
      } =
        await supabaseAdmin
          .from(
            "user_onboarding"
          )
          .update({
            completed:
              true,

            current_step:
              3,

            completed_at:
              now,

            updated_at:
              now,
          })
          .eq(
            "user_id",
            user.id
          );

      if (
        error
      ) {
        console.error(
          "ONBOARDING COMPLETE ERROR:",
          error
        );

        throw new Error(
          "Could not complete onboarding."
        );
      }

      return NextResponse.json({
        success:
          true,

        onboarding: {
          completed:
            true,

          currentStep:
            3,

          completedAt:
            now,
        },
      });
    }

    /* =====================================================
       RESET

       Development helper.
       This lets us test onboarding again without deleting
       the account.
       ===================================================== */

    if (
      body.action ===
      "reset"
    ) {
      const {
        error,
      } =
        await supabaseAdmin
          .from(
            "user_onboarding"
          )
          .update({
            completed:
              false,

            current_step:
              1,

            completed_at:
              null,

            updated_at:
              now,
          })
          .eq(
            "user_id",
            user.id
          );

      if (
        error
      ) {
        console.error(
          "ONBOARDING RESET ERROR:",
          error
        );

        throw new Error(
          "Could not reset onboarding."
        );
      }

      return NextResponse.json({
        success:
          true,

        onboarding: {
          completed:
            false,

          currentStep:
            1,

          completedAt:
            null,
        },
      });
    }

    return NextResponse.json(
      {
        success:
          false,

        error:
          "Invalid onboarding action.",
      },
      {
        status:
          400,
      }
    );
  } catch (
    error
  ) {
    console.error(
      "ONBOARDING PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "Could not update onboarding.",
      },
      {
        status:
          500,
      }
    );
  }
}