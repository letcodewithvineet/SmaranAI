import { NextResponse } from "next/server";
import OpenAI from "openai";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { saveMemorialRecord } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  memoryNotes: z
    .string()
    .trim()
    .min(20, "memoryNotes must include at least 20 characters."),
  targetLanguage: z
    .string()
    .trim()
    .min(2, "targetLanguage is required.")
    .max(40, "targetLanguage is too long."),
  photo: z
    .object({
      name: z.string().trim().min(1).max(160),
      type: z.string().trim().regex(/^image\/(jpeg|png|webp)$/),
      size: z.number().int().positive().max(1_500_000),
      dataUrl: z.string().trim().startsWith("data:image/").max(2_100_000),
    })
    .optional(),
});

const timelineItemSchema = z.object({
  year: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

const tributeSchema = z.object({
  fullName: z.string().trim().min(1),
  dates: z.string().trim().min(1),
  shortTribute: z
    .string()
    .trim()
    .min(80)
    .refine((value) => {
      const sentenceCount = value.split(/[.!?।]+/).filter(Boolean).length;
      return sentenceCount >= 2 && sentenceCount <= 3;
    }, "shortTribute must be 2-3 sentences."),
  biography: z
    .string()
    .trim()
    .refine((value) => {
      const paragraphs = value.split(/\n{2,}/).filter(Boolean);
      return paragraphs.length === 3 && paragraphs.every((item) => item.length > 80);
    }, "biography must contain exactly 3 structured paragraphs separated by blank lines."),
  coreValues: z.array(z.string().trim().min(1)).min(3).max(8),
  timeline: z.array(timelineItemSchema).min(3).max(8),
  inspirationalQuote: z.string().trim().min(12),
});

type TributeResponse = z.infer<typeof tributeSchema>;
type GenerateRequest = z.infer<typeof requestSchema>;

const tributeJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "fullName",
    "dates",
    "shortTribute",
    "biography",
    "coreValues",
    "timeline",
    "inspirationalQuote",
  ],
  properties: {
    fullName: { type: "string" },
    dates: { type: "string" },
    shortTribute: {
      type: "string",
      description: "Exactly 2-3 dignified sentences.",
    },
    biography: {
      type: "string",
      description:
        "Exactly 3 structured paragraphs separated by blank lines, honoring cultural reverence.",
    },
    coreValues: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: { type: "string" },
    },
    timeline: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["year", "title", "description"],
        properties: {
          year: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    inspirationalQuote: { type: "string" },
  },
} as const;

const geminiResponseSchema = {
  type: Type.OBJECT,
  required: [
    "fullName",
    "dates",
    "shortTribute",
    "biography",
    "coreValues",
    "timeline",
    "inspirationalQuote",
  ],
  properties: {
    fullName: { type: Type.STRING },
    dates: { type: Type.STRING },
    shortTribute: { type: Type.STRING },
    biography: { type: Type.STRING },
    coreValues: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    timeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["year", "title", "description"],
        properties: {
          year: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
        },
      },
    },
    inspirationalQuote: { type: Type.STRING },
  },
} as const;

export async function POST(request: Request) {
  let payload: GenerateRequest;

  try {
    const body: unknown = await request.json();
    payload = requestSchema.parse(body);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid request body.",
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    );
  }

  const prompt = buildPrompt(payload);

  try {
    const generated = await generateWithOpenAI(prompt);
    return NextResponse.json(await withPersistence(generated, payload, "openai"));
  } catch (openAIError) {
    console.error("OpenAI generation failed", openAIError);
  }

  try {
    const generated = await generateWithGemini(prompt);
    return NextResponse.json(await withPersistence(generated, payload, "gemini"));
  } catch (geminiError) {
    console.error("Gemini generation failed", geminiError);
  }

  return NextResponse.json(await withPersistence(mockTribute(payload), payload, "mock"), {
    headers: {
      "X-SmaranAI-Fallback": "mock",
    },
  });
}

async function withPersistence(
  generated: TributeResponse,
  payload: GenerateRequest,
  source: "openai" | "gemini" | "mock",
) {
  try {
    const recordId = await saveMemorialRecord({
      type: "memorial_profile",
      source,
      targetLanguage: payload.targetLanguage,
      memoryNotes: payload.memoryNotes,
      deceasedPhoto: payload.photo ?? null,
      profile: generated,
      membership: {
        plan: "Basic",
      },
    });

    return {
      ...generated,
      deceasedPhoto: payload.photo ?? null,
      recordId,
      persisted: true,
      source,
    };
  } catch (error) {
    console.error("MongoDB persistence failed", error);
    return {
      ...generated,
      deceasedPhoto: payload.photo ?? null,
      persisted: false,
      source,
    };
  }
}

async function generateWithOpenAI(prompt: string): Promise<TributeResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    input: prompt,
    temperature: 0.4,
    text: {
      format: {
        type: "json_schema",
        name: "smaranai_memorial_tribute",
        strict: true,
        schema: tributeJsonSchema,
      },
    },
  });

  const parsed = JSON.parse(response.output_text);
  return tributeSchema.parse(parsed);
}

async function generateWithGemini(prompt: string): Promise<TributeResponse> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not configured.");
  }

  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
    contents: prompt,
    config: {
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: geminiResponseSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return tributeSchema.parse(JSON.parse(text));
}

function buildPrompt({ memoryNotes, targetLanguage }: GenerateRequest) {
  return [
    "You are SmaranAI, a dignified digital heritage memorial writing assistant.",
    `Write entirely in this target language: ${targetLanguage}.`,
    "Infer names, dates, values, and life milestones only from the memory notes. If a detail is missing, use a respectful placeholder such as \"Not specified\".",
    "Honor cultural reverence without exaggeration, superstition, or unsupported factual claims.",
    "Return only JSON matching the provided schema.",
    "The shortTribute must be exactly 2-3 dignified sentences.",
    "The biography must be exactly 3 structured paragraphs separated by blank lines.",
    "Memory notes:",
    memoryNotes,
  ].join("\n\n");
}

function mockTribute({
  memoryNotes,
  targetLanguage,
}: GenerateRequest): TributeResponse {
  const firstLine = memoryNotes.split(/\n|\./)[0]?.trim();
  const fullName = extractLikelyName(memoryNotes) ?? "Beloved Family Elder";
  const dates = extractLikelyDates(memoryNotes) ?? "Dates not specified";

  if (/hindi|हिन्दी|हिंदी/i.test(targetLanguage)) {
    return {
      fullName,
      dates,
      shortTribute:
        "उनका जीवन स्नेह, धैर्य और गरिमा से भरा हुआ था। परिवार उन्हें उन मूल्यों के लिए याद करता है जिन्हें उन्होंने शांत कर्म, प्रेम और आशीर्वाद के रूप में आगे बढ़ाया।",
      biography:
        `${fullName} को परिवार की स्मृतियों में आदर और कृतज्ञता के साथ याद किया जाता है। ${firstLine || "उनकी जीवन यात्रा ने परिवार को अपनापन, संस्कार और स्थिरता का अर्थ सिखाया।"}\n\nउनके जीवन की छोटी-छोटी बातों में सेवा, संयम और स्नेह की झलक मिलती थी। परिवार के लिए उनका घर केवल रहने का स्थान नहीं, बल्कि सीख, परंपरा और आत्मीयता का केंद्र था।\n\nआज उनकी विरासत कहानियों, मूल्यों और उन स्मृतियों में जीवित है जिन्हें परिवार आने वाली पीढ़ियों तक संजोकर रखना चाहता है। यह श्रद्धांजलि उसी प्रेमपूर्ण उपस्थिति को सम्मानपूर्वक संरक्षित करती है।`,
      coreValues: ["करुणा", "परिवार", "धैर्य", "सेवा"],
      timeline: buildMockTimeline(),
      inspirationalQuote:
        "सच्ची विरासत वही है जो प्रेम, स्मृति और संस्कार के रूप में आगे बढ़ती रहे।",
    };
  }

  if (/gujarati|ગુજરાતી/i.test(targetLanguage)) {
    return {
      fullName,
      dates,
      shortTribute:
        "તેમનું જીવન સ્નેહ, ધીરજ અને ગૌરવથી ભરેલું હતું. પરિવાર તેમને તેમના મૂલ્યો, આશીર્વાદ અને શાંત સેવાભાવ માટે પ્રેમથી યાદ કરે છે.",
      biography:
        `${fullName}ને પરિવારની સ્મૃતિઓમાં આદર અને કૃતજ્ઞતા સાથે યાદ કરવામાં આવે છે. ${firstLine || "તેમની જીવનયાત્રાએ પરિવારને લાગણી, સંસ્કાર અને સ્થિરતાનો અર્થ શીખવ્યો."}\n\nતેમના રોજિંદા વર્તનમાં સેવા, સંયમ અને સ્નેહની સુંદર ઝલક જોવા મળતી હતી. પરિવાર માટે તેમનું ઘર માત્ર નિવાસસ્થાન નહોતું, પરંતુ શીખ, પરંપરા અને આત્મીયતાનું કેન્દ્ર હતું.\n\nઆજે તેમની વિરાસત વાર્તાઓ, મૂલ્યો અને યાદોમાં જીવંત છે, જેને પરિવાર આવતી પેઢીઓ સુધી સાચવવા માંગે છે. આ શ્રદ્ધાંજલિ તે પ્રેમાળ હાજરીને આદરપૂર્વક સંરક્ષિત કરે છે.`,
      coreValues: ["કરુણા", "પરિવાર", "ધીરજ", "સેવા"],
      timeline: buildMockTimeline(),
      inspirationalQuote:
        "સાચી વિરાસત પ્રેમ, સ્મૃતિ અને સંસ્કારરૂપે આગળ વધતી રહે છે.",
    };
  }

  return {
    fullName,
    dates,
    shortTribute:
      "Their life is remembered with affection, dignity, and gratitude. Through family stories, quiet acts of care, and enduring values, their presence continues to guide the generations that follow.",
    biography:
      `${fullName} is honored through the memories preserved by their family. ${firstLine || "Their life journey reflected care, steadiness, and a deep commitment to loved ones."}\n\nIn everyday rituals and ordinary moments, they offered kindness, patience, and cultural grounding. Their presence made family gatherings feel rooted, and their words carried the gentle authority of lived wisdom.\n\nTheir legacy now lives in stories, values, and memories that deserve to be protected with reverence. This tribute preserves that inheritance as a source of comfort, continuity, and inspiration.`,
    coreValues: ["Compassion", "Family", "Patience", "Service"],
    timeline: buildMockTimeline(),
    inspirationalQuote:
      "A true legacy continues wherever love is remembered and values are lived.",
  };
}

function buildMockTimeline() {
  return [
    {
      year: "Not specified",
      title: "Early Life",
      description:
        "Their roots and formative years remain an important part of the family heritage archive.",
    },
    {
      year: "Not specified",
      title: "Family and Service",
      description:
        "They nurtured family bonds through care, guidance, rituals, and steady presence.",
    },
    {
      year: "Legacy",
      title: "Remembered with Reverence",
      description:
        "Their values continue through the memories and stories preserved by loved ones.",
    },
  ];
}

function extractLikelyName(notes: string) {
  const match =
    notes.match(/full\s+name:\s*([^\n.]{2,80})/i) ??
    notes.match(/(?:name|named|called)\s+(?:was|is)?\s*([A-Z][A-Za-z .'-]{2,60})/) ??
    notes.match(/^([A-Z][A-Za-z .'-]{2,60})[,.\n]/);

  return match?.[1]?.trim();
}

function extractLikelyDates(notes: string) {
  const range = notes.match(
    /(\b(?:18|19|20)\d{2}\b\s*(?:-|–|to)\s*\b(?:18|19|20)\d{2}\b)/,
  );
  if (range?.[1]) return range[1].replace("–", "-");

  const years = notes.match(/\b(?:18|19|20)\d{2}\b/g);
  if (years && years.length >= 2) return `${years[0]} - ${years[1]}`;
  if (years?.[0]) return years[0];

  return undefined;
}
