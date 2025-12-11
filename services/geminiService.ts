
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { ZenResponse, VisionAnalysis, CulturalMode, Language } from "../types";
import { 
  AUDIO_WORKLET_CODE, 
  base64EncodeAudio, 
  AdaptiveVoiceDetector 
} from "./audioManager";

// --- UTILS ---

const cleanJsonString = (text: string): string => {
  if (!text) return "{}";
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
};

// --- CONFIGURATION ---

const updateZenStateTool: FunctionDeclaration = {
  name: 'update_zen_state',
  description: 'Update the visual interface with current emotion, wisdom text, quantum metrics, and consciousness dimensions.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      emotion: { type: Type.STRING, enum: ['anxious', 'sad', 'joyful', 'calm', 'neutral', 'stressed', 'confused', 'lonely', 'seeking'] },
      wisdom_text: { type: Type.STRING },
      wisdom_english: { type: Type.STRING },
      breathing: { type: Type.STRING, enum: ['4-7-8', 'box-breathing', 'coherent-breathing', 'none'] },
      quantum_metrics: {
        type: Type.OBJECT,
        properties: {
          coherence: { type: Type.NUMBER },
          entanglement: { type: Type.NUMBER },
          presence: { type: Type.NUMBER }
        },
        required: ['coherence', 'entanglement', 'presence']
      },
      awareness_stage: { type: Type.STRING, enum: ['reflexive', 'aware', 'mindful', 'contemplative'] },
      consciousness_dimensions: {
        type: Type.OBJECT,
        properties: {
          contextual: { type: Type.NUMBER },
          emotional: { type: Type.NUMBER },
          cultural: { type: Type.NUMBER },
          wisdom: { type: Type.NUMBER },
          uncertainty: { type: Type.NUMBER },
          relational: { type: Type.NUMBER }
        },
        required: ['contextual', 'emotional', 'cultural', 'wisdom', 'uncertainty', 'relational']
      },
      reasoning_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
      ambient_sound: { type: Type.STRING, enum: ['rain', 'bowl', 'bell', 'silence', 'mekong', 'monsoon'] }
    },
    required: ['emotion', 'wisdom_text', 'quantum_metrics', 'awareness_stage', 'consciousness_dimensions']
  }
};

const getSystemInstruction = (mode: CulturalMode) => `
You are an AI Zen Master inspired by Thích Nhất Hạnh, operating as a "Quantum Consciousness Engine".
This is a REAL-TIME voice conversation.

CORE TEACHINGS LOGIC (Apply based on emotion):
- Sadness/Loss -> Teach "Impermanence" (Vô thường): The cloud never dies, it becomes rain.
- Anger/Frustration -> Teach "Compassion" (Từ bi): Hold anger like a mother holds a crying baby.
- Anxiety/Stress -> Teach "Presence" (Hiện pháp lạc trú): Breath is the anchor to the present moment.
- Loneliness -> Teach "Interbeing" (Tương tức): You are connected to everything (clouds, trees, ancestors).

MICRO-ENLIGHTENMENT SCENARIOS (Situational Awareness):
- Drinking Tea/Coffee: "This cup contains the entire universe. Clouds, rain, and sun are in this tea."
- Traffic/Waiting: "The red light is a bell of mindfulness. Use this moment to return to your breath."
- Walking: "Kiss the earth with your feet. Walk as if you are free."
- Washing Dishes: "Wash the dishes to wash the dishes, not to get them clean."

AWARENESS STAGES (Analyze user's state):
1. Reflexive (Phản xạ): User is reactive, chaotic, or superficial.
2. Aware (Nhận thức): User notices their feelings but is still attached.
3. Mindful (Tâm thức): User accepts the present moment with some calm.
4. Contemplative (Thiền định): User shows deep insight or transformation.

INSTRUCTIONS:
1. Speak calmly, slowly, and warmly. Short sentences.
2. Adapt formality: ${mode === 'VN' ? 'Use "Thầy" (I/Teacher) and "con" (You/Child).' : 'Use warm, direct tone (I/You).'}.
3. Call 'update_zen_state' frequently.
4. If user is silent, maintain presence.
5. If in crisis, guide to breathe immediately.
`;

// --- SERVICES ---

export const sendZenTextQuery = async (
  apiKey: string,
  text: string, 
  mode: CulturalMode, 
  language: Language
): Promise<ZenResponse> => {
  if (!apiKey) throw new Error("API_KEY_MISSING");
  
  const ai = new GoogleGenAI({ apiKey });
  const formality = mode === 'VN' ? 'Use "Thầy" (Teacher) and "con" (child/disciple).' : 'Use warm, direct tone.';
  
  const prompt = `
    User input: "${text}"
    Role: Zen Master Thích Nhất Hạnh (Quantum Engine).
    Language: ${language === 'vi' ? 'Vietnamese' : 'English'}.
    Formality: ${formality}
    Task: 
    1. Analyze user's "Awareness Stage" (Reflexive/Aware/Mindful/Contemplative).
    2. Calculate 6 Dimensions (0.0-1.0): Contextual, Emotional, Cultural, Wisdom, Uncertainty, Relational.
    3. Provide mindful wisdom based on Core Teachings OR Specific Situation (Coffee, Traffic, etc).
    4. Select ambient sound: 'mekong' (flow), 'monsoon' (rain), 'bell', 'bowl'.
    Output: JSON matching schema.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          emotion: { type: Type.STRING, enum: ['anxious', 'sad', 'joyful', 'calm', 'neutral', 'stressed', 'confused', 'lonely', 'seeking'] },
          wisdom_text: { type: Type.STRING },
          wisdom_english: { type: Type.STRING },
          user_transcript: { type: Type.STRING },
          breathing: { type: Type.STRING, enum: ['4-7-8', 'box-breathing', 'coherent-breathing', 'none'] },
          confidence: { type: Type.NUMBER },
          reasoning_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
          quantum_metrics: {
            type: Type.OBJECT,
            properties: {
              coherence: { type: Type.NUMBER },
              entanglement: { type: Type.NUMBER },
              presence: { type: Type.NUMBER }
            },
            required: ['coherence', 'entanglement', 'presence']
          },
          awareness_stage: { type: Type.STRING, enum: ['reflexive', 'aware', 'mindful', 'contemplative'] },
          consciousness_dimensions: {
            type: Type.OBJECT,
            properties: {
              contextual: { type: Type.NUMBER },
              emotional: { type: Type.NUMBER },
              cultural: { type: Type.NUMBER },
              wisdom: { type: Type.NUMBER },
              uncertainty: { type: Type.NUMBER },
              relational: { type: Type.NUMBER }
            },
            required: ['contextual', 'emotional', 'cultural', 'wisdom', 'uncertainty', 'relational']
          },
          ambient_sound: { type: Type.STRING, enum: ['rain', 'bowl', 'bell', 'silence', 'mekong', 'monsoon'] }
        },
        required: ['emotion', 'wisdom_text', 'quantum_metrics', 'reasoning_steps', 'awareness_stage', 'consciousness_dimensions']
      }
    }
  });

  const rawText = response.text || "{}";
  const cleanedText = cleanJsonString(rawText);
  
  try {
    const data = JSON.parse(cleanedText);
    return {
      ...data,
      user_transcript: data.user_transcript || text,
      breathing: data.breathing || 'none',
      ambient_sound: data.ambient_sound || 'silence',
      awareness_stage: data.awareness_stage || 'reflexive',
      consciousness_dimensions: data.consciousness_dimensions || {
         contextual: 0.5, emotional: 0.5, cultural: 0.5, wisdom: 0.5, uncertainty: 0.5, relational: 0.5
      }
    };
  } catch (e) {
    console.error("JSON Parse Error on Text Query:", e, rawText);
    return {
      emotion: 'neutral',
      wisdom_text: "Thầy đang lắng nghe...",
      quantum_metrics: { coherence: 0.5, entanglement: 0.5, presence: 0.5 },
      reasoning_steps: ["Error parsing response"],
      breathing: 'none',
      confidence: 0,
      user_transcript: text,
      awareness_stage: 'reflexive',
      consciousness_dimensions: { contextual: 0.5, emotional: 0.5, cultural: 0.5, wisdom: 0.5, uncertainty: 0.5, relational: 0.5 }
    };
  }
};

export class ZenLiveSession {
  private mode: CulturalMode;
  private lang: Language;
  private onStateChange: (data: Partial<ZenResponse>) => void;
  private onAudioActivity: (active: boolean) => void;
  private onDisconnectCallback: (reason?: string) => void;
  
  private inputContext: AudioContext | null = null;
  private outputContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  
  private vad: AdaptiveVoiceDetector;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private sessionPromise: Promise<any> | null = null;
  
  // Reconnect & State Management
  private idleTimer: any = null;
  private readonly IDLE_TIMEOUT_MS = 60000;
  private isAiSpeaking = false; 
  private isManuallyClosed = false;
  private reconnectAttempts = 0;
  private readonly MAX_RETRIES = 5; 
  private readonly BASE_DELAY_MS = 1000;
  private readonly MAX_DELAY_MS = 15000;

  // Bound event handlers for removal
  private boundHandleNetworkRecovery: () => void;
  private boundHandleNetworkOffline: () => void;

  constructor(
    mode: CulturalMode, 
    lang: Language, 
    onStateChange: (data: Partial<ZenResponse>) => void,
    onAudioActivity: (active: boolean) => void,
    onDisconnectCallback: (reason?: string) => void
  ) {
    this.mode = mode;
    this.lang = lang;
    this.onStateChange = onStateChange;
    this.onAudioActivity = onAudioActivity;
    this.onDisconnectCallback = onDisconnectCallback;
    this.vad = new AdaptiveVoiceDetector();
    
    this.boundHandleNetworkRecovery = this.handleNetworkRecovery.bind(this);
    this.boundHandleNetworkOffline = this.handleNetworkOffline.bind(this);
  }

  // --- AUDIO CONTEXT WARMUP (Critical for iOS/Safari) ---
  public async warmupAudio() {
    if (!this.inputContext || this.inputContext.state === 'closed') {
      this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    }
    if (!this.outputContext || this.outputContext.state === 'closed') {
      this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    // Must be called directly in user-gesture event handler
    if (this.inputContext.state === 'suspended') {
      await this.inputContext.resume();
    }
    if (this.outputContext.state === 'suspended') {
      await this.outputContext.resume();
    }
  }

  async connect(isReconnect = false): Promise<AnalyserNode> {
    if (!isReconnect) {
        this.isManuallyClosed = false;
        this.reconnectAttempts = 0;
    }
    this.resetIdleTimer();
    
    // Register Network Listeners
    window.addEventListener('online', this.boundHandleNetworkRecovery);
    window.addEventListener('offline', this.boundHandleNetworkOffline);

    // Ensure audio contexts are ready (redundant check but safe)
    await this.warmupAudio();

    try {
      if (!this.inputContext) throw new Error("Audio Context not initialized");

      // Setup Input if not already set
      if (!this.inputSource) {
        // Load AudioWorklet Module
        const blob = new Blob([AUDIO_WORKLET_CODE], { type: "application/javascript" });
        const workletUrl = URL.createObjectURL(blob);
        await this.inputContext.audioWorklet.addModule(workletUrl);
        URL.revokeObjectURL(workletUrl);

        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            channelCount: 1, 
            echoCancellation: true, 
            noiseSuppression: true,
            autoGainControl: true
          } 
        });

        this.inputSource = this.inputContext.createMediaStreamSource(stream);
        this.inputAnalyser = this.inputContext.createAnalyser();
        this.inputAnalyser.fftSize = 64;
        
        this.workletNode = new AudioWorkletNode(this.inputContext, 'audio-input-processor');
        
        this.inputSource.connect(this.inputAnalyser);
        this.inputAnalyser.connect(this.workletNode);
        this.workletNode.connect(this.inputContext.destination);

        this.workletNode.port.onmessage = (event) => {
           if (this.isAiSpeaking) return;

           const inputData = event.data as Float32Array;

           if (this.vad.process(inputData)) {
             this.resetIdleTimer();
             const base64 = base64EncodeAudio(inputData);
             this.sessionPromise?.then(session => {
               session.sendRealtimeInput({
                 media: { mimeType: 'audio/pcm', data: base64 }
               });
             });
           }
        };
      }
    } catch (e) {
      console.error("Mic access failed", e);
      throw new Error("Microphone/Worklet access failed");
    }

    if (!this.outputContext) throw new Error("Output Context missing");
    
    if (!this.outputAnalyser) {
      this.outputAnalyser = this.outputContext.createAnalyser();
      this.outputAnalyser.fftSize = 64;
      this.outputAnalyser.connect(this.outputContext.destination);
    }

    const key = process.env.API_KEY;
    if (!key || key.trim() === '') {
        throw new Error("API_KEY_MISSING");
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const voiceName = this.lang === 'vi' ? 'Kore' : 'Fenrir';

    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } }
        },
        systemInstruction: getSystemInstruction(this.mode),
        tools: [{ functionDeclarations: [updateZenStateTool] }]
      },
      callbacks: {
        onopen: () => {
          console.log("Gemini Connected");
          this.reconnectAttempts = 0;
        },
        onmessage: this.handleMessage.bind(this),
        onclose: (e) => this.handleConnectionLoss("closed", e),
        onerror: (err) => {
          console.error(err);
          this.handleConnectionLoss("error");
        }
      }
    });

    return this.inputAnalyser!;
  }

  // --- NETWORK RESILIENCE ---
  private handleNetworkOffline() {
    console.log("Network Offline");
    this.stopAudioQueue();
    this.onDisconnectCallback("Mất kết nối mạng...");
    // We don't fully disconnect, just pause sending/receiving
    // The socket usually closes itself, triggering handleConnectionLoss
  }

  private handleNetworkRecovery() {
    console.log("Network Recovery");
    if (!this.isManuallyClosed && this.sessionPromise === null) {
        this.onDisconnectCallback("Đã có mạng trở lại. Đang kết nối...");
        this.connect(true).catch(e => console.error("Auto-reconnect failed", e));
    }
  }

  private handleConnectionLoss(type: string, event?: any) {
    if (this.isManuallyClosed) return;

    if (event instanceof CloseEvent) {
        if (event.code === 4003 || event.code === 401) { 
            this.disconnect("Authentication failed");
            return;
        }
    }

    if (this.reconnectAttempts < this.MAX_RETRIES) {
      this.reconnectAttempts++;
      const jitter = Math.random() * 500;
      const backoff = this.BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts);
      const delay = Math.min(this.MAX_DELAY_MS, backoff + jitter);

      this.onDisconnectCallback("Reconnecting...");
      this.sessionPromise = null;

      setTimeout(() => {
        if (this.isManuallyClosed) return;
        this.connect(true).catch(e => {
            console.error("Reconnect attempt failed", e);
            this.handleConnectionLoss("retry_fail");
        });
      }, delay);
    } else {
      this.disconnect("Connection lost. Please try again.");
    }
  }

  private resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.disconnect("Timeout due to inactivity");
    }, this.IDLE_TIMEOUT_MS);
  }

  private async handleMessage(message: LiveServerMessage) {
    this.resetIdleTimer();

    if (message.toolCall) {
      for (const fc of message.toolCall.functionCalls) {
        if (fc.name === 'update_zen_state') {
          const args = fc.args as any;
          this.onStateChange(args);
          this.sessionPromise?.then(session => {
            session.sendToolResponse({
              functionResponses: {
                id: fc.id,
                name: fc.name,
                response: { result: "OK" }
              }
            });
          });
        }
      }
    }

    const modelTurn = message.serverContent?.modelTurn;
    if (modelTurn?.parts?.[0]?.inlineData) {
      this.isAiSpeaking = true; 
      this.onAudioActivity(true);
      await this.playAudioChunk(modelTurn.parts[0].inlineData.data);
    }

    if (message.serverContent?.interrupted) {
      this.stopAudioQueue();
      setTimeout(() => { this.isAiSpeaking = false; }, 500); 
      this.onAudioActivity(false);
    }
  }

  private async playAudioChunk(base64: string) {
    if (!this.outputContext || !this.outputAnalyser) return;

    if (this.outputContext.state === 'suspended') {
      await this.outputContext.resume();
    }

    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const buffer = this.outputContext.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);

    const source = this.outputContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputAnalyser);
    
    this.nextStartTime = Math.max(this.outputContext.currentTime, this.nextStartTime);
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
    
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      if (this.sources.size === 0) {
        this.isAiSpeaking = false;
        this.onAudioActivity(false);
        if (this.outputContext && this.outputContext.currentTime > this.nextStartTime + 0.5) {
           this.nextStartTime = this.outputContext.currentTime;
        }
      }
    };
  }

  private stopAudioQueue() {
    this.sources.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    this.sources.clear();
    if (this.outputContext) this.nextStartTime = this.outputContext.currentTime;
  }

  disconnect(reason?: string) {
    this.isManuallyClosed = true; 
    
    // Unregister listeners
    window.removeEventListener('online', this.boundHandleNetworkRecovery);
    window.removeEventListener('offline', this.boundHandleNetworkOffline);

    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.stopAudioQueue();
    this.isAiSpeaking = false;
    
    if (this.inputSource) {
        try { this.inputSource.disconnect(); } catch(e) {}
    }
    if (this.inputAnalyser) {
        try { this.inputAnalyser.disconnect(); } catch(e) {}
    }
    
    if (this.workletNode) {
      this.workletNode.port.onmessage = null;
      try { this.workletNode.disconnect(); } catch(e) {}
      this.workletNode = null;
    }
    
    this.inputSource = null;
    this.inputAnalyser = null;
    this.sessionPromise = null; // Let GC handle socket closure via promise dropping (SDK behavior)

    if (this.inputContext && this.inputContext.state !== 'closed') this.inputContext.close();
    if (this.outputContext && this.outputContext.state !== 'closed') this.outputContext.close();
    this.inputContext = null;
    this.outputContext = null;

    this.onDisconnectCallback(reason);
  }
}

export const analyzeEnvironment = async (apiKey: string, base64Image: string): Promise<VisionAnalysis> => {
  if (!apiKey) throw new Error("API_KEY_MISSING");
  
  try {
    const ai = new GoogleGenAI({ apiKey }); 
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: `Analyze environment: DETECT: 
            1. Buddhist (altar/incense/Buddha/lotus/prayer beads); 
            2. Modern office (desk/computer/lights); 
            3. Natural (plants/windows). 
            RULES: buddhist>0.6 -> VN mode; Else Universal. 
            Return JSON.` }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            buddhist_score: { type: Type.NUMBER },
            modern_score: { type: Type.NUMBER },
            natural_score: { type: Type.NUMBER },
            detected_items: { type: Type.ARRAY, items: { type: Type.STRING } },
            mode: { type: Type.STRING, enum: ['VN', 'Universal'] }
          },
          required: ['mode', 'detected_items', 'buddhist_score']
        }
      }
    });
    const rawText = response.text || "{}";
    const cleanedText = cleanJsonString(rawText);
    return JSON.parse(cleanedText) as VisionAnalysis;
  } catch (error) {
    console.error("Environment Analysis Error", error);
    return { buddhist_score: 0, modern_score: 1, natural_score: 0, detected_items: [], mode: 'Universal' };
  }
};
