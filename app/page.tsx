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

type MobileWorkspaceTab =
  | "transcript"
  | "note";

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

type UsageSummary = {
  periodStart: string;
  periodEnd: string;

  aiCaptures: number;
  transcriptions: number;
  notionSaves: number;
  transcriptionSeconds: number;

  aiCaptureLimit: number;
  aiCapturesRemaining: number;

  percentageUsed: number;
};

type UsageResponse = {
  success: boolean;
  plan?: string;
  usage?: UsageSummary;
  error?: string;
};

const HISTORY_STORAGE_KEY =
  "voice-to-notion-history";

const MAX_HISTORY_ITEMS =
  10;

export default function Home() {
  const [
    transcript,
    setTranscript,
  ] = useState("");

  const [
    note,
    setNote,
  ] =
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

  const [
    mobileWorkspaceTab,
    setMobileWorkspaceTab,
  ] =
    useState<MobileWorkspaceTab>(
      "transcript"
    );

  const [
    error,
    setError,
  ] = useState("");

  const [
    isRecording,
    setIsRecording,
  ] =
    useState(false);

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
  ] =
    useState(0);

  const [
    notionSaved,
    setNotionSaved,
  ] =
    useState(false);

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
  ] =
    useState(false);

  const [
    accountEmail,
    setAccountEmail,
  ] =
    useState("");

  const [
    signingOut,
    setSigningOut,
  ] =
    useState(false);

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
  ] =
    useState("");

  const [
    savedDataSourceId,
    setSavedDataSourceId,
  ] =
    useState("");

  const [
    loadingDatabases,
    setLoadingDatabases,
  ] =
    useState(true);

  const [
    savingDatabase,
    setSavingDatabase,
  ] =
    useState(false);

  const [
    notionDatabaseError,
    setNotionDatabaseError,
  ] =
    useState("");

  const [
    notionDatabaseMessage,
    setNotionDatabaseMessage,
  ] =
    useState("");

  const [
    usage,
    setUsage,
  ] =
    useState<UsageSummary | null>(
      null
    );

  const [
    usagePlan,
    setUsagePlan,
  ] =
    useState("free");

  const [
    usageLoading,
    setUsageLoading,
  ] =
    useState(true);

  const [
    usageError,
    setUsageError,
  ] =
    useState("");

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

  /* =========================================================
     INITIAL ACCOUNT
     ========================================================= */

  useEffect(() => {
    async function loadAccount() {
      const {
        data: {
          session,
        },
      } =
        await supabaseBrowser.auth.getSession();

      setAccountEmail(
        session?.user.email ??
          ""
      );
    }

    loadAccount();
  }, []);

  /* =========================================================
     HISTORY
     ========================================================= */

  useEffect(() => {
    try {
      const storedHistory =
        localStorage.getItem(
          HISTORY_STORAGE_KEY
        );

      if (
        storedHistory
      ) {
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

        setHistory(
          normalized
        );
      }
    } catch (err) {
      console.error(
        "HISTORY LOAD ERROR:",
        err
      );
    } finally {
      setHistoryLoaded(
        true
      );
    }
  }, []);

  useEffect(() => {
    if (
      !historyLoaded
    ) {
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

  /* =========================================================
     INITIAL DATA
     ========================================================= */

  useEffect(() => {
    loadNotionDatabases();
    loadUsage();
  }, []);

  /* =========================================================
     CLEANUP
     ========================================================= */

  useEffect(() => {
    return () => {
      if (
        audioUrl
      ) {
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

  /* =========================================================
     AUTH HELPERS
     ========================================================= */

  async function getAccessToken() {
    const {
      data: {
        session,
      },
    } =
      await supabaseBrowser.auth.getSession();

    if (
      !session
    ) {
      window.location.href =
        "/login";

      throw new Error(
        "Authentication required."
      );
    }

    return session.access_token;
  }

  async function signOut() {
    try {
      setSigningOut(
        true
      );

      const {
        error:
          signOutError,
      } =
        await supabaseBrowser.auth.signOut();

      if (
        signOutError
      ) {
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

      setSigningOut(
        false
      );
    }
  }

  /* =========================================================
     USAGE
     ========================================================= */

  async function loadUsage(
    silent = false
  ) {
    if (
      !silent
    ) {
      setUsageLoading(
        true
      );
    }

    setUsageError(
      ""
    );

    try {
      const accessToken =
        await getAccessToken();

      const response =
        await fetch(
          "/api/usage",
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },

            cache:
              "no-store",
          }
        );

      const data =
        (await response.json()) as UsageResponse;

      if (
        response.status ===
        401
      ) {
        window.location.href =
          "/login";

        return;
      }

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

      setUsage(
        data.usage
      );

      setUsagePlan(
        data.plan ||
          "free"
      );
    } catch (err) {
      console.error(
        "USAGE LOAD ERROR:",
        err
      );

      setUsageError(
        err instanceof Error
          ? err.message
          : "Could not load usage."
      );
    } finally {
      if (
        !silent
      ) {
        setUsageLoading(
          false
        );
      }
    }
  }

  /* =========================================================
     NOTION
     ========================================================= */

  async function loadNotionDatabases() {
    setLoadingDatabases(
      true
    );

    setNotionDatabaseError(
      ""
    );

    setNotionDatabaseMessage(
      ""
    );

    try {
      const accessToken =
        await getAccessToken();

      const response =
        await fetch(
          "/api/notion/databases",
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          }
        );

      const data =
        (await response.json()) as NotionDatabasesResponse;

      if (
        response.status ===
        401
      ) {
        window.location.href =
          "/login";

        return;
      }

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Could not load Notion databases."
        );
      }

      const sources =
        data.dataSources ??
        [];

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
            source.id ===
            stored
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
      console.error(
        "LOAD NOTION DATABASES ERROR:",
        err
      );

      setNotionDatabaseError(
        err instanceof Error
          ? err.message
          : "Could not load Notion databases."
      );
    } finally {
      setLoadingDatabases(
        false
      );
    }
  }

  async function connectNotion() {
    try {
      setNotionDatabaseError(
        ""
      );

      setNotionDatabaseMessage(
        ""
      );

      const accessToken =
        await getAccessToken();

      const response =
        await fetch(
          "/api/notion/oauth/start",
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          }
        );

      const data =
        await response.json();

      if (
        response.status ===
        401
      ) {
        window.location.href =
          "/login";

        return;
      }

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Could not connect Notion."
        );
      }

      if (
        !data.authorizationUrl
      ) {
        throw new Error(
          "No Notion authorization URL was returned."
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
    if (
      !selectedDataSourceId
    ) {
      setNotionDatabaseError(
        "Choose a Notion database first."
      );

      return;
    }

    setSavingDatabase(
      true
    );

    setNotionDatabaseError(
      ""
    );

    setNotionDatabaseMessage(
      ""
    );

    try {
      const accessToken =
        await getAccessToken();

      const response =
        await fetch(
          "/api/notion/database/select",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${accessToken}`,
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

      if (
        response.status ===
        401
      ) {
        window.location.href =
          "/login";

        return;
      }

      if (
        !response.ok
      ) {
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
      setSavingDatabase(
        false
      );
    }
  }

  function resetNotionState() {
    setNotionSaved(
      false
    );

    setNotionPageUrl(
      null
    );
  }

  /* =========================================================
     HISTORY
     ========================================================= */

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

  /* =========================================================
     RECORDING
     ========================================================= */

  async function startRecording() {
    try {
      setError(
        ""
      );

      await getAccessToken();

      setNote(
        null
      );

      setTranscript(
        ""
      );

      setMobileWorkspaceTab(
        "transcript"
      );

      resetNotionState();

      currentHistoryIdRef.current =
        null;

      if (
        audioUrl
      ) {
        URL.revokeObjectURL(
          audioUrl
        );

        setAudioUrl(
          null
        );
      }

      setAudioBlob(
        null
      );

      setRecordingSeconds(
        0
      );

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio:
              true,
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
            event.data.size >
            0
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

            setAudioBlob(
              blob
            );

            setAudioUrl(
              url
            );

            stream
              .getTracks()
              .forEach(
                (track) =>
                  track.stop()
              );

            await processRecording(
              blob,
              recordingSeconds
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

      setIsRecording(
        true
      );

      setProcessingStep(
        "recording"
      );

      recordingTimerRef.current =
        setInterval(
          () => {
            setRecordingSeconds(
              (previous) =>
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

      if (
        err instanceof Error &&
        err.message ===
          "Authentication required."
      ) {
        return;
      }

      setError(
        "Could not access the microphone. Check your browser microphone permission."
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

    setIsRecording(
      false
    );

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

  /* =========================================================
     TRANSCRIPTION
     ========================================================= */

  async function transcribeBlob(
    blob: Blob,
    durationSeconds: number
  ) {
    setProcessingStep(
      "transcribing"
    );

    const accessToken =
      await getAccessToken();

    const formData =
      new FormData();

    const extension =
      blob.type.includes(
        "ogg"
      )
        ? "ogg"
        : blob.type.includes(
              "mp4"
            )
          ? "mp4"
          : "webm";

    formData.append(
      "audio",
      blob,
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
      await fetch(
        "/api/transcribe",
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },

          body:
            formData,
        }
      );

    const data =
      await response.json();

    if (
      response.status ===
      401
    ) {
      window.location.href =
        "/login";

      throw new Error(
        "Your session expired. Please log in again."
      );
    }

    if (
      !response.ok
    ) {
      throw new Error(
        data.error ||
          "Transcription failed."
      );
    }

    return data.transcript as string;
  }

  /* =========================================================
     STRUCTURE NOTE
     ========================================================= */

  async function structureText(
    text: string
  ): Promise<StructuredNote> {
    setProcessingStep(
      "structuring"
    );

    const accessToken =
      await getAccessToken();

    const response =
      await fetch(
        "/api/structure-note",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${accessToken}`,
          },

          body:
            JSON.stringify({
              transcript:
                text,
            }),
        }
      );

    const data =
      await response.json();

    if (
      response.status ===
      401
    ) {
      window.location.href =
        "/login";

      throw new Error(
        "Your session expired. Please log in again."
      );
    }

    if (
      !response.ok
    ) {
      throw new Error(
        data.error ||
          "Could not structure note."
      );
    }

    const structuredNote: StructuredNote =
      {
        ...data,

        priority:
          data.priority ??
          "Low",
      };

    await loadUsage(
      true
    );

    return structuredNote;
  }

  async function processRecording(
    blob: Blob,
    durationSeconds =
      recordingSeconds
  ) {
    try {
      const newTranscript =
        await transcribeBlob(
          blob,
          durationSeconds
        );

      setTranscript(
        newTranscript
      );

      const structured =
        await structureText(
          newTranscript
        );

      setNote(
        structured
      );

      setProcessingStep(
        "ready"
      );

      setMobileWorkspaceTab(
        "note"
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

    if (
      !transcript.trim()
    ) {
      return;
    }

    try {
      setError(
        ""
      );

      const structured =
        await structureText(
          transcript.trim()
        );

      setNote(
        structured
      );

      setProcessingStep(
        "ready"
      );

      setMobileWorkspaceTab(
        "note"
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
    if (
      !audioBlob
    ) {
      return;
    }

    await processRecording(
      audioBlob,
      recordingSeconds
    );
  }

  /* =========================================================
     SAVE TO NOTION
     ========================================================= */

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

    setError(
      ""
    );

    try {
      const accessToken =
        await getAccessToken();

      const response =
        await fetch(
          "/api/notion/save",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${accessToken}`,
            },

            body:
              JSON.stringify({
                title:
                  note.title,

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

      if (
        response.status ===
        401
      ) {
        window.location.href =
          "/login";

        return;
      }

      if (
        !response.ok
      ) {
        throw new Error(
          data.details ||
            data.error ||
            "Notion save failed."
        );
      }

      setNotionSaved(
        true
      );

      setNotionPageUrl(
        data.url ??
          null
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

  /* =========================================================
     NOTE EDITING
     ========================================================= */

  function updateNote(
    changes: Partial<StructuredNote>
  ) {
    setNote(
      (current) => {
        if (
          !current
        ) {
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
              note:
                updated,
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
    if (
      !note
    ) {
      return;
    }

    const items = [
      ...note.actionItems,
    ];

    items[index] =
      value;

    updateNote({
      actionItems:
        items,
    });
  }

  function addActionItem() {
    if (
      !note
    ) {
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
    if (
      !note
    ) {
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

  /* =========================================================
     RESET
     ========================================================= */

  function resetCapture() {
    if (
      audioUrl
    ) {
      URL.revokeObjectURL(
        audioUrl
      );
    }

    setAudioUrl(
      null
    );

    setAudioBlob(
      null
    );

    setTranscript(
      ""
    );

    setNote(
      null
    );

    setError(
      ""
    );

    setRecordingSeconds(
      0
    );

    setProcessingStep(
      "idle"
    );

    setMobileWorkspaceTab(
      "transcript"
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

    setMobileWorkspaceTab(
      "note"
    );

    window.scrollTo({
      top:
        0,

      behavior:
        "smooth",
    });
  }

  /* =========================================================
     HELPERS
     ========================================================= */

  function formatRecordingTime(
    seconds: number
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

  function formatUsageResetDate(
    periodEnd: string
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

  function systemLabel() {
    if (
      isRecording
    ) {
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
      return notionSaved
        ? "Synced"
        : "Note Ready";
    }

    return "System Ready";
  }

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <AuthGate>
      <main className="vtn-shell vtn-mobile-shell">

        <div className="vtn-orb vtn-orb-purple" />
        <div className="vtn-orb vtn-orb-cyan" />

        <div className="vtn-container pb-28 pt-4 md:pb-20 md:pt-5">

          {/* =================================================
              HUD
          ================================================== */}

          <header className="vtn-mobile-hud sticky top-3 z-50 mb-6">

            <div className="vtn-glass flex items-center justify-between gap-3 rounded-[20px] px-3 py-3 sm:px-5">

              <div className="flex min-w-0 items-center gap-3">

                <div className="vtn-brand-mark">
                  V
                </div>

                <div className="min-w-0">

                  <p className="truncate text-sm font-bold">
                    Voice to Notion
                  </p>

                  <div className="mt-1 flex items-center gap-2">

                    <span className="vtn-status-dot" />

                    <span className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      {systemLabel()}
                    </span>

                  </div>

                </div>

              </div>

              <div className="flex shrink-0 items-center gap-2">

                <ThemeToggle />

                <button
                  type="button"
                  onClick={
                    signOut
                  }
                  disabled={
                    signingOut
                  }
                  className="vtn-mobile-logout vtn-secondary"
                  aria-label="Log out"
                >
                  {signingOut
                    ? "..."
                    : "↗"}
                </button>

              </div>

            </div>

          </header>

          {/* =================================================
              MOBILE HERO
          ================================================== */}

          <section className="vtn-mobile-hero mb-5 text-center md:hidden">

            <div className="vtn-eyebrow mb-3">

              <span className="vtn-eyebrow-dot" />

              Voice → AI → Notion

            </div>

            <h1 className="vtn-gradient-text text-[2rem] font-bold leading-[1.05] tracking-[-0.05em]">
              Capture thoughts.
              <br />
              Turn them into action.
            </h1>

            <p className="mx-auto mt-3 max-w-[310px] text-xs leading-5 text-[var(--muted)]">
              Speak naturally. AI structures your thought and sends it directly to Notion.
            </p>

          </section>

          {/* =================================================
              DESKTOP HERO
          ================================================== */}

          <section className="mb-8 hidden md:block">

            <div className="vtn-eyebrow mb-3">

              <span className="vtn-eyebrow-dot" />

              Voice → AI → Notion

            </div>

            <h1 className="vtn-gradient-text max-w-3xl text-4xl font-bold tracking-[-0.045em] lg:text-5xl">
              Capture thoughts.
              <br />
              Turn them into action.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Speak naturally. Voice to Notion transcribes, structures and sends your thought directly into your Notion workspace.
            </p>

          </section>

          {/* =================================================
              LIVE USAGE
          ================================================== */}

          <section className="vtn-card mb-5 p-4 sm:p-5">

            <div className="relative z-10">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <span className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[var(--muted)]">
                    Monthly Usage
                  </span>

                  <div className="mt-1 flex items-center gap-2">

                    <h2 className="text-base font-semibold">
                      AI Captures
                    </h2>

                    <span className="vtn-badge px-2 py-1 text-[8px] uppercase">
                      {usagePlan}
                    </span>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    loadUsage()
                  }
                  disabled={
                    usageLoading
                  }
                  className="vtn-secondary flex min-h-9 min-w-9 items-center justify-center px-2 text-xs"
                  aria-label="Refresh usage"
                  title="Refresh usage"
                >
                  {usageLoading
                    ? "..."
                    : "↻"}
                </button>

              </div>

              {usageLoading ? (
                <div className="mt-4">

                  <div className="h-3 w-36 animate-pulse rounded-full bg-[var(--surface-soft)]" />

                  <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-[var(--surface-soft)]" />

                </div>
              ) : usageError ? (
                <div className="vtn-error mt-4 rounded-xl p-3 text-xs">
                  {usageError}
                </div>
              ) : usage ? (
                <>

                  <div className="mt-4 flex items-end justify-between gap-4">

                    <div>

                      <p className="text-2xl font-bold tracking-[-0.04em]">
                        {usage.aiCaptures}

                        <span className="ml-1 text-sm font-medium text-[var(--muted)]">
                          / {usage.aiCaptureLimit}
                        </span>
                      </p>

                      <p className="mt-1 text-[10px] text-[var(--muted)]">
                        {usage.aiCapturesRemaining} captures remaining
                      </p>

                    </div>

                    <div className="text-right">

                      <p className="text-xs font-semibold">
                        {usage.percentageUsed}%
                      </p>

                      <p className="mt-1 text-[9px] text-[var(--muted)]">
                        Resets {formatUsageResetDate(
                          usage.periodEnd
                        )}
                      </p>

                    </div>

                  </div>

                  <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-soft)]">

                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 transition-[width] duration-500"
                      style={{
                        width:
                          `${usage.percentageUsed}%`,
                      }}
                    />

                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">

                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">

                      <span className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Transcriptions
                      </span>

                      <p className="mt-1 text-sm font-bold">
                        {usage.transcriptions}
                      </p>

                    </div>

                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">

                      <span className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Voice Time
                      </span>

                      <p className="mt-1 text-sm font-bold">
                        {usage.transcriptionSeconds}s
                      </p>

                    </div>

                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">

                      <span className="text-[8px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                        Notion Saves
                      </span>

                      <p className="mt-1 text-sm font-bold">
                        {usage.notionSaves}
                      </p>

                    </div>

                  </div>

                </>
              ) : null}

            </div>

          </section>

          {/* =================================================
              MAIN GRID
          ================================================== */}

          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">

            <aside className="space-y-5">

              {/* =============================================
                  VOICE
              ============================================== */}

              <section
                className={`vtn-card vtn-mobile-voice-card p-5 sm:p-6 ${
                  isRecording
                    ? "vtn-recording"
                    : ""
                }`}
              >

                <div className="relative z-10">

                  <div className="flex items-center justify-between">

                    <div>

                      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                        Voice Core
                      </span>

                      <h2 className="mt-1 text-lg font-semibold md:text-xl">
                        Capture
                      </h2>

                    </div>

                    <div className="vtn-badge font-mono">
                      {formatRecordingTime(
                        recordingSeconds
                      )}
                    </div>

                  </div>

                  <div className="flex flex-col items-center py-6 sm:py-8">

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
                      aria-label={
                        isRecording
                          ? "Stop recording"
                          : "Start recording"
                      }
                    >

                      <div className="vtn-record-orb vtn-mobile-record-orb">

                        <div className="vtn-record-core vtn-mobile-record-core flex items-center justify-center text-white">

                          {isRecording ? (
                            <span className="h-5 w-5 rounded-[5px] bg-white" />
                          ) : (
                            <svg
                              width="31"
                              height="31"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden="true"
                            >
                              <rect
                                x="9"
                                y="3"
                                width="6"
                                height="11"
                                rx="3"
                                fill="currentColor"
                              />

                              <path
                                d="M6.5 11.5C6.5 14.54 8.96 17 12 17C15.04 17 17.5 14.54 17.5 11.5"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                              />

                              <path
                                d="M12 17V21"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                              />
                            </svg>
                          )}

                        </div>

                      </div>

                    </button>

                    <p className="mt-5 text-sm font-semibold">

                      {isRecording
                        ? "Listening..."
                        : isBusy
                          ? systemLabel()
                          : "Tap to speak"}

                    </p>

                    <p className="mt-2 text-center text-[11px] leading-5 text-[var(--muted)] md:hidden">

                      {isRecording
                        ? "Speak naturally, then tap again to stop."
                        : "Your voice becomes structured knowledge automatically."}

                    </p>

                    <div
                      className={`vtn-waveform mt-4 ${
                        isRecording
                          ? "is-active"
                          : ""
                      }`}
                    >

                      {Array.from({
                        length:
                          15,
                      }).map(
                        (
                          _,
                          index
                        ) => (
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
                    <div className="mt-2">

                      <audio
                        controls
                        src={
                          audioUrl
                        }
                        className="w-full"
                      />

                      <div className="mt-3 grid grid-cols-2 gap-2">

                        <button
                          type="button"
                          onClick={
                            retranscribeRecording
                          }
                          className="vtn-secondary min-h-11 px-3 text-xs"
                        >
                          Process Again
                        </button>

                        <button
                          type="button"
                          onClick={
                            resetCapture
                          }
                          className="vtn-secondary min-h-11 px-3 text-xs"
                        >
                          New Capture
                        </button>

                      </div>

                    </div>
                  )}

                </div>

              </section>

              {/* =============================================
                  NOTION DESTINATION
              ============================================== */}

              <section className="vtn-card vtn-mobile-destination p-4 sm:p-5">

                <div className="relative z-10">

                  <div className="flex items-center justify-between gap-3">

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--input-bg)] text-xs font-black">
                        N
                      </div>

                      <div className="min-w-0">

                        <span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                          Notion Destination
                        </span>

                        <h2 className="mt-0.5 truncate text-sm font-semibold">
                          {notionWorkspaceName ||
                            "Notion workspace"}
                        </h2>

                      </div>

                    </div>

                    {savedDataSourceId ? (
                      <span className="vtn-success shrink-0 rounded-full px-2.5 py-1 text-[9px] font-semibold">
                        ● LIVE
                      </span>
                    ) : (
                      <span className="vtn-badge shrink-0">
                        Setup
                      </span>
                    )}

                  </div>

                  {loadingDatabases ? (
                    <p className="mt-4 text-xs text-[var(--muted)]">
                      Loading destination...
                    </p>
                  ) : (
                    <>

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
                        className="vtn-input mt-4 min-h-12 px-3 text-xs"
                      >

                        <option value="">
                          Select database...
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
                              {source.name}
                            </option>
                          )
                        )}

                      </select>

                      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">

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
                          className="vtn-primary min-h-11 px-3 text-xs"
                        >
                          {savingDatabase
                            ? "Syncing..."
                            : destinationChanged
                              ? "Sync Destination"
                              : "Destination Synced"}
                        </button>

                        <button
                          type="button"
                          onClick={
                            loadNotionDatabases
                          }
                          className="vtn-secondary min-h-11 min-w-11 px-3"
                          aria-label="Refresh Notion databases"
                        >
                          ↻
                        </button>

                      </div>

                      <button
                        type="button"
                        onClick={
                          connectNotion
                        }
                        className="mt-2 w-full py-2 text-[10px] text-[var(--muted)] transition hover:text-[var(--foreground)]"
                      >
                        Reconnect Notion
                      </button>

                      {notionDatabaseError && (
                        <div
                          className="vtn-error mt-3 rounded-xl p-3 text-xs"
                          role="alert"
                        >
                          {notionDatabaseError}
                        </div>
                      )}

                      {notionDatabaseMessage && (
                        <div
                          className="vtn-success mt-3 rounded-xl p-3 text-xs"
                          role="status"
                        >
                          {notionDatabaseMessage}
                        </div>
                      )}

                    </>
                  )}

                </div>

              </section>

            </aside>

            {/* =================================================
                WORKSPACE
            ================================================== */}

            <section className="vtn-card vtn-mobile-workspace p-4 sm:p-6">

              <div className="relative z-10">

                <div className="hidden md:block">

                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Live Workspace
                  </span>

                  <h2 className="mt-2 text-2xl font-semibold">
                    Thought processing
                  </h2>

                </div>

                <div className="vtn-mobile-tabs md:hidden">

                  <button
                    type="button"
                    onClick={() =>
                      setMobileWorkspaceTab(
                        "transcript"
                      )
                    }
                    className={
                      mobileWorkspaceTab ===
                      "transcript"
                        ? "is-active"
                        : ""
                    }
                  >
                    Transcript
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setMobileWorkspaceTab(
                        "note"
                      )
                    }
                    className={
                      mobileWorkspaceTab ===
                      "note"
                        ? "is-active"
                        : ""
                    }
                  >
                    AI Note

                    {note && (
                      <span className="vtn-mobile-tab-dot" />
                    )}
                  </button>

                </div>

                <div
                  className={
                    mobileWorkspaceTab ===
                    "transcript"
                      ? "block"
                      : "hidden md:block"
                  }
                >

                  <form
                    onSubmit={
                      handleSubmit
                    }
                    className="mt-4 md:mt-6"
                  >

                    <div className="mb-2 flex items-center justify-between">

                      <label className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        Live Transcript
                      </label>

                      <span className="text-[9px] text-[var(--muted)]">
                        {transcript.length} chars
                      </span>

                    </div>

                    <textarea
                      value={
                        transcript
                      }
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
                      className="vtn-input vtn-mobile-transcript min-h-[150px] p-4 text-sm leading-6"
                    />

                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">

                      <button
                        type="submit"
                        disabled={
                          isBusy ||
                          !transcript.trim()
                        }
                        className="vtn-secondary min-h-11 px-4 text-xs"
                      >
                        ✦ Structure with AI
                      </button>

                      <button
                        type="button"
                        onClick={
                          resetCapture
                        }
                        className="vtn-secondary min-h-11 min-w-11 px-3 text-xs"
                        aria-label="Clear capture"
                      >
                        ×
                      </button>

                    </div>

                  </form>

                </div>

                {error && (
                  <div
                    className="vtn-error mt-4 rounded-xl p-3 text-xs"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                <div
                  className={`${
                    mobileWorkspaceTab ===
                    "note"
                      ? "block"
                      : "hidden md:block"
                  } ${
                    note
                      ? "md:mt-6"
                      : ""
                  }`}
                >

                  {!note ? (
                    <div className="vtn-empty-ai min-h-[230px]">

                      <div className="vtn-empty-ai-icon">
                        ✦
                      </div>

                      <p className="mt-4 text-sm font-semibold">
                        Waiting for a thought
                      </p>

                      <p className="mt-2 max-w-[250px] text-center text-[11px] leading-5 text-[var(--muted)]">
                        Tap to speak and your AI-structured note will appear here.
                      </p>

                    </div>
                  ) : (
                    <div className="space-y-4">

                      <div className="flex items-center justify-between">

                        <div className="vtn-eyebrow">
                          <span className="vtn-eyebrow-dot" />
                          AI Structured
                        </div>

                        <span
                          className={`vtn-priority-pill priority-${note.priority.toLowerCase()}`}
                        >
                          {note.priority}
                        </span>

                      </div>

                      <div>

                        <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                          Title
                        </label>

                        <input
                          value={
                            note.title
                          }
                          onChange={(
                            event
                          ) =>
                            updateNote({
                              title:
                                event.target.value,
                            })
                          }
                          className="vtn-input min-h-12 px-4 text-sm font-semibold"
                        />

                      </div>

                      <div>

                        <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
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
                                event.target.value,
                            })
                          }
                          rows={3}
                          className="vtn-input p-4 text-sm leading-6"
                        />

                      </div>

                      <div className="vtn-mobile-metadata-grid grid gap-3 md:grid-cols-3">

                        <div>

                          <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
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
                            className="vtn-input min-h-11 px-3 text-xs"
                          />

                        </div>

                        <div>

                          <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
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
                            className="vtn-input min-h-11 px-3 text-xs"
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

                          <label className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
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
                            className="vtn-input min-h-11 px-3 text-xs"
                          />

                        </div>

                      </div>

                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">

                        <div className="mb-3 flex items-center justify-between gap-3">

                          <div>

                            <p className="text-xs font-semibold">
                              Action Items
                            </p>

                            <p className="mt-1 text-[9px] text-[var(--muted)]">
                              {note.actionItems.length} extracted
                            </p>

                          </div>

                          <button
                            type="button"
                            onClick={
                              addActionItem
                            }
                            className="vtn-secondary min-h-9 px-3 text-[10px]"
                          >
                            + Add
                          </button>

                        </div>

                        <div className="space-y-2">

                          {note.actionItems.length ===
                          0 ? (
                            <p className="py-3 text-center text-[10px] text-[var(--muted)]">
                              No action items detected.
                            </p>
                          ) : (
                            note.actionItems.map(
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

                                  <div className="mt-[13px] h-2 w-2 shrink-0 rounded-full bg-violet-500" />

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
                                    className="vtn-input flex-1 px-3 py-3 text-xs"
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeActionItem(
                                        index
                                      )
                                    }
                                    className="vtn-secondary min-w-10 px-2"
                                    aria-label="Remove action item"
                                  >
                                    ×
                                  </button>

                                </div>
                              )
                            )
                          )}

                        </div>

                      </div>

                      <div className="hidden md:block">

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
                              : "Send to Notion →"}
                        </button>

                        {notionPageUrl && (
                          <a
                            href={
                              notionPageUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="vtn-secondary mt-2 block px-5 py-3 text-center text-xs"
                          >
                            Open in Notion ↗
                          </a>
                        )}

                      </div>

                    </div>
                  )}

                </div>

              </div>

            </section>

          </div>

          {/* =================================================
              HISTORY
          ================================================== */}

          <section className="vtn-card mt-5 p-4 sm:p-6">

            <div className="relative z-10">

              <div className="mb-4 flex items-end justify-between gap-3">

                <div>

                  <span className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[var(--muted)]">
                    Memory Vault
                  </span>

                  <h2 className="mt-1 text-lg font-semibold md:text-xl">
                    Recent Captures
                  </h2>

                </div>

                {history.length >
                  0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setHistory(
                        []
                      )
                    }
                    className="text-[10px] text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    Clear
                  </button>
                )}

              </div>

              {history.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">

                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400">
                    ✦
                  </div>

                  <p className="mt-3 text-xs font-semibold">
                    Your captures will appear here
                  </p>

                  <p className="mt-1 text-[10px] text-[var(--muted)]">
                    Your last 10 captures are stored locally in this browser.
                  </p>

                </div>
              ) : (
                <div className="vtn-mobile-history-row md:grid md:grid-cols-2 xl:grid-cols-3">

                  {history.map(
                    (
                      item
                    ) => (
                      <button
                        key={
                          item.id
                        }
                        type="button"
                        onClick={() =>
                          loadHistoryItem(
                            item
                          )
                        }
                        className="vtn-mobile-history-card rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-left transition hover:border-violet-500/30"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <p className="line-clamp-2 text-sm font-semibold">
                            {item.note.title}
                          </p>

                          {item.savedToNotion && (
                            <span className="vtn-success shrink-0 rounded-full px-2 py-1 text-[8px] font-semibold">
                              ✓
                            </span>
                          )}

                        </div>

                        <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-[var(--muted)]">
                          {item.note.summary}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-1.5">

                          <span className="vtn-badge text-[8px]">
                            {item.note.category}
                          </span>

                          <span
                            className={`vtn-priority-pill priority-${(
                              item.note.priority ??
                              "Low"
                            ).toLowerCase()}`}
                          >
                            {item.note.priority ??
                              "Low"}
                          </span>

                        </div>

                      </button>
                    )
                  )}

                </div>
              )}

            </div>

          </section>

          {accountEmail && (
            <p className="mt-5 text-center text-[9px] text-[var(--muted)]">
              Signed in as {accountEmail}
            </p>
          )}

        </div>

        {/* =================================================
            MOBILE STICKY SAVE
        ================================================== */}

        {note && (
          <div className="vtn-mobile-bottom-action md:hidden">

            <div className="vtn-mobile-bottom-inner">

              <div className="min-w-0">

                <span className="text-[8px] font-semibold uppercase tracking-[0.13em] text-[var(--muted)]">
                  Ready to sync
                </span>

                <p className="truncate text-xs font-semibold">
                  {note.title}
                </p>

              </div>

              {notionPageUrl ? (
                <a
                  href={
                    notionPageUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="vtn-success flex min-h-12 shrink-0 items-center rounded-xl px-4 text-xs font-semibold"
                >
                  Open in Notion ↗
                </a>
              ) : (
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
                  className="vtn-primary min-h-12 shrink-0 px-5 text-xs"
                >
                  {processingStep ===
                  "saving"
                    ? "Syncing..."
                    : notionSaved
                      ? "Synced ✓"
                      : "Send →"}
                </button>
              )}

            </div>

          </div>
        )}

      </main>
    </AuthGate>
  );
}