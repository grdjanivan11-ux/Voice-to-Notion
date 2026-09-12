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

/*
  NEW C8.2.6 PRIORITY FIELD
*/

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
   APPLICATION STATE
   ========================================================= */

let mediaRecorder =
  null;

let audioChunks =
  [];

let recordingSeconds =
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

    const theme =
      savedTheme === "light"
        ? "light"
        : "dark";

    applyTheme(
      theme
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
    ) || "dark";

  const nextTheme =
    currentTheme === "dark"
      ? "light"
      : "dark";

  applyTheme(
    nextTheme
  );

  try {
    await chrome.storage.local.set({
      [THEME_STORAGE_KEY]:
        nextTheme,
    });
  } catch (error) {
    console.warn(
      "THEME SAVE ERROR:",
      error
    );
  }
}

/* =========================================================
   SYSTEM UI
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
    state === "recording"
  ) {
    systemDot.classList.add(
      "recording"
    );

    return;
  }

  if (
    state === "busy"
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
    state === "recording"
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
      "Listening";

    voiceSubstatus.textContent =
      "Speak naturally. Tap again when you're finished.";

    setSystemState(
      "recording",
      "Listening"
    );

    return;
  }

  if (
    state === "transcribing"
  ) {
    processingIndicator.hidden =
      false;

    processingText.textContent =
      "Transcribing voice";

    transcriptShell.classList.add(
      "processing"
    );

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
    state === "structuring"
  ) {
    processingIndicator.hidden =
      false;

    processingText.textContent =
      "AI structuring note";

    transcriptShell.classList.add(
      "processing"
    );

    statusText.textContent =
      "AI Structuring";

    voiceSubstatus.textContent =
      "Extracting title, summary, tasks, category, priority and date.";

    setSystemState(
      "busy",
      "AI Structuring"
    );

    return;
  }

  if (
    state === "saving"
  ) {
    processingIndicator.hidden =
      false;

    processingText.textContent =
      "Syncing with Notion";

    statusText.textContent =
      "Syncing";

    voiceSubstatus.textContent =
      "Sending your structured note to Notion.";

    setSystemState(
      "busy",
      "Syncing"
    );

    return;
  }

  if (
    state === "ready"
  ) {
    statusText.textContent =
      "Note ready";

    voiceSubstatus.textContent =
      "Review it below or send it directly to Notion.";

    setSystemState(
      "ready",
      "Note Ready"
    );

    return;
  }

  statusText.textContent =
    "Tap to speak";

  voiceSubstatus.textContent =
    "Your thought becomes a structured Notion note automatically.";

  setSystemState(
    "ready",
    "System Ready"
  );
}

function updateTranscriptCount() {
  const count =
    transcriptBox.value.length;

  transcriptCount.textContent =
    `${count} ${
      count === 1
        ? "character"
        : "characters"
    }`;
}

/* =========================================================
   PRIORITY UI
   ========================================================= */

function updatePriorityAppearance() {
  if (!priorityInput) {
    return;
  }

  priorityInput.setAttribute(
    "value",
    priorityInput.value
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
    message || "";

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

  accountCard.classList.toggle(
    "signed-in",
    isAuthenticated
  );

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
  const auth =
    window.voiceToNotionAuth;

  if (!auth) {
    throw new Error(
      "Extension authentication is not available."
    );
  }

  const session =
    await auth.getValidAuthSession();

  if (
    !session ||
    !session.accessToken
  ) {
    setAppAuthenticated(
      false
    );

    throw new Error(
      "Please log in to Voice to Notion first."
    );
  }

  return session;
}

function handleAuthFailure(
  error
) {
  if (
    error?.code !==
      "AUTH_REQUIRED" &&
    error?.code !==
      "AUTH_EXPIRED"
  ) {
    return false;
  }

  setAppAuthenticated(
    false
  );

  resetNotionDestinationUI();

  resetCaptureUI();

  setAuthMessage(
    error.message ||
      "Your session expired. Please log in again.",
    true
  );

  return true;
}

async function initializeAuth() {
  try {
    const auth =
      window.voiceToNotionAuth;

    if (!auth) {
      throw new Error(
        "Extension authentication failed to load."
      );
    }

    const session =
      await auth.getValidAuthSession();

    if (!session) {
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

    await loadNotionDestination();
  } catch (error) {
    console.error(
      "AUTH INITIALIZATION ERROR:",
      error
    );

    if (
      handleAuthFailure(
        error
      )
    ) {
      return;
    }

    setAppAuthenticated(
      false
    );

    setAuthMessage(
      error instanceof Error
        ? error.message
        : "Could not load your session.",
      true
    );
  }
}

/* =========================================================
   RESPONSE HELPERS
   ========================================================= */

async function readJsonResponse(
  response,
  label
) {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

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
   NOTION DESTINATION
   ========================================================= */

function setDestinationMessage(
  message,
  isError = false
) {
  notionDestinationMessage.textContent =
    message || "";

  notionDestinationMessage.hidden =
    !message;

  notionDestinationMessage.classList.toggle(
    "destination-error",
    isError
  );
}

function resetNotionDestinationUI() {
  notionWorkspaceName.textContent =
    "";

  notionDatabaseSelect.innerHTML =
    `
      <option value="">
        Choose a database...
      </option>
    `;

  notionDestinationContent.hidden =
    true;

  notionDestinationLoading.hidden =
    false;

  notionDestinationLoading.textContent =
    "Loading your Notion workspace...";

  notionConnectionBadge.textContent =
    "Loading";

  notionConnectionBadge.classList.remove(
    "connected",
    "error"
  );

  savedDestinationId =
    "";

  setDestinationMessage("");
}

function updateDestinationButton() {
  const selectedId =
    notionDatabaseSelect.value;

  const changed =
    selectedId !==
    savedDestinationId;

  saveDestinationButton.disabled =
    !selectedId ||
    !changed;

  saveDestinationButton.textContent =
    changed
      ? "Sync Destination"
      : "Destination Synced";
}

async function loadNotionDestination() {
  resetNotionDestinationUI();

  try {
    const response =
      await window.voiceToNotionAuth.authenticatedFetch(
        `${API_BASE_URL}/api/notion/databases`,
        {
          method: "GET",
        }
      );

    const data =
      await readJsonResponse(
        response,
        "NOTION DATABASE"
      );

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Could not load your Notion destination."
      );
    }

    if (
      data.connected === false
    ) {
      notionDestinationLoading.hidden =
        true;

      notionConnectionBadge.textContent =
        "Offline";

      setDestinationMessage(
        "Connect Notion from the web app first.",
        true
      );

      return;
    }

    notionConnectionBadge.textContent =
      "Connected";

    notionConnectionBadge.classList.add(
      "connected"
    );

    notionWorkspaceName.textContent =
      data.workspace?.name ||
      "Notion workspace";

    const dataSources =
      Array.isArray(
        data.dataSources
      )
        ? data.dataSources
        : [];

    notionDatabaseSelect.innerHTML =
      `
        <option value="">
          Choose a database...
        </option>
      `;

    dataSources.forEach(
      (source) => {
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

    const selectionExists =
      dataSources.some(
        (source) =>
          source.id ===
          savedDestinationId
      );

    notionDatabaseSelect.value =
      selectionExists
        ? savedDestinationId
        : "";

    notionDestinationLoading.hidden =
      true;

    notionDestinationContent.hidden =
      false;

    updateDestinationButton();

    if (
      dataSources.length === 0
    ) {
      setDestinationMessage(
        "No accessible Notion databases were found.",
        true
      );
    }
  } catch (error) {
    if (
      handleAuthFailure(
        error
      )
    ) {
      return;
    }

    console.error(
      "LOAD NOTION DESTINATION ERROR:",
      error
    );

    notionDestinationLoading.hidden =
      true;

    notionConnectionBadge.textContent =
      "Error";

    notionConnectionBadge.classList.remove(
      "connected"
    );

    notionConnectionBadge.classList.add(
      "error"
    );

    setDestinationMessage(
      error instanceof Error
        ? error.message
        : "Could not load your Notion destination.",
      true
    );
  }
}

async function saveNotionDestinationSelection() {
  const dataSourceId =
    notionDatabaseSelect.value;

  if (!dataSourceId) {
    setDestinationMessage(
      "Choose a database first.",
      true
    );

    return;
  }

  try {
    saveDestinationButton.disabled =
      true;

    saveDestinationButton.textContent =
      "Syncing...";

    setDestinationMessage("");

    const response =
      await window.voiceToNotionAuth.authenticatedFetch(
        `${API_BASE_URL}/api/notion/database/select`,
        {
          method: "POST",

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
        "DESTINATION SAVE"
      );

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Could not save the Notion destination."
      );
    }

    savedDestinationId =
      dataSourceId;

    updateDestinationButton();

    setDestinationMessage(
      "Destination synchronized."
    );

    resetNotionState();
  } catch (error) {
    if (
      handleAuthFailure(
        error
      )
    ) {
      return;
    }

    console.error(
      "SAVE NOTION DESTINATION ERROR:",
      error
    );

    setDestinationMessage(
      error instanceof Error
        ? error.message
        : "Could not save the Notion destination.",
      true
    );

    updateDestinationButton();
  }
}

/* =========================================================
   GENERAL UI
   ========================================================= */

function formatTime(
  seconds
) {
  const minutes =
    Math.floor(
      seconds / 60
    );

  const remainingSeconds =
    seconds % 60;

  return `${String(
    minutes
  ).padStart(
    2,
    "0"
  )}:${String(
    remainingSeconds
  ).padStart(
    2,
    "0"
  )}`;
}

function showError(
  message
) {
  errorBox.textContent =
    message;

  errorBox.hidden =
    false;

  setSystemState(
    "busy",
    "Attention"
  );
}

function clearError() {
  errorBox.textContent =
    "";

  errorBox.hidden =
    true;
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

function setRecordButtonBusy(
  isBusy
) {
  recordButton.disabled =
    isBusy;
}

function setRestructureBusy(
  isBusy
) {
  restructureButton.disabled =
    isBusy;
}

function setSaveBusy(
  isBusy
) {
  saveButton.disabled =
    isBusy;

  if (
    isBusy
  ) {
    saveButton.textContent =
      "Syncing...";
  } else if (
    notionSaved
  ) {
    saveButton.textContent =
      "Synced ✓";
  } else {
    saveButton.innerHTML =
      `
        Send to Notion
        <span>→</span>
      `;
  }
}

function resetCaptureUI() {
  currentNote =
    null;

  resultSection.hidden =
    true;

  structuredSection.hidden =
    true;

  transcriptBox.value =
    "";

  titleInput.value =
    "";

  summaryInput.value =
    "";

  categoryInput.value =
    "";

  priorityInput.value =
    "Low";

  updatePriorityAppearance();

  dueDateInput.value =
    "";

  actionItemsContainer.innerHTML =
    "";

  timer.textContent =
    "00:00";

  recordingSeconds =
    0;

  waveform.classList.remove(
    "active"
  );

  voiceCard.classList.remove(
    "recording"
  );

  recordButton.classList.remove(
    "recording"
  );

  transcriptShell.classList.remove(
    "processing"
  );

  processingIndicator.hidden =
    true;

  if (
    currentAudioUrl
  ) {
    URL.revokeObjectURL(
      currentAudioUrl
    );

    currentAudioUrl =
      null;
  }

  audioPlayer.pause();

  audioPlayer.removeAttribute(
    "src"
  );

  audioPlayer.load();

  audioPlayer.hidden =
    true;

  resetNotionState();

  clearError();

  updateTranscriptCount();

  setVoiceState(
    "idle"
  );
}

/* =========================================================
   MICROPHONE PERMISSION
   ========================================================= */

async function checkMicrophonePermission() {
  try {
    const permission =
      await navigator.permissions.query({
        name: "microphone",
      });

    return permission.state;
  } catch (error) {
    console.warn(
      "Could not query microphone permission:",
      error
    );

    return "unknown";
  }
}

async function openMicrophonePermissionPage() {
  await chrome.tabs.create({
    url:
      chrome.runtime.getURL(
        "mic-permission.html"
      ),
  });
}

/* =========================================================
   ACTION ITEMS
   ========================================================= */

function renderActionItems(
  items
) {
  actionItemsContainer.innerHTML =
    "";

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

      input.placeholder =
        "Action item";

      input.addEventListener(
        "input",
        (event) => {
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

      const removeButton =
        document.createElement(
          "button"
        );

      removeButton.type =
        "button";

      removeButton.className =
        "remove-action-button";

      removeButton.textContent =
        "×";

      removeButton.title =
        "Remove action item";

      removeButton.addEventListener(
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

      row.appendChild(
        input
      );

      row.appendChild(
        removeButton
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
      note.priority === "High" ||
      note.priority === "Medium" ||
      note.priority === "Low"
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

  updatePriorityAppearance();

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

  updatePriorityAppearance();

  resetNotionState();
}

/* =========================================================
   STRUCTURE TRANSCRIPT
   ========================================================= */

async function structureTranscript(
  transcript
) {
  try {
    clearError();

    await requireAuthSession();

    resetNotionState();

    structuredStatus.textContent =
      "Working";

    setVoiceState(
      "structuring"
    );

    setRestructureBusy(
      true
    );

    const response =
      await fetch(
        `${API_BASE_URL}/api/structure-note`,
        {
          method: "POST",

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
          "The structure request failed."
      );
    }

    if (
      !data.title
    ) {
      throw new Error(
        "The server returned an invalid structured note."
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
  } catch (error) {
    if (
      handleAuthFailure(
        error
      )
    ) {
      return;
    }

    console.error(
      "STRUCTURE ERROR:",
      error
    );

    structuredStatus.textContent =
      "Failed";

    showError(
      error instanceof Error
        ? error.message
        : "Could not structure the transcript."
    );
  } finally {
    setRestructureBusy(
      false
    );
  }
}

/* =========================================================
   TRANSCRIPTION
   ========================================================= */

async function transcribeAudio(
  audioBlob
) {
  try {
    clearError();

    await requireAuthSession();

    setRecordButtonBusy(
      true
    );

    transcriptStatus.textContent =
      "Working";

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
    }

    if (
      audioBlob.type.includes(
        "mp4"
      )
    ) {
      extension =
        "mp4";
    }

    if (
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

    const response =
      await fetch(
        `${API_BASE_URL}/api/transcribe`,
        {
          method: "POST",

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
          "The transcription request failed."
      );
    }

    if (
      !data.transcript ||
      typeof data.transcript !==
        "string"
    ) {
      throw new Error(
        "The server returned an empty transcript."
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

    return data.transcript;
  } catch (error) {
    if (
      handleAuthFailure(
        error
      )
    ) {
      return null;
    }

    console.error(
      "TRANSCRIPTION ERROR:",
      error
    );

    transcriptStatus.textContent =
      "Failed";

    showError(
      error instanceof Error
        ? error.message
        : "Could not transcribe the recording."
    );

    return null;
  } finally {
    setRecordButtonBusy(
      false
    );
  }
}

/* =========================================================
   SAVE TO NOTION
   ========================================================= */

async function saveToNotion() {
  if (
    !currentNote
  ) {
    showError(
      "There is no structured note to save."
    );

    return;
  }

  syncCurrentNoteFromInputs();

  if (
    !currentNote.title.trim()
  ) {
    showError(
      "The note needs a title before it can be saved."
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

  try {
    clearError();

    setSaveBusy(
      true
    );

    setVoiceState(
      "saving"
    );

    const cleanActionItems =
      currentNote.actionItems
        .map(
          (item) =>
            item.trim()
        )
        .filter(
          Boolean
        );

    const response =
      await window.voiceToNotionAuth.authenticatedFetch(
        `${API_BASE_URL}/api/notion/save`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              title:
                currentNote.title.trim(),

              summary:
                currentNote.summary.trim(),

              actionItems:
                cleanActionItems,

              category:
                currentNote.category.trim(),

              priority:
                currentNote.priority,

              dueDate:
                currentNote.dueDate,

              transcript:
                transcriptBox.value.trim(),
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
          "Could not save the note to Notion."
      );
    }

    notionSaved =
      true;

    successBox.hidden =
      false;

    if (
      data.url
    ) {
      notionLink.href =
        data.url;

      notionLink.hidden =
        false;
    }

    setVoiceState(
      "ready"
    );

    setSystemState(
      "ready",
      "Synced"
    );

    setSaveBusy(
      false
    );

    saveButton.disabled =
      true;
  } catch (error) {
    notionSaved =
      false;

    setSaveBusy(
      false
    );

    if (
      handleAuthFailure(
        error
      )
    ) {
      return;
    }

    console.error(
      "NOTION SAVE ERROR:",
      error
    );

    showError(
      error instanceof Error
        ? error.message
        : "Could not save the note to Notion."
    );

    setVoiceState(
      "ready"
    );
  }
}

/* =========================================================
   START RECORDING
   ========================================================= */

async function startRecording() {
  try {
    clearError();

    await requireAuthSession();

    resetNotionState();

    resultSection.hidden =
      true;

    structuredSection.hidden =
      true;

    transcriptBox.value =
      "";

    updateTranscriptCount();

    currentNote =
      null;

    categoryInput.value =
      "";

    priorityInput.value =
      "Low";

    updatePriorityAppearance();

    dueDateInput.value =
      "";

    const permissionState =
      await checkMicrophonePermission();

    if (
      permissionState ===
        "prompt" ||
      permissionState ===
        "denied"
    ) {
      await openMicrophonePermissionPage();

      showError(
        "Allow microphone access in the new tab, then reopen the extension."
      );

      return;
    }

    const stream =
      await navigator.mediaDevices.getUserMedia(
        {
          audio: true,
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
        try {
          const mimeType =
            mediaRecorder.mimeType ||
            "audio/webm";

          const audioBlob =
            new Blob(
              audioChunks,
              {
                type:
                  mimeType,
              }
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
              audioBlob
            );

          audioPlayer.src =
            currentAudioUrl;

          audioPlayer.hidden =
            false;

          stream
            .getTracks()
            .forEach(
              (track) =>
                track.stop()
            );

          if (
            audioBlob.size === 0
          ) {
            showError(
              "The recording was empty. Please try again."
            );

            setVoiceState(
              "idle"
            );

            return;
          }

          await transcribeAudio(
            audioBlob
          );
        } catch (error) {
          console.error(
            "RECORDING PROCESS ERROR:",
            error
          );

          showError(
            "Could not process the recording."
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
  } catch (error) {
    if (
      handleAuthFailure(
        error
      )
    ) {
      return;
    }

    console.error(
      "MICROPHONE ERROR:",
      error
    );

    if (
      error.name ===
        "NotAllowedError" ||
      error.name ===
        "PermissionDeniedError"
    ) {
      await openMicrophonePermissionPage();

      showError(
        "Microphone permission is required. Grant permission and reopen the extension."
      );

      return;
    }

    showError(
      `Could not access the microphone: ${
        error.message ||
        "Unknown error"
      }`
    );
  }
}

/* =========================================================
   STOP RECORDING
   ========================================================= */

function stopRecording() {
  if (
    !mediaRecorder ||
    mediaRecorder.state ===
      "inactive"
  ) {
    return;
  }

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

  voiceSubstatus.textContent =
    "Getting your audio ready for AI processing.";

  setSystemState(
    "busy",
    "Processing"
  );
}

/* =========================================================
   AUTH EVENTS
   ========================================================= */

authForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const email =
      authEmail.value.trim();

    const password =
      authPassword.value;

    if (
      !email ||
      !password
    ) {
      setAuthMessage(
        "Enter your email and password.",
        true
      );

      return;
    }

    try {
      authButton.disabled =
        true;

      authButton.textContent =
        "Entering...";

      setAuthMessage("");

      const session =
        await window.voiceToNotionAuth.signInWithPassword(
          email,
          password
        );

      authPassword.value =
        "";

      setAppAuthenticated(
        true,
        session.user?.email ||
          email
      );

      await loadNotionDestination();
    } catch (error) {
      console.error(
        "EXTENSION LOGIN ERROR:",
        error
      );

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
      logoutButton.disabled =
        true;

      logoutButton.textContent =
        "...";

      await window.voiceToNotionAuth.signOutExtension();

      setAppAuthenticated(
        false
      );

      resetNotionDestinationUI();

      resetCaptureUI();

      authEmail.value =
        "";

      authPassword.value =
        "";
    } catch (error) {
      console.error(
        "EXTENSION LOGOUT ERROR:",
        error
      );

      setAuthMessage(
        error instanceof Error
          ? error.message
          : "Could not log out.",
        true
      );
    } finally {
      logoutButton.disabled =
        false;

      logoutButton.textContent =
        "Log out";
    }
  }
);

/* =========================================================
   DESTINATION EVENTS
   ========================================================= */

notionDatabaseSelect.addEventListener(
  "change",
  () => {
    setDestinationMessage("");

    updateDestinationButton();

    resetNotionState();
  }
);

saveDestinationButton.addEventListener(
  "click",
  saveNotionDestinationSelection
);

refreshDestinationButton.addEventListener(
  "click",
  loadNotionDestination
);

/* =========================================================
   RECORDING EVENTS
   ========================================================= */

recordButton.addEventListener(
  "click",
  async () => {
    if (
      mediaRecorder &&
      mediaRecorder.state ===
        "recording"
    ) {
      stopRecording();

      return;
    }

    await startRecording();
  }
);

/* =========================================================
   TRANSCRIPT EVENTS
   ========================================================= */

restructureButton.addEventListener(
  "click",
  async () => {
    const transcript =
      transcriptBox.value.trim();

    if (
      !transcript
    ) {
      showError(
        "Transcript is empty."
      );

      return;
    }

    await structureTranscript(
      transcript
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

/* =========================================================
   NOTE EVENTS
   ========================================================= */

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

saveButton.addEventListener(
  "click",
  saveToNotion
);

titleInput.addEventListener(
  "input",
  syncCurrentNoteFromInputs
);

summaryInput.addEventListener(
  "input",
  syncCurrentNoteFromInputs
);

categoryInput.addEventListener(
  "input",
  syncCurrentNoteFromInputs
);

priorityInput.addEventListener(
  "change",
  syncCurrentNoteFromInputs
);

dueDateInput.addEventListener(
  "input",
  syncCurrentNoteFromInputs
);

/* =========================================================
   THEME EVENT
   ========================================================= */

themeToggle.addEventListener(
  "click",
  toggleTheme
);

/* =========================================================
   INITIALIZE
   ========================================================= */

async function initialize() {
  await initializeTheme();

  updateTranscriptCount();

  priorityInput.value =
    "Low";

  updatePriorityAppearance();

  setVoiceState(
    "idle"
  );

  await initializeAuth();
}

initialize();