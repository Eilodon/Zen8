
import { useState, useRef, useCallback, useEffect } from 'react';
import { ZenLiveSession, sendZenTextQuery } from '../services/geminiService';
import { AppState, ZenResponse, CulturalMode, Language, ConversationEntry } from '../types';
import { haptic } from '../utils/designSystem';
import { detectEmergency } from '../data/emergencyKeywords';

interface UseZenSessionProps {
  culturalMode: CulturalMode;
  language: Language;
  onEmergencyDetected: () => void;
  onError: (msg: string, type: 'error' | 'warn' | 'info') => void;
}

export function useZenSession({ 
  culturalMode, 
  language, 
  onEmergencyDetected, 
  onError 
}: UseZenSessionProps) {
  
  const [state, setState] = useState<AppState>('idle');
  const [zenData, setZenData] = useState<ZenResponse | null>(null);
  
  const liveSessionRef = useRef<ZenLiveSession | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Handle session disconnects
  const handleDisconnect = useCallback((reason?: string) => {
    if (reason === "Reconnecting...") {
        onError("Đang kết nối lại...", "warn");
        setState('processing');
        return;
    }
    liveSessionRef.current = null;
    analyserRef.current = null;
    setState('idle');
    if (reason) {
       onError(reason === "Timeout due to inactivity" ? "Đã ngắt kết nối (Tự động)" : reason, "info");
    }
  }, [onError]);

  // Handle incoming data updates from Gemini
  const handleStateChange = useCallback((data: Partial<ZenResponse>) => {
     setZenData(prev => {
        const newData = prev ? { ...prev, ...data } : data as ZenResponse;
        
        // Emergency Check
        if (newData.wisdom_text && detectEmergency(newData.wisdom_text)) {
           onEmergencyDetected();
           liveSessionRef.current?.disconnect();
        }
        return newData;
     });
  }, [onEmergencyDetected]);

  // Connect Function
  const connect = useCallback(async () => {
    if (state !== 'idle') {
        liveSessionRef.current?.disconnect();
        return;
    }

    try {
        // 1. Initialize Session & Warmup Audio IMMEDIATELY (Sync with click)
        // This fixes Safari/iOS audio context blocking issues
        liveSessionRef.current = new ZenLiveSession(
          culturalMode,
          language,
          handleStateChange,
          (active) => setState(active ? 'speaking' : 'listening'),
          handleDisconnect
        );
        
        // Critical: Warmup audio context before any async API calls
        await liveSessionRef.current.warmupAudio();

        haptic('success');
        setState('listening');

        // 2. Async Check for API Key
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await (window as any).aistudio.openSelectKey();
          const confirmed = await (window as any).aistudio.hasSelectedApiKey();
          if (!confirmed) {
             liveSessionRef.current = null;
             setState('idle');
             return;
          }
        }
        
        // 3. Complete Connection
        if (liveSessionRef.current) {
            const analyser = await liveSessionRef.current.connect();
            analyserRef.current = analyser;
        }

    } catch (e) {
        console.error(e);
        setState('idle');
        onError("Lỗi kết nối", "error");
        liveSessionRef.current?.disconnect();
    }
  }, [state, culturalMode, language, handleStateChange, handleDisconnect, onError]);

  // Manual Disconnect
  const disconnect = useCallback(() => {
     if (liveSessionRef.current) {
         liveSessionRef.current.disconnect();
         haptic('warn');
     }
  }, []);

  // Text Query Function
  const sendText = useCallback(async (text: string) => {
    if (!text.trim()) return null;
    if (liveSessionRef.current) liveSessionRef.current.disconnect();

    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
          await (window as any).aistudio.openSelectKey();
          const confirmed = await (window as any).aistudio.hasSelectedApiKey();
          if (!confirmed) return null;
      }

      haptic('selection');
      setState('processing');
      
      const apiKey = process.env.API_KEY as string;
      const response = await sendZenTextQuery(apiKey, text, culturalMode, language);
      setZenData(response);
      haptic('success');
      setState('idle');
      
      return response;
    } catch (e) {
      console.error(e);
      onError("Không thể xử lý yêu cầu", "error");
      setState('idle');
      return null;
    }
  }, [culturalMode, language, onError]);

  return {
    state,
    zenData,
    connect,
    disconnect,
    sendText,
    analyserRef, 
    setZenData 
  };
}
