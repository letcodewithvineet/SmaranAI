import { NextResponse } from "next/server";
import { z } from "zod";
import { listMemorialRecords, saveMemorialRecord } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const profileSchema = z.object({
  fullName: z.string().trim().min(1),
  dates: z.string().trim().min(1),
  shortTribute: z.string().trim().min(1),
  biography: z.string().trim().min(1),
  coreValues: z.array(z.string().trim().min(1)).min(1),
  timeline: z.array(
    z.object({
      year: z.string().trim().min(1),
      title: z.string().trim().min(1),
      description: z.string().trim().min(1),
    }),
  ),
  inspirationalQuote: z.string().trim().min(1),
});

const createRecordSchema = z.object({
  profile: profileSchema,
  targetLanguage: z.string().trim().min(2).max(40),
  memoryNotes: z.string().trim().optional(),
  deceasedPhoto: z
    .object({
      name: z.string().trim().min(1).max(160),
      type: z.string().trim().regex(/^image\/(jpeg|png|webp)$/),
      size: z.number().int().positive().max(1_500_000),
      dataUrl: z.string().trim().startsWith("data:image/").max(2_100_000),
    })
    .optional(),
  source: z.enum(["openai", "gemini", "mock", "manual"]).default("manual"),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 25);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 25;

  try {
    const records = await listMemorialRecords(safeLimit);
    return NextResponse.json({ records });
  } catch (error) {
    console.error("MongoDB records lookup failed", error);
    return NextResponse.json(
      {
        records: [],
        warning: "Saved records are temporarily unavailable.",
      },
      { status: 200 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const payload = createRecordSchema.parse(body);
    const recordId = await saveMemorialRecord({
      type: "memorial_profile",
      ...payload,
      membership: {
        plan: "Basic",
      },
    });

    return NextResponse.json({ recordId, persisted: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body.", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error("MongoDB record creation failed", error);
    return NextResponse.json(
      { error: "Unable to save memorial record." },
      { status: 503 },
    );
  }
}
