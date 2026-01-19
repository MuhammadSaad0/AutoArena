import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Float, PerspectiveCamera, Grid } from '@react-three/drei';
import * as THREE from 'three';

const ProceduralCar = ({ color = "#ef4444", position = [0, 0, 0] }: { color?: string; position?: number[] }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.4;
    }
  });

  return (
    <group ref={groupRef} position={new THREE.Vector3(...position)}>
      {/* Car Body (Bottom) */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 0.5, 4.5]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} envMapIntensity={1.5} />
      </mesh>

      {/* Car Body (Top/Cabin) */}
      <mesh position={[0, 1.2, -0.2]}>
        <boxGeometry args={[1.6, 0.7, 2.5]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} envMapIntensity={1.5} />
      </mesh>

      {/* Windows */}
      <mesh position={[0, 1.2, -0.2]}>
        <boxGeometry args={[1.62, 0.6, 2.2]} />
        <meshStandardMaterial color="#000" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Wheels */}
      <Wheel position={[-1.05, 0.4, 1.5]} />
      <Wheel position={[1.05, 0.4, 1.5]} />
      <Wheel position={[-1.05, 0.4, -1.5]} />
      <Wheel position={[1.05, 0.4, -1.5]} />

      {/* Headlights (Neon) */}
      <mesh position={[0.6, 0.6, 2.26]}>
        <boxGeometry args={[0.4, 0.15, 0.1]} />
        <meshStandardMaterial color="#a5f3fc" emissive="#22d3ee" emissiveIntensity={5} toneMapped={false} />
      </mesh>
      <mesh position={[-0.6, 0.6, 2.26]}>
        <boxGeometry args={[0.4, 0.15, 0.1]} />
        <meshStandardMaterial color="#a5f3fc" emissive="#22d3ee" emissiveIntensity={5} toneMapped={false} />
      </mesh>

       {/* Taillights (Neon) */}
       <mesh position={[0.6, 0.6, -2.26]}>
        <boxGeometry args={[0.4, 0.15, 0.1]} />
        <meshStandardMaterial color="#ff0000" emissive="#ef4444" emissiveIntensity={5} toneMapped={false} />
      </mesh>
      <mesh position={[-0.6, 0.6, -2.26]}>
        <boxGeometry args={[0.4, 0.15, 0.1]} />
        <meshStandardMaterial color="#ff0000" emissive="#ef4444" emissiveIntensity={5} toneMapped={false} />
      </mesh>
      
      {/* Underglow */}
      <pointLight position={[0, 0.2, 0]} distance={4} intensity={2} color={color} />
    </group>
  );
};

const Wheel = ({ position }: { position: number[] }) => {
  return (
    <mesh position={new THREE.Vector3(...position)} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.4, 0.4, 0.35, 32]} />
      <meshStandardMaterial color="#111" roughness={0.5} />
      {/* Rim */}
      <mesh position={[0, -0.1, 0]}>
         <cylinderGeometry args={[0.25, 0.25, 0.16, 8]} />
         <meshStandardMaterial color="#333" metalness={1} roughness={0.2} />
      </mesh>
    </mesh>
  );
};

interface Vehicle3DModelProps {
  color: string;
}

export const Vehicle3DModel: React.FC<Vehicle3DModelProps> = ({ color }) => {
  return (
    <div className="w-full h-64 md:h-80 relative group">
      {/* Tech Border Container */}
      <div className="absolute inset-0 border-2 border-white/10 skew-box bg-black/40 backdrop-blur-sm z-0"></div>
      
      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 z-10 translate-x-[-2px] translate-y-[-2px]"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400 z-10 translate-x-[2px] translate-y-[2px]"></div>

      <div className="absolute top-4 left-6 z-20 skew-box">
        <span className="bg-cyan-500 text-black text-xs font-black italic px-3 py-1 uppercase tracking-tighter">
          3D VIEW // LIVE
        </span>
      </div>

      <div className="w-full h-full relative z-10">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[4, 2, 5]} fov={45} />
          
          {/* Studio Lights */}
          <ambientLight intensity={0.2} />
          <spotLight position={[10, 10, 10]} angle={0.5} penumbra={1} intensity={200} color="#ffffff" castShadow />
          <pointLight position={[-10, 0, -10]} intensity={50} color={color} />

          <Environment preset="night" />
          
          <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
             <ProceduralCar color={color} />
          </Float>
          
          {/* Garage Floor Grid */}
          <Grid position={[0, -0.01, 0]} args={[10.5, 10.5]} cellSize={0.5} cellThickness={0.5} cellColor={new THREE.Color(color).offsetHSL(0, 0, -0.2)} sectionSize={3} sectionThickness={1} sectionColor={color} fadeDistance={10} fadeStrength={1} infiniteGrid />
          
        </Canvas>
      </div>
    </div>
  );
};