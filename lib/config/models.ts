/**
 * Gemini Model Configuration for File Search
 * Models that support File Search tool
 */

export type GeminiModel = {
  value: string;
  label: string;
  description: string;
  tier: "stable" | "experimental";
  pricingTier: "free" | "paid" | "experimental";
  isDefault?: boolean;
};

export const GEMINI_MODELS: GeminiModel[] = [
  {
    value: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Nhanh, cân bằng chất lượng",
    tier: "stable",
    pricingTier: "free",
    isDefault: true,
  },
  {
    value: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Chất lượng cao",
    tier: "stable",
    pricingTier: "free",
  },
  {
    value: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    description: "Nhanh nhất, nhẹ",
    tier: "stable",
    pricingTier: "free",
  },
  {
    value: "gemini-2.0-flash-lite",
    label: "Gemini 2.0 Flash Lite",
    description: "Phiên bản cũ, ổn định",
    tier: "stable",
    pricingTier: "free",
  },
];

export const DEFAULT_MODEL =
  GEMINI_MODELS.find((m) => m.isDefault)?.value || "gemini-2.5-flash";
