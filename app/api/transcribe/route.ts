import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const transcriberEndpoint =
  process.env.TRANSCRIBER_API_URL ??
  "https://ai-speech-whisper-transcriber.vercel.app/api/transcribe";

export async function POST(request: Request) {
  try {
    const incomingFormData = await request.formData();
    const audioFile = incomingFormData.get("file");

    if (!(audioFile instanceof File) || audioFile.size === 0) {
      return NextResponse.json(
        { error: "Please provide a non-empty audio file." },
        { status: 400 },
      );
    }

    const outgoingFormData = new FormData();
    outgoingFormData.append("file", audioFile, audioFile.name || "voice-memory.webm");

    const response = await fetch(transcriberEndpoint, {
      method: "POST",
      body: outgoingFormData,
    });

    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok) {
      const details = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      console.error("Transcriber service failed", details);
      return NextResponse.json(
        { error: "Unable to transcribe this recording.", details },
        { status: response.status },
      );
    }

    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Transcriber returned an unexpected response." },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      text?: string;
      transcription?: string;
    };
    const text = (data.text ?? data.transcription ?? "").trim();

    if (!text) {
      return NextResponse.json(
        { error: "Transcriber returned an empty result." },
        { status: 502 },
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Transcription proxy failed", error);
    return NextResponse.json(
      { error: "Unable to reach the transcription service." },
      { status: 502 },
    );
  }
}
