export type VoiceInputErrorCode =
  | "unsupported"
  | "not-allowed"
  | "no-speech"
  | "audio-capture"
  | "network"
  | "aborted"
  | "unknown";

interface SpeechRecognitionAlternativeLike {
  transcript?: string;
}

interface SpeechRecognitionResultLike {
  isFinal?: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex?: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort?: () => void;
}

interface SpeechRecognitionConstructorLike {
  new (): SpeechRecognitionLike;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  }
}

export interface BrowserVoiceInputSession {
  stop(): void;
}

function resolveSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function normalizeVoiceInputErrorCode(value: string | undefined): VoiceInputErrorCode {
  switch ((value || "").trim().toLowerCase()) {
    case "not-allowed":
    case "service-not-allowed":
      return "not-allowed";
    case "no-speech":
      return "no-speech";
    case "audio-capture":
      return "audio-capture";
    case "network":
      return "network";
    case "aborted":
      return "aborted";
    default:
      return value ? "unknown" : "unknown";
  }
}

function extractTranscript(event: SpeechRecognitionEventLike) {
  const parts: string[] = [];
  const startIndex = Number(event.resultIndex || 0);

  for (let index = startIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    const alternative = result?.[0];
    const transcript = typeof alternative?.transcript === "string"
      ? alternative.transcript.trim()
      : "";

    if (transcript) {
      parts.push(transcript);
    }
  }

  return parts.join(" ").trim();
}

export function supportsBrowserVoiceInput() {
  return Boolean(resolveSpeechRecognitionConstructor());
}

export function startBrowserVoiceInput(options: {
  locale: string;
  onTranscript: (transcript: string) => void;
  onError: (code: VoiceInputErrorCode) => void;
  onEnd?: () => void;
}) {
  const Recognition = resolveSpeechRecognitionConstructor();

  if (!Recognition) {
    throw new Error("unsupported");
  }

  const recognition = new Recognition();
  recognition.lang = options.locale || "es-CO";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    const transcript = extractTranscript(event);
    if (transcript) {
      options.onTranscript(transcript);
    }
  };
  recognition.onerror = (event) => {
    options.onError(normalizeVoiceInputErrorCode(event.error));
  };
  recognition.onend = () => {
    options.onEnd?.();
  };
  recognition.start();

  return {
    stop() {
      try {
        recognition.stop();
      } catch {
        recognition.abort?.();
      }
    }
  } satisfies BrowserVoiceInputSession;
}
