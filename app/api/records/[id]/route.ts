import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteMemorialRecord, updateMemorialRecord } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

const photoSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: z.string().trim().regex(/^image\/(jpeg|png|webp)$/),
  size: z.number().int().positive().max(1_500_000),
  dataUrl: z.string().trim().startsWith("data:image/").max(2_100_000),
});

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

const updateRecordSchema = z.object({
  profile: profileSchema,
  targetLanguage: z.string().trim().min(2).max(40),
  memoryNotes: z.string().trim().optional(),
  deceasedPhoto: photoSchema.nullable().optional(),
  source: z.enum(["openai", "gemini", "mock", "manual"]).default("manual"),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsedId = mongoIdSchema.safeParse(id);

  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid record ID." }, { status: 400 });
  }

  try {
    const body: unknown = await request.json();
    const payload = updateRecordSchema.parse(body);
    const record = await updateMemorialRecord(parsedId.data, {
      type: "memorial_profile",
      ...payload,
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    return NextResponse.json({ record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body.", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error("MongoDB record update failed", error);
    return NextResponse.json(
      { error: "Unable to update memorial record." },
      { status: 503 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsedId = mongoIdSchema.safeParse(id);

  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid record ID." }, { status: 400 });
  }

  try {
    const deleted = await deleteMemorialRecord(parsedId.data);

    if (!deleted) {
      return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("MongoDB record deletion failed", error);
    return NextResponse.json(
      { error: "Unable to delete memorial record." },
      { status: 503 },
    );
  }
}
