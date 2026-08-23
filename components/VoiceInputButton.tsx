"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, RefreshCw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const transcriberEndpoint = "/api/transcribe";

type VoiceInputButtonProps = {
  onTranscriptionComplete: (text: string) => void;
  className?: string;
};

type RecordingState = "idle" | "recording" | "processing";

type AudioInputDevice = {
  deviceId: string;
  label: string;
};

export default function VoiceInputButton({
  onTranscriptionComplete,
  className,
}: VoiceInputButtonProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [audioInputDevices, setAudioInputDevices] = useState<AudioInputDevice[]>(
    [],
  );
  const [selectedDeviceId, setSelectedDeviceId] = useState("default");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  async function refreshAudioInputDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const seenDeviceIds = new Set(["default"]);
      const audioInputs = devices
        .filter((device) => device.kind === "audioinput")
        .flatMap((device, index) => {
          if (!device.deviceId || seenDeviceIds.has(device.deviceId)) {
            return [];
          }

          seenDeviceIds.add(device.deviceId);

          return [
            {
              deviceId: device.deviceId,
              label: device.label || `Microphone ${index + 1}`,
            },
          ];
        });

      setAudioInputDevices(audioInputs);
      setSelectedDeviceId((currentDeviceId) => {
        if (
          currentDeviceId === "default" ||
          audioInputs.some((device) => device.deviceId === currentDeviceId)
        ) {
          return currentDeviceId;
        }

        return "default";
      });
    } catch (error) {
      console.error("Unable to list audio input devices", error);
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Voice recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: buildAudioConstraints(selectedDeviceId),
      });
      void refreshAudioInputDevices();
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        void transcribeRecording(recorder.mimeType || mimeType || "audio/webm");
      };

      recorder.start();
      setRecordingState("recording");
    } catch (error) {
      cleanupRecording();
      alert(
        error instanceof Error
          ? error.message
          : "Unable to access the microphone.",
      );
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      setRecordingState("processing");
      recorder.stop();
      return;
    }

    cleanupRecording();
    setRecordingState("idle");
  }

  async function transcribeRecording(mimeType: string) {
    const audioBlob = new Blob(chunksRef.current, { type: mimeType });

    cleanupRecording(false);

    if (audioBlob.size === 0) {
      setRecordingState("idle");
      alert("No audio was captured. Please try recording again.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, getAudioFileName(mimeType));

      const response = await fetch(transcriberEndpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || "The transcription service could not process the audio.",
        );
      }

      const data = (await response.json()) as {
        text?: string;
        transcription?: string;
      };
      const transcription = (data.text ?? data.transcription ?? "").trim();

      if (!transcription) {
        throw new Error("The transcription service returned an empty result.");
      }

      onTranscriptionComplete(transcription);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to transcribe this recording.",
      );
    } finally {
      setRecordingState("idle");
    }
  }

  function cleanupRecording(clearChunks = true) {
    mediaRecorderRef.current = null;
    stopStreamTracks();

    if (clearChunks) {
      chunksRef.current = [];
    }
  }

  function stopStreamTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    return () => {
      stopStreamTracks();
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshAudioInputDevices();
    });

    navigator.mediaDevices?.addEventListener?.(
      "devicechange",
      refreshAudioInputDevices,
    );

    return () => {
      navigator.mediaDevices?.removeEventListener?.(
        "devicechange",
        refreshAudioInputDevices,
      );
    };
  }, []);

  if (recordingState === "recording") {
    return (
      <Button
        type="button"
        onClick={stopRecording}
        className={cn(
          "w-full bg-red-600 text-white shadow-sm hover:bg-red-700 sm:w-fit",
          className,
        )}
      >
        <span className="relative flex h-4 w-4 items-center justify-center">
          <span className="absolute h-4 w-4 animate-ping rounded-full bg-white/70" />
          <Square className="relative h-3.5 w-3.5 fill-current" />
        </span>
        Stop Recording
      </Button>
    );
  }

  if (recordingState === "processing") {
    return (
      <Button type="button" disabled className={cn("w-full sm:w-fit", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Transcribing...
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto]",
        className,
      )}
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.5rem] gap-2">
        <Select
          value={selectedDeviceId}
          onValueChange={setSelectedDeviceId}
          disabled={recordingState !== "idle"}
        >
          <SelectTrigger
            className="min-w-0 [&>span:first-child]:truncate"
            aria-label="Voice input device"
          >
            <SelectValue placeholder="System microphone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">System microphone</SelectItem>
            {audioInputDevices.map((device) => (
              <SelectItem value={device.deviceId} key={device.deviceId}>
                {device.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => void refreshAudioInputDevices()}
          aria-label="Refresh microphones"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={startRecording}
        className="w-full sm:w-fit"
      >
        <Mic className="h-4 w-4" />
        Record Voice Memory
      </Button>
    </div>
  );
}

function buildAudioConstraints(selectedDeviceId: string): MediaTrackConstraints {
  return {
    ...(selectedDeviceId === "default"
      ? {}
      : { deviceId: { exact: selectedDeviceId } }),
    autoGainControl: true,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
  };
}

function getSupportedMimeType() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/wav"];

  return types.find((type) => MediaRecorder.isTypeSupported(type));
}

function getAudioFileName(mimeType: string) {
  if (mimeType.includes("wav")) return "voice-memory.wav";
  if (mimeType.includes("mp4")) return "voice-memory.mp4";

  return "voice-memory.webm";
}
