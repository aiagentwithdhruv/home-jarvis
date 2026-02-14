export interface RealtimePricing {
  audioInputPer1M: number;
  audioOutputPer1M: number;
  textInputPer1M: number;
  textOutputPer1M: number;
}

const REALTIME_PRICING: Record<string, RealtimePricing> = {
  'gpt-4o-realtime': {
    audioInputPer1M: 100.00,
    audioOutputPer1M: 200.00,
    textInputPer1M: 5.00,
    textOutputPer1M: 20.00,
  },
  'gpt-4o-mini-realtime': {
    audioInputPer1M: 10.00,
    audioOutputPer1M: 20.00,
    textInputPer1M: 0.60,
    textOutputPer1M: 2.40,
  },
};

export function calculateRealtimeCost(
  modelId: string,
  audioInputTokens: number,
  audioOutputTokens: number,
  textInputTokens: number,
  textOutputTokens: number
): number {
  let pricing: RealtimePricing | undefined;
  for (const key of Object.keys(REALTIME_PRICING)) {
    if (modelId.includes(key)) { pricing = REALTIME_PRICING[key]; break; }
  }
  if (!pricing) pricing = REALTIME_PRICING['gpt-4o-mini-realtime'];
  const audioCost =
    (audioInputTokens / 1_000_000) * pricing.audioInputPer1M +
    (audioOutputTokens / 1_000_000) * pricing.audioOutputPer1M;
  const textCost =
    (textInputTokens / 1_000_000) * pricing.textInputPer1M +
    (textOutputTokens / 1_000_000) * pricing.textOutputPer1M;
  return Math.round((audioCost + textCost) * 1_000_000) / 1_000_000;
}
