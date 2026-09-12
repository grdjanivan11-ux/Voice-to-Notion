const API_BASE_URL =
  "https://voice-to-notion-omega.vercel.app";

const THEME_STORAGE_KEY =
  "voiceToNotionTheme";

const DEFAULT_ENTITLEMENTS = {
  plan:
    "free",

  displayName:
    "Free",

  badgeLabel:
    "FREE",

  monthlyAiCaptures:
    30,

  maxRecordingSeconds:
    120,

  maxNotionDestinations:
    1,

  localHistoryLimit:
    10,

  cloudHistory:
    false,

  customCaptureModes:
    false,

  smartRouting:
    false,

  autoSync:
    false,

  customInstructions:
    false,

  advancedAi:
    false,

  captureModes: [
    "general",
  ],
};

/* =========================================================
   ELEMENTS
   ========================================================= */

const topHud =
  document.getElementById(
    "topHud"
  );

const headerProBadge =
  document.getElementById(
    "headerProBadge"
  );

const accountCard =
  document.getElementById(
    "accountCard"
  );

const loggedOutHeader =
  document.getElementById(
    "loggedOutHeader"
  );

const authForm =
  document.getElementById(
    "authForm"
  );

const authEmail =
  document.getElementById(
    "authEmail"
  );

const authPassword =
  document.getElementById(
    "authPassword"
  );

const authButton =
  document.getElementById(
    "authButton"
  );

const authMessage =
  document.getElementById(
    "authMessage"
  );

const signedInBox =
  document.getElementById(
    "signedInBox"
  );

const signedInEmail =
  document.getElementById(
    "signedInEmail"
  );

const profileInitial =
  document.getElementById(
    "profileInitial"
  );

const logoutButton =
  document.getElementById(
    "logoutButton"
  );

const appContent =
  document.getElementById(
    "appContent"
  );

/* =========================================================
   USAGE / PLAN
   ========================================================= */

const usageCard =
  document.getElementById(
    "usageCard"
  );

const proTopLine =
  document.getElementById(
    "proTopLine"
  );

const usageKicker =
  document.getElementById(
    "usageKicker"
  );

const usagePlan =
  document.getElementById(
    "usagePlan"
  );

const openPlanButton =
  document.getElementById(
    "openPlanButton"
  );

const refreshUsageButton =
  document.getElementById(
    "refreshUsageButton"
  );

const usageLoading =
  document.getElementById(
    "usageLoading"
  );

const usageContent =
  document.getElementById(
    "usageContent"
  );

const usageCurrent =
  document.getElementById(
    "usageCurrent"
  );

const usageLimit =
  document.getElementById(
    "usageLimit"
  );

const usageRemaining =
  document.getElementById(
    "usageRemaining"
  );

const usagePercentage =
  document.getElementById(
    "usagePercentage"
  );

const usageReset =
  document.getElementById(
    "usageReset"
  );

const usageProgress =
  document.getElementById(
    "usageProgress"
  );

const usageProgressBar =
  document.getElementById(
    "usageProgressBar"
  );

const usageTranscriptions =
  document.getElementById(
    "usageTranscriptions"
  );

const usageVoiceTime =
  document.getElementById(
    "usageVoiceTime"
  );

const usageNotionSaves =
  document.getElementById(
    "usageNotionSaves"
  );

const usageMessage =
  document.getElementById(
    "usageMessage"
  );

const limitWarning =
  document.getElementById(
    "limitWarning"
  );

const limitWarningText =
  document.getElementById(
    "limitWarningText"
  );

const limitUpgradeButton =
  document.getElementById(
    "limitUpgradeButton"
  );

const planCenter =
  document.getElementById(
    "planCenter"
  );

const planCenterTitle =
  document.getElementById(
    "planCenterTitle"
  );

const closePlanButton =
  document.getElementById(
    "closePlanButton"
  );

const freeCurrentBadge =
  document.getElementById(
    "freeCurrentBadge"
  );

const proPlanBadge =
  document.getElementById(
    "proPlanBadge"
  );

const upgradeButton =
  document.getElementById(
    "upgradeButton"
  );

const upgradeMessage =
  document.getElementById(
    "upgradeMessage"
  );

const proPreview =
  document.getElementById(
    "proPreview"
  );

const exploreProButton =
  document.getElementById(
    "exploreProButton"
  );

/* =========================================================
   THEME / SYSTEM
   ========================================================= */

const themeToggle =
  document.getElementById(
    "themeToggle"
  );

const systemDot =
  document.getElementById(
    "systemDot"
  );

const systemLabel =
  document.getElementById(
    "systemLabel"
  );

/* =========================================================
   NOTION
   ========================================================= */

const notionConnectionBadge =
  document.getElementById(
    "notionConnectionBadge"
  );

const notionDestinationLoading =
  document.getElementById(
    "notionDestinationLoading"
  );

const notionDestinationContent =
  document.getElementById(
    "notionDestinationContent"
  );

const notionWorkspaceName =
  document.getElementById(
    "notionWorkspaceName"
  );

const notionDatabaseSelect =
  document.getElementById(
    "notionDatabaseSelect"
  );

const saveDestinationButton =
  document.getElementById(
    "saveDestinationButton"
  );

const refreshDestinationButton =
  document.getElementById(
    "refreshDestinationButton"
  );

const notionDestinationMessage =
  document.getElementById(
    "notionDestinationMessage"
  );

const proDestinationNotice =
  document.getElementById(
    "proDestinationNotice"
  );

const proDestinationLimit =
  document.getElementById(
    "proDestinationLimit"
  );

/* =========================================================
   VOICE
   ========================================================= */

const voiceCard =
  document.getElementById(
    "voiceCard"
  );

const voiceKicker =
  document.getElementById(
    "voiceKicker"
  );

const recordButton =
  document.getElementById(
    "recordButton"
  );

const timer =
  document.getElementById(
    "timer"
  );

const recordingLimitLabel =
  document.getElementById(
    "recordingLimitLabel"
  );

const statusText =
  document.getElementById(
    "status"
  );

const voiceSubstatus =
  document.getElementById(
    "voiceSubstatus"
  );

const voiceUpgradeButton =
  document.getElementById(
    "voiceUpgradeButton"
  );

const waveform =
  document.getElementById(
    "waveform"
  );

const processingIndicator =
  document.getElementById(
    "processingIndicator"
  );

const processingText =
  document.getElementById(
    "processingText"
  );

const audioPlayer =
  document.getElementById(
    "audioPlayer"
  );

/* =========================================================
   TRANSCRIPT
   ========================================================= */

const resultSection =
  document.getElementById(
    "resultSection"
  );

const transcriptBox =
  document.getElementById(
    "transcript"
  );

const transcriptStatus =
  document.getElementById(
    "transcriptStatus"
  );

const transcriptCount =
  document.getElementById(
    "transcriptCount"
  );

const transcriptShell =
  document.getElementById(
    "transcriptShell"
  );

const restructureButton =
  document.getElementById(
    "restructureButton"
  );

/* =========================================================
   STRUCTURED
   ========================================================= */

const structuredSection =
  document.getElementById(
    "structuredSection"
  );

const structuredKicker =
  document.getElementById(
    "structuredKicker"
  );

const structuredStatus =
  document.getElementById(
    "structuredStatus"
  );

const titleInput =
  document.getElementById(
    "title"
  );

const summaryInput =
  document.getElementById(
    "summary"
  );

const categoryInput =
  document.getElementById(
    "category"
  );

const priorityInput =
  document.getElementById(
    "priority"
  );

const dueDateInput =
  document.getElementById(
    "dueDate"
  );

const actionItemsContainer =
  document.getElementById(
    "actionItems"
  );

const addActionButton =
  document.getElementById(
    "addActionButton"
  );

const saveButton =
  document.getElementById(
    "saveButton"
  );

const successBox =
  document.getElementById(
    "successBox"
  );

const notionLink =
  document.getElementById(
    "notionLink"
  );

const errorBox =
  document.getElementById(
    "errorBox"
  );

/* =========================================================
   STATE
   ========================================================= */

let mediaRecorder =
  null;

let audioChunks =
  [];

let recordingSeconds =
  0;

let lastRecordingSeconds =
  0;

let timerInterval =
  null;

let currentAudioUrl =
  null;

let currentNote =
  null;

let notionSaved =
  false;

let savedDestinationId =
  "";

let currentPlan =
  "free";

let currentUsage =
  null;

let currentEntitlements = {
  ...DEFAULT_ENTITLEMENTS,
};

let limitReached =
  false;

/* =========================================================
   PLAN HELPERS
   ========================================================= */

function isPro() {
  return currentPlan ===
    "pro";
}

function recordingLimitMinutes() {
  return Math.max(
    1,
    Math.round(
      currentEntitlements
        .maxRecordingSeconds /
        60
    )
  );
}

function showPlanCenter() {
  planCenter.hidden =
    false;

  planCenter.scrollIntoView({
    behavior:
      "smooth",

    block:
      "nearest",
  });
}

function hidePlanCenter() {
  planCenter.hidden =
    true;
}

function showUpgradeMessage() {
  upgradeMessage.textContent =
    "Stripe checkout is the next build step. Your Free / Pro account system is already ready for billing.";

  upgradeMessage.hidden =
    false;

  showPlanCenter();
}

function applyPlanAppearance() {
  const pro =
    isPro();

  document.body.classList.toggle(
    "pro-plan",
    pro
  );

  headerProBadge.hidden =
    !pro;

  proTopLine.hidden =
    !pro;

  usagePlan.textContent =
    pro
      ? "✦ PRO"
      : "FREE";

  usagePlan.classList.toggle(
    "pro",
    pro
  );

  usageKicker.textContent =
    pro
      ? "Pro Command Center"
      : "Monthly Usage";

  proPreview.hidden =
    pro;

  voiceCard.classList.toggle(
    "pro",
    pro
  );

  voiceKicker.textContent =
    pro
      ? "Pro Voice Core"
      : "Voice Core";

  structuredKicker.textContent =
    pro
      ? "Structured with Pro AI"
      : "AI Structured";

  recordingLimitLabel.textContent =
    `max ${recordingLimitMinutes()}m`;

  proDestinationNotice.hidden =
    !pro;

  proDestinationLimit.textContent =
    `up to ${currentEntitlements.maxNotionDestinations}`;

  freeCurrentBadge.hidden =
    pro;

  proPlanBadge.textContent =
    pro
      ? "ACTIVE"
      : "PREMIUM";

  proPlanBadge.classList.toggle(
    "active",
    pro
  );

  upgradeButton.hidden =
    pro;

  planCenterTitle.textContent =
    pro
      ? "Voice to Notion Pro"
      : "Unlock your full capture system";

  if (
    pro
  ) {
    setSystemState(
      "ready",
      "Pro Intelligence Active"
    );
  }

  updateCaptureAvailability();
}

function updateCaptureAvailability() {
  const blocked =
    limitReached;

  if (
    blocked
  ) {
    recordButton.disabled =
      true;

    restructureButton.disabled =
      true;

    voiceUpgradeButton.hidden =
      isPro();

    statusText.textContent =
      "Capture limit reached";

    voiceSubstatus.textContent =
      isPro()
        ? "Your Pro allowance will reset next month."
        : "Upgrade to Pro for 500 AI captures each month.";

    return;
  }

  if (
    !mediaRecorder ||
    mediaRecorder.state !==
      "recording"
  ) {
    recordButton.disabled =
      false;
  }

  restructureButton.disabled =
    false;

  voiceUpgradeButton.hidden =
    true;
}

/* =========================================================
   THEME
   ========================================================= */

async function initializeTheme() {
  try {
    const result =
      await chrome.storage.local.get(
        THEME_STORAGE_KEY
      );

    applyTheme(
      result[
        THEME_STORAGE_KEY
      ] ===
        "light"
        ? "light"
        : "dark"
    );
  } catch (
    error
  ) {
    console.warn(
      "THEME LOAD ERROR:",
      error
    );

    applyTheme(
      "dark"
    );
  }
}

function applyTheme(
  theme
) {
  document.body.setAttribute(
    "data-theme",
    theme
  );
}

async function toggleTheme() {
  const current =
    document.body.getAttribute(
      "data-theme"
    ) ||
    "dark";

  const next =
    current ===
    "dark"
      ? "light"
      : "dark";

  applyTheme(
    next
  );

  await chrome.storage.local.set({
    [THEME_STORAGE_KEY]:
      next,
  });
}

/* =========================================================
   JSON
   ========================================================= */

async function readJsonResponse(
  response,
  label
) {
  const contentType =
    response.headers.get(
      "content-type"
    ) ||
    "";

  if (
    !contentType.includes(
      "application/json"
    )
  ) {
    const text =
      await response.text();

    console.error(
      `${label} NON-JSON RESPONSE:`,
      text
    );

    throw new Error(
      `Server returned ${response.status} instead of JSON.`
    );
  }

  return response.json();
}

/* =========================================================
   SYSTEM
   ========================================================= */

function setSystemState(
  state,
  label
) {
  systemLabel.textContent =
    label;

  systemDot.classList.remove(
    "busy",
    "recording"
  );

  if (
    state ===
    "recording"
  ) {
    systemDot.classList.add(
      "recording"
    );
  } else if (
    state ===
    "busy"
  ) {
    systemDot.classList.add(
      "busy"
    );
  }
}

function setVoiceState(
  state
) {
  voiceCard.classList.remove(
    "recording"
  );

  recordButton.classList.remove(
    "recording"
  );

  waveform.classList.remove(
    "active"
  );

  processingIndicator.hidden =
    true;

  if (
    state ===
    "recording"
  ) {
    voiceCard.classList.add(
      "recording"
    );

    recordButton.classList.add(
      "recording"
    );

    waveform.classList.add(
      "active"
    );

    statusText.textContent =
      "Listening...";

    voiceSubstatus.textContent =
      `Speak naturally. Your ${isPro() ? "Pro" : "Free"} plan supports up to ${recordingLimitMinutes()} minutes per capture.`;

    setSystemState(
      "recording",
      "Listening"
    );

    return;
  }

  if (
    state ===
    "transcribing"
  ) {
    processingIndicator.hidden =
      false;

    processingText.textContent =
      "Transcribing voice";

    statusText.textContent =
      "Transcribing";

    voiceSubstatus.textContent =
      "Turning your recording into text.";

    setSystemState(
      "busy",
      "Transcribing"
    );

    return;
  }

  if (
    state ===
    "structuring"
  ) {
    processingIndicator.hidden =
      false;

    processingText.textContent =
      "AI Structuring";

    statusText.textContent =
      "AI Structuring";

    voiceSubstatus.textContent =
      isPro()
        ? "Pro intelligence is organizing your capture."
        : "Organizing your capture into a useful note.";

    setSystemState(
      "busy",
      "AI Structuring"
    );

    return;
  }

  if (
    state ===
    "saving"
  ) {
    processingIndicator.hidden =
      false;

    processingText.textContent =
      "Syncing with Notion";

    statusText.textContent =
      "Syncing";

    setSystemState(
      "busy",
      "Syncing"
    );

    return;
  }

  if (
    state ===
    "synced"
  ) {
    statusText.textContent =
      "Synced";

    voiceSubstatus.textContent =
      "Your note is safely stored in Notion.";

    setSystemState(
      "ready",
      "Synced"
    );

    return;
  }

  if (
    state ===
    "ready"
  ) {
    statusText.textContent =
      "Note ready";

    voiceSubstatus.textContent =
      "Review your structured note or send it to Notion.";

    setSystemState(
      "ready",
      "Note Ready"
    );

    return;
  }

  if (
    limitReached
  ) {
    updateCaptureAvailability();

    return;
  }

  statusText.textContent =
    "Tap to speak";

  voiceSubstatus.textContent =
    isPro()
      ? "Pro intelligence is active. Capture longer thoughts without breaking your flow."
      : "Speak naturally. AI structures your thought and sends it directly to Notion.";

  setSystemState(
    "ready",
    isPro()
      ? "Pro Intelligence Active"
      : "System Ready"
  );
}

/* =========================================================
   AUTH
   ========================================================= */

function setAuthMessage(
  message,
  isError =
    false
) {
  authMessage.textContent =
    message ||
    "";

  authMessage.hidden =
    !message;

  authMessage.classList.toggle(
    "auth-error",
    isError
  );
}

function setAppAuthenticated(
  authenticated,
  email =
    ""
) {
  authForm.hidden =
    authenticated;

  loggedOutHeader.hidden =
    authenticated;

  signedInBox.hidden =
    !authenticated;

  appContent.hidden =
    !authenticated;

  if (
    authenticated
  ) {
    const clean =
      email ||
      "Voice to Notion user";

    signedInEmail.textContent =
      clean;

    profileInitial.textContent =
      clean
        .charAt(
          0
        )
        .toUpperCase();

    setAuthMessage(
      ""
    );
  }
}

async function requireAuthSession() {
  const session =
    await window.voiceToNotionAuth
      .getValidAuthSession();

  if (
    !session ||
    !session.accessToken
  ) {
    setAppAuthenticated(
      false
    );

    throw new Error(
      "Please log in first."
    );
  }

  return session;
}

/* =========================================================
   USAGE
   ========================================================= */

function setUsageMessage(
  message,
  isError =
    false
) {
  usageMessage.textContent =
    message ||
    "";

  usageMessage.hidden =
    !message;

  usageMessage.classList.toggle(
    "usage-error",
    isError
  );
}

function formatUsageResetDate(
  periodEnd
) {
  const date =
    new Date(
      `${periodEnd}T00:00:00Z`
    );

  return new Intl.DateTimeFormat(
    "en",
    {
      month:
        "short",

      day:
        "numeric",

      timeZone:
        "UTC",
    }
  ).format(
    date
  );
}

function formatVoiceTime(
  seconds
) {
  if (
    seconds <
    60
  ) {
    return `${seconds}s`;
  }

  const minutes =
    Math.floor(
      seconds /
        60
    );

  const remaining =
    seconds %
    60;

  return remaining
    ? `${minutes}m ${remaining}s`
    : `${minutes}m`;
}

function applyUsageData(
  data
) {
  currentPlan =
    data.plan ===
      "pro"
      ? "pro"
      : "free";

  currentEntitlements = {
    ...DEFAULT_ENTITLEMENTS,
    ...(
      data.entitlements ||
      {}
    ),
  };

  currentUsage =
    data.usage;

  limitReached =
    Boolean(
      data.usage
        ?.limitReached
    );

  const usage =
    data.usage;

  usageCurrent.textContent =
    String(
      usage.aiCaptures
    );

  usageLimit.textContent =
    String(
      usage.aiCaptureLimit
    );

  usageRemaining.textContent =
    `${usage.aiCapturesRemaining} captures remaining`;

  usagePercentage.textContent =
    `${usage.percentageUsed}%`;

  usageReset.textContent =
    `Resets ${formatUsageResetDate(
      usage.periodEnd
    )}`;

  usageProgressBar.style.width =
    `${usage.percentageUsed}%`;

  usageProgress.classList.toggle(
    "limit",
    limitReached
  );

  usageTranscriptions.textContent =
    String(
      usage.transcriptions
    );

  usageVoiceTime.textContent =
    formatVoiceTime(
      usage.transcriptionSeconds
    );

  usageNotionSaves.textContent =
    String(
      usage.notionSaves
    );

  limitWarning.hidden =
    !limitReached;

  if (
    limitReached
  ) {
    limitWarningText.textContent =
      isPro()
        ? "Your Pro allowance will reset next month."
        : "Your Free allowance is finished. Pro includes 500 AI captures each month.";

    limitUpgradeButton.hidden =
      isPro();
  }

  applyPlanAppearance();

  usageLoading.hidden =
    true;

  usageContent.hidden =
    false;
}

async function loadUsage(
  silent =
    false
) {
  if (
    !silent
  ) {
    usageLoading.hidden =
      false;

    usageContent.hidden =
      true;
  }

  refreshUsageButton.disabled =
    true;

  setUsageMessage(
    ""
  );

  try {
    const response =
      await window.voiceToNotionAuth
        .authenticatedFetch(
          `${API_BASE_URL}/api/usage`,
          {
            method:
              "GET",
          }
        );

    const data =
      await readJsonResponse(
        response,
        "USAGE"
      );

    if (
      !response.ok ||
      !data.success ||
      !data.usage
    ) {
      throw new Error(
        data.error ||
          "Could not load usage."
      );
    }

    applyUsageData(
      data
    );
  } catch (
    error
  ) {
    console.error(
      "USAGE LOAD ERROR:",
      error
    );

    usageLoading.hidden =
      true;

    setUsageMessage(
      error instanceof Error
        ? error.message
        : "Could not load usage.",
      true
    );
  } finally {
    refreshUsageButton.disabled =
      false;
  }
}

/* =========================================================
   NOTION
   ========================================================= */

function setDestinationMessage(
  message,
  isError =
    false
) {
  notionDestinationMessage.textContent =
    message ||
    "";

  notionDestinationMessage.hidden =
    !message;

  notionDestinationMessage.classList.toggle(
    "destination-error",
    isError
  );
}

async function loadNotionDestination() {
  notionDestinationLoading.hidden =
    false;

  notionDestinationContent.hidden =
    true;

  const response =
    await window.voiceToNotionAuth
      .authenticatedFetch(
        `${API_BASE_URL}/api/notion/databases`,
        {
          method:
            "GET",
        }
      );

  const data =
    await readJsonResponse(
      response,
      "NOTION DATABASE"
    );

  if (
    !response.ok
  ) {
    throw new Error(
      data.error ||
        "Could not load Notion."
    );
  }

  notionDestinationLoading.hidden =
    true;

  notionDestinationContent.hidden =
    false;

  notionConnectionBadge.textContent =
    "Connected";

  notionConnectionBadge.classList.add(
    "connected"
  );

  notionWorkspaceName.textContent =
    data.workspace?.name ||
    "Notion workspace";

  notionDatabaseSelect.innerHTML =
    `
      <option value="">
        Select database...
      </option>
    `;

  const sources =
    Array.isArray(
      data.dataSources
    )
      ? data.dataSources
      : [];

  sources.forEach(
    (
      source
    ) => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        source.id;

      option.textContent =
        source.name ||
        "Untitled";

      notionDatabaseSelect.appendChild(
        option
      );
    }
  );

  savedDestinationId =
    data.selectedDataSourceId ||
    "";

  const exists =
    sources.some(
      (
        source
      ) =>
        source.id ===
        savedDestinationId
    );

  notionDatabaseSelect.value =
    exists
      ? savedDestinationId
      : "";

  updateDestinationButton();
}

function updateDestinationButton() {
  const changed =
    notionDatabaseSelect.value !==
    savedDestinationId;

  saveDestinationButton.disabled =
    !notionDatabaseSelect.value ||
    !changed;

  saveDestinationButton.textContent =
    changed
      ? "Sync Destination"
      : "Destination Synced";
}

async function saveNotionDestinationSelection() {
  const dataSourceId =
    notionDatabaseSelect.value;

  if (
    !dataSourceId
  ) {
    return;
  }

  saveDestinationButton.disabled =
    true;

  saveDestinationButton.textContent =
    "Syncing...";

  const response =
    await window.voiceToNotionAuth
      .authenticatedFetch(
        `${API_BASE_URL}/api/notion/database/select`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              dataSourceId,
            }),
        }
      );

  const data =
    await readJsonResponse(
      response,
      "DESTINATION"
    );

  if (
    !response.ok
  ) {
    updateDestinationButton();

    throw new Error(
      data.error ||
        "Could not save destination."
    );
  }

  savedDestinationId =
    dataSourceId;

  updateDestinationButton();

  setDestinationMessage(
    "Destination synchronized."
  );

  resetNotionState();
}

/* =========================================================
   GENERAL UI
   ========================================================= */

function formatTime(
  seconds
) {
  const minutes =
    Math.floor(
      seconds /
        60
    );

  const remaining =
    seconds %
    60;

  return `${String(
    minutes
  ).padStart(
    2,
    "0"
  )}:${String(
    remaining
  ).padStart(
    2,
    "0"
  )}`;
}

function updateTranscriptCount() {
  const count =
    transcriptBox.value.length;

  transcriptCount.textContent =
    `${count} ${
      count ===
      1
        ? "character"
        : "characters"
    }`;
}

function showError(
  message
) {
  errorBox.textContent =
    message;

  errorBox.hidden =
    false;
}

function clearError() {
  errorBox.hidden =
    true;

  errorBox.textContent =
    "";
}

function resetNotionState() {
  notionSaved =
    false;

  successBox.hidden =
    true;

  notionLink.hidden =
    true;

  notionLink.href =
    "#";

  saveButton.disabled =
    false;

  saveButton.innerHTML =
    `
      Send to Notion
      <span>→</span>
    `;
}

/* =========================================================
   ACTION ITEMS
   ========================================================= */

function renderActionItems(
  items
) {
  actionItemsContainer.innerHTML =
    "";

  if (
    items.length ===
    0
  ) {
    const empty =
      document.createElement(
        "p"
      );

    empty.textContent =
      "No action items detected.";

    empty.style.fontSize =
      "10px";

    empty.style.color =
      "var(--muted)";

    actionItemsContainer.appendChild(
      empty
    );

    return;
  }

  items.forEach(
    (
      item,
      index
    ) => {
      const row =
        document.createElement(
          "div"
        );

      row.className =
        "action-item";

      const input =
        document.createElement(
          "input"
        );

      input.type =
        "text";

      input.value =
        item;

      input.addEventListener(
        "input",
        (
          event
        ) => {
          if (
            !currentNote
          ) {
            return;
          }

          currentNote.actionItems[
            index
          ] =
            event.target.value;

          resetNotionState();
        }
      );

      const remove =
        document.createElement(
          "button"
        );

      remove.type =
        "button";

      remove.className =
        "remove-action-button";

      remove.textContent =
        "×";

      remove.addEventListener(
        "click",
        () => {
          if (
            !currentNote
          ) {
            return;
          }

          currentNote.actionItems.splice(
            index,
            1
          );

          renderActionItems(
            currentNote.actionItems
          );

          resetNotionState();
        }
      );

      row.append(
        input,
        remove
      );

      actionItemsContainer.appendChild(
        row
      );
    }
  );
}

/* =========================================================
   NOTE
   ========================================================= */

function populateStructuredNote(
  note
) {
  currentNote = {
    title:
      note.title ||
      "",

    summary:
      note.summary ||
      "",

    actionItems:
      Array.isArray(
        note.actionItems
      )
        ? [
            ...note.actionItems,
          ]
        : [],

    category:
      note.category ||
      "Other",

    priority:
      note.priority ===
        "High" ||
      note.priority ===
        "Medium"
        ? note.priority
        : "Low",

    dueDate:
      note.dueDate ||
      null,
  };

  titleInput.value =
    currentNote.title;

  summaryInput.value =
    currentNote.summary;

  categoryInput.value =
    currentNote.category;

  priorityInput.value =
    currentNote.priority;

  dueDateInput.value =
    currentNote.dueDate ||
    "";

  renderActionItems(
    currentNote.actionItems
  );

  structuredSection.hidden =
    false;

  structuredStatus.textContent =
    "Ready";

  resetNotionState();
}

function syncCurrentNoteFromInputs() {
  if (
    !currentNote
  ) {
    return;
  }

  currentNote.title =
    titleInput.value;

  currentNote.summary =
    summaryInput.value;

  currentNote.category =
    categoryInput.value;

  currentNote.priority =
    priorityInput.value;

  currentNote.dueDate =
    dueDateInput.value ||
    null;

  resetNotionState();
}

/* =========================================================
   LIMIT ERROR
   ========================================================= */

async function handlePlanLimitResponse(
  data
) {
  if (
    data?.code !==
    "PLAN_LIMIT_REACHED"
  ) {
    return false;
  }

  await loadUsage(
    true
  );

  showPlanCenter();

  showError(
    data.error ||
      "Your monthly capture allowance has been used."
  );

  return true;
}

/* =========================================================
   STRUCTURE
   ========================================================= */

async function structureTranscript(
  transcript
) {
  if (
    limitReached
  ) {
    showPlanCenter();

    throw new Error(
      isPro()
        ? "Your monthly Pro capture allowance has been used."
        : "You've used all 30 Free captures this month. Upgrade to Pro for 500 monthly captures."
    );
  }

  clearError();

  setVoiceState(
    "structuring"
  );

  restructureButton.disabled =
    true;

  try {
    const response =
      await window.voiceToNotionAuth
        .authenticatedFetch(
          `${API_BASE_URL}/api/structure-note`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                transcript,
              }),
          }
        );

    const data =
      await readJsonResponse(
        response,
        "STRUCTURE"
      );

    if (
      !response.ok
    ) {
      await handlePlanLimitResponse(
        data
      );

      throw new Error(
        data.error ||
          "Structure failed."
      );
    }

    populateStructuredNote(
      data
    );

    setVoiceState(
      "ready"
    );

    await loadUsage(
      true
    );
  } finally {
    if (
      !limitReached
    ) {
      restructureButton.disabled =
        false;
    }
  }
}

/* =========================================================
   TRANSCRIPTION
   ========================================================= */

async function transcribeAudio(
  audioBlob,
  durationSeconds
) {
  if (
    limitReached
  ) {
    showPlanCenter();

    throw new Error(
      "Your monthly capture allowance has been used."
    );
  }

  clearError();

  setVoiceState(
    "transcribing"
  );

  const formData =
    new FormData();

  let extension =
    "webm";

  if (
    audioBlob.type.includes(
      "ogg"
    )
  ) {
    extension =
      "ogg";
  } else if (
    audioBlob.type.includes(
      "mp4"
    )
  ) {
    extension =
      "mp4";
  } else if (
    audioBlob.type.includes(
      "mpeg"
    )
  ) {
    extension =
      "mp3";
  }

  formData.append(
    "audio",
    audioBlob,
    `recording.${extension}`
  );

  formData.append(
    "durationSeconds",
    String(
      Math.max(
        1,
        Math.round(
          durationSeconds
        )
      )
    )
  );

  const response =
    await window.voiceToNotionAuth
      .authenticatedFetch(
        `${API_BASE_URL}/api/transcribe`,
        {
          method:
            "POST",

          body:
            formData,
        }
      );

  const data =
    await readJsonResponse(
      response,
      "TRANSCRIPTION"
    );

  if (
    !response.ok
  ) {
    await handlePlanLimitResponse(
      data
    );

    throw new Error(
      data.error ||
        "Transcription failed."
    );
  }

  transcriptBox.value =
    data.transcript;

  updateTranscriptCount();

  resultSection.hidden =
    false;

  transcriptStatus.textContent =
    "Ready";

  await structureTranscript(
    data.transcript
  );
}

/* =========================================================
   NOTION SAVE
   ========================================================= */

async function saveToNotion() {
  if (
    !currentNote
  ) {
    showError(
      "There is no note to save."
    );

    return;
  }

  if (
    !savedDestinationId
  ) {
    showError(
      "Choose and sync a Notion destination first."
    );

    return;
  }

  if (
    notionSaved
  ) {
    return;
  }

  syncCurrentNoteFromInputs();

  clearError();

  setVoiceState(
    "saving"
  );

  saveButton.disabled =
    true;

  saveButton.textContent =
    "Syncing...";

  try {
    const response =
      await window.voiceToNotionAuth
        .authenticatedFetch(
          `${API_BASE_URL}/api/notion/save`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                title:
                  currentNote.title,

                summary:
                  currentNote.summary,

                actionItems:
                  currentNote.actionItems
                    .map(
                      (
                        item
                      ) =>
                        item.trim()
                    )
                    .filter(
                      Boolean
                    ),

                category:
                  currentNote.category,

                priority:
                  currentNote.priority,

                dueDate:
                  currentNote.dueDate,

                transcript:
                  transcriptBox.value,
              }),
          }
        );

    const data =
      await readJsonResponse(
        response,
        "NOTION SAVE"
      );

    if (
      !response.ok
    ) {
      throw new Error(
        data.details ||
          data.error ||
          "Notion save failed."
      );
    }

    notionSaved =
      true;

    successBox.hidden =
      false;

    saveButton.textContent =
      "Synced ✓";

    if (
      data.url
    ) {
      notionLink.href =
        data.url;

      notionLink.hidden =
        false;
    }

    setVoiceState(
      "synced"
    );

    await loadUsage(
      true
    );
  } catch (
    error
  ) {
    notionSaved =
      false;

    saveButton.disabled =
      false;

    saveButton.innerHTML =
      `
        Send to Notion
        <span>→</span>
      `;

    setVoiceState(
      "ready"
    );

    throw error;
  }
}

/* =========================================================
   RECORDING
   ========================================================= */

async function startRecording() {
  if (
    limitReached
  ) {
    showPlanCenter();

    showError(
      isPro()
        ? "Your monthly Pro capture allowance has been used."
        : "You've used all 30 Free captures. Upgrade to Pro for 500 monthly captures."
    );

    return;
  }

  clearError();

  await requireAuthSession();

  resultSection.hidden =
    true;

  structuredSection.hidden =
    true;

  transcriptBox.value =
    "";

  updateTranscriptCount();

  currentNote =
    null;

  resetNotionState();

  const stream =
    await navigator.mediaDevices
      .getUserMedia({
        audio:
          true,
      });

  audioChunks =
    [];

  mediaRecorder =
    new MediaRecorder(
      stream
    );

  mediaRecorder.addEventListener(
    "dataavailable",
    (
      event
    ) => {
      if (
        event.data.size >
        0
      ) {
        audioChunks.push(
          event.data
        );
      }
    }
  );

  mediaRecorder.addEventListener(
    "stop",
    async () => {
      try {
        const blob =
          new Blob(
            audioChunks,
            {
              type:
                mediaRecorder.mimeType ||
                "audio/webm",
            }
          );

        stream
          .getTracks()
          .forEach(
            (
              track
            ) =>
              track.stop()
          );

        if (
          currentAudioUrl
        ) {
          URL.revokeObjectURL(
            currentAudioUrl
          );
        }

        currentAudioUrl =
          URL.createObjectURL(
            blob
          );

        audioPlayer.src =
          currentAudioUrl;

        audioPlayer.hidden =
          false;

        if (
          blob.size ===
          0
        ) {
          throw new Error(
            "The recording was empty."
          );
        }

        await transcribeAudio(
          blob,
          lastRecordingSeconds
        );
      } catch (
        error
      ) {
        showError(
          error instanceof Error
            ? error.message
            : "Could not process recording."
        );

        setVoiceState(
          "idle"
        );
      }
    }
  );

  mediaRecorder.start();

  recordingSeconds =
    0;

  lastRecordingSeconds =
    0;

  timer.textContent =
    "00:00";

  timerInterval =
    setInterval(
      () => {
        recordingSeconds +=
          1;

        timer.textContent =
          formatTime(
            recordingSeconds
          );

        if (
          recordingSeconds >=
          currentEntitlements
            .maxRecordingSeconds
        ) {
          stopRecording();

          showError(
            `Recording stopped automatically at the ${recordingLimitMinutes()}-minute ${isPro() ? "Pro" : "Free"} plan limit.`
          );
        }
      },
      1000
    );

  setVoiceState(
    "recording"
  );
}

function stopRecording() {
  if (
    !mediaRecorder ||
    mediaRecorder.state ===
      "inactive"
  ) {
    return;
  }

  lastRecordingSeconds =
    Math.max(
      1,
      recordingSeconds
    );

  mediaRecorder.stop();

  if (
    timerInterval
  ) {
    clearInterval(
      timerInterval
    );

    timerInterval =
      null;
  }

  waveform.classList.remove(
    "active"
  );

  voiceCard.classList.remove(
    "recording"
  );

  recordButton.classList.remove(
    "recording"
  );

  statusText.textContent =
    "Preparing recording";

  setSystemState(
    "busy",
    "Processing"
  );
}

/* =========================================================
   EVENTS
   ========================================================= */

themeToggle.addEventListener(
  "click",
  toggleTheme
);

openPlanButton.addEventListener(
  "click",
  () => {
    planCenter.hidden =
      !planCenter.hidden;

    if (
      !planCenter.hidden
    ) {
      upgradeMessage.hidden =
        true;
    }
  }
);

closePlanButton.addEventListener(
  "click",
  hidePlanCenter
);

[
  upgradeButton,
  exploreProButton,
  limitUpgradeButton,
  voiceUpgradeButton,
].forEach(
  (
    button
  ) => {
    button.addEventListener(
      "click",
      showUpgradeMessage
    );
  }
);

refreshUsageButton.addEventListener(
  "click",
  () =>
    loadUsage()
);

notionDatabaseSelect.addEventListener(
  "change",
  () => {
    setDestinationMessage(
      ""
    );

    updateDestinationButton();

    resetNotionState();
  }
);

saveDestinationButton.addEventListener(
  "click",
  async () => {
    try {
      await saveNotionDestinationSelection();
    } catch (
      error
    ) {
      setDestinationMessage(
        error instanceof Error
          ? error.message
          : "Could not save destination.",
        true
      );
    }
  }
);

refreshDestinationButton.addEventListener(
  "click",
  async () => {
    try {
      await loadNotionDestination();
    } catch (
      error
    ) {
      setDestinationMessage(
        error instanceof Error
          ? error.message
          : "Could not refresh destination.",
        true
      );
    }
  }
);

recordButton.addEventListener(
  "click",
  async () => {
    try {
      if (
        mediaRecorder &&
        mediaRecorder.state ===
          "recording"
      ) {
        stopRecording();

        return;
      }

      await startRecording();
    } catch (
      error
    ) {
      showError(
        error instanceof Error
          ? error.message
          : "Could not access microphone."
      );
    }
  }
);

restructureButton.addEventListener(
  "click",
  async () => {
    const transcript =
      transcriptBox.value
        .trim();

    if (
      !transcript
    ) {
      showError(
        "Transcript is empty."
      );

      return;
    }

    try {
      await structureTranscript(
        transcript
      );
    } catch (
      error
    ) {
      showError(
        error instanceof Error
          ? error.message
          : "Could not structure note."
      );
    }
  }
);

saveButton.addEventListener(
  "click",
  async () => {
    try {
      await saveToNotion();
    } catch (
      error
    ) {
      showError(
        error instanceof Error
          ? error.message
          : "Could not save to Notion."
      );
    }
  }
);

authForm.addEventListener(
  "submit",
  async (
    event
  ) => {
    event.preventDefault();

    try {
      authButton.disabled =
        true;

      authButton.textContent =
        "Entering workspace...";

      setAuthMessage(
        ""
      );

      const session =
        await window.voiceToNotionAuth
          .signInWithPassword(
            authEmail.value.trim(),
            authPassword.value
          );

      authPassword.value =
        "";

      setAppAuthenticated(
        true,
        session.user?.email ||
          authEmail.value.trim()
      );

      await Promise.all([
        loadUsage(),
        loadNotionDestination(),
      ]);

      setVoiceState(
        "idle"
      );
    } catch (
      error
    ) {
      setAuthMessage(
        error instanceof Error
          ? error.message
          : "Could not log in.",
        true
      );
    } finally {
      authButton.disabled =
        false;

      authButton.textContent =
        "Enter Workspace";
    }
  }
);

logoutButton.addEventListener(
  "click",
  async () => {
    try {
      await window.voiceToNotionAuth
        .signOutExtension();

      setAppAuthenticated(
        false
      );

      currentPlan =
        "free";

      currentUsage =
        null;

      currentEntitlements = {
        ...DEFAULT_ENTITLEMENTS,
      };

      limitReached =
        false;

      document.body.classList.remove(
        "pro-plan"
      );

      planCenter.hidden =
        true;

      usageContent.hidden =
        true;

      usageLoading.hidden =
        false;
    } catch (
      error
    ) {
      setAuthMessage(
        error instanceof Error
          ? error.message
          : "Could not log out.",
        true
      );
    }
  }
);

[
  titleInput,
  summaryInput,
  categoryInput,
  priorityInput,
  dueDateInput,
].forEach(
  (
    element
  ) => {
    element.addEventListener(
      "input",
      syncCurrentNoteFromInputs
    );
  }
);

transcriptBox.addEventListener(
  "input",
  () => {
    updateTranscriptCount();

    resetNotionState();
  }
);

addActionButton.addEventListener(
  "click",
  () => {
    if (
      !currentNote
    ) {
      return;
    }

    currentNote.actionItems.push(
      ""
    );

    renderActionItems(
      currentNote.actionItems
    );

    resetNotionState();
  }
);

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initialize() {
  await initializeTheme();

  updateTranscriptCount();

  setVoiceState(
    "idle"
  );

  try {
    const session =
      await window.voiceToNotionAuth
        .getValidAuthSession();

    if (
      !session
    ) {
      setAppAuthenticated(
        false
      );

      return;
    }

    setAppAuthenticated(
      true,
      session.user?.email ||
        ""
    );

    await Promise.all([
      loadUsage(),
      loadNotionDestination(),
    ]);

    setVoiceState(
      "idle"
    );
  } catch (
    error
  ) {
    console.error(
      "INITIALIZATION ERROR:",
      error
    );

    setAppAuthenticated(
      false
    );
  }
}

initialize();