
// --- AUDIO MANAGER & UTILITIES ---

export const AUDIO_WORKLET_CODE = `
class AudioInputProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Gemini prefers 16kHz
    this.TARGET_RATE = 16000; 
    // Accumulate roughly 0.1s - 0.2s of audio before sending to avoid flooding the main thread
    this.BUFFER_THRESHOLD = 2048; 
    this.buffer = new Float32Array(this.BUFFER_THRESHOLD * 2); // Double buffer for safety
    this.byteCount = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0];
      const currentRate = sampleRate; // Global in AudioWorkletScope

      // --- DOWNSAMPLING LOGIC (Linear Interpolation) ---
      // Running inside Audio Thread to keep Main Thread free for UI
      
      if (currentRate === this.TARGET_RATE) {
        // No resampling needed, just copy
        this.pushData(channelData);
      } else {
        // Resample small chunk on the fly
        const ratio = currentRate / this.TARGET_RATE;
        const newLength = Math.ceil(channelData.length / ratio);
        
        for (let i = 0; i < newLength; i++) {
          const offset = i * ratio;
          const index = Math.floor(offset);
          const decimal = offset - index;
          
          // Boundary checks
          const a = channelData[index] || 0;
          const b = channelData[index + 1] || a;
          
          const val = a + (b - a) * decimal;
          this.appendToBuffer(val);
        }
      }
    }
    return true;
  }

  appendToBuffer(value) {
    if (this.byteCount < this.buffer.length) {
      this.buffer[this.byteCount++] = value;
    }
    // Check flush
    if (this.byteCount >= this.BUFFER_THRESHOLD) {
      this.flush();
    }
  }

  pushData(data) {
    for (let i = 0; i < data.length; i++) {
      this.appendToBuffer(data[i]);
    }
  }

  flush() {
    // Send exact slice of buffer to Main Thread
    const dataToSend = this.buffer.slice(0, this.byteCount);
    this.port.postMessage(dataToSend);
    this.byteCount = 0;
  }
}
registerProcessor('audio-input-processor', AudioInputProcessor);
`;

// Helper for sending text queries (fallback if worklet isn't used)
export const floatTo16BitPCM = (float32Array: Float32Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
};

export const base64EncodeAudio = (float32Array: Float32Array): string => {
  const pcm = floatTo16BitPCM(float32Array);
  let binary = '';
  const bytes = new Uint8Array(pcm);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export class AdaptiveVoiceDetector {
  private noiseFloor = 0.002; // Start slightly more sensitive
  private alpha = 0.05; // Learning rate for noise floor
  
  // Hysteresis Logic:
  // UPPER: Signal must cross this multiple of noise floor to START recording (Gate Open)
  private readonly UPPER_THRESHOLD_RATIO = 5.0; 
  // LOWER: Signal must drop below this multiple to STOP recording (Gate Close)
  private readonly LOWER_THRESHOLD_RATIO = 2.0;
  
  private isActive = false;
  private holdFrameCount = 5; // Increased hold time (approx 5 chunks ~ 0.5s-0.7s) to prevent chopping end of sentences
  private currentHold = 0;

  public process(float32Array: Float32Array): boolean {
    let sum = 0;
    // Step optimization: Check every 4th sample
    const step = 4; 
    for (let i = 0; i < float32Array.length; i += step) {
      sum += float32Array[i] * float32Array[i];
    }
    const rms = Math.sqrt(sum / (float32Array.length / step));

    // Dynamic Noise Floor Adaptation
    if (rms < this.noiseFloor) {
      // If quieter than noise floor, adapt down quickly
      this.noiseFloor = (this.noiseFloor * 0.95) + (rms * 0.05);
    } else {
      // If louder, adapt up slowly (avoids adapting to speech)
      this.noiseFloor = (this.noiseFloor * 0.999) + (rms * 0.001);
    }
    
    // Clamp noise floor to reasonable bounds to prevent sticking open/closed
    this.noiseFloor = Math.max(0.0005, Math.min(this.noiseFloor, 0.05));

    const upperThreshold = this.noiseFloor * this.UPPER_THRESHOLD_RATIO;
    const lowerThreshold = this.noiseFloor * this.LOWER_THRESHOLD_RATIO;

    if (this.isActive) {
      // While active, use the LOWER threshold to stay active
      if (rms > lowerThreshold) {
        this.currentHold = this.holdFrameCount; // Reset hold timer
        return true;
      } else {
        // Signal dropped, start holding
        if (this.currentHold > 0) {
          this.currentHold--;
          return true; // Still outputting during hold time
        } else {
          this.isActive = false; // Gate closes
          return false;
        }
      }
    } else {
      // While inactive, use the UPPER threshold to trigger
      if (rms > upperThreshold) {
        this.isActive = true;
        this.currentHold = this.holdFrameCount;
        return true;
      }
      return false;
    }
  }
}
