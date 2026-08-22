"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  mockMemorialProfiles,
  type MemorialLanguage,
  type MemorialProfile,
  type VaultMessage,
} from "@/types/memorial";

type MemoryVaultProps = {
  profiles: MemorialProfile[];
  activeProfileId?: string;
  onProfileChange?: (profileId: string) => void;
};

type ChatBubble = VaultMessage & {
  id: string;
};

const languageLabels: Record<MemorialLanguage, string> = {
  English: "English",
  Hindi: "हिन्दी",
  Gujarati: "ગુજરાતી",
};

const missingInfoFallback: Record<MemorialLanguage, string> = {
  English:
    "This particular memory has not yet been preserved in the family heritage archive. Would you like to record it?",
  Hindi:
    "यह संस्मरण अभी तक हमारे पारिवारिक विरासत संग्रह में दर्ज नहीं है। क्या आप इसे जोड़ना चाहेंगे?",
  Gujarati:
    "આ સ્મૃતિ હજુ સુધી પરિવારના વારસા સંગ્રહમાં નોંધાઈ નથી. શું તમે તેને ઉમેરવા માંગો છો?",
};

const quickPrompts: Record<MemorialLanguage, string[]> = {
  English: [
    "Tell me about their core life principles",
    "Describe their early career and milestones",
    "What advice did they share about family?",
  ],
  Hindi: [
    "उनके जीवन के मुख्य सिद्धांत क्या थे?",
    "उनकी प्रमुख उपलब्धियों के बारे में बताएं",
    "परिवार और संस्कारों पर उनका क्या संदेश था?",
  ],
  Gujarati: [
    "તેમના જીવનના મુખ્ય સિદ્ધાંતો શું હતા?",
    "તેમની મુખ્ય સિદ્ધિઓ વિશે કહો",
    "પરિવાર અને સંસ્કારો વિશે તેમનો સંદેશ શું હતો?",
  ],
};

export default function MemoryVault({
  profiles,
  activeProfileId,
  onProfileChange,
}: MemoryVaultProps) {
  const [demoProfiles, setDemoProfiles] = useState<MemorialProfile[]>([]);
  const allProfiles = useMemo(() => {
    const profileMap = new Map<string, MemorialProfile>();

    [...profiles, ...demoProfiles].forEach((profile) => {
      profileMap.set(profile.id, profile);
    });

    return Array.from(profileMap.values());
  }, [demoProfiles, profiles]);
  const [selectedProfileId, setSelectedProfileId] = useState(
    activeProfileId ?? allProfiles[0]?.id ?? "",
  );
  const activeProfile = allProfiles.find(
    (profile) => profile.id === selectedProfileId,
  );
  const [language, setLanguage] = useState<MemorialLanguage>(
    activeProfile?.language ?? "English",
  );
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");
  const feedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeProfileId) {
      setSelectedProfileId(activeProfileId);
    } else if (!selectedProfileId && allProfiles[0]) {
      setSelectedProfileId(allProfiles[0].id);
    }
  }, [activeProfileId, allProfiles, selectedProfileId]);

  useEffect(() => {
    const profileLanguage = activeProfile?.language;

    if (profileLanguage) {
      setLanguage(profileLanguage);
    }
    clearChat();
  }, [activeProfile?.id, activeProfile?.language]);

  useEffect(() => {
    feedRef.current?.scrollTo({
      top: feedRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [isTyping, messages]);

  function handleProfileChange(profileId: string) {
    setSelectedProfileId(profileId);
    onProfileChange?.(profileId);
    clearChat();
  }

  function loadSampleProfile() {
    const sample = mockMemorialProfiles[0];
    setDemoProfiles((currentProfiles) =>
      currentProfiles.some((profile) => profile.id === sample.id)
        ? currentProfiles
        : [sample, ...currentProfiles],
    );
    setSelectedProfileId(sample.id);
    setLanguage(sample.language);
    onProfileChange?.(sample.id);
    clearChat();
  }

  function clearChat() {
    setMessages([]);
    setInput("");
    setError("");
  }

  async function sendMessage(question?: string) {
    const content = (question ?? input).trim();

    if (!content || !activeProfile) {
      return;
    }

    const nextMessages: ChatBubble[] = [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: "user",
        content,
      },
    ];

    setMessages(nextMessages);
    setInput("");
    setError("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/memory-vault/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: activeProfile.id,
          targetLanguage: language,
          messages: nextMessages.map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
        }),
      });
      const data = (await response.json()) as { answer?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "The Memory Vault could not answer right now.");
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer ?? missingInfoFallback[language],
        },
      ]);
    } catch (chatError) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            chatError instanceof Error
              ? chatError.message
              : missingInfoFallback[language],
        },
      ]);
      setError(
        chatError instanceof Error
          ? chatError.message
          : "The Memory Vault could not answer right now.",
      );
    } finally {
      setIsTyping(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  const verifiedMemoryCount = activeProfile
    ? activeProfile.coreValues.length +
      activeProfile.lifeTimeline.length +
      activeProfile.storiesAndQuotes.length +
      activeProfile.biography.split(/\n{2,}/).filter(Boolean).length
    : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-[#fbf7ee]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <CardTitle>Memory Vault</CardTitle>
              <CardDescription>
                Select a saved record to ground the archive chat.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(languageLabels) as MemorialLanguage[]).map((item) => (
                <Button
                  className="h-9"
                  key={item}
                  type="button"
                  size="sm"
                  variant={language === item ? "default" : "outline"}
                  onClick={() => setLanguage(item)}
                >
                  {languageLabels[item]}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-5 p-4 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <Select
              value={selectedProfileId}
              onValueChange={handleProfileChange}
            >
              <SelectTrigger className="h-auto min-h-12">
                <SelectValue placeholder="Select a saved memorial record" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {allProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-border bg-[#fbf7ee]">
                        {profile.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt=""
                            className="h-full w-full object-cover"
                            src={profile.avatarUrl}
                          />
                        ) : (
                          <UserRound className="h-4 w-4 text-muted-foreground" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {profile.fullName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {profile.relation}
                        </span>
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              onClick={loadSampleProfile}
            >
              <BookOpen className="h-4 w-4" />
              Load Sample Grandfather Profile
            </Button>
          </div>

          {activeProfile ? (
            <div className="rounded-md border border-[#d7b66c]/70 bg-[#fff8e5] px-4 py-3 text-sm leading-6 text-[#5f461d]">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-1 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-bold">
                    Grounded in: {activeProfile.fullName}&apos;s Heritage Vault
                  </p>
                  <p className="text-xs">
                    {verifiedMemoryCount} verified memories · {activeProfile.relation} · {activeProfile.dates}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-border bg-[#fbf7ee] px-4 py-3 text-sm leading-6 text-muted-foreground">
              Select a saved memorial record or load the sample grandfather profile to begin.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {quickPrompts[language].map((prompt) => (
              <Button
                className="h-auto justify-start whitespace-normal rounded-md border-[#d7b66c]/60 bg-card px-3 py-2 text-left text-xs leading-5"
                disabled={!activeProfile || isTyping}
                key={prompt}
                type="button"
                variant="outline"
                onClick={() => void sendMessage(prompt)}
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#9b7436]" />
                {prompt}
              </Button>
            ))}
          </div>

          <div
            className="flex h-[460px] flex-col gap-4 overflow-y-auto rounded-lg border border-border bg-[#fbf7ee] p-4"
            ref={feedRef}
          >
            {messages.length === 0 ? (
              <div className="m-auto max-w-md text-center text-sm leading-7 text-muted-foreground">
                <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-[#b9934a]" />
                Ask a question about the selected profile. The Vault will answer only from preserved memories, values, biography, and timeline details.
              </div>
            ) : null}

            {messages.map((message) => (
              <div
                className={cn(
                  "max-w-[86%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm",
                  message.role === "user"
                    ? "ml-auto bg-[#2f3437] text-[#fffaf0]"
                    : "border border-[#d7b66c]/50 bg-card text-foreground",
                )}
                key={message.id}
              >
                {message.content}
              </div>
            ))}

            {isTyping ? (
              <div className="max-w-[86%] rounded-lg border border-[#d7b66c]/50 bg-card px-4 py-3 text-sm leading-6 text-muted-foreground shadow-sm">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memory Vault is reading the preserved archive...
                </span>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
              {error}
            </div>
          ) : null}

          <form className="flex gap-3" onSubmit={handleSubmit}>
            <Input
              aria-label="Ask the Memory Vault"
              disabled={!activeProfile || isTyping}
              placeholder={
                activeProfile
                  ? "Ask from this grounded heritage archive..."
                  : "Select a profile first..."
              }
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <Button
              aria-label="Send message"
              disabled={!activeProfile || isTyping || !input.trim()}
              size="icon"
              type="submit"
            >
              {isTyping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vault Controls</CardTitle>
          <CardDescription>
            Keep each conversation tied to one verified profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button
            className="justify-start"
            disabled={messages.length === 0 && !input}
            type="button"
            variant="outline"
            onClick={clearChat}
          >
            <RefreshCw className="h-4 w-4" />
            Clear chat history
          </Button>
          <div className="rounded-md border border-border bg-[#fbf7ee] p-4 text-sm leading-7 text-muted-foreground">
            <BookOpen className="mb-2 h-5 w-5 text-[#9b7436]" />
            The Vault uses the selected profile&apos;s name, dates, relationship, biography, values, timeline, and preserved stories. If a detail is missing, it should invite the family to record it.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
