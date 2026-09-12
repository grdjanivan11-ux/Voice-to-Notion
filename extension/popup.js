const API_BASE_URL =
  "https://voice-to-notion-omega.vercel.app";

const THEME_STORAGE_KEY =
  "voiceToNotionTheme";

/* =========================================================
   AUTH ELEMENTS
   ========================================================= */

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
   USAGE
   ========================================================= */

const usagePlan =
  document.getElementById(
    "usagePlan"
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
   NOTION DESTINATION
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

/* =========================================================
   VOICE
   ========================================================= */

const voiceCard =
  document.getElementById(
    "voiceCard"
  );

const recordButton =
  document.getElementById(
    "recordButton"
  );

const timer =
  document.getElementById(
    "timer"
  );

const statusText =
  document.getElementById(
    "status"
  );

const voiceSubstatus =
  document.getElementById(
    "voiceSubstatus"
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
   STRUCTURED NOTE
   ========================================================= */

const structuredSection =
  document.getElementById(
    "structuredSection"
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

/* =========================================================
   THEME
   ========================================================= */

async function initializeTheme() {
  try {
    const result =
      await chrome.storage.local.get(
        THEME_STORAGE_KEY
      );

    const savedTheme =
      result[
        THEME_STORAGE_KEY
      ];

    applyTheme(
      savedTheme ===
        "light"
        ? "light"
        : "dark"
    );
  } catch (error) {
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
  const currentTheme =
    document.body.getAttribute(
      "data-theme"
    ) ||
    "dark";

  const nextTheme =
    currentTheme ===
    "dark"
      ? "light"
      : "dark";

  applyTheme(
    nextTheme
  );

  await chrome.storage.local.set({
    [THEME_STORAGE_KEY]:
      nextTheme,
  });
}

/* =========================================================
   JSON RESPONSE
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
   SYSTEM STATE
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

  transcriptShell.classList.remove(
    "processing"
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
      "Speak naturally, then tap again to stop.";

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

    setSystemState(
      "ready",
      "Note Ready"
    );

    return;
  }

  statusText.textContent =
    "Tap to speak";

  voiceSubstatus.textContent =
    "Speak naturally. AI structures your thought and sends it directly to Notion.";

  setSystemState(
    "ready",
    "System Ready"
  );
}

/* =========================================================
   AUTH HELPERS
   ========================================================= */

function setAuthMessage(
  message,
  isError = false
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
  isAuthenticated,
  email = ""
) {
  authForm.hidden =
    isAuthenticated;

  loggedOutHeader.hidden =
    isAuthenticated;

  signedInBox.hidden =
    !isAuthenticated;

  appContent.hidden =
    !isAuthenticated;

  if (
    isAuthenticated
  ) {
    const cleanEmail =
      email ||
      "Voice to Notion user";

    signedInEmail.textContent =
      cleanEmail;

    profileInitial.textContent =
      cleanEmail
        .charAt(0)
        .toUpperCase();

    setAuthMessage("");
  }
}

async function requireAuthSession() {
  const session =
    await window.voiceToNotionAuth.getValidAuthSession();

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
  isError = false
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

async function loadUsage(
  silent = false
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

  setUsageMessage("");

  try {
    const response =
      await window.voiceToNotionAuth.authenticatedFetch(
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

    const usage =
      data.usage;

    usagePlan.textContent =
      (
        data.plan ||
        "free"
      ).toUpperCase();

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

    usageLoading.hidden =
      true;

    usageContent.hidden =
      false;
  } catch (error) {
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
   NOTION DESTINATION
   ========================================================= */

function setDestinationMessage(
  message,
  isError = false
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
  const response =
    await window.voiceToNotionAuth.authenticatedFetch(
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

  const dataSources =
    Array.isArray(
      data.dataSources
    )
      ? data.dataSources
      : [];

  dataSources.forEach(
    (source) => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        source.id;

      option.textContent =
        source.name;

      notionDatabaseSelect.appendChild(
        option
      );
    }
  );

  savedDestinationId =
    data.selectedDataSourceId ||
    "";

  notionDatabaseSelect.value =
    savedDestinationId;
}

async function saveNotionDestinationSelection() {
  const dataSourceId =
    notionDatabaseSelect.value;

  if (
    !dataSourceId
  ) {
    return;
  }

  const response =
    await window.voiceToNotionAuth.authenticatedFetch(
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
    throw new Error(
      data.error ||
        "Could not save destination."
    );
  }

  savedDestinationId =
    dataSourceId;

  setDestinationMessage(
    "Destination synchronized."
  );
}

/* =========================================================
   GENERAL HELPERS
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
    `${count} characters`;
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

      input.value =
        item;

      input.addEventListener(
        "input",
        (event) => {
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
          currentNote.actionItems.splice(
            index,
            1
          );

          renderActionItems(
            currentNote.actionItems
          );
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
   STRUCTURED NOTE
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
      note.priority ||
      "Low",

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
   STRUCTURE
   ========================================================= */

async function structureTranscript(
  transcript
) {
  clearError();

  setVoiceState(
    "structuring"
  );

  const response =
    await window.voiceToNotionAuth.authenticatedFetch(
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
    throw new Error(
      data.error ||
        "Structure failed."
    );
  }

  populateStructuredNote(
    data
  );

  structuredStatus.textContent =
    "Ready";

  setVoiceState(
    "ready"
  );

  await loadUsage(
    true
  );
}

/* =========================================================
   TRANSCRIBE
   ========================================================= */

async function transcribeAudio(
  audioBlob,
  durationSeconds
) {
  clearError();

  setVoiceState(
    "transcribing"
  );

  const formData =
    new FormData();

  formData.append(
    "audio",
    audioBlob,
    "recording.webm"
  );

  formData.append(
    "durationSeconds",
    String(
      Math.max(
        1,
        durationSeconds
      )
    )
  );

  const response =
    await window.voiceToNotionAuth.authenticatedFetch(
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
   SAVE TO NOTION
   ========================================================= */

async function saveToNotion() {
  if (
    !currentNote
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
      await window.voiceToNotionAuth.authenticatedFetch(
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
                currentNote.actionItems,

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
  } catch (error) {
    saveButton.disabled =
      false;

    resetNotionState();

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
  clearError();

  await requireAuthSession();

  const stream =
    await navigator.mediaDevices.getUserMedia(
      {
        audio:
          true,
      }
    );

  audioChunks =
    [];

  mediaRecorder =
    new MediaRecorder(
      stream
    );

  mediaRecorder.addEventListener(
    "dataavailable",
    (event) => {
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
          (track) =>
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

      try {
        await transcribeAudio(
          blob,
          lastRecordingSeconds
        );
      } catch (error) {
        showError(
          error instanceof Error
            ? error.message
            : "Processing failed."
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

  clearInterval(
    timerInterval
  );

  timerInterval =
    null;

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

refreshUsageButton.addEventListener(
  "click",
  () =>
    loadUsage()
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
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Could not record."
      );
    }
  }
);

restructureButton.addEventListener(
  "click",
  async () => {
    try {
      await structureTranscript(
        transcriptBox.value.trim()
      );
    } catch (error) {
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
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Could not save to Notion."
      );
    }
  }
);

saveDestinationButton.addEventListener(
  "click",
  async () => {
    try {
      await saveNotionDestinationSelection();
    } catch (error) {
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
    } catch (error) {
      setDestinationMessage(
        error instanceof Error
          ? error.message
          : "Could not refresh destination.",
        true
      );
    }
  }
);

authForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    try {
      authButton.disabled =
        true;

      authButton.textContent =
        "Entering workspace...";

      const session =
        await window.voiceToNotionAuth.signInWithPassword(
          authEmail.value.trim(),
          authPassword.value
        );

      setAppAuthenticated(
        true,
        session.user?.email ||
          authEmail.value.trim()
      );

      await Promise.all([
        loadNotionDestination(),
        loadUsage(),
      ]);
    } catch (error) {
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
    await window.voiceToNotionAuth.signOutExtension();

    setAppAuthenticated(
      false
    );

    usageContent.hidden =
      true;

    usageLoading.hidden =
      false;
  }
);

[
  titleInput,
  summaryInput,
  categoryInput,
  priorityInput,
  dueDateInput,
].forEach(
  (element) => {
    element.addEventListener(
      "input",
      syncCurrentNoteFromInputs
    );
  }
);

transcriptBox.addEventListener(
  "input",
  updateTranscriptCount
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
  }
);

/* =========================================================
   INITIALIZE
   ========================================================= */

async function initialize() {
  await initializeTheme();

  updateTranscriptCount();

  setVoiceState(
    "idle"
  );

  try {
    const session =
      await window.voiceToNotionAuth.getValidAuthSession();

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
      loadNotionDestination(),
      loadUsage(),
    ]);
  } catch (error) {
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