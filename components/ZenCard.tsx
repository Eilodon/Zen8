

import React from 'react';
import { ZenResponse } from '../types';
import { MessageSquareQuote, Share2, Sparkles, Wind, Brain } from 'lucide-react';
import { useStreamingText, TOKENS, haptic } from '../utils/designSystem';

interface Props {
  data: ZenResponse;
  isGenerating?: boolean; // To trigger shimmer
}

const STAGE_CONFIG = {
  reflexive: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Phản xạ / Reflexive' },
  aware: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Nhận thức / Aware' },
  mindful: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Tâm thức / Mindful' },
  contemplative: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Thiền định / Contemplative' }
};

export const ZenCard: React.FC<Props> = ({ data, isGenerating = false }) => {
  const { stream, isDone } = useStreamingText(data.wisdom_text, isGenerating);
  
  // Design Kit "Caret"
  const caret = (
    <span className="inline-block w-2 h-5 ml-0.5 align-middle bg-orange-500 animate-pulse rounded-full" aria-hidden="true" />
  );
  
  const stage = STAGE_CONFIG[data.awareness_stage || 'reflexive'];

  return (
    <div 
      className="relative w-full overflow-hidden transition-all duration-500 group"
      style={{
        borderRadius: TOKENS.radius.card,
        background: TOKENS.materials.glassLight,
        boxShadow: TOKENS.elevation.card,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${TOKENS.materials.borderLight}`
      }}
    >
      {/* Top Bar: Emotion & Status */}
      <div className="flex flex-wrap items-center justify-between p-5 pb-2 border-b border-stone-100/50 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Emotion Badge */}
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5
            ${data.emotion === 'anxious' ? 'bg-orange-100 text-orange-700' : 
              data.emotion === 'sad' ? 'bg-blue-100 text-blue-700' : 
              'bg-stone-100 text-stone-600'}`}>
            <Sparkles size={10} />
            {data.emotion}
          </span>
          
          {/* Awareness Stage Badge (New from PDF) */}
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${stage.color}`}>
             <Brain size={10} />
             {stage.label}
          </span>
          
          {data.breathing && data.breathing !== 'none' && (
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-700 border border-cyan-100 flex items-center gap-1">
              <Wind size={10} className="animate-spin-slow" />
              Breath
            </span>
          )}
        </div>
        
        <button 
          onClick={() => haptic('selection')}
          className="text-stone-400 hover:text-orange-600 transition-colors p-2 rounded-full hover:bg-stone-50"
          title="Share Wisdom"
        >
          <Share2 size={16} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-6 md:p-8">
        <div className="relative min-h-[120px]">
           {/* Decorative Quote Mark */}
           <MessageSquareQuote className="absolute -top-2 -left-2 text-orange-500/10 w-16 h-16 pointer-events-none" />
           
           {/* Wisdom Text */}
           <div 
             className="relative z-10 text-[18px] md:text-[22px] leading-loose text-stone-800 font-serif"
             style={{ fontFeatureSettings: '"pnum" on, "lnum" on' }} // Design kit typography polish
           >
             {stream}
             {!isDone && caret}
           </div>

           {/* English Subtext (Fade In) */}
           {isDone && data.wisdom_english && (
             <div className="mt-6 pt-4 border-t border-stone-200/60 animate-[fadeIn_0.8s_ease-out]">
                <p className="text-[14px] text-stone-500 italic font-sans font-light">
                  "{data.wisdom_english}"
                </p>
             </div>
           )}
        </div>
      </div>

      {/* User Transcript (Collapsible/Subtle) */}
      <div className="bg-stone-50/50 p-4 border-t border-stone-100/50">
         <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center mt-1 shrink-0 text-[10px] font-bold text-stone-500">
               YOU
            </div>
            <p className="text-[13px] text-stone-500 leading-relaxed line-clamp-2 italic">
               "{data.user_transcript}"
            </p>
         </div>
      </div>
      
      {/* Shimmer Overlay (If generating/processing) */}
      {isGenerating && (
         <div className="absolute inset-0 pointer-events-none z-20">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
         </div>
      )}
      
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};