"use client";

import { useMemo, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Center } from "@react-three/drei";
import * as THREE from "three";

interface ModelViewerProps {
  className?: string;
  stlData?: string | null;
  loading?: boolean;
  error?: string | null;
}

function parseStl(data: string): THREE.BufferGeometry {
  // Handle ASCII STL
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const normals: number[] = [];

  const lines = data.split("\n");
  let currentNormal: number[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("facet normal")) {
      const parts = trimmed.split(/\s+/);
      currentNormal = [
        parseFloat(parts[2]),
        parseFloat(parts[3]),
        parseFloat(parts[4]),
      ];
    } else if (trimmed.startsWith("vertex")) {
      const parts = trimmed.split(/\s+/);
      vertices.push(
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3])
      );
      normals.push(...currentNormal);
    }
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(normals, 3)
  );

  if (normals.every((n) => n === 0)) {
    geometry.computeVertexNormals();
  }

  return geometry;
}

function StlMesh({ stlData }: { stlData: string }) {
  const geometry = useMemo(() => parseStl(stlData), [stlData]);
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <Center>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color="#4488ff"
          metalness={0.3}
          roughness={0.6}
        />
      </mesh>
    </Center>
  );
}

function AutoFit({ stlData }: { stlData?: string | null }) {
  const { camera } = useThree();

  useEffect(() => {
    if (!stlData) return;
    // Reset camera on new geometry
    (camera as THREE.PerspectiveCamera).position.set(4, 3, 4);
    camera.lookAt(0, 0, 0);
  }, [stlData, camera]);

  return null;
}

function PlaceholderMesh() {
  return (
    <mesh>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#4488ff" opacity={0.3} transparent />
    </mesh>
  );
}

function Scene({ stlData }: { stlData?: string | null }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, -3, 2]} intensity={0.3} />
      {stlData ? <StlMesh stlData={stlData} /> : <PlaceholderMesh />}
      <Grid
        infiniteGrid
        cellSize={1}
        sectionSize={5}
        fadeDistance={30}
        cellColor="#333"
        sectionColor="#555"
        position={[0, -1.5, 0]}
      />
      <OrbitControls makeDefault />
      <Environment preset="studio" />
      <AutoFit stlData={stlData} />
    </>
  );
}

export function ModelViewer({ className, stlData, loading, error }: ModelViewerProps) {
  return (
    <div className={`overflow-hidden rounded-xl bg-gray-900 ${className || ""}`}>
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">3D Preview</span>
          {loading && (
            <span className="text-xs text-blue-400">Rendering...</span>
          )}
          {stlData && !loading && (
            <span className="text-xs text-green-400">Live</span>
          )}
        </div>
        <span className="text-xs text-gray-600">
          Drag to rotate, scroll to zoom
        </span>
      </div>
      {error && (
        <div className="border-b border-gray-800 bg-red-900/20 px-4 py-2 text-xs text-red-400">
          {error}
        </div>
      )}
      <div className="h-[500px]">
        <Canvas camera={{ position: [4, 3, 4], fov: 50 }}>
          <Scene stlData={stlData} />
        </Canvas>
      </div>
    </div>
  );
}
