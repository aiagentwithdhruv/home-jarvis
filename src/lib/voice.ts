/**
 * Jarvis - OpenAI Realtime Voice Engine
 * Adapted from Angelina AI voice system
 */

export interface VoiceConfig {
  apiKey: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  model?: string;
  instructions?: string;
  tools?: Array<{
    name: string;
    description: string;
    parameters: object;
  }>;
}

export interface VoiceEvents {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onListening?: () => void;
  onSpeaking?: (text: string) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onResponse?: (text: string) => void;
  onToolCall?: (name: string, args: object) => Promise<any>;
  onError?: (error: Error) => void;
}

export class OpenAIRealtimeVoice {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private config: VoiceConfig;
  private events: VoiceEvents;
  private isConnected = false;

  constructor(config: VoiceConfig, events: VoiceEvents = {}) {
    this.config = {
      voice: 'onyx',
      model: 'gpt-4o-mini-realtime-preview-2024-12-17',
      ...config,
    };
    this.events = events;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `wss://api.openai.com/v1/realtime?model=${this.config.model}`;

        this.ws = new WebSocket(url, [
          'realtime',
          `openai-insecure-api-key.${this.config.apiKey}`,
          'openai-beta.realtime-v1',
        ]);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.sendEvent('session.update', {
            session: {
              modalities: ['text', 'audio'],
              voice: this.config.voice,
              instructions: this.config.instructions,
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: { model: 'whisper-1' },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              },
              tools: this.config.tools?.map(t => ({
                type: 'function',
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              })) || [],
            },
          });
          this.events.onConnected?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          this.handleServerEvent(data);
        };

        this.ws.onerror = (error) => {
          this.events.onError?.(new Error('WebSocket connection failed'));
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.events.onDisconnected?.();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async startListening(): Promise<void> {
    if (!this.isConnected) await this.connect();
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 24000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.processor.onaudioprocess = (event) => {
        if (!this.isConnected) return;
        const inputData = event.inputBuffer.getChannelData(0);
        const pcm16 = this.float32ToPCM16(inputData);
        const base64 = this.arrayBufferToBase64(pcm16.buffer as ArrayBuffer);
        this.sendEvent('input_audio_buffer.append', { audio: base64 });
      };
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.events.onListening?.();
    } catch (error) {
      this.events.onError?.(error as Error);
      throw error;
    }
  }

  stopListening(): void {
    if (this.processor) { this.processor.disconnect(); this.processor = null; }
    if (this.mediaStream) { this.mediaStream.getTracks().forEach(track => track.stop()); this.mediaStream = null; }
    if (this.audioContext) { this.audioContext.close(); this.audioContext = null; }
    if (this.isConnected) this.sendEvent('input_audio_buffer.commit', {});
  }

  sendMessage(text: string): void {
    if (!this.isConnected) return;
    this.sendEvent('conversation.item.create', {
      item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
    });
    this.sendEvent('response.create', {});
  }

  interrupt(): void {
    if (this.isConnected) this.sendEvent('response.cancel', {});
  }

  disconnect(): void {
    this.stopListening();
    if (this.ws) { this.ws.close(); this.ws = null; }
    this.isConnected = false;
  }

  private sendEvent(type: string, data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  private handleServerEvent(event: any): void {
    switch (event.type) {
      case 'conversation.item.input_audio_transcription.completed':
        this.events.onTranscript?.(event.transcript, true);
        break;
      case 'response.audio_transcript.delta':
        this.events.onSpeaking?.(event.delta);
        break;
      case 'response.audio_transcript.done':
        this.events.onResponse?.(event.transcript);
        break;
      case 'response.audio.delta':
        this.playAudio(event.delta);
        break;
      case 'response.function_call_arguments.done':
        this.handleToolCall(event);
        break;
      case 'error':
        this.events.onError?.(new Error(event.error?.message || 'Unknown error'));
        break;
    }
  }

  private async handleToolCall(event: any): Promise<void> {
    const { name, arguments: argsJson, call_id } = event;
    try {
      const args = JSON.parse(argsJson);
      const result = await this.events.onToolCall?.(name, args);
      this.sendEvent('conversation.item.create', {
        item: { type: 'function_call_output', call_id, output: JSON.stringify(result || {}) },
      });
      this.sendEvent('response.create', {});
    } catch (error) {
      console.error('Tool execution error:', error);
    }
  }

  private playAudio(base64Audio: string): void {
    const audioData = this.base64ToArrayBuffer(base64Audio);
    const pcm16 = new Int16Array(audioData);
    const float32 = this.pcm16ToFloat32(pcm16);
    if (!this.audioContext) this.audioContext = new AudioContext({ sampleRate: 24000 });
    const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(new Float32Array(float32), 0);
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start();
  }

  private float32ToPCM16(float32: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm16;
  }

  private pcm16ToFloat32(pcm16: Int16Array): Float32Array {
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
    }
    return float32;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }
}
