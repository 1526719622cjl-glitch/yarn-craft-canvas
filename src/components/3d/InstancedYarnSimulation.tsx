import { useRef, useMemo, useEffect } from 'react';
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

// Custom fuzzy yarn shader for instancing
const yarnVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vInstanceColor;
  
  void main() {
    vNormal = normalize(normalMatrix * (instanceMatrix * vec4(normal, 0.0)).xyz);
    vPosition = (instanceMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    vInstanceColor = instanceColor;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const yarnFragmentShader = `
  uniform float time;
  uniform bool highFidelity;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vInstanceColor;
  
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
    vec3 color = vInstanceColor;
    
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
    
    // High fidelity adds subtle AO simulation
    if (highFidelity) {
      float ao = 0.8 + 0.2 * vNormal.z;
      finalColor = finalColor * ao;
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Shared geometries for instancing
function getStitchGeometry(type: string, highFidelity: boolean) {
  const points: THREE.Vector3[] = [];
  const scale = 1;
  
  switch (type) {
    case 'sc_cross1':
      for (let t = 0; t <= 1; t += 0.1) {
        points.push(new THREE.Vector3((t - 0.5) * 0.3 * scale, (t - 0.5) * 0.3 * scale, Math.sin(t * Math.PI) * 0.05 * scale));
      }
      break;
    case 'sc_cross2':
      for (let t = 0; t <= 1; t += 0.1) {
        points.push(new THREE.Vector3((t - 0.5) * 0.3 * scale, -(t - 0.5) * 0.3 * scale, Math.sin(t * Math.PI) * 0.05 * scale));
      }
      break;
    case 'knit':
      for (let t = 0; t <= 1; t += 0.05) {
        const angle = t * Math.PI;
        points.push(new THREE.Vector3(Math.sin(angle) * 0.12 * scale, (t - 0.5) * 0.25 * scale, Math.cos(angle) * 0.03 * scale));
      }
      break;
    case 'purl':
      for (let t = 0; t <= 1; t += 0.1) {
        points.push(new THREE.Vector3((t - 0.5) * 0.3 * scale, Math.sin(t * Math.PI) * 0.08 * scale, 0.05 * scale));
      }
      break;
    default:
      for (let t = 0; t <= 1; t += 0.1) {
        points.push(new THREE.Vector3((t - 0.5) * 0.2 * scale, Math.sin(t * Math.PI) * 0.1 * scale, 0));
      }
  }
  
  const curve = new THREE.CatmullRomCurve3(points);
  const tubularSegments = highFidelity ? 32 : 16;
  const radialSegments = highFidelity ? 8 : 6;
  const radius = 0.02 * scale;
  return new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
}

interface InstancedStitchesProps {
  data: { position: [number, number, number]; rotation: [number, number, number]; color: string }[];
  type: string;
  highFidelity: boolean;
}

function InstancedStitches({ data, type, highFidelity }: InstancedStitchesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const geometry = useMemo(() => getStitchGeometry(type, highFidelity), [type, highFidelity]);
  
  const uniforms = useMemo(() => ({
    time: { value: 0 },
    highFidelity: { value: highFidelity },
  }), [highFidelity]);

  useEffect(() => {
    if (!meshRef.current) return;
    
    const tempMatrix = new THREE.Matrix4();
    const tempColor = new THREE.Color();
    
    data.forEach((item, i) => {
      tempMatrix.makeRotationFromEuler(new THREE.Euler(...item.rotation));
      tempMatrix.setPosition(...item.position);
      meshRef.current!.setMatrixAt(i, tempMatrix);
      
      tempColor.set(item.color);
      meshRef.current!.setColorAt(i, tempColor);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [data]);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = clock.getElapsedTime();
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, data.length]}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={yarnVertexShader}
        fragmentShader={yarnFragmentShader}
        uniforms={uniforms}
      />
    </instancedMesh>
  );
}

export function InstancedCrochetScene({ chart, highFidelity }: { chart: any[]; highFidelity: boolean }) {
  const groups = useMemo(() => {
    const sc1: any[] = [];
    const sc2: any[] = [];
    const inc: any[] = [];
    const def: any[] = [];
    
    chart.forEach((cell, i) => {
      const row = cell.row;
      const radius = 0.3 + row * 0.35;
      const rowCells = chart.filter(c => c.row === row);
      const angleStep = (2 * Math.PI) / rowCells.length;
      const cellIndex = rowCells.indexOf(cell);
      const angle = cellIndex * angleStep - Math.PI / 2;
      const stitchOffset = row % 2 === 0 ? 0 : angleStep / 2;
      const x = Math.cos(angle + stitchOffset) * radius;
      const y = Math.sin(angle + stitchOffset) * radius;
      const z = row * 0.04;
      const rot = angle + stitchOffset + Math.PI / 2;
      
      const color = cell.type === 'inc' ? YARN_COLORS.rose : cell.type === 'dec' ? YARN_COLORS.sage : YARN_COLORS.cream;
      
      if (cell.type === 'inc') {
        inc.push({ position: [x - 0.05, y, z], rotation: [0, 0, rot + Math.PI / 6], color });
        inc.push({ position: [x + 0.05, y, z], rotation: [0, 0, rot - Math.PI / 6], color });
      } else if (['sc', 'hdc', 'dc', 'tr', 'dtr'].includes(cell.type)) {
        sc1.push({ position: [x, y, z], rotation: [0, 0, rot + Math.PI / 4], color });
        sc2.push({ position: [x, y, z + 0.02], rotation: [0, 0, rot - Math.PI / 4], color });
      } else {
        def.push({ position: [x, y, z], rotation: [0, 0, rot], color });
      }
    });
    
    return { sc1, sc2, inc, def };
  }, [chart]);

  return (
    <group>
      <InstancedStitches data={groups.sc1} type="default" highFidelity={highFidelity} />
      <InstancedStitches data={groups.sc2} type="default" highFidelity={highFidelity} />
      <InstancedStitches data={groups.inc} type="default" highFidelity={highFidelity} />
      <InstancedStitches data={groups.def} type="default" highFidelity={highFidelity} />
    </group>
  );
}

export function InstancedKnittingScene({ chart, width, height, highFidelity }: { chart: any[]; width: number; height: number; highFidelity: boolean }) {
  const spacing = 0.3;
  const offsetX = (width * spacing) / 2;
  const offsetY = (height * spacing) / 2;

  const groups = useMemo(() => {
    const knit1: any[] = [];
    const knit2: any[] = [];
    const purl: any[] = [];
    const def: any[] = [];
    
    chart.forEach((cell) => {
      const xOffset = cell.row % 2 === 0 ? 0 : spacing / 2;
      const x = cell.stitch * spacing - offsetX + xOffset;
      const y = cell.row * spacing * 0.7 - offsetY;
      const z = cell.row * 0.015;
      const color = cell.type === 'knit' ? YARN_COLORS.cream : cell.type === 'purl' ? YARN_COLORS.honey : cell.type === 'yo' ? YARN_COLORS.sky : YARN_COLORS.cream;

      if (cell.type === 'knit') {
        knit1.push({ position: [x - 0.04, y + 0.05, z], rotation: [0, 0, Math.PI / 5], color });
        knit2.push({ position: [x + 0.04, y + 0.05, z], rotation: [0, 0, -Math.PI / 5], color });
      } else if (cell.type === 'purl') {
        purl.push({ position: [x, y, z + 0.02], rotation: [0, 0, Math.PI / 2], color });
      } else {
        def.push({ position: [x, y, z], rotation: [0, 0, 0], color });
      }
    });
    
    return { knit1, knit2, purl, def };
  }, [chart, width, height]);

  return (
    <group>
      <InstancedStitches data={groups.knit1} type="default" highFidelity={highFidelity} />
      <InstancedStitches data={groups.knit2} type="default" highFidelity={highFidelity} />
      <InstancedStitches data={groups.purl} type="default" highFidelity={highFidelity} />
      <InstancedStitches data={groups.def} type="default" highFidelity={highFidelity} />
    </group>
  );
}
