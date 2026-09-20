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
   C9.4 — ONBOARDING + GETTING STARTED STATE
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

  first_capture_completed:
    boolean;

  first_capture_completed_at:
    string | null;

  checklist_dismissed:
    boolean;

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
        "dismiss_checklist";
    }
  | {
      action:
        "restore_checklist";
    }
  | {
      action:
        "reset";
    };

/* =========================================================
   SELECT
   ========================================================= */

const onboardingSelect = `
  user_id,
  completed,
  current_step,
  completed_at,
  first_capture_completed,
  first_capture_completed_at,
  checklist_dismissed,
  created_at,
  updated_at
`;

/* =========================================================
   RESPONSE NORMALIZER
   ========================================================= */

function normalizeOnboarding(
  onboarding:
    OnboardingRow
) {
  return {
    completed:
      onboarding.completed,

    currentStep:
      onboarding.current_step,

    completedAt:
      onboarding.completed_at,

    firstCaptureCompleted:
      onboarding.first_capture_completed,

    firstCaptureCompletedAt:
      onboarding.first_capture_completed_at,

    checklistDismissed:
      onboarding.checklist_dismissed,
  };
}

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
        onboardingSelect
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

  const now =
    new Date()
      .toISOString();

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

          first_capture_completed:
            false,

          first_capture_completed_at:
            null,

          checklist_dismissed:
            false,

          created_at:
            now,

          updated_at:
            now,
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
        onboardingSelect
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
   LOAD CURRENT ROW
   ========================================================= */

async function loadOnboardingRow(
  userId:
    string
) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "user_onboarding"
      )
      .select(
        onboardingSelect
      )
      .eq(
        "user_id",
        userId
      )
      .single();

  if (
    error ||
    !data
  ) {
    console.error(
      "ONBOARDING RELOAD ERROR:",
      error
    );

    throw new Error(
      "Could not reload onboarding."
    );
  }

  return data as OnboardingRow;
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

      onboarding:
        normalizeOnboarding(
          onboarding
        ),
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

      const onboarding =
        await loadOnboardingRow(
          user.id
        );

      return NextResponse.json({
        success:
          true,

        onboarding:
          normalizeOnboarding(
            onboarding
          ),
      });
    }

    /* =====================================================
       COMPLETE INITIAL ONBOARDING
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

      const onboarding =
        await loadOnboardingRow(
          user.id
        );

      return NextResponse.json({
        success:
          true,

        onboarding:
          normalizeOnboarding(
            onboarding
          ),
      });
    }

    /* =====================================================
       DISMISS GETTING STARTED CHECKLIST
       ===================================================== */

    if (
      body.action ===
      "dismiss_checklist"
    ) {
      const existing =
        await loadOnboardingRow(
          user.id
        );

      if (
        !existing
          .first_capture_completed
      ) {
        return NextResponse.json(
          {
            success:
              false,

            error:
              "Complete setup before dismissing the checklist.",
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
            checklist_dismissed:
              true,

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
          "GETTING STARTED DISMISS ERROR:",
          error
        );

        throw new Error(
          "Could not dismiss checklist."
        );
      }

      const onboarding =
        await loadOnboardingRow(
          user.id
        );

      return NextResponse.json({
        success:
          true,

        onboarding:
          normalizeOnboarding(
            onboarding
          ),
      });
    }

    /* =====================================================
       RESTORE CHECKLIST
       ===================================================== */

    if (
      body.action ===
      "restore_checklist"
    ) {
      const {
        error,
      } =
        await supabaseAdmin
          .from(
            "user_onboarding"
          )
          .update({
            checklist_dismissed:
              false,

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
          "GETTING STARTED RESTORE ERROR:",
          error
        );

        throw new Error(
          "Could not restore checklist."
        );
      }

      const onboarding =
        await loadOnboardingRow(
          user.id
        );

      return NextResponse.json({
        success:
          true,

        onboarding:
          normalizeOnboarding(
            onboarding
          ),
      });
    }

    /* =====================================================
       RESET INITIAL ONBOARDING

       Development helper.

       Important:
       This does NOT erase the permanent first-capture
       milestone.
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

            checklist_dismissed:
              false,

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

      const onboarding =
        await loadOnboardingRow(
          user.id
        );

      return NextResponse.json({
        success:
          true,

        onboarding:
          normalizeOnboarding(
            onboarding
          ),
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