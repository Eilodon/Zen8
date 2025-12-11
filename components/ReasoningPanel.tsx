

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Brain, Zap, Activity, Waves } from 'lucide-react';
import { ZenResponse } from '../types';

interface Props {
  data: ZenResponse;
}

export const ReasoningPanel: React.FC<Props> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Fallback if reasoning isn't provided
  if (!data.reasoning_steps || data.reasoning_steps.length === 0) return null;

  const dims = data.consciousness_dimensions || { 
     contextual: 0.5, emotional: 0.5, cultural: 0.5, wisdom: 0.5, uncertainty: 0.5, relational: 0.5 
  };

  return (
    <div className="w-full max-w-md mx-4 mt-4 transition-all duration-300 ease-in-out">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 w-full py-2 text-xs font-medium text-stone-500 hover:text-orange-600 transition-colors uppercase tracking-widest"
      >
        {isOpen ? (
          <>Ẩn phân tích <ChevronUp size={14} /></>
        ) : (
          <>Phân tích tâm thức <ChevronDown size={14} /></>
        )}
      </button>

      {isOpen && (
        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 mt-2 border border-stone-200 shadow-inner animate-[fadeIn_0.3s_ease-out]">
          
          {/* Header */}
          <div className="flex items-center gap-2 mb-4 text-stone-700">
            <Waves size={16} className="text-orange-500" />
            <span className="font-semibold text-sm font-sans">Tâm Thức Dimensions (Quantum Field)</span>
          </div>

          {/* New Quantum Dimensions Viz (PDF Page 13 style) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {Object.entries(dims).map(([key, value], idx) => (
              <div key={key} className="bg-stone-50 p-2 rounded-lg border border-stone-100 flex flex-col gap-1">
                 <div className="flex justify-between items-center text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                    <span>{key}</span>
                    <span>{Math.round((value as number) * 100)}%</span>
                 </div>
                 <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-1000"
                      style={{ width: `${(value as number) * 100}%`, transitionDelay: `${idx * 100}ms` }}
                    />
                 </div>
              </div>
            ))}
          </div>

          {/* Reasoning Steps */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 text-stone-700">
                <Brain size={14} className="text-stone-400" />
                <span className="font-semibold text-xs font-sans uppercase">Reasoning Process</span>
            </div>
            <div className="relative pl-4 border-l-2 border-stone-200 space-y-4">
                {data.reasoning_steps.map((step, idx) => (
                <div 
                    key={idx} 
                    className="relative animate-[slideRight_0.4s_ease-out_forwards]"
                    style={{ opacity: 0, animationDelay: `${idx * 150}ms` }}
                >
                    <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-stone-400 border border-white shadow-sm" />
                    <p className="text-xs text-stone-600 font-sans leading-relaxed">
                    {step}
                    </p>
                </div>
                ))}
            </div>
          </div>

          {/* Quantum Metrics (Orb Inputs) */}
          {data.quantum_metrics && (
            <div className="pt-4 border-t border-stone-200 grid grid-cols-3 gap-2">
               <MetricItem 
                 icon={<Activity size={14} />} 
                 label="Coherence" 
                 value={data.quantum_metrics.coherence} 
                 color="text-blue-500"
                 delay={500}
               />
               <MetricItem 
                 icon={<Zap size={14} />} 
                 label="Entanglement" 
                 value={data.quantum_metrics.entanglement} 
                 color="text-purple-500"
                 delay={600}
               />
               <MetricItem 
                 icon={<Brain size={14} />} 
                 label="Presence" 
                 value={data.quantum_metrics.presence} 
                 color="text-emerald-500"
                 delay={700}
               />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MetricItem = ({ icon, label, value, color, delay }: any) => (
  <div 
    className="flex flex-col items-center animate-[scaleIn_0.5s_ease-out_forwards]"
    style={{ opacity: 0, animationDelay: `${delay}ms` }}
  >
    <div className={`mb-1 ${color}`}>{icon}</div>
    <div className="relative w-8 h-8 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2" className="text-stone-200 fill-none" />
        <circle 
          cx="16" cy="16" r="12" 
          stroke="currentColor" 
          strokeWidth="2" 
          className={`${color} fill-none transition-all duration-1000`}
          strokeDasharray="100"
          strokeDashoffset={100 - (value * 100)}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-[8px] font-bold text-stone-600">{Math.round(value * 100)}</span>
    </div>
    <span className="text-[8px] uppercase tracking-wider text-stone-500 mt-1">{label}</span>
  </div>
);