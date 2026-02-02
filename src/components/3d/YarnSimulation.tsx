import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CrochetStitch, KnittingStitch } from '@/store/useYarnCluesStore';

// Yarn colors
const YARN_COLORS = {
  cream: '#E8D5C4',
  rose: '#D4A5A5',
  honey: '#C9A08E',
  sage: '#8B9A7C',
  sky: '#A5C4D4',
};

// Custom fuzzy yarn shader
const yarnVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const yarnFragmentShader = `
  uniform vec3 baseColor;
  uniform float time;
  uniform bool isHovered;
  uniform bool highFidelity;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  // Simple noise function
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  void main() {
    vec3 color = baseColor;
    
    // Fuzzy fiber effect
    float fuzz = noise(vUv * 50.0 + time * 0.1) * 0.15;
    color = color + vec3(fuzz) - 0.075;
    
    // Subtle color variation along yarn
    float variation = noise(vUv * 20.0) * 0.1;
    color = color * (1.0 + variation - 0.05);
    
    // Basic lighting
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.0);
    float ambient = 0.4;
    
    vec3 finalColor = color * (ambient + diff * 0.6);
    
    // Emissive glow on hover
    if (isHovered) {
      finalColor = finalColor + baseColor * 0.4;
    }
    
    // High fidelity adds subtle AO simulation
    if (highFidelity) {
      float ao = 0.8 + 0.2 * vNormal.z;
      finalColor = finalColor * ao;
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Create yarn tube geometry from path points
function createYarnPath(
  type: 'sc' | 'inc' | 'knit' | 'purl' | 'default',
  scale: number = 1
): THREE.Curve<THREE.Vector3> {
  const points: THREE.Vector3[] = [];
  
  switch (type) {
    case 'sc':
      // X shape - two crossing strands
      // First diagonal
      for (let t = 0; t <= 1; t += 0.1) {
        points.push(new THREE.Vector3(
          (t - 0.5) * 0.3 * scale,
          (t - 0.5) * 0.3 * scale,
          Math.sin(t * Math.PI) * 0.05 * scale
        ));
      }
      break;
      
    case 'inc':
      // V shape
      for (let t = 0; t <= 1; t += 0.1) {
        const x = (t - 0.5) * 0.3 * scale;
        const y = Math.abs(t - 0.5) * 0.3 * scale - 0.1 * scale;
        points.push(new THREE.Vector3(x, y, 0));
      }
      break;
      
    case 'knit':
      // Interlocking V loop
      for (let t = 0; t <= 1; t += 0.05) {
        const angle = t * Math.PI;
        const x = Math.sin(angle) * 0.12 * scale;
        const y = (t - 0.5) * 0.25 * scale;
        const z = Math.cos(angle) * 0.03 * scale;
        points.push(new THREE.Vector3(x, y, z));
      }
      break;
      
    case 'purl':
      // Horizontal bump
      for (let t = 0; t <= 1; t += 0.1) {
        const x = (t - 0.5) * 0.3 * scale;
        const y = Math.sin(t * Math.PI) * 0.08 * scale;
        points.push(new THREE.Vector3(x, y, 0.05 * scale));
      }
      break;
      
    default:
      // Simple curved line
      for (let t = 0; t <= 1; t += 0.1) {
        points.push(new THREE.Vector3(
          (t - 0.5) * 0.2 * scale,
          Math.sin(t * Math.PI) * 0.1 * scale,
          0
        ));
      }
  }
  
  return new THREE.CatmullRomCurve3(points);
}

// Yarn Tube Component using TubeGeometry
interface YarnTubeProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  type: 'sc' | 'inc' | 'knit' | 'purl' | 'default';
  color?: string;
  isHovered: boolean;
  highFidelity: boolean;
  scale?: number;
}

export function YarnTube({
  position,
  rotation = [0, 0, 0],
  type,
  color = YARN_COLORS.cream,
  isHovered,
  highFidelity,
  scale = 1,
}: YarnTubeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const curve = useMemo(() => createYarnPath(type, scale), [type, scale]);
  
  const tubeGeometry = useMemo(() => {
    const tubularSegments = highFidelity ? 32 : 16;
    const radialSegments = highFidelity ? 8 : 6;
    const radius = 0.02 * scale;
    return new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  }, [curve, highFidelity, scale]);
  
  const uniforms = useMemo(() => ({
    baseColor: { value: new THREE.Color(color) },
    time: { value: 0 },
    isHovered: { value: isHovered },
    highFidelity: { value: highFidelity },
  }), [color, isHovered, highFidelity]);
  
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = clock.getElapsedTime();
      materialRef.current.uniforms.isHovered.value = isHovered;
      materialRef.current.uniforms.highFidelity.value = highFidelity;
    }
  });
  
  return (
    <mesh 
      ref={meshRef} 
      position={position} 
      rotation={rotation as unknown as THREE.Euler}
      geometry={tubeGeometry}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={yarnVertexShader}
        fragmentShader={yarnFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

// Crochet Stitch 3D Component with yarn tubes
interface CrochetStitch3DProps {
  position: [number, number, number];
  rotation?: number; // Radial rotation for circular charts
  type: CrochetStitch;
  isHovered: boolean;
  highFidelity: boolean;
}

export function CrochetYarnStitch({
  position,
  rotation = 0,
  type,
  isHovered,
  highFidelity,
}: CrochetStitch3DProps) {
  const color = type === 'inc' ? YARN_COLORS.rose : type === 'dec' ? YARN_COLORS.sage : YARN_COLORS.cream;
  
  // Map crochet stitch types to yarn path types
  const getYarnType = (stitchType: CrochetStitch): 'sc' | 'inc' | 'default' => {
    switch (stitchType) {
      case 'sc':
      case 'hdc':
      case 'dc':
      case 'tr':
      case 'dtr':
        return 'sc';
      case 'inc':
        return 'inc';
      default:
        return 'default';
    }
  };
  
  const yarnType = getYarnType(type);
  
  // For X-shaped stitches (sc, dc, etc), render two crossing tubes
  if (yarnType === 'sc') {
    return (
      <group position={position} rotation={[0, 0, rotation]}>
        <YarnTube
          position={[0, 0, 0]}
          rotation={[0, 0, Math.PI / 4]}
          type="default"
          color={color}
          isHovered={isHovered}
          highFidelity={highFidelity}
          scale={0.8}
        />
        <YarnTube
          position={[0, 0, 0.02]}
          rotation={[0, 0, -Math.PI / 4]}
          type="default"
          color={color}
          isHovered={isHovered}
          highFidelity={highFidelity}
          scale={0.8}
        />
      </group>
    );
  }
  
  if (yarnType === 'inc') {
    return (
      <group position={position} rotation={[0, 0, rotation]}>
        <YarnTube
          position={[-0.05, 0, 0]}
          rotation={[0, 0, Math.PI / 6]}
          type="default"
          color={color}
          isHovered={isHovered}
          highFidelity={highFidelity}
          scale={0.7}
        />
        <YarnTube
          position={[0.05, 0, 0]}
          rotation={[0, 0, -Math.PI / 6]}
          type="default"
          color={color}
          isHovered={isHovered}
          highFidelity={highFidelity}
          scale={0.7}
        />
      </group>
    );
  }
  
  return (
    <group position={position} rotation={[0, 0, rotation]}>
      <YarnTube
        position={[0, 0, 0]}
        type="default"
        color={color}
        isHovered={isHovered}
        highFidelity={highFidelity}
        scale={0.8}
      />
    </group>
  );
}

// Knitting Stitch 3D Component with yarn tubes
interface KnittingStitch3DProps {
  position: [number, number, number];
  type: KnittingStitch;
  isHovered: boolean;
  highFidelity: boolean;
}

export function KnittingYarnStitch({
  position,
  type,
  isHovered,
  highFidelity,
}: KnittingStitch3DProps) {
  const color = type === 'knit' ? YARN_COLORS.cream : 
                type === 'purl' ? YARN_COLORS.honey : 
                type === 'yo' ? YARN_COLORS.sky : YARN_COLORS.cream;
  
  if (type === 'knit') {
    return (
      <group position={position}>
        <YarnTube
          position={[-0.04, 0.05, 0]}
          rotation={[0, 0, Math.PI / 5]}
          type="default"
          color={color}
          isHovered={isHovered}
          highFidelity={highFidelity}
          scale={0.6}
        />
        <YarnTube
          position={[0.04, 0.05, 0]}
          rotation={[0, 0, -Math.PI / 5]}
          type="default"
          color={color}
          isHovered={isHovered}
          highFidelity={highFidelity}
          scale={0.6}
        />
      </group>
    );
  }
  
  if (type === 'purl') {
    return (
      <group position={position}>
        <YarnTube
          position={[0, 0, 0.02]}
          rotation={[0, 0, Math.PI / 2]}
          type="default"
          color={color}
          isHovered={isHovered}
          highFidelity={highFidelity}
          scale={0.7}
        />
      </group>
    );
  }
  
  if (type === 'yo') {
    // Yarn over - small loop
    return (
      <mesh position={position}>
        <torusGeometry args={[0.06, 0.015, 8, 16]} />
        <meshStandardMaterial 
          color={color}
          roughness={0.9}
          emissive={isHovered ? color : '#000000'}
          emissiveIntensity={isHovered ? 0.4 : 0}
        />
      </mesh>
    );
  }
  
  // Default
  return (
    <group position={position}>
      <YarnTube
        position={[0, 0, 0]}
        type="default"
        color={color}
        isHovered={isHovered}
        highFidelity={highFidelity}
        scale={0.6}
      />
    </group>
  );
}

export { YARN_COLORS };
