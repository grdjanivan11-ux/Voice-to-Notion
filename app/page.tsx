"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import AuthGate from "@/components/AuthGate";
import { supabaseBrowser } from "@/lib/supabase-browser";

type StructuredNote = {
  title: string;
  summary: string;
  actionItems: string[];
  category: string;
  dueDate: string | null;
  mock?: boolean;
};

type NotionSaveResponse = {
  success: boolean;
  pageId?: string;
  url?: string | null;
  error?: string;
  details?: string;
};

type ProcessingStep =
  | "idle"
  | "recording"
  | "transcribing"
  | "structuring"
  | "ready"
  | "saving";

type CaptureHistoryItem = {
  id: string;
  createdAt: string;
  transcript: string;
  note: StructuredNote;
  savedToNotion: boolean;
  notionUrl: string | null;
};

type NotionDataSource = {
  id: string;
  name: string;
};

type NotionDatabasesResponse = {
  success?: boolean;

  workspace?: {
    id: string;
    name: string | null;
  };

  selectedDataSourceId?: string | null;

  dataSources?: NotionDataSource[];

  error?: string;
};

type NotionDatabaseSelectionResponse = {
  success?: boolean;
  selectedDataSourceId?: string;
  error?: string;
};

const HISTORY_STORAGE_KEY =
  "voice-to-notion-history";

const MAX_HISTORY_ITEMS = 10;


export default function Home() {
  const [transcript, setTranscript] =
    useState("");

  const [note, setNote] =
    useState<StructuredNote | null>(
      null
    );

  const [
    processingStep,
    setProcessingStep,
  ] =
    useState<ProcessingStep>(
      "idle"
    );

  const [error, setError] =
    useState("");

  const [
    isRecording,
    setIsRecording,
  ] = useState(false);

  const [
    audioBlob,
    setAudioBlob,
  ] =
    useState<Blob | null>(
      null
    );

  const [
    audioUrl,
    setAudioUrl,
  ] =
    useState<string | null>(
      null
    );

  const [
    recordingSeconds,
    setRecordingSeconds,
  ] = useState(0);

  const [
    notionSaved,
    setNotionSaved,
  ] = useState(false);

  const [
    notionPageUrl,
    setNotionPageUrl,
  ] =
    useState<string | null>(
      null
    );

  const [
    history,
    setHistory,
  ] =
    useState<
      CaptureHistoryItem[]
    >([]);

  const [
    historyLoaded,
    setHistoryLoaded,
  ] = useState(false);

  /*
    NOTION DATABASE PICKER
  */

  const [
    notionWorkspaceName,
    setNotionWorkspaceName,
  ] =
    useState<string | null>(
      null
    );

  const [
    notionDataSources,
    setNotionDataSources,
  ] =
    useState<
      NotionDataSource[]
    >([]);

  const [
    selectedDataSourceId,
    setSelectedDataSourceId,
  ] = useState("");

  const [
    savedDataSourceId,
    setSavedDataSourceId,
  ] = useState("");

  const [
    loadingDatabases,
    setLoadingDatabases,
  ] = useState(true);

  const [
    savingDatabase,
    setSavingDatabase,
  ] = useState(false);

  const [
    notionDatabaseError,
    setNotionDatabaseError,
  ] = useState("");

  const [
    notionDatabaseMessage,
    setNotionDatabaseMessage,
  ] = useState("");

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(
      null
    );

  const audioChunksRef =
    useRef<Blob[]>([]);

  const recordingTimerRef =
    useRef<
      ReturnType<
        typeof setInterval
      > | null
    >(null);

  const currentHistoryIdRef =
    useRef<string | null>(
      null
    );

  const isBusy =
    processingStep ===
      "transcribing" ||
    processingStep ===
      "structuring" ||
    processingStep ===
      "saving";

  /*
    LOAD HISTORY
  */

  useEffect(() => {
    try {
      const storedHistory =
        localStorage.getItem(
          HISTORY_STORAGE_KEY
        );

      if (storedHistory) {
        const parsedHistory =
          JSON.parse(
            storedHistory
          ) as CaptureHistoryItem[];

        setHistory(
          parsedHistory
        );
      }
    } catch (err) {
      console.error(
        "HISTORY LOAD ERROR:",
        err
      );
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  /*
    SAVE HISTORY
  */

  useEffect(() => {
    if (!historyLoaded) {
      return;
    }

    try {
      localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(
          history
        )
      );
    } catch (err) {
      console.error(
        "HISTORY SAVE ERROR:",
        err
      );
    }
  }, [
    history,
    historyLoaded,
  ]);

  /*
    LOAD NOTION DATABASES
  */

  useEffect(() => {
    loadNotionDatabases();
  }, []);

  /*
    CLEANUP AUDIO
  */

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(
          audioUrl
        );
      }

      if (
        recordingTimerRef.current
      ) {
        clearInterval(
          recordingTimerRef.current
        );
      }
    };
  }, [audioUrl]);

  async function loadNotionDatabases() {
  setLoadingDatabases(true);

  setNotionDatabaseError("");
  setNotionDatabaseMessage("");

  try {
    const {
      data: { session },
    } = await supabaseBrowser.auth.getSession();

    if (!session) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch(
      "/api/notion/databases",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const data =
      (await response.json()) as NotionDatabasesResponse;

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Could not load Notion databases."
      );
    }

    const dataSources =
      data.dataSources ?? [];

    setNotionDataSources(
      dataSources
    );

    setNotionWorkspaceName(
      data.workspace?.name ??
        null
    );

    const storedSelection =
      data.selectedDataSourceId ??
      "";

    const validSelection =
      dataSources.some(
        (source) =>
          source.id ===
          storedSelection
      )
        ? storedSelection
        : "";

    setSelectedDataSourceId(
      validSelection
    );

    setSavedDataSourceId(
      validSelection
    );
  } catch (err) {
    console.error(
      "LOAD NOTION DATABASES ERROR:",
      err
    );

    if (err instanceof Error) {
      setNotionDatabaseError(
        err.message
      );
    } else {
      setNotionDatabaseError(
        "Could not load Notion databases."
      );
    }
  } finally {
    setLoadingDatabases(false);
  }
}

  async function connectNotion() {
    try {
      setNotionDatabaseError("");
      setNotionDatabaseMessage("");

      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(
        "/api/notion/oauth/start",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not connect Notion."
        );
      }

      if (!data.authorizationUrl) {
        throw new Error(
          "No Notion authorization URL was returned."
        );
      }

      window.location.href =
        data.authorizationUrl;
    } catch (err) {
      console.error(
        "CONNECT NOTION ERROR:",
        err
      );

      if (err instanceof Error) {
        setNotionDatabaseError(
          err.message
        );
      } else {
        setNotionDatabaseError(
          "Could not connect Notion."
        );
      }
    }
  }

  async function saveNotionDatabaseSelection() {
  if (!selectedDataSourceId) {
    setNotionDatabaseError(
      "Choose a Notion database first."
    );

    return;
  }

  setSavingDatabase(true);

  setNotionDatabaseError("");
  setNotionDatabaseMessage("");

  try {
    const {
      data: { session },
    } =
      await supabaseBrowser.auth.getSession();

    if (!session) {
      window.location.href =
        "/login";

      return;
    }

    const response =
      await fetch(
        "/api/notion/database/select",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            dataSourceId:
              selectedDataSourceId,
          }),
        }
      );

    const data =
      (await response.json()) as NotionDatabaseSelectionResponse;

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Could not save the Notion destination."
      );
    }

    setSavedDataSourceId(
      selectedDataSourceId
    );

    setNotionDatabaseMessage(
      "Notion destination saved."
    );
  } catch (err) {
    console.error(
      "SAVE NOTION DATABASE ERROR:",
      err
    );

    if (err instanceof Error) {
      setNotionDatabaseError(
        err.message
      );
    } else {
      setNotionDatabaseError(
        "Could not save the Notion destination."
      );
    }
  } finally {
    setSavingDatabase(false);
  }
}


  function resetNotionState() {
    setNotionSaved(false);
    setNotionPageUrl(null);
  }

  function createHistoryItem(
    structuredNote: StructuredNote,
    sourceTranscript: string
  ) {
    const historyItem: CaptureHistoryItem =
      {
        id: crypto.randomUUID(),

        createdAt:
          new Date().toISOString(),

        transcript:
          sourceTranscript,

        note:
          structuredNote,

        savedToNotion:
          false,

        notionUrl:
          null,
      };

    setHistory(
      (
        currentHistory
      ) => {
        const newHistory =
          [
            historyItem,
            ...currentHistory,
          ];

        return newHistory.slice(
          0,
          MAX_HISTORY_ITEMS
        );
      }
    );

    return historyItem.id;
  }

  function updateHistoryItem(
    id: string,
    changes: Partial<CaptureHistoryItem>
  ) {
    setHistory(
      (
        currentHistory
      ) =>
        currentHistory.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  ...changes,
                }
              : item
        )
    );
  }

  async function startRecording() {
    try {
      setError("");

      setNote(null);

      setTranscript("");

      resetNotionState();

      currentHistoryIdRef.current =
        null;

      if (audioUrl) {
        URL.revokeObjectURL(
          audioUrl
        );

        setAudioUrl(null);
      }

      setAudioBlob(null);

      setRecordingSeconds(0);

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
          }
        );

      const mediaRecorder =
        new MediaRecorder(
          stream
        );

      mediaRecorderRef.current =
        mediaRecorder;

      audioChunksRef.current =
        [];

      mediaRecorder.ondataavailable =
        (event) => {
          if (
            event.data.size >
            0
          ) {
            audioChunksRef.current.push(
              event.data
            );
          }
        };

      mediaRecorder.onstop =
        async () => {
          try {
            const mimeType =
              mediaRecorder.mimeType ||
              "audio/webm";

            const recordedBlob =
              new Blob(
                audioChunksRef.current,
                {
                  type:
                    mimeType,
                }
              );

            const url =
              URL.createObjectURL(
                recordedBlob
              );

            setAudioBlob(
              recordedBlob
            );

            setAudioUrl(url);

            stream
              .getTracks()
              .forEach(
                (track) =>
                  track.stop()
              );

            await processRecording(
              recordedBlob
            );
          } catch (err) {
            console.error(
              "RECORDING PROCESSING ERROR:",
              err
            );

            setProcessingStep(
              "idle"
            );

            if (
              err instanceof
              Error
            ) {
              setError(
                err.message
              );
            } else {
              setError(
                "Could not process the recording."
              );
            }
          }
        };

      mediaRecorder.start();

      setIsRecording(true);

      setProcessingStep(
        "recording"
      );

      recordingTimerRef.current =
        setInterval(
          () => {
            setRecordingSeconds(
              (
                previous
              ) =>
                previous +
                1
            );
          },
          1000
        );
    } catch (err) {
      console.error(
        "MICROPHONE ERROR:",
        err
      );

      setProcessingStep(
        "idle"
      );

      setError(
        "Could not access the microphone. Check your browser microphone permissions."
      );
    }
  }

  function stopRecording() {
    const mediaRecorder =
      mediaRecorderRef.current;

    if (
      !mediaRecorder ||
      mediaRecorder.state ===
        "inactive"
    ) {
      return;
    }

    mediaRecorder.stop();

    setIsRecording(false);

    if (
      recordingTimerRef.current
    ) {
      clearInterval(
        recordingTimerRef.current
      );

      recordingTimerRef.current =
        null;
    }
  }

  async function processRecording(
    recordedBlob: Blob
  ) {
    setError("");

    setNote(null);

    resetNotionState();

    const newTranscript =
      await transcribeBlob(
        recordedBlob
      );

    setTranscript(
      newTranscript
    );

    const structuredNote =
      await structureText(
        newTranscript
      );

    setNote(
      structuredNote
    );

    setProcessingStep(
      "ready"
    );

    const historyId =
      createHistoryItem(
        structuredNote,
        newTranscript
      );

    currentHistoryIdRef.current =
      historyId;
  }

  async function transcribeBlob(
    blob: Blob
  ): Promise<string> {
    setProcessingStep(
      "transcribing"
    );

    const formData =
      new FormData();

    const extension =
      blob.type.includes(
        "ogg"
      )
        ? "ogg"
        : "webm";

    formData.append(
      "audio",
      blob,
      `recording.${extension}`
    );

    const response =
      await fetch(
        "/api/transcribe",
        {
          method: "POST",
          body:
            formData,
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Transcription failed."
      );
    }

    if (
      !data.transcript ||
      typeof data.transcript !==
        "string"
    ) {
      throw new Error(
        "The transcription service returned no text."
      );
    }

    return data.transcript;
  }

  async function structureText(
    text: string
  ): Promise<StructuredNote> {
    setProcessingStep(
      "structuring"
    );

    const response =
      await fetch(
        "/api/structure-note",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              {
                transcript:
                  text,
              }
            ),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Could not structure the note."
      );
    }

    return data as StructuredNote;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    await structureTranscriptManually();
  }

  async function structureTranscriptManually() {
    if (
      !transcript.trim()
    ) {
      setError(
        "Please record audio or enter a transcript first."
      );

      return;
    }

    setError("");

    setNote(null);

    resetNotionState();

    try {
      const structuredNote =
        await structureText(
          transcript.trim()
        );

      setNote(
        structuredNote
      );

      setProcessingStep(
        "ready"
      );

      const historyId =
        createHistoryItem(
          structuredNote,
          transcript.trim()
        );

      currentHistoryIdRef.current =
        historyId;
    } catch (err) {
      console.error(
        "STRUCTURE NOTE ERROR:",
        err
      );

      setProcessingStep(
        "idle"
      );

      if (
        err instanceof Error
      ) {
        setError(
          err.message
        );
      } else {
        setError(
          "Could not structure the note."
        );
      }
    }
  }

  async function retranscribeRecording() {
    if (!audioBlob) {
      setError(
        "Please record some audio first."
      );

      return;
    }

    try {
      await processRecording(
        audioBlob
      );
    } catch (err) {
      console.error(
        "REPROCESS RECORDING ERROR:",
        err
      );

      setProcessingStep(
        "idle"
      );

      if (
        err instanceof Error
      ) {
        setError(
          err.message
        );
      } else {
        setError(
          "Could not process the recording."
        );
      }
    }
  }

  async function saveToNotion() {
  if (!note) {
    setError(
      "There is no structured note to save."
    );

    return;
  }

  if (!savedDataSourceId) {
    setError(
      "Choose and save a Notion destination first."
    );

    return;
  }

  setProcessingStep(
    "saving"
  );

  setError("");

  setNotionSaved(false);

  setNotionPageUrl(
    null
  );

  try {
    const {
      data: { session },
    } =
      await supabaseBrowser.auth.getSession();

    if (!session) {
      window.location.href =
        "/login";

      return;
    }

    const response =
      await fetch(
        "/api/notion/save",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session.access_token}`,
          },

          body:
            JSON.stringify(
              {
                title:
                  note.title,

                summary:
                  note.summary,

                actionItems:
                  note.actionItems,

                category:
                  note.category,

                dueDate:
                  note.dueDate,

                transcript,
              }
            ),
        }
      );

    const data =
      (await response.json()) as NotionSaveResponse;

    if (!response.ok) {
      throw new Error(
        data.details ||
          data.error ||
          "Could not save the note to Notion."
      );
    }

    setNotionSaved(true);

    if (data.url) {
      setNotionPageUrl(
        data.url
      );
    }

    if (
      currentHistoryIdRef.current
    ) {
      updateHistoryItem(
        currentHistoryIdRef.current,
        {
          savedToNotion:
            true,

          notionUrl:
            data.url ??
            null,

          note,

          transcript,
        }
      );
    }

    setProcessingStep(
      "ready"
    );

    console.log(
      "NOTION SAVE SUCCESS:",
      data
    );
  } catch (err) {
    console.error(
      "SAVE TO NOTION ERROR:",
      err
    );

    setProcessingStep(
      "ready"
    );

    if (
      err instanceof Error
    ) {
      setError(
        err.message
      );
    } else {
      setError(
        "Could not save the note to Notion."
      );
    }
  }
}

  function updateNote(
    changes: Partial<StructuredNote>
  ) {
    setNote(
      (
        currentNote
      ) => {
        if (
          !currentNote
        ) {
          return currentNote;
        }

        const updatedNote =
          {
            ...currentNote,
            ...changes,
          };

        if (
          currentHistoryIdRef.current
        ) {
          updateHistoryItem(
            currentHistoryIdRef.current,
            {
              note:
                updatedNote,
            }
          );
        }

        return updatedNote;
      }
    );

    resetNotionState();
  }

  function updateActionItem(
    index: number,
    value: string
  ) {
    if (!note) {
      return;
    }

    const updatedItems =
      [
        ...note.actionItems,
      ];

    updatedItems[index] =
      value;

    updateNote({
      actionItems:
        updatedItems,
    });
  }

  function addActionItem() {
    if (!note) {
      return;
    }

    updateNote({
      actionItems: [
        ...note.actionItems,
        "",
      ],
    });
  }

  function removeActionItem(
    index: number
  ) {
    if (!note) {
      return;
    }

    updateNote({
      actionItems:
        note.actionItems.filter(
          (
            _,
            itemIndex
          ) =>
            itemIndex !==
            index
        ),
    });
  }

  function loadHistoryItem(
    item: CaptureHistoryItem
  ) {
    setTranscript(
      item.transcript
    );

    setNote(
      item.note
    );

    setNotionSaved(
      item.savedToNotion
    );

    setNotionPageUrl(
      item.notionUrl
    );

    currentHistoryIdRef.current =
      item.id;

    setError("");

    setProcessingStep(
      "ready"
    );

    if (audioUrl) {
      URL.revokeObjectURL(
        audioUrl
      );
    }

    setAudioUrl(null);

    setAudioBlob(null);

    setRecordingSeconds(0);

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  function deleteHistoryItem(
    id: string
  ) {
    setHistory(
      (
        currentHistory
      ) =>
        currentHistory.filter(
          (item) =>
            item.id !==
            id
        )
    );

    if (
      currentHistoryIdRef.current ===
      id
    ) {
      currentHistoryIdRef.current =
        null;
    }
  }

  function clearHistory() {
    setHistory([]);

    currentHistoryIdRef.current =
      null;
  }

  function resetCapture() {
    if (audioUrl) {
      URL.revokeObjectURL(
        audioUrl
      );
    }

    setAudioUrl(null);

    setAudioBlob(null);

    setTranscript("");

    setNote(null);

    setError("");

    setRecordingSeconds(0);

    setProcessingStep(
      "idle"
    );

    currentHistoryIdRef.current =
      null;

    resetNotionState();
  }

  function formatRecordingTime(
    seconds: number
  ) {
    const minutes =
      Math.floor(
        seconds / 60
      );

    const remainingSeconds =
      seconds % 60;

    return `${minutes
      .toString()
      .padStart(
        2,
        "0"
      )}:${remainingSeconds
      .toString()
      .padStart(
        2,
        "0"
      )}`;
  }

  function formatHistoryDate(
    dateString: string
  ) {
    const date =
      new Date(
        dateString
      );

    return date.toLocaleString();
  }

  function processingMessage() {
    if (
      processingStep ===
      "transcribing"
    ) {
      return "Transcribing your recording...";
    }

    if (
      processingStep ===
      "structuring"
    ) {
      return "Turning your thought into a structured note...";
    }

    if (
      processingStep ===
      "saving"
    ) {
      return "Saving your note to Notion...";
    }

    return null;
  }

  const destinationChanged =
    selectedDataSourceId !==
    savedDataSourceId;

  return (
  <AuthGate>
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <header className="mb-12">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            AI Productivity
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Voice to Notion
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-400">
            Speak your thought.
            We&apos;ll transcribe
            it, organize it and
            prepare it for Notion.
          </p>
        </header>

        {/* NOTION DESTINATION */}

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                Notion Destination
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Choose where your
                captured notes will
                be saved.
              </p>
            </div>

            {savedDataSourceId && (
              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                Connected
              </span>
            )}
          </div>

          {loadingDatabases ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
              Loading your Notion
              workspace...
            </div>
          ) : notionDatabaseError &&
            notionDataSources.length ===
              0 ? (
            <div>
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {
                  notionDatabaseError
                }
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={
                    loadNotionDatabases
                  }
                  className="rounded-xl border border-zinc-700 px-5 py-3 font-medium text-zinc-300 transition hover:bg-zinc-800"
                >
                  Try Again
                </button>

                <button
                  type="button"
                  onClick={connectNotion}
                  className="rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200"
                >
                  Connect Notion
                </button>
              </div>
            </div>
          ) : (
            <div>
              {notionWorkspaceName && (
                <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
                    Workspace
                  </p>

                  <p className="mt-1 font-medium text-white">
                    {
                      notionWorkspaceName
                    }
                  </p>
                </div>
              )}

              {notionDataSources.length >
              0 ? (
                <>
                  <label
                    htmlFor="notion-destination"
                    className="mb-2 block text-sm font-medium text-zinc-400"
                  >
                    Destination database
                  </label>

                  <select
                    id="notion-destination"
                    value={
                      selectedDataSourceId
                    }
                    onChange={(
                      event
                    ) => {
                      setSelectedDataSourceId(
                        event
                          .target
                          .value
                      );

                      setNotionDatabaseMessage(
                        ""
                      );

                      setNotionDatabaseError(
                        ""
                      );
                    }}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-white outline-none transition focus:border-zinc-500"
                  >
                    <option value="">
                      Choose a
                      database...
                    </option>

                    {notionDataSources.map(
                      (
                        source
                      ) => (
                        <option
                          key={
                            source.id
                          }
                          value={
                            source.id
                          }
                        >
                          {
                            source.name
                          }
                        </option>
                      )
                    )}
                  </select>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={
                        saveNotionDatabaseSelection
                      }
                      disabled={
                        !selectedDataSourceId ||
                        savingDatabase ||
                        !destinationChanged
                      }
                      className="rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingDatabase
                        ? "Saving..."
                        : destinationChanged
                          ? "Save Destination"
                          : "Destination Saved"}
                    </button>

                    <button
                      type="button"
                      onClick={
                        loadNotionDatabases
                      }
                      disabled={
                        loadingDatabases
                      }
                      className="rounded-xl border border-zinc-700 px-5 py-3 font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Refresh
                    </button>

                    <button
                      type="button"
                      onClick={connectNotion}
                      className="rounded-xl border border-zinc-700 px-5 py-3 font-medium text-zinc-300 transition hover:bg-zinc-800"
                    >
                      Reconnect Notion
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
                    No Notion
                    databases were
                    found. Give Voice
                    to Notion access
                    to a database and
                    reconnect.
                  </div>

                  <button
                    type="button"
                    onClick={connectNotion}
                    className="mt-4 inline-block rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200"
                  >
                    Connect Notion
                  </button>
                </div>
              )}

              {notionDatabaseError && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  {
                    notionDatabaseError
                  }
                </div>
              )}

              {notionDatabaseMessage && (
                <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-400">
                  {
                    notionDatabaseMessage
                  }
                </div>
              )}
            </div>
          )}
        </section>

        {/* RECORDING */}

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                Voice Recording
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Record once.
                Processing starts
                automatically when
                you stop.
              </p>
            </div>

            {isRecording && (
              <div className="flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-400" />

                {formatRecordingTime(
                  recordingSeconds
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {!isRecording ? (
              <button
                type="button"
                onClick={
                  startRecording
                }
                disabled={isBusy}
                className="rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start Recording
              </button>
            ) : (
              <button
                type="button"
                onClick={
                  stopRecording
                }
                className="rounded-xl bg-red-500 px-5 py-3 font-semibold text-white transition hover:bg-red-400"
              >
                Stop Recording
              </button>
            )}

            <span className="text-sm text-zinc-400">
              {isRecording
                ? "Recording..."
                : isBusy
                  ? "Processing..."
                  : "Microphone ready"}
            </span>
          </div>

          {processingMessage() && (
            <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-300">
              {
                processingMessage()
              }
            </div>
          )}

          {audioUrl && (
            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="mb-3 text-sm font-medium text-zinc-400">
                Recorded audio
              </p>

              <audio
                controls
                src={audioUrl}
                className="w-full"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={
                    retranscribeRecording
                  }
                  disabled={isBusy}
                  className="rounded-xl border border-zinc-700 px-5 py-3 font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Process Again
                </button>

                <button
                  type="button"
                  onClick={
                    resetCapture
                  }
                  disabled={isBusy}
                  className="rounded-xl border border-zinc-700 px-5 py-3 font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Record Again
                </button>
              </div>
            </div>
          )}
        </section>

        {/* TRANSCRIPT */}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <form
            onSubmit={
              handleSubmit
            }
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <label
                htmlFor="transcript"
                className="block text-sm font-medium text-zinc-300"
              >
                Transcript
              </label>

              {transcript && (
                <span className="text-xs text-zinc-600">
                  {
                    transcript.length
                  }{" "}
                  characters
                </span>
              )}
            </div>

            <textarea
              id="transcript"
              value={transcript}
              onChange={(
                event
              ) => {
                const value =
                  event.target
                    .value;

                setTranscript(
                  value
                );

                resetNotionState();

                if (
                  currentHistoryIdRef.current
                ) {
                  updateHistoryItem(
                    currentHistoryIdRef.current,
                    {
                      transcript:
                        value,
                    }
                  );
                }
              }}
              placeholder="Your transcript will appear here automatically..."
              rows={7}
              disabled={isBusy}
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-500 disabled:opacity-60"
            />

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={
                  isBusy ||
                  isRecording ||
                  !transcript.trim()
                }
                className="rounded-xl border border-zinc-700 px-5 py-3 font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Re-structure
                Transcript
              </button>

              {(transcript ||
                note ||
                audioUrl) && (
                <button
                  type="button"
                  onClick={
                    resetCapture
                  }
                  disabled={
                    isBusy ||
                    isRecording
                  }
                  className="rounded-xl border border-zinc-700 px-5 py-3 font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </section>

        {/* PREVIEW */}

        {note && (
          <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">
                  Preview
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Review and edit
                  anything before
                  sending it to
                  Notion.
                </p>
              </div>

              {note.mock && (
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                  Mock AI
                </span>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm text-zinc-500">
                  Title
                </label>

                <input
                  type="text"
                  value={
                    note.title
                  }
                  onChange={(
                    event
                  ) =>
                    updateNote({
                      title:
                        event
                          .target
                          .value,
                    })
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-white outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-500">
                  Summary
                </label>

                <textarea
                  value={
                    note.summary
                  }
                  onChange={(
                    event
                  ) =>
                    updateNote({
                      summary:
                        event
                          .target
                          .value,
                    })
                  }
                  rows={4}
                  className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-white outline-none focus:border-zinc-500"
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-500">
                    Category
                  </label>

                  <input
                    type="text"
                    value={
                      note.category
                    }
                    onChange={(
                      event
                    ) =>
                      updateNote({
                        category:
                          event
                            .target
                            .value,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-white outline-none focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-500">
                    Due Date
                  </label>

                  <input
                    type="date"
                    value={
                      note.dueDate ??
                      ""
                    }
                    onChange={(
                      event
                    ) =>
                      updateNote({
                        dueDate:
                          event
                            .target
                            .value ||
                          null,
                      })
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-white outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p className="text-sm text-zinc-500">
                    Action Items
                  </p>

                  <button
                    type="button"
                    onClick={
                      addActionItem
                    }
                    className="text-sm font-medium text-zinc-300 hover:text-white"
                  >
                    + Add task
                  </button>
                </div>

                <div className="space-y-3">
                  {note.actionItems.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          index
                        }
                        className="flex gap-3"
                      >
                        <input
                          type="text"
                          value={
                            item
                          }
                          onChange={(
                            event
                          ) =>
                            updateActionItem(
                              index,
                              event
                                .target
                                .value
                            )
                          }
                          className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-zinc-300 outline-none focus:border-zinc-500"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            removeActionItem(
                              index
                            )
                          }
                          className="rounded-xl border border-zinc-700 px-4 text-zinc-500 transition hover:border-red-500/50 hover:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  )}

                  {note
                    .actionItems
                    .length ===
                    0 && (
                    <p className="text-sm text-zinc-500">
                      No action
                      items.
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-6">
                {!savedDataSourceId && (
                  <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">
                    Choose and save
                    a Notion
                    destination
                    before saving
                    this note.
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={
                      saveToNotion
                    }
                    disabled={
                      processingStep ===
                        "saving" ||
                      notionSaved ||
                      !note.title.trim() ||
                      !savedDataSourceId
                    }
                    className="rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processingStep ===
                    "saving"
                      ? "Saving..."
                      : notionSaved
                        ? "Saved to Notion"
                        : "Save to Notion"}
                  </button>

                  {notionSaved &&
                    notionPageUrl && (
                      <a
                        href={
                          notionPageUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-zinc-700 px-5 py-3 font-medium text-zinc-300 transition hover:bg-zinc-800"
                      >
                        Open in
                        Notion
                      </a>
                    )}
                </div>

                {notionSaved && (
                  <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-400">
                    Note saved
                    successfully to
                    Notion.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* HISTORY */}

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                Recent Captures
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Your last{" "}
                {
                  MAX_HISTORY_ITEMS
                }{" "}
                captures are
                stored locally in
                this browser.
              </p>
            </div>

            {history.length >
              0 && (
              <button
                type="button"
                onClick={
                  clearHistory
                }
                className="text-sm font-medium text-zinc-500 transition hover:text-red-400"
              >
                Clear history
              </button>
            )}
          </div>

          {history.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
              Your recent
              captures will
              appear here.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(
                (item) => (
                  <div
                    key={
                      item.id
                    }
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          loadHistoryItem(
                            item
                          )
                        }
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate font-medium text-white">
                          {
                            item
                              .note
                              .title
                          }
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          {formatHistoryDate(
                            item.createdAt
                          )}
                        </p>

                        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                          {
                            item
                              .note
                              .summary
                          }
                        </p>
                      </button>

                      <div className="flex items-center gap-3">
                        {item.savedToNotion && (
                          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                            Saved
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            deleteHistoryItem(
                              item.id
                            )
                          }
                          className="text-sm text-zinc-600 transition hover:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {item.notionUrl && (
                      <a
                        href={
                          item.notionUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-sm font-medium text-zinc-400 hover:text-white"
                      >
                        Open saved
                        Notion page
                      </a>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </section>
            </div>
    </main>
  </AuthGate>
);
}