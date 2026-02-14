/**
 * Euri API Client - TypeScript
 * Reusable across any Next.js / Node.js project
 *
 * Usage:
 *   import { EuriClient } from './euri-client';
 *   const euri = new EuriClient(process.env.EURI_API_KEY!);
 *   const response = await euri.chat("Hello!");
 */

import {
  EURI_DEFAULT_TEXT_MODEL,
  EURI_DEFAULT_EMBEDDING_MODEL,
  EURI_DEFAULT_IMAGE_MODEL,
} from "./euri-models";

// ── Types ───────────────────────────────────────────────────────────

export interface EuriContentPart {
  type: "text";
  text: string;
}

export interface EuriChatMessage {
  role: "system" | "user" | "assistant";
  content: string | EuriContentPart[];
}

export interface EuriChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

export interface EuriChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: { role: string; content: string | EuriContentPart[] };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface EuriEmbeddingResponse {
  object: string;
  data: { object: string; index: number; embedding: number[] }[];
  model: string;
  usage?: { prompt_tokens: number; total_tokens: number };
}

export interface EuriImageResponse {
  created: number;
  data: { url?: string; b64_json?: string }[];
}

// ── Constants ───────────────────────────────────────────────────────

const EURI_BASE_URL = "https://api.euron.one/api/v1/euri";
const DAILY_TOKEN_LIMIT = 200_000;

// ── Client ──────────────────────────────────────────────────────────

export class EuriClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    if (!apiKey) throw new Error("EURI_API_KEY is required");
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || EURI_BASE_URL;
  }

  private async request<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Euri API error (${res.status}): ${error}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Chat Completions ────────────────────────────────────────────

  /**
   * Send chat messages and get a completion.
   * OpenAI-compatible format.
   */
  async chatCompletion(
    messages: EuriChatMessage[],
    options: EuriChatOptions = {}
  ): Promise<EuriChatResponse> {
    return this.request<EuriChatResponse>("/chat/completions", {
      model: options.model || EURI_DEFAULT_TEXT_MODEL,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1000,
      ...(options.top_p !== undefined && { top_p: options.top_p }),
      ...(options.stream !== undefined && { stream: options.stream }),
    });
  }

  /**
   * Simple single-prompt chat (convenience method).
   */
  async chat(
    prompt: string,
    options: EuriChatOptions & { systemPrompt?: string } = {}
  ): Promise<string> {
    const messages: EuriChatMessage[] = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await this.chatCompletion(messages, options);
    return extractTextContent(response.choices[0]?.message?.content);
  }

  // ── Embeddings ──────────────────────────────────────────────────

  /**
   * Generate embeddings for text input.
   */
  async embedding(
    input: string | string[],
    model?: string
  ): Promise<EuriEmbeddingResponse> {
    return this.request<EuriEmbeddingResponse>("/embeddings", {
      model: model || EURI_DEFAULT_EMBEDDING_MODEL,
      input,
    });
  }

  /**
   * Get embedding vector for a single text (convenience method).
   */
  async embed(text: string, model?: string): Promise<number[]> {
    const response = await this.embedding(text, model);
    return response.data[0]?.embedding || [];
  }

  // ── Image Generation ────────────────────────────────────────────

  /**
   * Generate images from text descriptions.
   */
  async generateImage(
    prompt: string,
    options: { model?: string; n?: number; size?: string } = {}
  ): Promise<EuriImageResponse> {
    return this.request<EuriImageResponse>("/images/generations", {
      model: options.model || EURI_DEFAULT_IMAGE_MODEL,
      prompt,
      n: options.n ?? 1,
      ...(options.size && { size: options.size }),
    });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Extract text from Euri response content.
 * Content can be a plain string OR an array [{type:"text", text:"..."}]
 */
function extractTextContent(content: string | EuriContentPart[] | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
  }
  return "";
}

export { extractTextContent };

// ── Factory ─────────────────────────────────────────────────────────

/**
 * Create a client from environment variable.
 * Reads EURI_API_KEY from process.env.
 */
export function createEuriClient(): EuriClient {
  const apiKey = process.env.EURI_API_KEY;
  if (!apiKey) {
    throw new Error("EURI_API_KEY environment variable is not set");
  }
  return new EuriClient(apiKey);
}

// ── Token Budget Helper ─────────────────────────────────────────────

export { DAILY_TOKEN_LIMIT, EURI_BASE_URL };
