
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { VoiceButton } from './components/VoiceButton';
import { ZenCard } from './components/ZenCard';
import { Snackbar } from './components/Snackbar'; 
import { CameraScan } from './components/CameraScan';
import { ReasoningPanel } from './components/ReasoningPanel';
import { AudioEngine } from './components/AudioEngine';
import { BreathingCircle } from './components/BreathingCircle';
import { EmergencyProtocol } from './components/EmergencyProtocol';
import { HistoryPanel } from './components/HistoryPanel';
import { LoadingScreen } from './components/LoadingScreen';
import { MicroPractices } from './components/MicroPractices';
import { AppState, CulturalMode, ConversationEntry, Language, InputMode } from './types';
import { detectEmergency } from './data/emergencyKeywords';
import { Keyboard, Mic, Languages, SendHorizontal, Headphones, Sparkles, Leaf } from 'lucide-react';
import { haptic, TOKENS } from './utils/designSystem'; 
import { dbService } from './services/db'; 

import { useZenSession } from './hooks/useZenSession';

const OrbViz = React.lazy(() => import('./components/OrbViz'));

export default function App() {
  // UI State
  const [culturalMode, setCulturalMode] = useState<CulturalMode>('Universal');
  const [language, setLanguage] = useState<Language>('vi');
  const [inputMode, setInputMode] = useState<InputMode>('voice'); 
  const [inputText, setInputText] = useState('');
  const [snackbar, setSnackbar] = useState<{kind: "success"|"warn"|"error"|"info", text: string} | null>(null);
  
  // Visualization & Overlay State
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(64));
  const [showBreathing, setShowBreathing] = useState(false);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Persistence State
  const [history, setHistory] = useState<ConversationEntry[]>([]);

  const animationFrameRef = useRef<number | null>(null);

  const { 
    state, 
    zenData, 
    connect, 
    disconnect, 
    sendText, 
    analyserRef 
  } = useZenSession({
    culturalMode,
    language,
    onEmergencyDetected: () => setEmergencyActive(true),
    onError: (msg, kind) => showSnack(msg, kind)
  });

  useEffect(() => {
    dbService.getAllEntries().then(entries => {
      setHistory(entries);
      setIsLoading(false);
    }).catch(e => {
       console.error("DB Load failed", e);
       setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (zenData && zenData.emotion && zenData.quantum_metrics && zenData.reasoning_steps) {
        const newEntry: ConversationEntry = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            emotion: zenData.emotion!,
            quantum_metrics: zenData.quantum_metrics!,
            stage: zenData.awareness_stage,
            consciousness_dimensions: zenData.consciousness_dimensions
        };

        setHistory(prev => {
            const last = prev[prev.length - 1];
            if (last && Date.now() - last.timestamp < 5000) return prev;
            dbService.saveEntry(newEntry);
            return [...prev, newEntry];
        });
    }
    if (zenData?.breathing && zenData.breathing !== 'none') {
        setShowBreathing(true);
    }
  }, [zenData]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !emergencyActive && !showBreathing && inputMode === 'voice') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          toggleConnection();
        }
      }
      if (e.key === 'Escape') {
         if (emergencyActive) setEmergencyActive(false);
         if (showBreathing) setShowBreathing(false);
         disconnect();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [state, emergencyActive, showBreathing, inputMode, disconnect]);

  useEffect(() => {
    const updateViz = () => {
      if (!analyserRef.current && state === 'processing' && inputMode === 'text') {
         const data = new Uint8Array(64).map(() => Math.random() * 50 + 50);
         setFrequencyData(data);
         animationFrameRef.current = requestAnimationFrame(updateViz);
         return;
      }
      if (!analyserRef.current) return;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      if (Date.now() % 33 < 16) { 
        setFrequencyData(dataArray.slice(0, 64));
      }
      animationFrameRef.current = requestAnimationFrame(updateViz);
    };

    if (state !== 'idle') {
      if (!animationFrameRef.current) updateViz();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        setFrequencyData(new Uint8Array(64));
      }
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [state, inputMode, analyserRef]); 

  const showSnack = (text: string, kind: "success"|"warn"|"error"|"info" = "info") => {
    haptic('light');
    setSnackbar({ text, kind });
  };

  const toggleConnection = () => {
      if (state === 'idle') connect();
      else disconnect();
  };

  const toggleLanguage = () => {
    const newLang = language === 'vi' ? 'en' : 'vi';
    setLanguage(newLang);
    showSnack(newLang === 'vi' ? "Ngôn ngữ: Tiếng Việt" : "Language: English", "success");
    if (state !== 'idle') {
        disconnect();
        setTimeout(() => connect(), 500);
    }
  };

  const toggleInputMode = () => {
    disconnect();
    setInputMode(prev => prev === 'voice' ? 'text' : 'voice');
    haptic('selection');
  };

  const handleModeChange = (mode: CulturalMode, items: string[]) => {
    setCulturalMode(mode);
    showSnack(`Chế độ: ${mode}`, "success");
    haptic('success');
    if (state !== 'idle') {
        disconnect();
        setTimeout(() => connect(), 500);
    }
  };

  const handleSendText = async (text: string) => {
    if (!text.trim()) return;
    const response = await sendText(text);
    if (response) {
        setInputText('');
        if (detectEmergency(text) || detectEmergency(response.wisdom_text)) {
            setEmergencyActive(true);
        }
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-stone-50 select-none font-sans text-stone-900">
      {isLoading && <LoadingScreen />}
      
      <Suspense fallback={<div className="absolute inset-0 bg-stone-50" />}>
        <OrbViz 
          analyser={analyserRef.current} 
          emotion={zenData?.emotion || 'neutral'} 
          frequencyData={frequencyData}
        />
      </Suspense>

      <AudioEngine 
        emotion={zenData?.emotion} 
        breathing={zenData?.breathing} 
        ambientSound={zenData?.ambient_sound}
        isSpeaking={state === 'speaking'} 
      />

      {showBreathing && (
        <BreathingCircle 
          type={zenData?.breathing || '4-7-8'} 
          isActive={showBreathing} 
          onComplete={() => setShowBreathing(false)} 
        />
      )}
      
      <EmergencyProtocol 
        isActive={emergencyActive} 
        onComplete={() => {
          setEmergencyActive(false);
          disconnect();
        }} 
      />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex justify-between items-center z-40 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2" style={{ 
           background: TOKENS.materials.glassLight, 
           backdropFilter: 'blur(8px)',
           borderRadius: TOKENS.radius.chip,
           padding: '4px 6px',
           boxShadow: TOKENS.elevation.chip
        }}>
           <CameraScan onModeChange={handleModeChange} currentMode={culturalMode} />
           <div className="h-4 w-px bg-stone-300 mx-1"></div>
           <button 
            onClick={toggleLanguage}
            className="p-2 rounded-full text-stone-600 hover:bg-white transition-all"
          >
            <Languages size={18} />
          </button>
        </div>
        
        <div className="pointer-events-auto">
          <HistoryPanel history={history} onClear={() => setHistory([])} />
        </div>
      </div>

      {/* Main Wisdom Area */}
      <div className="absolute inset-0 flex flex-col z-30 pointer-events-none">
        <div className="flex-1 flex items-center justify-center p-6 pb-40 overflow-y-auto no-scrollbar">
           <div className="w-full max-w-lg pointer-events-auto flex flex-col items-center gap-4">
              {zenData ? (
                <>
                  <ZenCard data={zenData} isGenerating={state === 'processing' || state === 'speaking'} />
                  <ReasoningPanel data={zenData} />
                </>
              ) : (
                <div className="text-center opacity-40 animate-pulse mt-10">
                   <div className="w-16 h-16 bg-stone-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Leaf className="text-stone-400" />
                   </div>
                   <p className="font-serif text-lg italic text-stone-500">
                      {language === 'vi' ? 'Thở vào tâm tĩnh lặng...' : 'Breathing in, I calm my body...'}
                   </p>
                </div>
              )}
           </div>
        </div>

        {/* Bottom Control Deck */}
        <div className="pointer-events-auto w-full pb-8 pt-4 px-0 flex flex-col items-center justify-end bg-gradient-to-t from-stone-50 via-stone-50/90 to-transparent">
          <div className="w-full max-w-lg relative transition-all duration-500 flex flex-col gap-4">
            
            {/* Micro Enlightenment Moments (New) */}
            <div className={`transition-opacity duration-300 ${state === 'idle' ? 'opacity-100' : 'opacity-50'}`}>
               <MicroPractices 
                 onSelect={(txt) => handleSendText(txt)} 
                 disabled={state !== 'idle'} 
                 lang={language}
               />
            </div>

            {/* Voice Mode */}
            <div className={`flex flex-col items-center gap-4 transition-all duration-300 ${inputMode === 'voice' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 absolute inset-x-0 bottom-0 pointer-events-none'}`}>
               <VoiceButton state={state} onClick={toggleConnection} />
               {state !== 'idle' && (
                 <span className="flex items-center gap-1 text-[10px] text-stone-400 mt-2">
                    <Headphones size={10} /> Optimal experience
                 </span>
               )}
            </div>

            {/* Text Mode */}
            <div className={`transition-all duration-300 px-6 ${inputMode === 'text' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 absolute inset-x-0 bottom-0 pointer-events-none'}`}>
               <div className="relative group shadow-lg rounded-[24px]" style={{ boxShadow: TOKENS.elevation.card }}>
                 <input
                   type="text"
                   value={inputText}
                   onChange={(e) => setInputText(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleSendText(inputText)}
                   placeholder={language === 'vi' ? "Chia sẻ nỗi niềm..." : "Share your thoughts..."}
                   className="w-full bg-white/90 backdrop-blur-xl border border-stone-200 rounded-[24px] py-4 pl-6 pr-14 text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all text-base"
                   disabled={state === 'processing'}
                   autoFocus={inputMode === 'text'}
                 />
                 <button 
                   onClick={() => handleSendText(inputText)}
                   disabled={!inputText.trim() || state === 'processing'}
                   className="absolute right-2 top-2 bottom-2 p-2 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-full transition-all shadow-md transform hover:scale-105 active:scale-95"
                 >
                   <SendHorizontal size={20} />
                 </button>
               </div>
            </div>

            {/* Toggle Switch */}
            <div className="absolute right-4 bottom-24 hidden md:block">
               <button 
                 onClick={toggleInputMode}
                 className="p-3 bg-white hover:bg-stone-50 rounded-full text-stone-500 shadow-sm border border-stone-200 transition-all hover:scale-110"
               >
                 {inputMode === 'voice' ? <Keyboard size={20} /> : <Mic size={20} />}
               </button>
            </div>
             <button 
               onClick={toggleInputMode}
               className="md:hidden absolute left-4 bottom-28 p-3 text-stone-400 hover:text-stone-600 transition-colors"
            >
               {inputMode === 'voice' ? <Keyboard size={20} /> : <Mic size={20} />}
            </button>
          </div>
        </div>
      
      {snackbar && (
        <Snackbar 
          text={snackbar.text} 
          kind={snackbar.kind} 
          onClose={() => setSnackbar(null)} 
        />
      )}
    </div>
  );
}
