export type MemorialLanguage = "Hindi" | "English" | "Gujarati";

export type VaultMessage = {
  role: "user" | "assistant";
  content: string;
};

export interface MemorialProfile {
  id: string;
  fullName: string;
  dates: string;
  relation: string;
  language: MemorialLanguage;
  shortTribute: string;
  biography: string;
  coreValues: string[];
  lifeTimeline: Array<{
    year: string;
    title: string;
    description: string;
  }>;
  storiesAndQuotes: string[];
  avatarUrl?: string;
}

export const mockMemorialProfiles: MemorialProfile[] = [
  {
    id: "sample-grandfather-rk-sharma",
    fullName: "Late Shri R.K. Sharma",
    dates: "1948 - 2024",
    relation: "Grandfather / Dadaji",
    language: "English",
    shortTribute:
      "A dignified family elder remembered for wisdom, discipline, kindness, and quiet devotion to family.",
    biography:
      "Late Shri R.K. Sharma grew up with modest means and carried a deep respect for education, family duty, and honest work throughout his life.\n\nHe guided younger generations with patient advice, steady values, and a belief that family harmony was one of life's greatest responsibilities.\n\nHis legacy lives through the stories he told, the blessings he gave, and the principles of seva, integrity, and gratitude that remain within the family.",
    coreValues: ["Integrity", "Family unity", "Education", "Seva", "Discipline"],
    lifeTimeline: [
      {
        year: "1948",
        title: "Birth and Roots",
        description:
          "Born into a family that valued simplicity, education, and respect for elders.",
      },
      {
        year: "1972",
        title: "Early Career",
        description:
          "Began a career known for discipline, reliability, and sincere service.",
      },
      {
        year: "1980",
        title: "Family Guidance",
        description:
          "Became a steady guide for the family, offering calm advice and blessings.",
      },
      {
        year: "2024",
        title: "Legacy Preserved",
        description:
          "Remembered through family stories, values, and the blessings he shared.",
      },
    ],
    storiesAndQuotes: [
      "He often reminded the family that respect, patience, and education are wealth that cannot be lost.",
      "Family should sit together, eat together, and solve difficulties with calm words.",
      "His blessing before important journeys was remembered as a source of courage.",
    ],
  },
];

export function findMockMemorialProfile(profileId: string) {
  return mockMemorialProfiles.find((profile) => profile.id === profileId);
}
