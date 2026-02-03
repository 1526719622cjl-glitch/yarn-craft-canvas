import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CrochetStitch } from '@/store/useYarnCluesStore';

interface TubeStitchProps {
  position: [number, number, number];
  rotation: number;
  type: CrochetStitch;
  isHovered: boolean;
  highFidelity: boolean;
  yarnColor?: string;
  rowIndex: number;
  previousRowY?: number;
}

// Generate stitch path as a 3D curve
function generateStitchPath(type: CrochetStitch): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  
  switch (type) {
    case 'sc': // Single crochet - compact loop with V head
      points.push(
        new THREE.Vector3(0, 0, 0),       // Base (enters from previous row)
        new THREE.Vector3(0.02, 0.03, 0),  // Loop up
        new THREE.Vector3(-0.02, 0.05, 0.01), // Cross over
        new THREE.Vector3(0.03, 0.07, 0),  // V head left
        new THREE.Vector3(0, 0.08, 0),     // V peak
        new THREE.Vector3(-0.03, 0.07, 0), // V head right
        new THREE.Vector3(0, 0.05, -0.01), // Exit
      );
      break;
      
    case 'hdc': // Half double - taller with one wrap
      points.push(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.02, 0.04, 0),
        new THREE.Vector3(-0.01, 0.06, 0.01),
        new THREE.Vector3(0.02, 0.09, 0),  // Wrap
        new THREE.Vector3(-0.02, 0.11, 0),
        new THREE.Vector3(0.03, 0.13, 0),
        new THREE.Vector3(0, 0.14, 0),
        new THREE.Vector3(-0.03, 0.13, 0),
      );
      break;
      
    case 'dc': // Double crochet - tall with two wraps
      points.push(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.02, 0.05, 0),
        new THREE.Vector3(-0.01, 0.08, 0.01), // First wrap
        new THREE.Vector3(0.02, 0.12, 0),
        new THREE.Vector3(-0.01, 0.15, 0.01), // Second wrap
        new THREE.Vector3(0.02, 0.18, 0),
        new THREE.Vector3(0, 0.20, 0),
        new THREE.Vector3(-0.02, 0.18, 0),
      );
      break;
      
    case 'tr': // Treble - very tall
      points.push(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.02, 0.06, 0),
        new THREE.Vector3(-0.01, 0.10, 0.01),
        new THREE.Vector3(0.02, 0.14, 0),
        new THREE.Vector3(-0.01, 0.18, 0.01),
        new THREE.Vector3(0.02, 0.22, 0),
        new THREE.Vector3(0, 0.26, 0),
        new THREE.Vector3(-0.02, 0.24, 0),
      );
      break;
      
    case 'inc': // Increase - V shape, two stitches from one
      points.push(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0.03, 0),
        // First branch
        new THREE.Vector3(-0.04, 0.06, 0),
        new THREE.Vector3(-0.05, 0.08, 0),
        // Return to center
        new THREE.Vector3(0, 0.05, 0.01),
        // Second branch
        new THREE.Vector3(0.04, 0.06, 0),
        new THREE.Vector3(0.05, 0.08, 0),
      );
      break;
      
    case 'dec': // Decrease - inverted V, two into one
      points.push(
        new THREE.Vector3(-0.04, 0, 0),
        new THREE.Vector3(-0.02, 0.02, 0),
        new THREE.Vector3(0, 0.04, 0),
        new THREE.Vector3(0.02, 0.02, 0),
        new THREE.Vector3(0.04, 0, 0),
        new THREE.Vector3(0.02, 0.02, 0.01),
        new THREE.Vector3(0, 0.06, 0),
        new THREE.Vector3(0, 0.08, 0),
      );
      break;
      
    case 'chain': // Chain - simple loop
      points.push(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.03, 0.02, 0),
        new THREE.Vector3(0.03, 0.04, 0),
        new THREE.Vector3(0, 0.05, 0),
        new THREE.Vector3(-0.03, 0.04, 0),
        new THREE.Vector3(-0.03, 0.02, 0),
        new THREE.Vector3(0, 0, 0.01),
      );
      break;
      
    case 'slip': // Slip stitch - tiny bump
      points.push(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.01, 0.01, 0),
        new THREE.Vector3(0, 0.02, 0),
        new THREE.Vector3(-0.01, 0.01, 0),
        new THREE.Vector3(0, 0, 0.005),
      );
      break;
      
    default: // Default to SC-like
      points.push(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.02, 0.03, 0),
        new THREE.Vector3(-0.02, 0.05, 0.01),
        new THREE.Vector3(0.03, 0.07, 0),
        new THREE.Vector3(0, 0.08, 0),
        new THREE.Vector3(-0.03, 0.07, 0),
      );
  }
  
  return new THREE.CatmullRomCurve3(points);
}

// Get stitch height for interlocking calculations
function getStitchHeight(type: CrochetStitch): number {
  switch (type) {
    case 'sc': return 0.08;
    case 'hdc': return 0.14;
    case 'dc': return 0.20;
    case 'tr': return 0.26;
    case 'chain': return 0.05;
    case 'slip': return 0.02;
    case 'inc': return 0.08;
    case 'dec': return 0.08;
    default: return 0.08;
  }
}

// Yarn material with fuzzy fiber effect
function createYarnMaterial(color: string, highFidelity: boolean, isHovered: boolean) {
  const baseColor = new THREE.Color(color);
  
  if (!highFidelity) {
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.8,
      metalness: 0.0,
      emissive: isHovered ? baseColor : new THREE.Color(0x000000),
      emissiveIntensity: isHovered ? 0.3 : 0,
    });
  }
  
  // High fidelity: more complex material
  return new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.9,
    metalness: 0.0,
    emissive: isHovered ? baseColor : new THREE.Color(0x000000),
    emissiveIntensity: isHovered ? 0.4 : 0,
    // Would add normal map for fiber texture in production
  });
}

export function TubeStitch({
  position,
  rotation,
  type,
  isHovered,
  highFidelity,
  yarnColor = '#C9A08E',
  rowIndex,
  previousRowY = 0,
}: TubeStitchProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Generate tube geometry from stitch path
  const geometry = useMemo(() => {
    const curve = generateStitchPath(type);
    const tubeRadius = highFidelity ? 0.008 : 0.012;
    const tubularSegments = highFidelity ? 64 : 24;
    const radialSegments = highFidelity ? 12 : 6;
    
    return new THREE.TubeGeometry(curve, tubularSegments, tubeRadius, radialSegments, false);
  }, [type, highFidelity]);
  
  // Material
  const material = useMemo(() => {
    return createYarnMaterial(yarnColor, highFidelity, isHovered);
  }, [yarnColor, highFidelity, isHovered]);
  
  // Calculate interlocking offset
  const interlockOffset = useMemo(() => {
    if (rowIndex === 0) return 0;
    const prevHeight = getStitchHeight('sc'); // Assume SC for simplicity
    return prevHeight * 0.3; // Overlap by 30%
  }, [rowIndex]);
  
  // Animate on hover
  useFrame(() => {
    if (meshRef.current) {
      const targetScale = isHovered ? 1.15 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });
  
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[position[0], position[1], position[2] - interlockOffset]}
      rotation={[0, 0, rotation]}
      castShadow={highFidelity}
      receiveShadow={highFidelity}
    />
  );
}

// Shrinkage preview wrapper
interface ShrinkagePreviewProps {
  children: React.ReactNode;
  widthFactor: number;
  heightFactor: number;
  enabled: boolean;
}

export function ShrinkagePreview({ children, widthFactor, heightFactor, enabled }: ShrinkagePreviewProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current && enabled) {
      groupRef.current.scale.lerp(
        new THREE.Vector3(1 / widthFactor, 1 / heightFactor, 1),
        0.05
      );
    } else if (groupRef.current) {
      groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
    }
  });
  
  return <group ref={groupRef}>{children}</group>;
}

// X-Ray mode effect
export function XRayEffect({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return (
    <group>
      {children}
      {enabled && (
        <mesh>
          {/* Would add wireframe overlay in production */}
        </mesh>
      )}
    </group>
  );
}
