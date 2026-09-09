const API_BASE_URL =
  "https://voice-to-notion-omega.vercel.app";

/*
  AUTH ELEMENTS
*/

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

const logoutButton =
  document.getElementById(
    "logoutButton"
  );

const appContent =
  document.getElementById(
    "appContent"
  );

/*
  NOTION DESTINATION ELEMENTS
*/

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

/*
  VOICE / NOTE ELEMENTS
*/

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

const audioPlayer =
  document.getElementById(
    "audioPlayer"
  );

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

const restructureButton =
  document.getElementById(
    "restructureButton"
  );

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

/*
  STATE
*/

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

/*
  AUTH HELPERS
*/

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

  signedInBox.hidden =
    !isAuthenticated;

  appContent.hidden =
    !isAuthenticated;

  if (isAuthenticated) {
    signedInEmail.textContent =
      email ||
      "Voice to Notion user";

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

/*
  NOTION DESTINATION
*/

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
    "Loading...";

  savedDestinationId =
    "";

  setDestinationMessage(
    ""
  );
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
      ? "Save Destination"
      : "Destination Saved";
}

async function loadNotionDestination() {
  resetNotionDestinationUI();

  try {
    const session =
      await requireAuthSession();

    const response =
      await fetch(
        `${API_BASE_URL}/api/notion/databases`,
        {
          method:
            "GET",

          headers: {
            Authorization:
              `Bearer ${session.accessToken}`,
          },
        }
      );

    const data =
      await response.json();

    console.log(
      "NOTION DATABASE RESPONSE:",
      data
    );

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Could not load your Notion destination."
      );
    }

    if (!data.connected) {
      notionDestinationLoading.hidden =
        true;

      notionConnectionBadge.textContent =
        "Not connected";

      setDestinationMessage(
        "Connect Notion from the Voice to Notion web app first.",
        true
      );

      return;
    }

    notionConnectionBadge.textContent =
      "Connected";

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
      dataSources.length ===
      0
    ) {
      setDestinationMessage(
        "No accessible Notion databases were found.",
        true
      );
    }
  } catch (error) {
    console.error(
      "LOAD NOTION DESTINATION ERROR:",
      error
    );

    notionDestinationLoading.hidden =
      true;

    notionConnectionBadge.textContent =
      "Error";

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
      "Saving...";

    setDestinationMessage(
      ""
    );

    const session =
      await requireAuthSession();

    const response =
      await fetch(
        `${API_BASE_URL}/api/notion/database/select`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session.accessToken}`,
          },

          body:
            JSON.stringify({
              dataSourceId,
            }),
        }
      );

    const data =
      await response.json();

    console.log(
      "NOTION DESTINATION SAVE RESPONSE:",
      data
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
      "Notion destination saved."
    );

    resetNotionState();
  } catch (error) {
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

/*
  GENERAL UI
*/

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

  statusText.textContent =
    "Something went wrong";
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

  saveButton.textContent =
    "Save to Notion";
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

  if (isBusy) {
    saveButton.textContent =
      "Saving...";
  } else if (
    notionSaved
  ) {
    saveButton.textContent =
      "Saved to Notion";
  } else {
    saveButton.textContent =
      "Save to Notion";
  }
}

/*
  MICROPHONE
*/

async function checkMicrophonePermission() {
  try {
    const permission =
      await navigator.permissions.query({
        name:
          "microphone",
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

/*
  ACTION ITEMS
*/

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

      input.addEventListener(
        "input",
        (
          event
        ) => {
          if (!currentNote) {
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

      removeButton.addEventListener(
        "click",
        () => {
          if (!currentNote) {
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

/*
  STRUCTURED NOTE
*/

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
      "",

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
  if (!currentNote) {
    return;
  }

  currentNote.title =
    titleInput.value;

  currentNote.summary =
    summaryInput.value;

  currentNote.category =
    categoryInput.value;

  currentNote.dueDate =
    dueDateInput.value ||
    null;

  resetNotionState();
}

/*
  STRUCTURE TRANSCRIPT
*/

async function structureTranscript(
  transcript
) {
  try {
    clearError();

    resetNotionState();

    structuredStatus.textContent =
      "Structuring...";

    statusText.textContent =
      "Structuring your note...";

    setRestructureBusy(
      true
    );

    const response =
      await fetch(
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
      await response.json();

    console.log(
      "STRUCTURE RESPONSE:",
      data
    );

    if (!response.ok) {
      throw new Error(
        data.error ||
          "The structure request failed."
      );
    }

    if (!data.title) {
      throw new Error(
        "The server returned an invalid structured note."
      );
    }

    populateStructuredNote(
      data
    );

    structuredStatus.textContent =
      "Ready";

    statusText.textContent =
      "Note ready";
  } catch (error) {
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

/*
  TRANSCRIPTION
*/

async function transcribeAudio(
  audioBlob
) {
  try {
    clearError();

    setRecordButtonBusy(
      true
    );

    transcriptStatus.textContent =
      "Transcribing...";

    statusText.textContent =
      "Transcribing your recording...";

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

    formData.append(
      "audio",
      audioBlob,
      `recording.${extension}`
    );

    const response =
      await fetch(
        `${API_BASE_URL}/api/transcribe`,
        {
          method:
            "POST",

          body:
            formData,
        }
      );

    const data =
      await response.json();

    console.log(
      "TRANSCRIPTION RESPONSE:",
      data
    );

    if (!response.ok) {
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

    resultSection.hidden =
      false;

    transcriptStatus.textContent =
      "Ready";

    statusText.textContent =
      "Transcription complete";

    await structureTranscript(
      data.transcript
    );

    return data.transcript;
  } catch (error) {
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

/*
  SAVE NOTE TO NOTION
*/

async function saveToNotion() {
  if (!currentNote) {
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

  if (notionSaved) {
    return;
  }

  try {
    clearError();

    setSaveBusy(
      true
    );

    statusText.textContent =
      "Saving to Notion...";

    const cleanActionItems =
      currentNote.actionItems
        .map(
          (
            item
          ) =>
            item.trim()
        )
        .filter(
          Boolean
        );

    const session =
      await requireAuthSession();

    const response =
      await fetch(
        `${API_BASE_URL}/api/notion/save`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session.accessToken}`,
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

              dueDate:
                currentNote.dueDate,

              transcript:
                transcriptBox.value.trim(),
            }),
        }
      );

    const data =
      await response.json();

    console.log(
      "NOTION SAVE RESPONSE:",
      data
    );

    if (!response.ok) {
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

    statusText.textContent =
      "Saved to Notion";

    setSaveBusy(
      false
    );

    saveButton.disabled =
      true;
  } catch (error) {
    console.error(
      "NOTION SAVE ERROR:",
      error
    );

    notionSaved =
      false;

    setSaveBusy(
      false
    );

    showError(
      error instanceof Error
        ? error.message
        : "Could not save the note to Notion."
    );
  }
}

/*
  RECORDING
*/

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

    currentNote =
      null;

    const permissionState =
      await checkMicrophonePermission();

    if (
      permissionState ===
        "prompt" ||
      permissionState ===
        "denied"
    ) {
      statusText.textContent =
        "Microphone permission required";

      await openMicrophonePermissionPage();

      showError(
        "Allow microphone access in the new tab, then reopen the extension."
      );

      return;
    }

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
              (
                track
              ) =>
                track.stop()
            );

          if (
            audioBlob.size ===
            0
          ) {
            showError(
              "The recording was empty. Please try again."
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

    recordButton.textContent =
      "Stop Recording";

    recordButton.classList.add(
      "recording"
    );

    statusText.textContent =
      "Recording...";
  } catch (error) {
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
        "Microphone permission is required. Grant permission in the new tab, then reopen the extension."
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

  recordButton.textContent =
    "Start Recording";

  recordButton.classList.remove(
    "recording"
  );

  statusText.textContent =
    "Preparing recording...";
}

/*
  AUTH EVENTS
*/

authForm.addEventListener(
  "submit",
  async (
    event
  ) => {
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
        "Logging in...";

      setAuthMessage(
        ""
      );

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
        "Log In";
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
        "Logging out...";

      await window.voiceToNotionAuth.signOutExtension();

      setAppAuthenticated(
        false
      );

      resetNotionDestinationUI();

      authEmail.value =
        "";

      authPassword.value =
        "";

      currentNote =
        null;

      resultSection.hidden =
        true;

      structuredSection.hidden =
        true;

      audioPlayer.hidden =
        true;

      clearError();

      statusText.textContent =
        "Microphone ready";
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
        "Log Out";
    }
  }
);

/*
  DESTINATION EVENTS
*/

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
  saveNotionDestinationSelection
);

refreshDestinationButton.addEventListener(
  "click",
  loadNotionDestination
);

/*
  RECORDING EVENTS
*/

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

restructureButton.addEventListener(
  "click",
  async () => {
    const transcript =
      transcriptBox.value.trim();

    if (!transcript) {
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

addActionButton.addEventListener(
  "click",
  () => {
    if (!currentNote) {
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

transcriptBox.addEventListener(
  "input",
  () => {
    resetNotionState();
  }
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

dueDateInput.addEventListener(
  "input",
  syncCurrentNoteFromInputs
);

/*
  INITIALIZE
*/

initializeAuth();