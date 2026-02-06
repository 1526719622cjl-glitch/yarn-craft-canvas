/**
 * High-performance 3D Crochet Wireframe Renderer
 * Uses LineSegments with BufferGeometry for efficient rendering
 * Implements spiral topology and stitch-specific geometry
 */

import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ParsedStitch } from '@/lib/enhancedCrochetParser';
import { useWireframeGeometry } from './useWireframeGeometry';
import { getStitchPosition, StitchPosition } from '@/lib/crochetPathGenerator';

interface CrochetWireframeMeshProps {
  stitches: ParsedStitch[];
  hoveredCell: { row: number; stitch: number } | null;
  onStitchClick?: (row: number, stitch: number) => void;
  onStitchHover?: (row: number, stitch: number) => void;
  onStitchLeave?: () => void;
  yarnColor?: string;
  showConnectors?: boolean;
  enableSpiral?: boolean;
}

function CrochetWireframeMesh({
  stitches,
  hoveredCell,
  onStitchClick,
  onStitchHover,
  onStitchLeave,
  yarnColor = '#333333',
  showConnectors = true,
  enableSpiral = true,
}: CrochetWireframeMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  
  // Generate wireframe geometry
  const { geometry, positions } = useWireframeGeometry(stitches, {
    showConnectors,
    zSpiral: enableSpiral,
  });
  
  // Create line material
  const material = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: yarnColor,
      linewidth: 1, // Note: linewidth > 1 only works on some systems
      transparent: false,
    });
  }, [yarnColor]);
  
  // Highlight material for hovered stitch
  const highlightMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#8B5CF6',
      transparent: true,
      opacity: 0.8,
    });
  }, []);
  
  // Get hovered stitch position for highlight
  const hoveredPosition = useMemo(() => {
    if (!hoveredCell) return null;
    return getStitchPosition(hoveredCell.row, hoveredCell.stitch, positions);
  }, [hoveredCell, positions]);
  
  // Slow auto-rotation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.getElapsedTime() * 0.05;
    }
  });
  
  // Ray casting for stitch selection
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!onStitchHover || positions.length === 0) return;
    
    // Find closest stitch to click point
    const point = event.point;
    let closest: StitchPosition | null = null;
    let minDist = Infinity;
    
    for (const pos of positions) {
      const dist = Math.sqrt(
        Math.pow(point.x - pos.x, 2) + 
        Math.pow(point.y - pos.y, 2)
      );
      if (dist < 0.15 && dist < minDist) {
        minDist = dist;
        closest = pos;
      }
    }
    
    if (closest) {
      onStitchHover(closest.row, closest.stitch);
    }
  };
  
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!onStitchClick || positions.length === 0) return;
    
    const point = event.point;
    let closest: StitchPosition | null = null;
    let minDist = Infinity;
    
    for (const pos of positions) {
      const dist = Math.sqrt(
        Math.pow(point.x - pos.x, 2) + 
        Math.pow(point.y - pos.y, 2)
      );
      if (dist < 0.15 && dist < minDist) {
        minDist = dist;
        closest = pos;
      }
    }
    
    if (closest) {
      onStitchClick(closest.row, closest.stitch);
    }
  };
  
  const handlePointerLeave = () => {
    onStitchLeave?.();
  };
  
  if (stitches.length === 0) {
    return (
      <mesh>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial color="#ccc" />
      </mesh>
    );
  }
  
  return (
    <group ref={groupRef}>
      {/* Main wireframe lines */}
      <lineSegments
        ref={linesRef}
        geometry={geometry}
        material={material}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        onPointerLeave={handlePointerLeave}
      />
      
      {/* Highlight sphere for hovered stitch */}
      {hoveredPosition && (
        <mesh
          position={[hoveredPosition.x, hoveredPosition.y, hoveredPosition.z + 0.05]}
          material={highlightMaterial}
        >
          <sphereGeometry args={[0.03, 16, 16]} />
        </mesh>
      )}
      
      {/* Center ring indicator */}
      <mesh rotation={[0, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[0.35, 0.38, 32]} />
        <meshBasicMaterial color="#ddd" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Invisible plane for ray casting */}
      <mesh visible={false} onPointerMove={handlePointerMove}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}

// Main scene wrapper
export interface CrochetWireframeSceneProps {
  stitches: ParsedStitch[];
  hoveredCell: { row: number; stitch: number } | null;
  onStitchClick?: (row: number, stitch: number) => void;
  onStitchHover?: (row: number, stitch: number) => void;
  onStitchLeave?: () => void;
  yarnColor?: string;
  backgroundColor?: string;
  showConnectors?: boolean;
  enableSpiral?: boolean;
}

export function CrochetWireframeScene({
  stitches,
  hoveredCell,
  onStitchClick,
  onStitchHover,
  onStitchLeave,
  yarnColor = '#333333',
  backgroundColor = '#f5f5f5',
  showConnectors = true,
  enableSpiral = true,
}: CrochetWireframeSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 50 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[backgroundColor]} />
      
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      
      <Suspense fallback={null}>
        <CrochetWireframeMesh
          stitches={stitches}
          hoveredCell={hoveredCell}
          onStitchClick={onStitchClick}
          onStitchHover={onStitchHover}
          onStitchLeave={onStitchLeave}
          yarnColor={yarnColor}
          showConnectors={showConnectors}
          enableSpiral={enableSpiral}
        />
      </Suspense>
      
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={10}
        makeDefault
      />
    </Canvas>
  );
}

export default CrochetWireframeScene;
