
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface OrbProps {
  analyser: AnalyserNode | null;
  emotion: string;
  frequencyData?: Uint8Array;
}

const EMOTION_COLORS: Record<string, THREE.Color> = {
  anxious: new THREE.Color(1.0, 0.4, 0.0), // Fire Orange
  sad: new THREE.Color(0.2, 0.3, 0.8),     // Deep Ocean Blue
  joyful: new THREE.Color(1.0, 0.8, 0.2),  // Golden Sunshine
  calm: new THREE.Color(0.2, 0.8, 0.5),    // Emerald Forest
  neutral: new THREE.Color(0.8, 0.8, 0.8), // Soft Gray
};

const QuantumOrb: React.FC<OrbProps & { detail: number }> = ({ analyser, emotion, frequencyData, detail }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const geomRef = useRef<THREE.IcosahedronGeometry>(null);
  
  // Target values for smooth transitions
  const targetScale = useRef(1);
  const targetColor = useRef(new THREE.Color(EMOTION_COLORS.neutral));

  // Explicit Cleanup
  useEffect(() => {
    return () => {
      if (geomRef.current) geomRef.current.dispose();
      if (materialRef.current) materialRef.current.dispose();
    };
  }, []);

  useEffect(() => {
    const c = EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral;
    targetColor.current.copy(c);
  }, [emotion]);

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;

    // Multi-band frequency analysis (bass/mid/high)
    if (frequencyData && frequencyData.length >= 24) {
      const bass = frequencyData.slice(0, 8).reduce((a, b) => a + b) / 8;
      const mid = frequencyData.slice(8, 16).reduce((a, b) => a + b) / 8;
      
      // Bass drives main scale
      targetScale.current = 1 + (bass / 255) * 1.5;
      
      // Mid frequencies morph vertices (organic movement)
      if (meshRef.current.geometry) {
        const posAttr = meshRef.current.geometry.attributes.position;
        // Optimization: Only animate vertices if detail is high enough or desktop
        if (detail > 0) {
          for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            const z = posAttr.getZ(i);
            const length = Math.sqrt(x*x + y*y + z*z);
            const baseR = 1.5; 
            const displacement = (mid / 255) * 0.3 * Math.sin(i * 0.5 + time * 3.0);
            const scale = (baseR + displacement) / length;
            posAttr.setXYZ(i, x * scale, y * scale, z * scale);
          }
          posAttr.needsUpdate = true;
        }
      }
    } else {
      // Fallback: gentle breathing
      targetScale.current = 1 + Math.sin(time) * 0.08;
    }

    // Spring physics for scale
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale.current, targetScale.current, targetScale.current), 0.1);
    
    // Manual Floating and Rotation
    meshRef.current.position.y = Math.sin(time * 0.5) * 0.2; 
    meshRef.current.rotation.y += 0.002;
    meshRef.current.rotation.z = Math.sin(time * 0.3) * 0.1;

    // Color Transition
    materialRef.current.color.lerp(targetColor.current, 0.05);
    materialRef.current.emissive.lerp(targetColor.current, 0.05);
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry ref={geomRef} args={[1.5, detail]} />
      <meshPhysicalMaterial
        ref={materialRef}
        metalness={0.4}
        roughness={0.2}
        transmission={0.6}
        thickness={2.0}
        clearcoat={1.0}
        clearcoatRoughness={0.1}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
};

const Particles = ({ color, frequencyData, count = 50 }: { color: string, frequencyData?: Uint8Array, count?: number }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);

  // Clean up particles
  useEffect(() => {
      return () => {
          if (geomRef.current) geomRef.current.dispose();
          if (matRef.current) matRef.current.dispose();
      };
  }, []);
  
  // Create random particles
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);

  useFrame(() => {
    if (pointsRef.current) {
       // High freq drives particles
       if (frequencyData && frequencyData.length >= 32) {
         const high = frequencyData.slice(20, 32).reduce((a, b) => a + b) / 12;
         const speed = 0.001 + (high / 255) * 0.015;
         pointsRef.current.rotation.y -= speed;
         const scale = 1 + (high / 255) * 0.4;
         pointsRef.current.scale.setScalar(scale);
       } else {
         pointsRef.current.rotation.y -= 0.001;
         pointsRef.current.scale.setScalar(1);
       }
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        size={0.08}
        color="white"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default function OrbViz({ analyser, emotion, frequencyData }: OrbProps) {
  // Device detection
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isLowPower = typeof window !== 'undefined' && (window.navigator as any).deviceMemory && (window.navigator as any).deviceMemory < 4;

  return (
    <div className="w-full h-full absolute inset-0 z-0 pointer-events-none">
      <Canvas 
        dpr={isMobile ? [1, 1.5] : [1, 2]} // Lower pixel ratio on mobile
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ 
          antialias: !isLowPower, // Disable AA on low-power devices
          powerPreference: 'high-performance',
          alpha: true
        }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <QuantumOrb 
          analyser={analyser} 
          emotion={emotion} 
          frequencyData={frequencyData} 
          detail={isMobile ? 0 : 4} // Adaptive geometry detail (0 = low poly)
        />
        <Particles 
          color={emotion} 
          frequencyData={frequencyData}
          count={isMobile ? 25 : isLowPower ? 35 : 50} // Adaptive particle count
        />
      </Canvas>
    </div>
  );
}
