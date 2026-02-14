/**
 * Euri API Model Definitions
 * All available models on https://euron.one/euri
 * Last updated: Feb 14, 2026
 */

export type EuriModelType = "text" | "embedding" | "image";
export type EuriSpeed = "ultra-fast" | "very-fast" | "fast" | "medium";
export type EuriCost = "very-low" | "low" | "medium" | "high";
export type EuriProvider = "alibaba" | "google" | "groq" | "meta" | "openai" | "together";

export interface EuriModel {
  id: string;
  name: string;
  provider: EuriProvider;
  type: EuriModelType;
  contextWindow: number;
  speed: EuriSpeed;
  cost: EuriCost;
  capabilities: string[];
}

// ── Text Generation Models ──────────────────────────────────────────

export const EURI_TEXT_MODELS: EuriModel[] = [
  // Alibaba
  {
    id: "qwen/qwen3-32b",
    name: "Qwen 3 32B",
    provider: "alibaba",
    type: "text",
    contextWindow: 128_000,
    speed: "fast",
    cost: "medium",
    capabilities: ["Text Generation", "Code Generation", "Mathematical Reasoning"],
  },

  // Google
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "google",
    type: "text",
    contextWindow: 1_000_000,
    speed: "very-fast",
    cost: "low",
    capabilities: ["Text Generation", "Code Generation", "Multimodal"],
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    type: "text",
    contextWindow: 2_000_000,
    speed: "fast",
    cost: "medium",
    capabilities: ["Text Generation", "Code Generation", "Mathematical Reasoning"],
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    type: "text",
    contextWindow: 1_000_000,
    speed: "very-fast",
    cost: "low",
    capabilities: ["Text Generation", "Code Generation", "Mathematical Reasoning"],
  },
  {
    id: "gemini-2.5-pro-preview-06-05",
    name: "Gemini 2.5 Pro Preview",
    provider: "google",
    type: "text",
    contextWindow: 2_000_000,
    speed: "fast",
    cost: "medium",
    capabilities: ["Text Generation", "Code Generation", "Mathematical Reasoning"],
  },
  {
    id: "gemini-2.5-flash-preview-05-20",
    name: "Gemini 2.5 Flash Preview",
    provider: "google",
    type: "text",
    contextWindow: 1_000_000,
    speed: "very-fast",
    cost: "low",
    capabilities: ["Text Generation", "Code Generation", "Mathematical Reasoning"],
  },
  {
    id: "gemini-2.5-flash-lite-preview-06-17",
    name: "Gemini 2.5 Flash Lite Preview",
    provider: "google",
    type: "text",
    contextWindow: 128_000,
    speed: "ultra-fast",
    cost: "very-low",
    capabilities: ["Text Generation", "Conversation", "Instruction Following"],
  },

  // Groq
  {
    id: "groq/compound",
    name: "Groq Compound",
    provider: "groq",
    type: "text",
    contextWindow: 131_000,
    speed: "fast",
    cost: "medium",
    capabilities: ["Text Generation", "Code Generation", "Web Search"],
  },
  {
    id: "groq/compound-mini",
    name: "Groq Compound Mini",
    provider: "groq",
    type: "text",
    contextWindow: 131_000,
    speed: "fast",
    cost: "medium",
    capabilities: ["Text Generation", "Code Generation", "Web Search"],
  },

  // Meta
  {
    id: "llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout",
    provider: "meta",
    type: "text",
    contextWindow: 128_000,
    speed: "fast",
    cost: "medium",
    capabilities: ["Text Generation", "Conversation", "Instruction Following"],
  },
  {
    id: "llama-4-maverick-17b-128e-instruct",
    name: "Llama 4 Maverick",
    provider: "meta",
    type: "text",
    contextWindow: 128_000,
    speed: "medium",
    cost: "medium",
    capabilities: ["Text Generation", "Conversation", "Instruction Following"],
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B",
    provider: "meta",
    type: "text",
    contextWindow: 128_000,
    speed: "medium",
    cost: "high",
    capabilities: ["Text Generation", "Code Generation", "Mathematical Reasoning"],
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    provider: "meta",
    type: "text",
    contextWindow: 128_000,
    speed: "very-fast",
    cost: "low",
    capabilities: ["Text Generation", "Code Generation", "Conversation"],
  },
  {
    id: "llama-guard-4-12b",
    name: "Llama Guard 4 12B",
    provider: "meta",
    type: "text",
    contextWindow: 128_000,
    speed: "fast",
    cost: "low",
    capabilities: ["Text Generation", "Conversation", "Instruction Following"],
  },

  // OpenAI
  {
    id: "gpt-5-nano-2025-08-07",
    name: "GPT-5 Nano",
    provider: "openai",
    type: "text",
    contextWindow: 128_000,
    speed: "ultra-fast",
    cost: "very-low",
    capabilities: ["Text Generation", "Conversation", "Instruction Following"],
  },
  {
    id: "gpt-5-mini-2025-08-07",
    name: "GPT-5 Mini",
    provider: "openai",
    type: "text",
    contextWindow: 128_000,
    speed: "fast",
    cost: "low",
    capabilities: ["Text Generation", "Code Generation", "Mathematical Reasoning"],
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    provider: "openai",
    type: "text",
    contextWindow: 128_000,
    speed: "ultra-fast",
    cost: "very-low",
    capabilities: ["Text Generation", "Conversation", "Instruction Following"],
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "openai",
    type: "text",
    contextWindow: 128_000,
    speed: "fast",
    cost: "low",
    capabilities: ["Text Generation", "Code Generation", "Mathematical Reasoning"],
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT-OSS 20B",
    provider: "openai",
    type: "text",
    contextWindow: 128_000,
    speed: "fast",
    cost: "medium",
    capabilities: ["Text Generation", "Code Generation", "Mathematical Reasoning"],
  },
  {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    provider: "openai",
    type: "text",
    contextWindow: 128_000,
    speed: "medium",
    cost: "high",
    capabilities: ["Text Generation", "Code Generation", "Mathematical Reasoning"],
  },
];

// ── Embedding Models ────────────────────────────────────────────────

export const EURI_EMBEDDING_MODELS: EuriModel[] = [
  {
    id: "gemini-embedding-001",
    name: "Gemini Embedding 001",
    provider: "google",
    type: "embedding",
    contextWindow: 8_000,
    speed: "very-fast",
    cost: "very-low",
    capabilities: ["Semantic Search", "Text Classification", "Named Entity Recognition"],
  },
  {
    id: "text-embedding-3-small",
    name: "Text Embedding 3 Small",
    provider: "openai",
    type: "embedding",
    contextWindow: 8_000,
    speed: "very-fast",
    cost: "very-low",
    capabilities: ["Semantic Search", "Text Classification", "Named Entity Recognition"],
  },
  {
    id: "togethercomputer/m2-bert-80M-32k-retrieval",
    name: "M2 BERT 80M 32K Retrieval",
    provider: "together",
    type: "embedding",
    contextWindow: 32_000,
    speed: "very-fast",
    cost: "very-low",
    capabilities: ["Semantic Search", "Text Classification", "Named Entity Recognition"],
  },
];

// ── Image Generation Models ─────────────────────────────────────────

export const EURI_IMAGE_MODELS: EuriModel[] = [
  {
    id: "gemini-3-pro-image-preview",
    name: "Gemini 3 Pro Image Preview",
    provider: "google",
    type: "image",
    contextWindow: 0,
    speed: "very-fast",
    cost: "low",
    capabilities: ["Image Generation", "Multimodal", "Creative Writing"],
  },
];

// ── All Models ──────────────────────────────────────────────────────

export const ALL_EURI_MODELS: EuriModel[] = [
  ...EURI_TEXT_MODELS,
  ...EURI_EMBEDDING_MODELS,
  ...EURI_IMAGE_MODELS,
];

// ── Defaults ────────────────────────────────────────────────────────

export const EURI_DEFAULT_TEXT_MODEL = "gemini-2.5-flash";
export const EURI_DEFAULT_FAST_MODEL = "gemini-2.5-flash-lite-preview-06-17";
export const EURI_DEFAULT_SMART_MODEL = "gemini-2.5-pro";
export const EURI_DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
export const EURI_DEFAULT_IMAGE_MODEL = "gemini-3-pro-image-preview";

// ── Helpers ─────────────────────────────────────────────────────────

export function getEuriModel(id: string): EuriModel | undefined {
  return ALL_EURI_MODELS.find((m) => m.id === id);
}

export function getEuriModelsByProvider(provider: EuriProvider): EuriModel[] {
  return ALL_EURI_MODELS.filter((m) => m.provider === provider);
}

export function getEuriModelsByType(type: EuriModelType): EuriModel[] {
  return ALL_EURI_MODELS.filter((m) => m.type === type);
}
