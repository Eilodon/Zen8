
import React, { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { Volume2, VolumeX, Wind, Waves, CloudRain, Droplets } from 'lucide-react';

interface Props {
  emotion?: string;
  breathing?: string | null;
  ambientSound?: 'rain' | 'bowl' | 'bell' | 'silence' | 'mekong' | 'monsoon';
  isSpeaking: boolean;
}

// Global helper for emergency sound
export const playEmergencyAlert = async () => {
  await Tone.start();
  const synth = new Tone.Synth().toDestination();
  const now = Tone.now();
  synth.volume.value = -10;
  synth.triggerAttackRelease("A3", "0.2", now);
  synth.triggerAttackRelease("A3", "0.2", now + 0.3);
  setTimeout(() => synth.dispose(), 1000);
};

export const AudioEngine: React.FC<Props> = ({ emotion, breathing, ambientSound, isSpeaking }) => {
  const [muted, setMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // Refs to track active nodes specifically to avoid memory leaks
  const nodes = useRef({
    ambient: null as Tone.Source | null,
    breathingOsc: null as Tone.Oscillator | null,
    breathingLoop: null as Tone.Loop | null,
    binauralLeft: null as Tone.Oscillator | null,
    binauralRight: null as Tone.Oscillator | null,
    filter: null as Tone.Filter | null,
    volume: null as Tone.Volume | null
  });

  // Cleanup Function
  useEffect(() => {
    return () => {
      // Full cleanup on unmount
      Object.values(nodes.current).forEach(node => {
          if (node) {
              try { (node as any).dispose(); } catch(e) {}
          }
      });
      if (Tone.Transport.state === 'started') {
         Tone.Transport.stop();
         Tone.Transport.cancel(); // Clear events
      }
    };
  }, []);

  // Initialize Tone Master Chain
  const initAudio = async () => {
    if (isReady) return;
    await Tone.start();
    
    // Master chain (Volume -> Filter -> Destination)
    const vol = new Tone.Volume(-15).toDestination();
    const filter = new Tone.Filter(1000, "lowpass").connect(vol);
    
    nodes.current.volume = vol;
    nodes.current.filter = filter;
    setIsReady(true);
  };

  const toggleMute = async () => {
    if (!isReady) await initAudio();
    setMuted(!muted);
    Tone.Destination.mute = !muted;
  };

  // 1. Ambient Loop Management
  useEffect(() => {
    const cleanupAmbient = () => {
      if (nodes.current.ambient) {
        try {
          nodes.current.ambient.stop();
          (nodes.current.ambient as any).dispose();
        } catch(e) { /* ignore cleanup error */ }
        nodes.current.ambient = null;
      }
    };

    if (!isReady || muted) {
      cleanupAmbient();
      return;
    }

    // Determine sound source
    let soundType = ambientSound || 'silence';
    if (!ambientSound && emotion) {
        if (emotion === 'anxious') soundType = 'rain';
        else if (emotion === 'sad') soundType = 'bowl';
        else if (emotion === 'joyful') soundType = 'bell';
        else if (emotion === 'calm') soundType = 'mekong';
        else soundType = 'silence';
    }

    if (soundType === 'silence') {
         cleanupAmbient();
         return;
    }

    // Cleanup before creating new one
    cleanupAmbient();

    const dest = nodes.current.filter || Tone.Destination;
    let newSource: Tone.Source | null = null;

    try {
      switch (soundType) {
        case 'rain': 
          const rain = new Tone.Noise("pink").connect(dest);
          rain.fadeIn = 2;
          rain.volume.value = -12;
          rain.start();
          newSource = rain;
          if (nodes.current.filter) nodes.current.filter.frequency.rampTo(400, 2);
          break;

        case 'monsoon': 
          const monsoon = new Tone.Noise("pink").connect(dest);
          monsoon.fadeIn = 2;
          monsoon.volume.value = -10; // Louder, heavier
          monsoon.start();
          newSource = monsoon;
          if (nodes.current.filter) nodes.current.filter.frequency.rampTo(800, 2);
          break;

        case 'mekong':
          const river = new Tone.Noise("brown").connect(dest);
          river.fadeIn = 3;
          river.volume.value = -15; // Deep rumble
          river.start();
          newSource = river;
          if (nodes.current.filter) nodes.current.filter.frequency.rampTo(300, 2);
          break;

        case 'bowl': 
          const bowl = new Tone.Oscillator(150, "sine").connect(dest);
          bowl.volume.value = -8;
          bowl.fadeIn = 2;
          bowl.start();
          newSource = bowl;
          if (nodes.current.filter) nodes.current.filter.frequency.rampTo(800, 2);
          break;

        case 'bell':
          const bell = new Tone.Oscillator(440, "triangle").connect(dest);
          const lfo = new Tone.LFO(0.5, 435, 445).connect(bell.frequency);
          lfo.start();
          bell.volume.value = -12;
          bell.fadeIn = 2;
          bell.start();
          newSource = bell;
          if (nodes.current.filter) nodes.current.filter.frequency.rampTo(2000, 2);
          break;
      }
      nodes.current.ambient = newSource;
    } catch (e) {
      console.error("Audio creation failed", e);
    }

    return cleanupAmbient;
  }, [emotion, ambientSound, isReady, muted]);

  // 2. Binaural Beats Generator
  useEffect(() => {
    const cleanupBinaural = () => {
      if (nodes.current.binauralLeft) {
        nodes.current.binauralLeft.stop();
        nodes.current.binauralLeft.dispose();
        nodes.current.binauralLeft = null;
      }
      if (nodes.current.binauralRight) {
        nodes.current.binauralRight.stop();
        nodes.current.binauralRight.dispose();
        nodes.current.binauralRight = null;
      }
    };

    if (!isReady || muted) {
      cleanupBinaural();
      return;
    }

    let baseFreq = 0;
    let beatFreq = 0;

    if (emotion === 'sad' || emotion === 'stressed') {
       baseFreq = 100; beatFreq = 2; // Delta
    } else if (emotion === 'calm' || emotion === 'seeking') {
       baseFreq = 150; beatFreq = 6; // Theta
    } else if (emotion === 'anxious' || emotion === 'confused') {
       baseFreq = 200; beatFreq = 10; // Alpha
    } else {
       cleanupBinaural();
       return;
    }

    try {
        const panLeft = new Tone.Panner(-1).toDestination();
        const panRight = new Tone.Panner(1).toDestination();

        const oscL = new Tone.Oscillator(baseFreq, "sine").connect(panLeft);
        const oscR = new Tone.Oscillator(baseFreq + beatFreq, "sine").connect(panRight);

        oscL.volume.value = -25;
        oscR.volume.value = -25;
        
        oscL.fadeIn = 5;
        oscR.fadeIn = 5;

        oscL.start();
        oscR.start();

        nodes.current.binauralLeft = oscL;
        nodes.current.binauralRight = oscR;
    } catch (e) {
        console.error("Binaural init failed", e);
    }

    return cleanupBinaural;
  }, [emotion, isReady, muted]);


  // 3. Breathing Guide Management
  useEffect(() => {
    const cleanupBreathing = () => {
      if (nodes.current.breathingLoop) {
        try { nodes.current.breathingLoop.stop(); nodes.current.breathingLoop.dispose(); } catch(e) {}
        nodes.current.breathingLoop = null;
      }
      if (nodes.current.breathingOsc) {
        try { nodes.current.breathingOsc.stop(); nodes.current.breathingOsc.dispose(); } catch(e) {}
        nodes.current.breathingOsc = null;
      }
    };

    if (!isReady || !breathing || breathing === 'none' || muted) {
      cleanupBreathing();
      return;
    }

    cleanupBreathing();

    const is478 = breathing === '4-7-8';
    const isBox = breathing === 'box-breathing';
    
    const inhaleT = 4;
    const holdT = is478 ? 7 : 4;
    const exhaleT = is478 ? 8 : 4;
    const hold2T = isBox ? 4 : 0; 
    const totalT = inhaleT + holdT + exhaleT + hold2T;

    try {
      const osc = new Tone.Oscillator(200, "sine").toDestination();
      osc.volume.value = -10;
      osc.start();
      nodes.current.breathingOsc = osc;

      const loop = new Tone.Loop((time) => {
        if (osc.state === 'stopped') return;
        osc.frequency.cancelScheduledValues(time);
        osc.frequency.setValueAtTime(200, time);
        osc.frequency.linearRampTo(400, inhaleT, time);
        osc.frequency.setValueAtTime(400, time + inhaleT);
        osc.frequency.linearRampTo(200, exhaleT, time + inhaleT + holdT);
      }, totalT);

      loop.start(0);
      nodes.current.breathingLoop = loop;

      if (Tone.Transport.state !== 'started') {
        Tone.Transport.start();
      }
    } catch (e) {
      console.error("Breathing audio failed", e);
    }

    return cleanupBreathing;
  }, [breathing, isReady, muted]);

  // 4. Ducking
  useEffect(() => {
    if (nodes.current.volume) {
      const target = isSpeaking ? -25 : -15;
      nodes.current.volume.volume.rampTo(target, 0.5);
    }
  }, [isSpeaking]);

  return (
    <div className="relative">
      <button
        onClick={toggleMute}
        className="p-3 bg-white/20 backdrop-blur-md rounded-full text-stone-600 hover:bg-white/40 transition-all shadow-sm flex items-center gap-1"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
      {!isReady && !muted && (
        <span className="absolute top-full right-0 mt-2 text-[10px] whitespace-nowrap bg-stone-800 text-white px-2 py-1 rounded">
          Tap for sound
        </span>
      )}
      {breathing && breathing !== 'none' && !muted && isReady && (
        <div className="absolute top-0 -left-6 animate-pulse text-orange-500">
          <Wind size={16} />
        </div>
      )}
      
      {/* Sound Icons */}
      {isReady && !muted && (
         <div className="absolute -bottom-2 -left-2 text-blue-400 opacity-60 flex gap-1">
            {ambientSound === 'mekong' && <Waves size={12} className="animate-pulse" />}
            {ambientSound === 'monsoon' && <CloudRain size={12} className="animate-pulse" />}
            {ambientSound === 'rain' && <Droplets size={12} className="animate-pulse" />}
         </div>
      )}
    </div>
  );
};
