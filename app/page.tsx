"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import {
  AlertCircle,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  Image as ImageIcon,
  Languages,
  Loader2,
  Pencil,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import PricingPlans, { type MembershipPlan } from "@/components/PricingPlans";
import MemoryVault from "@/components/MemoryVault";
import VoiceInputButton from "@/components/VoiceInputButton";
import type { MemorialProfile } from "@/types/memorial";

type MemorialForm = {
  fullName: string;
  birthDate: string;
  passingDate: string;
  relation: string;
  language: "English" | "Hindi" | "Gujarati";
  keyEvents: string;
  memories: string;
};

type SavedProfile = {
  fullName: string;
  dates: string;
  shortTribute: string;
  biography: string;
  coreValues: string[];
  timeline: TimelineItem[];
  inspirationalQuote: string;
  deceasedPhoto?: MemorialPhoto | null;
  recordId?: string;
  persisted?: boolean;
  source?: string;
};

type TimelineItem = {
  year: string;
  title: string;
  description: string;
};

type TimelineViewItem = {
  year: string | number;
  title: string;
  text: string;
};

type MemorialPhoto = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

type StoredRecord = {
  _id: string;
  type: string;
  source: string;
  targetLanguage: string;
  memoryNotes?: string;
  profile: SavedProfile;
  deceasedPhoto?: MemorialPhoto | null;
  membership?: {
    plan?: MembershipPlan;
    paymentId?: string;
    orderId?: string;
    provider?: string;
    updatedAt?: string;
  };
  createdAt?: string;
};

type ThemeStyle = {
  card: string;
  frame: string;
  accent: string;
  motif: string;
};

const maxPhotoSize = 1_500_000;

const defaultForm: MemorialForm = {
  fullName: "",
  birthDate: "",
  passingDate: "",
  relation: "",
  language: "English",
  keyEvents: "",
  memories: "",
};

const themes = {
  "Ivory Gold": {
    card: "bg-[#fffaf0] text-zinc-800",
    frame: "border-[#c9a45f]",
    accent: "text-[#9b7436]",
    motif: "ॐ",
  },
  Sandalwood: {
    card: "bg-[#f3eadc] text-stone-800",
    frame: "border-[#a9845a]",
    accent: "text-[#7b5b37]",
    motif: "✦",
  },
  "Midnight Prayer": {
    card: "bg-[#1f2528] text-[#f8f1e3]",
    frame: "border-[#d7b66c]",
    accent: "text-[#e0bf76]",
    motif: "दीप",
  },
  "Hindu Lotus": {
    card: "bg-[#fff7ed] text-stone-900",
    frame: "border-[#d08a2f]",
    accent: "text-[#9a5a16]",
    motif: "ॐ",
  },
  "Sikh Seva": {
    card: "bg-[#fff8e7] text-slate-900",
    frame: "border-[#d6a132]",
    accent: "text-[#8a5a05]",
    motif: "ੴ",
  },
  "Islamic Garden": {
    card: "bg-[#f5fbf7] text-emerald-950",
    frame: "border-[#2e8b68]",
    accent: "text-[#126548]",
    motif: "☪",
  },
  "Christian Grace": {
    card: "bg-[#f8fafc] text-slate-900",
    frame: "border-[#8aa3c2]",
    accent: "text-[#4c6687]",
    motif: "✝",
  },
  "Buddhist Peace": {
    card: "bg-[#fff9e9] text-stone-900",
    frame: "border-[#c49a35]",
    accent: "text-[#8c681f]",
    motif: "☸",
  },
  "Jain Ahimsa": {
    card: "bg-[#fbfff6] text-stone-900",
    frame: "border-[#8aa65a]",
    accent: "text-[#5d7a31]",
    motif: "अहिंसा",
  },
  "Gujarati Heritage": {
    card: "bg-[#fff6ef] text-zinc-900",
    frame: "border-[#c85f3d]",
    accent: "text-[#9d3f24]",
    motif: "ગરબા",
  },
  "Hindi Kavya": {
    card: "bg-[#fffaf0] text-stone-900",
    frame: "border-[#b4833a]",
    accent: "text-[#805c24]",
    motif: "श्रद्धा",
  },
  "South Indian Temple": {
    card: "bg-[#fff8ec] text-stone-900",
    frame: "border-[#b85f31]",
    accent: "text-[#88401d]",
    motif: "दीपम्",
  },
  "Punjabi Phulkari": {
    card: "bg-[#fff6f4] text-slate-900",
    frame: "border-[#c24e56]",
    accent: "text-[#973641]",
    motif: "ਫੁਲਕਾਰੀ",
  },
  "Teacher's Legacy": {
    card: "bg-[#f8f6ef] text-zinc-900",
    frame: "border-[#7c6f55]",
    accent: "text-[#5d513d]",
    motif: "ज्ञान",
  },
  "Doctor's Service": {
    card: "bg-[#f6fbfb] text-slate-900",
    frame: "border-[#5b9aa0]",
    accent: "text-[#326e73]",
    motif: "सेवा",
  },
  "Farmer's Earth": {
    card: "bg-[#fbf8ef] text-stone-900",
    frame: "border-[#8a7a45]",
    accent: "text-[#625527]",
    motif: "धरती",
  },
  "Armed Forces Honor": {
    card: "bg-[#f7f8f4] text-slate-950",
    frame: "border-[#68734d]",
    accent: "text-[#4d5834]",
    motif: "शौर्य",
  },
  "Artist's Muse": {
    card: "bg-[#fff9f4] text-zinc-900",
    frame: "border-[#9d7a8a]",
    accent: "text-[#76556a]",
    motif: "कला",
  },
  "Tricolor Salute": {
    card: "bg-[#fffaf2] text-slate-950",
    frame: "border-[#1f8f5f]",
    accent: "text-[#c26b1d]",
    motif: "भारत",
  },
  "Republic Honor": {
    card: "bg-[#f7f9ff] text-slate-950",
    frame: "border-[#345c9c]",
    accent: "text-[#24457a]",
    motif: "जय हिंद",
  },
} satisfies Record<string, ThemeStyle>;

type ThemeName = keyof typeof themes;

const themeSections: Array<{ label: string; items: ThemeName[] }> = [
  {
    label: "Classic",
    items: ["Ivory Gold", "Sandalwood", "Midnight Prayer"],
  },
  {
    label: "Religious",
    items: [
      "Hindu Lotus",
      "Sikh Seva",
      "Islamic Garden",
      "Christian Grace",
      "Buddhist Peace",
      "Jain Ahimsa",
    ],
  },
  {
    label: "Culture",
    items: [
      "Gujarati Heritage",
      "Hindi Kavya",
      "South Indian Temple",
      "Punjabi Phulkari",
    ],
  },
  {
    label: "Profession",
    items: [
      "Teacher's Legacy",
      "Doctor's Service",
      "Farmer's Earth",
      "Armed Forces Honor",
      "Artist's Muse",
    ],
  },
  {
    label: "Patriotism",
    items: ["Tricolor Salute", "Republic Honor"],
  },
];

const classicThemeNames = themeSections[0].items;
const allThemeNames = themeSections.flatMap((section) => section.items);

const subscriptionPlans: Record<
  MembershipPlan,
  {
    price: string;
    description: string;
    limitLabel: string;
  }
> = {
  Basic: {
    price: "Free",
    description: "Access all classic memorial themes.",
    limitLabel: `${classicThemeNames.length} classic themes`,
  },
  Standard: {
    price: "₹799",
    description: "Access up to 10 themes from the full library.",
    limitLabel: "10 total themes",
  },
  Gold: {
    price: "₹999",
    description: "Access every religious, cultural, profession, and patriotic theme.",
    limitLabel: `${allThemeNames.length} total themes`,
  },
};

const tributeLines = {
  English: {
    title: "A life remembered with grace",
    blessing: "May every memory become a lamp for the generations ahead.",
  },
  Hindi: {
    title: "श्रद्धा और स्मृति से संजोया जीवन",
    blessing: "हर स्मृति आने वाली पीढ़ियों के लिए प्रकाश बने।",
  },
  Gujarati: {
    title: "આદર અને સ્મરણથી સાચવાયેલું જીવન",
    blessing: "દરેક સ્મૃતિ આવતી પેઢીઓ માટે દીવો બને.",
  },
};

function dateLabel(value: string) {
  if (!value) return "Date to be added";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function parseTimeline(form: MemorialForm): TimelineViewItem[] {
  const entries = form.keyEvents
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [year, ...rest] = line.split(":");
      return {
        year: rest.length ? year.trim() : "Milestone",
        title: "Life Milestone",
        text: rest.length ? rest.join(":").trim() : line,
      };
    });

  return [
    { year: form.birthDate ? new Date(form.birthDate).getFullYear() : "Birth", title: "Birth and Roots", text: "Born into a family whose stories continue through SmaranAI." },
    ...entries,
    { year: form.passingDate ? new Date(form.passingDate).getFullYear() : "Legacy", title: "Legacy Preserved", text: "Their legacy is preserved through memories, words, rituals, and love." },
  ];
}

function buildBio(form: MemorialForm) {
  const lines = tributeLines[form.language];
  const name = form.fullName || "This beloved soul";
  const relation = form.relation ? `as a cherished ${form.relation}` : "with deep affection";

  if (form.language === "Hindi") {
    return `${name} को ${relation} याद किया जाता है। उनका जीवन स्नेह, धैर्य और सेवा की शांत गरिमा से भरा था। परिवार की स्मृतियों में उनके संस्कार, शब्द और जीवन के छोटे-छोटे उत्सव आज भी जीवित हैं। ${lines.blessing}`;
  }

  if (form.language === "Gujarati") {
    return `${name}ને ${relation} તરીકે પ્રેમથી યાદ કરવામાં આવે છે. તેમનું જીવન સ્નેહ, ધીરજ અને સેવાની શાંત ગરિમાથી ભરેલું હતું. પરિવારની યાદોમાં તેમના સંસ્કાર, શબ્દો અને જીવનના નાનાં ઉત્સવો આજે પણ જીવંત છે. ${lines.blessing}`;
  }

  return `${name} is remembered ${relation}. Their life carried a quiet dignity: kindness in ordinary moments, strength in difficult seasons, and a gift for making family feel rooted. The memories preserved here become a living archive of their values, rituals, humor, and love. ${lines.blessing}`;
}

export default function Home() {
  const createSectionRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [theme, setTheme] = useState<ThemeName>("Ivory Gold");
  const [membershipPlan, setMembershipPlan] = useState<MembershipPlan>("Basic");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [savedProfile, setSavedProfile] = useState<SavedProfile | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<StoredRecord | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [records, setRecords] = useState<StoredRecord[]>([]);
  const [recordsState, setRecordsState] = useState<
    | { status: "idle"; message: string }
    | { status: "loading"; message: string }
    | { status: "warning"; message: string }
    | { status: "error"; message: string }
  >({ status: "idle", message: "" });
  const [deceasedPhoto, setDeceasedPhoto] = useState<MemorialPhoto | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [saveState, setSaveState] = useState<
    | { status: "idle"; message: string }
    | { status: "saving"; message: string }
    | { status: "saved"; message: string }
    | { status: "error"; message: string }
  >({ status: "idle", message: "" });
  const activeProfile = selectedRecord?.profile ?? savedProfile;
  const activePhoto = selectedRecord?.deceasedPhoto ?? activeProfile?.deceasedPhoto ?? deceasedPhoto;
  const activeLanguage = normalizeLanguage(selectedRecord?.targetLanguage) ?? form.language;
  const timeline = useMemo(() => {
    if (selectedRecord) {
      return buildTimelineFromRecord(selectedRecord);
    }

    if (activeProfile?.timeline?.length) {
      return buildTimelineFromProfile(activeProfile);
    }

    return parseTimeline(form);
  }, [activeProfile, form, selectedRecord]);
  const bio = useMemo(() => buildBio(form), [form]);
  const activeTheme = themes[theme];
  const activeSubscription = subscriptionPlans[membershipPlan];
  const accessibleThemes = useMemo(
    () => getAccessibleThemeNames(membershipPlan),
    [membershipPlan],
  );
  const activeName = activeProfile?.fullName ?? form.fullName;
  const activeDates = activeProfile?.dates ?? `${dateLabel(form.birthDate)} - ${dateLabel(form.passingDate)}`;
  const activeBiography = activeProfile?.biography ?? bio;
  const activeShortTribute = activeProfile?.shortTribute ?? bio;
  const activeQuote =
    activeProfile?.inspirationalQuote ?? tributeLines[activeLanguage].blessing;
  const activeBiographyParagraphs = activeBiography
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const memoryVaultProfiles = useMemo(() => {
    const profileMap = new Map<string, MemorialProfile>();

    records.forEach((record) => {
      profileMap.set(record._id, recordToMemorialProfile(record));
    });

    if (selectedRecord) {
      profileMap.set(selectedRecord._id, recordToMemorialProfile(selectedRecord));
    }

    return Array.from(profileMap.values());
  }, [records, selectedRecord]);

  useEffect(() => {
    void loadRecords();
  }, []);

  async function loadRecords() {
    setRecordsState({ status: "loading", message: "Loading saved records..." });

    try {
      const response = await fetch("/api/records?limit=12");
      if (!response.ok) {
        throw new Error("Unable to load saved records.");
      }
      const data = (await response.json()) as {
        records: StoredRecord[];
        warning?: string;
      };
      setRecords(data.records);
      setRecordsState(
        data.warning
          ? { status: "warning", message: data.warning }
          : { status: "idle", message: "" },
      );
    } catch (error) {
      setRecordsState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to load saved records.",
      });
    }
  }

  function handleMembershipPaymentSuccess(
    nextPlan: Extract<MembershipPlan, "Standard" | "Gold">,
    paymentId: string,
  ) {
    const membership = {
      plan: nextPlan,
      paymentId,
      provider: "razorpay",
      updatedAt: new Date().toISOString(),
    };

    setMembershipPlan(nextPlan);
    setTheme((currentTheme) =>
      isThemeAllowed(currentTheme, nextPlan) ? currentTheme : classicThemeNames[0],
    );
    setPaymentMessage(
      `${nextPlan} membership unlocked for ${activeName || "this record"}. Payment ID: ${paymentId}`,
    );
    setSelectedRecord((currentRecord) =>
      currentRecord
        ? {
            ...currentRecord,
            membership,
          }
        : currentRecord,
    );
    setRecords((currentRecords) =>
      currentRecords.map((record) =>
        record._id === selectedRecord?._id
          ? {
              ...record,
              membership,
            }
          : record,
      ),
    );
  }

  function selectRecord(record: StoredRecord) {
    const recordPlan = getRecordMembershipPlan(record);

    setSelectedRecord(record);
    setEditingRecordId(record._id);
    setSavedProfile({
      ...record.profile,
      recordId: record._id,
      source: record.source,
      persisted: true,
      deceasedPhoto: record.deceasedPhoto ?? null,
    });
    setDeceasedPhoto(record.deceasedPhoto ?? null);
    setSaveState({
      status: "saved",
      message: `Viewing saved record. ID: ${record._id}`,
    });
    setForm(recordToForm(record));
    setMembershipPlan(recordPlan);
    setPaymentMessage(
      recordPlan === "Basic"
        ? ""
        : `${recordPlan} membership is active for ${record.profile.fullName}.`,
    );
    setTheme((currentTheme) =>
      isThemeAllowed(currentTheme, recordPlan) ? currentTheme : classicThemeNames[0],
    );
    setTimeout(() => {
      createSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  function handleVaultProfileChange(profileId: string) {
    const record =
      records.find((item) => item._id === profileId) ??
      (selectedRecord?._id === profileId ? selectedRecord : undefined);

    if (record) {
      selectRecord(record);
    }
  }

  function updateField(field: keyof MemorialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (saveState.status !== "idle") {
      setSaveState({ status: "idle", message: "" });
    }
  }

  function handleTranscriptionComplete(text: string) {
    const transcription = text.trim();

    if (!transcription) return;

    setForm((current) => ({
      ...current,
      memories: current.memories.trim()
        ? `${current.memories.trim()}\n\n${transcription}`
        : transcription,
    }));

    if (saveState.status !== "idle") {
      setSaveState({ status: "idle", message: "" });
    }
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setSaveState({
        status: "error",
        message: "Please upload a JPG, PNG, or WebP photo.",
      });
      event.target.value = "";
      return;
    }

    if (file.size > maxPhotoSize) {
      setSaveState({
        status: "error",
        message: "Please keep the photo under 1.5 MB.",
      });
      event.target.value = "";
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setDeceasedPhoto({
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl,
    });
    setSaveState({ status: "idle", message: "" });
  }

  function clearPhoto() {
    setDeceasedPhoto(null);
    setPhotoInputKey((current) => current + 1);
  }

  async function handleRecordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const memoryNotes = buildMemoryNotes(form);

    if (memoryNotes.length < 20) {
      setSaveState({
        status: "error",
        message: "Add at least one name, date, event, or memory before saving.",
      });
      return;
    }

    setSaveState({ status: "saving", message: "Saving memorial record..." });

    try {
      if (editingRecordId) {
        const profile = buildProfileFromForm(form, activeProfile);
        const response = await fetch(`/api/records/${editingRecordId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profile,
            targetLanguage: form.language,
            memoryNotes,
            deceasedPhoto,
            source: selectedRecord?.source ?? "manual",
          }),
        });

        if (!response.ok) {
          throw new Error("Unable to update this memorial record.");
        }

        const data = (await response.json()) as { record: StoredRecord };
        selectRecord(data.record);
        await loadRecords();
        setSaveState({
          status: "saved",
          message: `Record updated. ID: ${data.record._id}`,
        });
        return;
      }

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memoryNotes,
          targetLanguage: form.language,
          photo: deceasedPhoto,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to save this memorial record.");
      }

      const data = (await response.json()) as SavedProfile;
      setSavedProfile(data);
      setSelectedRecord(
        data.recordId
          ? {
              _id: data.recordId,
              type: "memorial_profile",
              source: data.source ?? "mock",
              targetLanguage: form.language,
              profile: data,
              deceasedPhoto: data.deceasedPhoto ?? deceasedPhoto,
              memoryNotes,
              membership: {
                plan: "Basic",
              },
            }
          : null,
      );
      setMembershipPlan("Basic");
      setPaymentMessage("");
      setForm(defaultForm);
      clearPhoto();
      void loadRecords();
      setSaveState({
        status: "saved",
        message: data.persisted
          ? `Record saved. ID: ${data.recordId ?? "created"}`
          : "Draft generated, but database persistence was not available.",
      });
    } catch (error) {
      setSaveState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while saving the record.",
      });
    }
  }

  function resetForm() {
    setForm(defaultForm);
    clearPhoto();
    setEditingRecordId(null);
    setSelectedRecord(null);
    setSavedProfile(null);
    setMembershipPlan("Basic");
    setPaymentMessage("");
    setSaveState({ status: "idle", message: "" });
  }

  async function deleteRecord(record: StoredRecord) {
    const confirmed = window.confirm(
      `Delete the saved memorial record for ${record.profile.fullName}?`,
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/records/${record._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete this memorial record.");
      }

      if (selectedRecord?._id === record._id) {
        resetForm();
      }

      await loadRecords();
    } catch (error) {
      setRecordsState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete this memorial record.",
      });
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(198,163,88,0.18),transparent_34%),linear-gradient(180deg,#f8f4ea,#ece7dd)]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-1 text-sm font-bold text-muted-foreground">
              <Sparkles className="h-4 w-4 shrink-0 text-[#a97d36]" />
              <span className="min-w-0 truncate">
                Digital heritage and multilingual memorial preservation
              </span>
            </div>
            <h1 className="font-serif text-4xl font-semibold leading-tight tracking-normal text-zinc-850 sm:text-5xl">
              SmaranAI
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-8 text-muted-foreground">
              Create dignified tribute biographies, ceremonial memorial cards,
              family timelines, and a conversational memory vault in Hindi,
              Gujarati, or English.
            </p>
          </div>
          <div className="grid w-full grid-cols-3 gap-2 text-center sm:w-auto">
            {["Hindi", "Gujarati", "English"].map((language) => (
              <div
                className="rounded-md border border-border bg-card px-2 py-3 shadow-sm sm:px-4"
                key={language}
              >
                <Languages className="mx-auto mb-1 h-4 w-4 text-[#a97d36]" />
                <p className="text-xs font-bold text-muted-foreground">
                  {language}
                </p>
              </div>
            ))}
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Saved Memorial Records</CardTitle>
            <CardDescription>
              Select a saved record to synchronize Studio, Timeline, and Vault.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedRecord
                  ? `Active record: ${selectedRecord.profile.fullName}`
                  : "No saved record selected."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => void loadRecords()}
                disabled={recordsState.status === "loading"}
              >
                {recordsState.status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
            {recordsState.status === "error" || recordsState.status === "warning" ? (
              <div
                className={cn(
                  "rounded-md border px-3 py-2 text-sm",
                  recordsState.status === "error"
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-[#d4b36c] bg-[#fff8e5] text-[#6f5424]",
                )}
              >
                {recordsState.message}
              </div>
            ) : records.length ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {records.map((record) => (
                  <div
                    className={cn(
                      "flex min-h-32 flex-col gap-3 rounded-lg border bg-card p-3 text-left transition hover:border-[#b9934a] hover:bg-[#fffaf0] sm:flex-row",
                      selectedRecord?._id === record._id &&
                        "border-[#b9934a] bg-[#fff8e5]",
                    )}
                    key={record._id}
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                      {record.deceasedPhoto?.dataUrl ? (
                        <NextImage
                          alt={`${record.profile.fullName} portrait`}
                          className="h-16 w-16 object-cover"
                          height={64}
                          src={record.deceasedPhoto.dataUrl}
                          unoptimized
                          width={64}
                        />
                      ) : (
                        <UserRound className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-serif text-lg font-semibold">
                          {record.profile.fullName}
                        </p>
                        <Eye className="h-4 w-4 shrink-0 text-[#a97d36]" />
                      </div>
                      <p className="text-xs font-bold text-[#9b7436]">
                        {record.profile.dates}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {record.profile.shortTribute}
                      </p>
                      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => selectRecord(record)}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => selectRecord(record)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-700 hover:bg-red-50 hover:text-red-800"
                          onClick={() => void deleteRecord(record)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border bg-[#fbf7ee] px-4 py-6 text-center text-sm text-muted-foreground">
                Saved records will appear here after creation.
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-1 lg:grid-cols-4">
            <TabsTrigger value="create">
              <UserRound className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="studio">
              <BookOpenText className="h-4 w-4" />
              Studio
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <CalendarDays className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="vault">
              <BookOpenText className="h-4 w-4" />
              Vault
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <div
              ref={createSectionRef}
              className="scroll-mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Create Memorial / Bio Generator</CardTitle>
                  <CardDescription>
                    {editingRecordId
                      ? "Edit this saved memorial record, then update it in MongoDB."
                      : "Add the essential details and SmaranAI shapes them into a respectful multilingual tribute."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-5" onSubmit={handleRecordSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Full Name">
                        <Input
                          placeholder="e.g. Anaya Mehta"
                          value={form.fullName}
                          onChange={(event) =>
                            updateField("fullName", event.target.value)
                          }
                        />
                      </Field>
                      <Field label="Relation">
                        <Input
                          placeholder="e.g. Grandmother"
                          value={form.relation}
                          onChange={(event) =>
                            updateField("relation", event.target.value)
                          }
                        />
                      </Field>
                      <Field label="Birth Date">
                        <Input
                          type="date"
                          value={form.birthDate}
                          onChange={(event) =>
                            updateField("birthDate", event.target.value)
                          }
                        />
                      </Field>
                      <Field label="Passing Date">
                        <Input
                          type="date"
                          value={form.passingDate}
                          onChange={(event) =>
                            updateField("passingDate", event.target.value)
                          }
                        />
                      </Field>
                      <Field label="Language">
                        <Select
                          value={form.language}
                          onValueChange={(value) =>
                            updateField("language", value as MemorialForm["language"])
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Hindi">Hindi</SelectItem>
                            <SelectItem value="Gujarati">Gujarati</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    <Field label="Photo of Deceased">
                      <div className="grid gap-3 rounded-lg border border-dashed border-border bg-[#fbf7ee] p-4">
                        {deceasedPhoto ? (
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <NextImage
                              alt="Selected deceased portrait preview"
                              className="h-20 w-20 rounded-md border border-border object-cover"
                              height={80}
                              src={deceasedPhoto.dataUrl}
                              unoptimized
                              width={80}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold">
                                {deceasedPhoto.name}
                              </p>
                              <p className="text-xs leading-5 text-muted-foreground">
                                {formatFileSize(deceasedPhoto.size)} saved with this record
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={clearPhoto}
                              aria-label="Remove selected photo"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-card">
                              <ImageIcon className="h-6 w-6 text-[#a97d36]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold">
                                Upload a portrait photo
                              </p>
                              <p className="text-xs leading-5 text-muted-foreground">
                                JPG, PNG, or WebP up to 1.5 MB.
                              </p>
                            </div>
                          </div>
                        )}
                        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-bold transition-colors hover:bg-muted">
                          <Upload className="h-4 w-4" />
                          Choose Photo
                          <input
                            key={photoInputKey}
                            className="sr-only"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handlePhotoChange}
                          />
                        </label>
                      </div>
                    </Field>
                    <Field label="Key Life Events">
                      <Textarea
                        placeholder="Add one milestone per line, e.g. 1982: Opened a community library"
                        value={form.keyEvents}
                        onChange={(event) =>
                          updateField("keyEvents", event.target.value)
                        }
                      />
                    </Field>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <Label>Memories / Quotes</Label>
                      </div>
                      <VoiceInputButton
                        onTranscriptionComplete={handleTranscriptionComplete}
                      />
                      <Textarea
                        placeholder="Add personal memories, rituals, quotes, values, or family stories..."
                        value={form.memories}
                        onChange={(event) =>
                          updateField("memories", event.target.value)
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <StatusMessage state={saveState} />
                      <div className="grid gap-2 sm:flex sm:shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={resetForm}
                          disabled={saveState.status === "saving"}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Clear
                        </Button>
                        <Button
                          type="submit"
                          className="w-full sm:w-auto"
                          disabled={saveState.status === "saving"}
                        >
                          {saveState.status === "saving" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          {editingRecordId ? "Update Record" : "Save Record"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-[#24292b] text-[#f7f0e2]">
                <CardHeader>
                  <CardTitle>Generated Tribute</CardTitle>
                  <CardDescription className="text-[#d7ccb8]">
                    {activeProfile
                      ? "Memorial page draft from the active saved record."
                      : "A ready first draft for the memorial page."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {activeProfile ? (
                    <div className="mb-5 rounded-md border border-[#d7b66c]/50 bg-[#f8f1e3]/10 p-4 text-sm leading-6 text-[#eee5d4]">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#d7b66c]" />
                        <div>
                          <p className="font-bold text-[#f8f1e3]">
                            Last saved: {activeProfile.fullName}
                          </p>
                          <p className="text-[#d7ccb8]">
                            {activeProfile.recordId
                              ? `Record ID ${activeProfile.recordId}`
                              : "Generated profile is ready for review."}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    {activePhoto ? (
                      <NextImage
                        alt={`${activeName || "Memorial"} portrait`}
                        className="h-28 w-28 rounded-md border border-[#d7b66c]/40 object-cover"
                        height={112}
                        src={activePhoto.dataUrl}
                        unoptimized
                        width={112}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold uppercase tracking-normal text-[#d7b66c]">
                        Memorial Page Draft
                      </p>
                      <h3 className="mt-2 break-words font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                        {activeName || "Full Name"}
                      </h3>
                      <p className="mt-2 text-sm text-[#d7ccb8]">{activeDates}</p>
                    </div>
                  </div>
                  <div>
                    <p className="break-words font-serif text-xl leading-8 sm:text-2xl sm:leading-9">
                      {tributeLines[activeLanguage].title}
                    </p>
                    <p className="mt-4 break-words leading-8 text-[#eee5d4]">
                      {activeShortTribute}
                    </p>
                  </div>
                  <div className="border-t border-[#f8f1e3]/15 pt-5">
                    <p className="text-sm font-bold uppercase tracking-normal text-[#d7b66c]">
                      Biography
                    </p>
                    <div className="mt-3 space-y-4 text-sm leading-7 text-[#eee5d4]">
                      {activeBiographyParagraphs.map((paragraph, index) => (
                        <p key={`${paragraph.slice(0, 24)}-${index}`}>
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                  {activeProfile?.coreValues?.length ? (
                    <div className="border-t border-[#f8f1e3]/15 pt-5">
                      <p className="text-sm font-bold uppercase tracking-normal text-[#d7b66c]">
                        Core Values
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {activeProfile.coreValues.map((value) => (
                          <span
                            className="rounded-md border border-[#d7b66c]/40 bg-[#f8f1e3]/10 px-3 py-1 text-sm text-[#f8f1e3]"
                            key={value}
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="border-t border-[#f8f1e3]/15 pt-5">
                    <p className="break-words font-serif text-xl leading-8 text-[#d7b66c] sm:text-2xl sm:leading-9">
                      {activeQuote}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="studio">
            <div className="grid gap-6 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Tribute Studio</CardTitle>
                  <CardDescription>
                    Select a ceremonial visual theme, then export the memorial
                    card using your browser PDF dialog.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Membership access</Label>
                    <div className="rounded-md border border-[#d7b66c]/60 bg-[#fff8e5] p-3 text-sm leading-6 text-[#5f461d]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-bold">
                            {membershipPlan} plan active
                          </p>
                          <p className="mt-1 text-xs">
                            {activeSubscription.description}
                          </p>
                        </div>
                        <span className="shrink-0 font-bold">
                          {activeSubscription.price}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-bold uppercase">
                        {activeSubscription.limitLabel}
                      </p>
                    </div>
                    {paymentMessage ? (
                      <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-800">
                        {paymentMessage}
                      </div>
                    ) : null}
                  </div>

                  <PricingPlans
                    activePlan={membershipPlan}
                    activeRecordId={selectedRecord?._id}
                    onPaymentSuccess={handleMembershipPaymentSuccess}
                  />

                  <Field label="Theme">
                    <Select
                      value={theme}
                      onValueChange={(value) => {
                        const nextTheme = value as ThemeName;
                        if (isThemeAllowed(nextTheme, membershipPlan)) {
                          setTheme(nextTheme);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {themeSections.map((section) => (
                          <div key={section.label}>
                            <div className="px-2 py-1.5 text-xs font-bold uppercase text-muted-foreground">
                              {section.label}
                            </div>
                            {section.items.map((item) => (
                              <SelectItem
                                value={item}
                                key={item}
                                disabled={!accessibleThemes.includes(item)}
                              >
                                <span className="flex w-full min-w-0 items-center justify-between gap-3">
                                  <span className="min-w-0 truncate">{item}</span>
                                  {!accessibleThemes.includes(item) ? (
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                      {getRequiredPlanLabel(item)}
                                    </span>
                                  ) : null}
                                </span>
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {membershipPlan} plan active: {activeSubscription.limitLabel}.
                    </p>
                  </Field>
                  <Button className="w-full" onClick={() => window.print()}>
                    <Download className="h-4 w-4" />
                    Export to PDF
                  </Button>
                </CardContent>
              </Card>

              <article
                id="memorial-card"
                className={cn(
                  "mx-auto min-h-[560px] w-full max-w-2xl rounded-lg border-2 p-5 shadow-soft-gold sm:min-h-[760px] sm:p-10",
                  activeTheme.card,
                  activeTheme.frame,
                )}
              >
                <div className="flex items-center justify-between gap-4 border-b border-current/20 pb-5">
                  <span className={cn("text-sm font-bold", activeTheme.accent)}>
                    SmaranAI Memorial
                  </span>
                  <span className={cn("font-serif text-3xl", activeTheme.accent)}>
                    {activeTheme.motif}
                  </span>
                </div>
                <div className="py-8 text-center sm:py-12">
                  {activePhoto ? (
                    <NextImage
                      alt="Deceased portrait"
                      className="mx-auto mb-7 h-24 w-24 rounded-full border-2 border-current/25 object-cover p-1 sm:h-32 sm:w-32"
                      height={128}
                      src={activePhoto.dataUrl}
                      unoptimized
                      width={128}
                    />
                  ) : null}
                  <p className={cn("text-sm font-bold uppercase", activeTheme.accent)}>
                    In loving memory of
                  </p>
                  <h2 className="mt-4 break-words font-serif text-3xl font-semibold leading-tight sm:text-5xl">
                    {activeName || "Full Name"}
                  </h2>
                  <p className="mt-4 text-sm">{activeDates}</p>
                  <p className="mx-auto mt-8 max-w-xl break-words text-base leading-8 sm:text-lg sm:leading-9">
                    {activeBiography}
                  </p>
                </div>
                <div className="border-t border-current/20 pt-6">
                  <p className={cn("break-words font-serif text-xl sm:text-2xl", activeTheme.accent)}>
                    {activeQuote}
                  </p>
                  <p className="mt-5 break-words leading-8 opacity-85">
                    {activeProfile?.shortTribute ?? form.memories}
                  </p>
                </div>
              </article>
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Life Timeline</CardTitle>
                <CardDescription>
                  {activeProfile
                    ? `Milestones from the active record for ${activeProfile.fullName}.`
                    : "Milestones are mapped from the current draft until a record is selected."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative mx-auto max-w-3xl pl-6 sm:pl-8">
                  <div className="absolute bottom-6 left-3 top-2 w-px bg-[#b9934a]" />
                  {timeline.map((item, index) => (
                    <div className="relative pb-9" key={`${item.year}-${index}`}>
                      <div className="absolute -left-[30px] top-1 h-4 w-4 rounded-full border-2 border-[#b9934a] bg-card" />
                      <p className="text-sm font-bold text-[#9b7436]">
                        {item.year}
                      </p>
                      <h3 className="mt-1 break-words font-serif text-xl sm:text-2xl">
                        {item.title ??
                          (index === 0
                            ? "Birth and Roots"
                            : index === timeline.length - 1
                              ? "Legacy Preserved"
                              : "Life Milestone")}
                      </h3>
                      <p className="mt-2 break-words leading-7 text-muted-foreground">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vault">
            <MemoryVault
              profiles={memoryVaultProfiles}
              activeProfileId={selectedRecord?._id}
              onProfileChange={handleVaultProfileChange}
            />
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StatusMessage({
  state,
}: {
  state:
    | { status: "idle"; message: string }
    | { status: "saving"; message: string }
    | { status: "saved"; message: string }
    | { status: "error"; message: string };
}) {
  if (state.status === "idle") {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        Saved records are preserved in MongoDB.
      </p>
    );
  }

  const isError = state.status === "error";
  const Icon = isError ? AlertCircle : state.status === "saving" ? Loader2 : CheckCircle2;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm leading-6",
        isError
          ? "border-red-300 bg-red-50 text-red-800"
          : "border-[#d4b36c] bg-[#fff8e5] text-[#6f5424]",
      )}
    >
      <Icon className={cn("mt-1 h-4 w-4 shrink-0", state.status === "saving" && "animate-spin")} />
      <span>{state.message}</span>
    </div>
  );
}

function buildMemoryNotes(form: MemorialForm) {
  return [
    form.fullName ? `Full name: ${form.fullName}` : "",
    form.birthDate ? `Birth date: ${form.birthDate}` : "",
    form.passingDate ? `Passing date: ${form.passingDate}` : "",
    form.relation ? `Relation: ${form.relation}` : "",
    form.keyEvents ? `Key life events:\n${form.keyEvents}` : "",
    form.memories ? `Memories and quotes:\n${form.memories}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function recordToForm(record: StoredRecord): MemorialForm {
  const language = normalizeLanguage(record.targetLanguage) ?? "English";
  const notes = record.memoryNotes ?? "";
  const birthDate = extractNoteValue(notes, "Birth date");
  const passingDate = extractNoteValue(notes, "Passing date");
  const relation = extractNoteValue(notes, "Relation");
  const keyEvents =
    extractNoteBlock(notes, "Key life events") ??
    record.profile.timeline
      .map((item) => `${item.year}: ${item.title} - ${item.description}`)
      .join("\n");
  const memories =
    extractNoteBlock(notes, "Memories and quotes") ??
    `${record.profile.shortTribute}\n\n${record.profile.inspirationalQuote}`;

  return {
    fullName: record.profile.fullName,
    birthDate: isDateInputValue(birthDate) ? birthDate : "",
    passingDate: isDateInputValue(passingDate) ? passingDate : "",
    relation: relation ?? "",
    language,
    keyEvents,
    memories,
  };
}

function recordToMemorialProfile(record: StoredRecord): MemorialProfile {
  const notes = record.memoryNotes ?? "";
  const stories =
    extractNoteBlock(notes, "Memories and quotes")
      ?.split("\n")
      .map((line) => line.trim())
      .filter(Boolean) ?? [];

  return {
    id: record._id,
    fullName: record.profile.fullName,
    dates: record.profile.dates,
    relation: extractNoteValue(notes, "Relation") ?? "Family member",
    language: normalizeLanguage(record.targetLanguage) ?? "English",
    shortTribute: record.profile.shortTribute,
    biography: record.profile.biography,
    coreValues: record.profile.coreValues,
    lifeTimeline: buildTimelineFromRecord(record).map((item) => ({
      year: String(item.year),
      title: item.title,
      description: item.text,
    })),
    storiesAndQuotes: stories.length
      ? stories
      : [
          record.profile.shortTribute,
          record.profile.inspirationalQuote,
        ].filter(Boolean),
    avatarUrl: record.deceasedPhoto?.dataUrl,
  };
}

function buildTimelineFromProfile(profile: SavedProfile): TimelineViewItem[] {
  return profile.timeline.map((item) => ({
    year: item.year,
    title: item.title,
    text: item.description,
  }));
}

function buildTimelineFromRecord(record: StoredRecord): TimelineViewItem[] {
  const notes = record.memoryNotes ?? "";
  const form = recordToForm(record);
  const savedBirthDate = extractNoteValue(notes, "Birth date");
  const savedPassingDate = extractNoteValue(notes, "Passing date");
  const savedKeyEvents = extractNoteBlock(notes, "Key life events");
  const recordHasSavedTimelineFields =
    Boolean(
      isDateInputValue(savedBirthDate) ||
        isDateInputValue(savedPassingDate) ||
        savedKeyEvents?.trim(),
    );

  if (recordHasSavedTimelineFields) {
    return parseTimeline({
      ...form,
      birthDate: isDateInputValue(savedBirthDate) ? savedBirthDate : "",
      passingDate: isDateInputValue(savedPassingDate) ? savedPassingDate : "",
      keyEvents: savedKeyEvents ?? "",
    });
  }

  const years = extractYears(`${record.profile.dates}\n${notes}`);
  const parsedEvents = savedKeyEvents ? parseTimelineLines(savedKeyEvents) : [];
  const profileTimeline = buildTimelineFromProfile(record.profile);

  if (
    parsedEvents.length === 0 &&
    profileTimeline.length > 0 &&
    !isGenericTimeline(profileTimeline)
  ) {
    return profileTimeline;
  }

  const birthYear = years[0];
  const passingYear = years.length > 1 ? years[years.length - 1] : undefined;
  const recordName = record.profile.fullName || "Their";
  const timeline: TimelineViewItem[] = [
    birthYear
      ? {
          year: birthYear,
          title: "Birth and Roots",
          text: `${recordName}'s life journey begins.`,
        }
      : undefined,
    ...parsedEvents,
    passingYear && passingYear !== birthYear
      ? {
          year: passingYear,
          title: "Legacy Preserved",
          text: "Their legacy is preserved through memories, words, rituals, and love.",
        }
      : undefined,
  ].filter((item): item is TimelineViewItem => Boolean(item));

  return timeline.length > 0 ? dedupeTimeline(timeline) : profileTimeline;
}

function isGenericTimeline(items: TimelineViewItem[]) {
  const genericTitles = new Set([
    "Early Life",
    "Family and Service",
    "Remembered with Reverence",
  ]);

  return items.some(
    (item) => item.year === "Not specified" || genericTitles.has(item.title),
  );
}

function parseTimelineLines(value: string): TimelineViewItem[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [year, ...rest] = line.split(":");
      const text = rest.length ? rest.join(":").trim() : line;

      return {
        year: rest.length ? year.trim() : "Milestone",
        title: "Life Milestone",
        text,
      };
    });
}

function extractYears(value: string) {
  return Array.from(value.matchAll(/\b(?:18|19|20)\d{2}\b/g), (match) => match[0]);
}

function dedupeTimeline(items: TimelineViewItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.year}-${item.title}-${item.text}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildProfileFromForm(
  form: MemorialForm,
  previousProfile: SavedProfile | null,
): SavedProfile {
  const draftTimeline = parseTimeline(form).map((item) => ({
    year: String(item.year),
    title: item.title,
    description: item.text,
  }));
  const biography = buildBio(form);
  const dates = [form.birthDate, form.passingDate].filter(Boolean).join(" - ");

  return {
    fullName: form.fullName || previousProfile?.fullName || "Beloved Family Elder",
    dates: dates || previousProfile?.dates || "Dates not specified",
    shortTribute:
      form.memories ||
      previousProfile?.shortTribute ||
      "Their life is remembered with affection, dignity, and gratitude.",
    biography,
    coreValues: previousProfile?.coreValues?.length
      ? previousProfile.coreValues
      : ["Compassion", "Family", "Service"],
    timeline: draftTimeline,
    inspirationalQuote:
      previousProfile?.inspirationalQuote ??
      tributeLines[form.language].blessing,
  };
}

function extractNoteValue(notes: string, label: string) {
  const match = notes.match(new RegExp(`${label}:\\s*([^\\n]+)`, "i"));
  return match?.[1]?.trim();
}

function extractNoteBlock(notes: string, label: string) {
  const match = notes.match(
    new RegExp(`${label}:\\s*\\n?([\\s\\S]*?)(?:\\n\\n[A-Z][A-Za-z ]+:|$)`, "i"),
  );
  return match?.[1]?.trim();
}

function isDateInputValue(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read the selected photo."));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getAccessibleThemeNames(plan: MembershipPlan): ThemeName[] {
  if (plan === "Gold") {
    return allThemeNames;
  }

  if (plan === "Standard") {
    return allThemeNames.slice(0, 10);
  }

  return classicThemeNames;
}

function getRecordMembershipPlan(record: StoredRecord): MembershipPlan {
  const plan = record.membership?.plan;

  if (plan === "Standard" || plan === "Gold") {
    return plan;
  }

  return "Basic";
}

function isThemeAllowed(themeName: ThemeName, plan: MembershipPlan) {
  return getAccessibleThemeNames(plan).includes(themeName);
}

function getRequiredPlanLabel(themeName: ThemeName) {
  return allThemeNames.slice(0, 10).includes(themeName) ? "Standard" : "Gold";
}

function normalizeLanguage(value?: string): MemorialForm["language"] | undefined {
  if (value === "Hindi" || value === "Gujarati" || value === "English") {
    return value;
  }

  return undefined;
}
