"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import AuthGate from "@/components/AuthGate";
import ThemeToggle from "@/components/ThemeToggle";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Priority =
  | "Low"
  | "Medium"
  | "High";

type StructuredNote = {
  title: string;
  summary: string;
  actionItems: string[];
  category: string;
  priority: Priority;
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
  connected?: boolean;

  workspace?: {
    id: string;
    name: string | null;
  };

  selectedDataSourceId?:
    | string
    | null;

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

  const [
    accountEmail,
    setAccountEmail,
  ] = useState("");

  const [
    signingOut,
    setSigningOut,
  ] = useState(false);

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

  const destinationChanged =
    selectedDataSourceId !==
    savedDataSourceId;

  useEffect(() => {
    async function loadAccount() {
      const {
        data: { session },
      } =
        await supabaseBrowser.auth.getSession();

      setAccountEmail(
        session?.user.email ??
          ""
      );
    }

    loadAccount();
  }, []);

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

        const normalized =
          parsedHistory.map(
            (item) => ({
              ...item,

              note: {
                ...item.note,

                priority:
                  item.note
                    .priority ??
                  "Low",
              },
            })
          );

        setHistory(normalized);
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

  useEffect(() => {
    if (!historyLoaded) {
      return;
    }

    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(history)
    );
  }, [
    history,
    historyLoaded,
  ]);

  useEffect(() => {
    loadNotionDatabases();
  }, []);

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

  async function signOut() {
    try {
      setSigningOut(true);

      const {
        error: signOutError,
      } =
        await supabaseBrowser.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      window.location.replace(
        "/login"
      );
    } catch (err) {
      console.error(
        "SIGN OUT ERROR:",
        err
      );

      setSigningOut(false);
    }
  }

  async function loadNotionDatabases() {
    setLoadingDatabases(true);
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
          "/api/notion/databases",
          {
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
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

      const sources =
        data.dataSources ?? [];

      setNotionDataSources(
        sources
      );

      setNotionWorkspaceName(
        data.workspace?.name ??
          null
      );

      const stored =
        data.selectedDataSourceId ??
        "";

      const valid =
        sources.some(
          (source) =>
            source.id === stored
        )
          ? stored
          : "";

      setSelectedDataSourceId(
        valid
      );

      setSavedDataSourceId(
        valid
      );
    } catch (err) {
      setNotionDatabaseError(
        err instanceof Error
          ? err.message
          : "Could not load Notion databases."
      );
    } finally {
      setLoadingDatabases(false);
    }
  }

  async function connectNotion() {
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
          "/api/notion/oauth/start",
          {
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not connect Notion."
        );
      }

      window.location.href =
        data.authorizationUrl;
    } catch (err) {
      setNotionDatabaseError(
        err instanceof Error
          ? err.message
          : "Could not connect Notion."
      );
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

            body:
              JSON.stringify({
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
            "Could not save destination."
        );
      }

      setSavedDataSourceId(
        selectedDataSourceId
      );

      setNotionDatabaseMessage(
        "Destination synchronized."
      );
    } catch (err) {
      setNotionDatabaseError(
        err instanceof Error
          ? err.message
          : "Could not save destination."
      );
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
    const item: CaptureHistoryItem =
      {
        id:
          crypto.randomUUID(),

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
      (current) =>
        [
          item,
          ...current,
        ].slice(
          0,
          MAX_HISTORY_ITEMS
        )
    );

    return item.id;
  }

  function updateHistoryItem(
    id: string,
    changes: Partial<CaptureHistoryItem>
  ) {
    setHistory(
      (current) =>
        current.map(
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

      const recorder =
        new MediaRecorder(
          stream
        );

      mediaRecorderRef.current =
        recorder;

      audioChunksRef.current =
        [];

      recorder.ondataavailable =
        (event) => {
          if (
            event.data.size > 0
          ) {
            audioChunksRef.current.push(
              event.data
            );
          }
        };

      recorder.onstop =
        async () => {
          try {
            const blob =
              new Blob(
                audioChunksRef.current,
                {
                  type:
                    recorder.mimeType ||
                    "audio/webm",
                }
              );

            const url =
              URL.createObjectURL(
                blob
              );

            setAudioBlob(blob);
            setAudioUrl(url);

            stream
              .getTracks()
              .forEach(
                (track) =>
                  track.stop()
              );

            await processRecording(
              blob
            );
          } catch (err) {
            setProcessingStep(
              "idle"
            );

            setError(
              err instanceof Error
                ? err.message
                : "Could not process recording."
            );
          }
        };

      recorder.start();

      setIsRecording(true);

      setProcessingStep(
        "recording"
      );

      recordingTimerRef.current =
        setInterval(
          () => {
            setRecordingSeconds(
              (previous) =>
                previous + 1
            );
          },
          1000
        );
    } catch {
      setProcessingStep(
        "idle"
      );

      setError(
        "Could not access the microphone."
      );
    }
  }

  function stopRecording() {
    const recorder =
      mediaRecorderRef.current;

    if (
      !recorder ||
      recorder.state ===
        "inactive"
    ) {
      return;
    }

    recorder.stop();

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

  async function transcribeBlob(
    blob: Blob
  ) {
    setProcessingStep(
      "transcribing"
    );

    const formData =
      new FormData();

    const extension =
      blob.type.includes("ogg")
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
          body: formData,
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

    return data.transcript as string;
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
            JSON.stringify({
              transcript: text,
            }),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Could not structure note."
      );
    }

    return {
      ...data,

      priority:
        data.priority ??
        "Low",
    };
  }

  async function processRecording(
    blob: Blob
  ) {
    try {
      const newTranscript =
        await transcribeBlob(blob);

      setTranscript(
        newTranscript
      );

      const structured =
        await structureText(
          newTranscript
        );

      setNote(structured);

      setProcessingStep(
        "ready"
      );

      currentHistoryIdRef.current =
        createHistoryItem(
          structured,
          newTranscript
        );
    } catch (err) {
      setProcessingStep(
        "idle"
      );

      setError(
        err instanceof Error
          ? err.message
          : "Processing failed."
      );
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!transcript.trim()) {
      return;
    }

    try {
      setError("");

      const structured =
        await structureText(
          transcript.trim()
        );

      setNote(structured);

      setProcessingStep(
        "ready"
      );

      currentHistoryIdRef.current =
        createHistoryItem(
          structured,
          transcript.trim()
        );
    } catch (err) {
      setProcessingStep(
        "idle"
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not structure note."
      );
    }
  }

  async function retranscribeRecording() {
    if (!audioBlob) {
      return;
    }

    await processRecording(
      audioBlob
    );
  }

  async function saveToNotion() {
    if (
      !note ||
      !savedDataSourceId
    ) {
      return;
    }

    setProcessingStep(
      "saving"
    );

    setError("");

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
              JSON.stringify({
                title: note.title,

                summary:
                  note.summary,

                actionItems:
                  note.actionItems,

                category:
                  note.category,

                priority:
                  note.priority,

                dueDate:
                  note.dueDate,

                transcript,
              }),
          }
        );

      const data =
        (await response.json()) as NotionSaveResponse;

      if (!response.ok) {
        throw new Error(
          data.details ||
            data.error ||
            "Notion save failed."
        );
      }

      setNotionSaved(true);

      setNotionPageUrl(
        data.url ?? null
      );

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
    } catch (err) {
      setProcessingStep(
        "ready"
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not save to Notion."
      );
    }
  }

  function updateNote(
    changes: Partial<StructuredNote>
  ) {
    setNote(
      (current) => {
        if (!current) {
          return null;
        }

        const updated = {
          ...current,
          ...changes,
        };

        if (
          currentHistoryIdRef.current
        ) {
          updateHistoryItem(
            currentHistoryIdRef.current,
            {
              note: updated,
            }
          );
        }

        return updated;
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

    const items =
      [...note.actionItems];

    items[index] = value;

    updateNote({
      actionItems: items,
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
          (_, itemIndex) =>
            itemIndex !== index
        ),
    });
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

  function loadHistoryItem(
    item: CaptureHistoryItem
  ) {
    setTranscript(
      item.transcript
    );

    setNote({
      ...item.note,

      priority:
        item.note.priority ??
        "Low",
    });

    setNotionSaved(
      item.savedToNotion
    );

    setNotionPageUrl(
      item.notionUrl
    );

    currentHistoryIdRef.current =
      item.id;

    setProcessingStep(
      "ready"
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function formatRecordingTime(
    seconds: number
  ) {
    const minutes =
      Math.floor(
        seconds / 60
      );

    const remaining =
      seconds % 60;

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

  function systemLabel() {
    if (isRecording) {
      return "Listening";
    }

    if (
      processingStep ===
      "transcribing"
    ) {
      return "Transcribing";
    }

    if (
      processingStep ===
      "structuring"
    ) {
      return "AI Structuring";
    }

    if (
      processingStep ===
      "saving"
    ) {
      return "Syncing";
    }

    if (
      processingStep ===
      "ready"
    ) {
      return "Note Ready";
    }

    return "System Ready";
  }

  return (
    <AuthGate>
      <main className="vtn-shell">
        <div className="vtn-orb vtn-orb-purple" />
        <div className="vtn-orb vtn-orb-cyan" />

        <div className="vtn-container pb-20 pt-5">
          <header className="sticky top-4 z-50 mb-8">
            <div className="vtn-glass flex items-center justify-between gap-4 rounded-[22px] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 font-black text-white">
                  V
                </div>

                <div>
                  <p className="text-sm font-bold text-[var(--foreground)]">
                    Voice to Notion
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="vtn-status-dot" />

                    <span className="text-[10px] uppercase tracking-[0.13em] text-[var(--muted)]">
                      {systemLabel()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {savedDataSourceId && (
                  <div className="vtn-badge hidden md:flex">
                    <span className="vtn-status-dot" />
                    Notion synced
                  </div>
                )}

                <ThemeToggle />

                <span className="hidden max-w-[180px] truncate text-xs text-[var(--muted)] lg:block">
                  {accountEmail}
                </span>

                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  className="vtn-secondary px-3 py-2 text-xs"
                >
                  {signingOut
                    ? "..."
                    : "Log out"}
                </button>
              </div>
            </div>
          </header>

          <section className="mb-8">
            <div className="vtn-eyebrow mb-3">
              <span className="vtn-eyebrow-dot" />
              Neural capture workspace
            </div>

            <h1 className="vtn-gradient-text max-w-3xl text-3xl font-bold tracking-[-0.04em] sm:text-5xl">
              Capture thoughts at the speed of speech.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Speak once. AI structures your thought and sends it directly into Notion.
            </p>
          </section>

          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-6">
              <section
                className={`vtn-card p-6 ${
                  isRecording
                    ? "vtn-recording"
                    : ""
                }`}
              >
                <div className="relative z-10">
                  <div className="flex justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                        Voice Core
                      </span>

                      <h2 className="mt-2 text-xl font-semibold">
                        Capture
                      </h2>
                    </div>

                    <div className="vtn-badge font-mono">
                      {formatRecordingTime(
                        recordingSeconds
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center py-8 text-center">
                    <button
                      type="button"
                      onClick={
                        isRecording
                          ? stopRecording
                          : startRecording
                      }
                      disabled={
                        isBusy &&
                        !isRecording
                      }
                      className="rounded-full"
                    >
                      <div className="vtn-record-orb">
                        <div className="vtn-record-core flex items-center justify-center text-white">
                          {isRecording
                            ? "■"
                            : "🎙"}
                        </div>
                      </div>
                    </button>

                    <p className="mt-5 font-semibold">
                      {isRecording
                        ? "Listening"
                        : isBusy
                          ? systemLabel()
                          : "Tap to speak"}
                    </p>

                    <div
                      className={`vtn-waveform mt-5 ${
                        isRecording
                          ? "is-active"
                          : ""
                      }`}
                    >
                      {Array.from({
                        length: 13,
                      }).map(
                        (_, index) => (
                          <span
                            key={
                              index
                            }
                          />
                        )
                      )}
                    </div>
                  </div>

                  {audioUrl && (
                    <>
                      <audio
                        controls
                        src={audioUrl}
                        className="w-full"
                      />

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          onClick={
                            retranscribeRecording
                          }
                          className="vtn-secondary py-2 text-xs"
                        >
                          Process Again
                        </button>

                        <button
                          onClick={
                            resetCapture
                          }
                          className="vtn-secondary py-2 text-xs"
                        >
                          New Capture
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </section>

              <section className="vtn-card p-5">
                <div className="relative z-10">
                  <div className="mb-4 flex justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                        Destination
                      </span>

                      <h2 className="mt-2 text-lg font-semibold">
                        Notion Sync
                      </h2>
                    </div>

                    {savedDataSourceId && (
                      <span className="vtn-success rounded-full px-2.5 py-1 text-[10px]">
                        Live
                      </span>
                    )}
                  </div>

                  {loadingDatabases ? (
                    <p className="text-xs text-[var(--muted)]">
                      Loading workspace...
                    </p>
                  ) : (
                    <>
                      {notionWorkspaceName && (
                        <div className="mb-3 rounded-xl border border-[var(--border)] p-3">
                          <p className="text-[9px] uppercase text-[var(--muted)]">
                            Workspace
                          </p>

                          <p className="mt-1 text-xs font-semibold">
                            {notionWorkspaceName}
                          </p>
                        </div>
                      )}

                      <select
                        value={
                          selectedDataSourceId
                        }
                        onChange={(
                          event
                        ) => {
                          setSelectedDataSourceId(
                            event.target.value
                          );

                          setNotionDatabaseMessage(
                            ""
                          );
                        }}
                        className="vtn-input p-3 text-xs"
                      >
                        <option value="">
                          Select database...
                        </option>

                        {notionDataSources.map(
                          (source) => (
                            <option
                              key={
                                source.id
                              }
                              value={
                                source.id
                              }
                            >
                              {source.name}
                            </option>
                          )
                        )}
                      </select>

                      <button
                        onClick={
                          saveNotionDatabaseSelection
                        }
                        disabled={
                          !selectedDataSourceId ||
                          savingDatabase ||
                          !destinationChanged
                        }
                        className="vtn-primary mt-3 w-full py-2.5 text-xs"
                      >
                        {savingDatabase
                          ? "Saving..."
                          : destinationChanged
                            ? "Sync Destination"
                            : "Destination Synced"}
                      </button>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          onClick={
                            loadNotionDatabases
                          }
                          className="vtn-secondary py-2 text-xs"
                        >
                          Refresh
                        </button>

                        <button
                          onClick={
                            connectNotion
                          }
                          className="vtn-secondary py-2 text-xs"
                        >
                          Reconnect
                        </button>
                      </div>

                      {notionDatabaseError && (
                        <div className="vtn-error mt-3 rounded-xl p-3 text-xs">
                          {notionDatabaseError}
                        </div>
                      )}

                      {notionDatabaseMessage && (
                        <div className="vtn-success mt-3 rounded-xl p-3 text-xs">
                          {notionDatabaseMessage}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            </aside>

            <section className="vtn-card p-6">
              <div className="relative z-10">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  Live Workspace
                </span>

                <h2 className="mt-2 text-2xl font-semibold">
                  Thought processing
                </h2>

                <form
                  onSubmit={handleSubmit}
                  className="mt-6"
                >
                  <label className="mb-2 block text-[10px] uppercase text-[var(--muted)]">
                    Live Transcript
                  </label>

                  <textarea
                    value={transcript}
                    onChange={(
                      event
                    ) => {
                      setTranscript(
                        event.target.value
                      );

                      resetNotionState();
                    }}
                    rows={7}
                    placeholder="Your voice will appear here..."
                    className="vtn-input min-h-[170px] p-4 text-sm leading-7"
                  />

                  <div className="mt-3 flex gap-2">
                    <button
                      type="submit"
                      disabled={
                        isBusy ||
                        !transcript.trim()
                      }
                      className="vtn-secondary px-4 py-2.5 text-xs"
                    >
                      ✦ Re-structure with AI
                    </button>

                    <button
                      type="button"
                      onClick={
                        resetCapture
                      }
                      className="vtn-secondary px-4 py-2.5 text-xs"
                    >
                      Clear
                    </button>
                  </div>
                </form>

                {error && (
                  <div className="vtn-error mt-4 rounded-xl p-3 text-xs">
                    {error}
                  </div>
                )}

                <div className="my-6 h-px bg-[var(--border)]" />

                {!note ? (
                  <div className="vtn-empty-ai">
                    <div className="vtn-empty-ai-icon">
                      ✦
                    </div>

                    <p className="mt-4 font-semibold">
                      Waiting for a thought
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="vtn-eyebrow">
                      <span className="vtn-eyebrow-dot" />
                      AI structured
                    </div>

                    <div>
                      <label className="mb-2 block text-[9px] uppercase text-[var(--muted)]">
                        Title
                      </label>

                      <input
                        value={note.title}
                        onChange={(
                          event
                        ) =>
                          updateNote({
                            title:
                              event.target.value,
                          })
                        }
                        className="vtn-input p-3.5"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[9px] uppercase text-[var(--muted)]">
                        Summary
                      </label>

                      <textarea
                        value={note.summary}
                        onChange={(
                          event
                        ) =>
                          updateNote({
                            summary:
                              event.target.value,
                          })
                        }
                        rows={3}
                        className="vtn-input p-3.5"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-[9px] uppercase text-[var(--muted)]">
                          Category
                        </label>

                        <input
                          value={
                            note.category
                          }
                          onChange={(
                            event
                          ) =>
                            updateNote({
                              category:
                                event.target.value,
                            })
                          }
                          className="vtn-input p-3.5"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-[9px] uppercase text-[var(--muted)]">
                          Priority
                        </label>

                        <select
                          value={
                            note.priority
                          }
                          onChange={(
                            event
                          ) =>
                            updateNote({
                              priority:
                                event.target.value as Priority,
                            })
                          }
                          className="vtn-input p-3.5"
                        >
                          <option value="Low">
                            Low
                          </option>

                          <option value="Medium">
                            Medium
                          </option>

                          <option value="High">
                            High
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-[9px] uppercase text-[var(--muted)]">
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
                                event.target.value ||
                                null,
                            })
                          }
                          className="vtn-input p-3.5"
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] p-4">
                      <div className="mb-3 flex justify-between">
                        <div>
                          <p className="text-xs font-semibold">
                            Action Items
                          </p>

                          <p className="text-[10px] text-[var(--muted)]">
                            AI extracted tasks
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={
                            addActionItem
                          }
                          className="vtn-secondary px-3 py-2 text-[10px]"
                        >
                          + Add
                        </button>
                      </div>

                      <div className="space-y-2">
                        {note.actionItems.map(
                          (
                            item,
                            index
                          ) => (
                            <div
                              key={
                                index
                              }
                              className="flex gap-2"
                            >
                              <input
                                value={
                                  item
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateActionItem(
                                    index,
                                    event.target.value
                                  )
                                }
                                className="vtn-input flex-1 p-3 text-xs"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  removeActionItem(
                                    index
                                  )
                                }
                                className="vtn-secondary px-3"
                              >
                                ×
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        saveToNotion
                      }
                      disabled={
                        processingStep ===
                          "saving" ||
                        notionSaved ||
                        !savedDataSourceId
                      }
                      className="vtn-primary w-full py-3"
                    >
                      {processingStep ===
                      "saving"
                        ? "Syncing..."
                        : notionSaved
                          ? "Synced ✓"
                          : "Send to Notion"}
                    </button>

                    {notionPageUrl && (
                      <a
                        href={
                          notionPageUrl
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="vtn-secondary block px-5 py-3 text-center text-xs"
                      >
                        Open in Notion ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="vtn-card mt-6 p-6">
            <div className="relative z-10">
              <div className="mb-5 flex justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    Memory Vault
                  </span>

                  <h2 className="mt-2 text-xl font-semibold">
                    Recent Captures
                  </h2>
                </div>

                {history.length > 0 && (
                  <button
                    onClick={() =>
                      setHistory([])
                    }
                    className="vtn-secondary px-3 py-2 text-xs"
                  >
                    Clear history
                  </button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {history.map(
                  (item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        loadHistoryItem(
                          item
                        )
                      }
                      className="rounded-2xl border border-[var(--border)] p-4 text-left"
                    >
                      <p className="font-semibold">
                        {item.note.title}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="vtn-badge">
                          {item.note.category}
                        </span>

                        <span className="vtn-badge">
                          {item.note.priority ??
                            "Low"}
                        </span>

                        {item.savedToNotion && (
                          <span className="vtn-success rounded-full px-2 py-1 text-[10px]">
                            Synced
                          </span>
                        )}
                      </div>

                      <p className="mt-3 line-clamp-2 text-xs text-[var(--muted)]">
                        {item.note.summary}
                      </p>
                    </button>
                  )
                )}

                {history.length === 0 && (
                  <p className="text-sm text-[var(--muted)]">
                    No captures yet.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </AuthGate>
  );
}