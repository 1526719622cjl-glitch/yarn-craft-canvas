/**
 * React hook for managing wireframe BufferGeometry
 * Optimized for high-performance updates with Float32Array
 */

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { ParsedStitch } from '@/lib/enhancedCrochetParser';
import { 
  generateWireframeVertices, 
  WireframeConfig, 
  DEFAULT_CONFIG,
  calculateStitchPositions,
  StitchPosition 
} from '@/lib/crochetPathGenerator';

export interface UseWireframeGeometryOptions {
  showConnectors?: boolean;
  zSpiral?: boolean;
  heightScale?: number;
  baseRadius?: number;
  rowSpacing?: number;
}

export interface UseWireframeGeometryResult {
  geometry: THREE.BufferGeometry;
  vertexCount: number;
  positions: StitchPosition[];
  updateGeometry: () => void;
}

export function useWireframeGeometry(
  stitches: ParsedStitch[],
  options: UseWireframeGeometryOptions = {}
): UseWireframeGeometryResult {
  const geometryRef = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry());
  
  // Build config from options
  const config: WireframeConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    showConnectors: options.showConnectors ?? true,
    zIncrement: options.zSpiral !== false ? DEFAULT_CONFIG.zIncrement : 0,
    heightScale: options.heightScale ?? DEFAULT_CONFIG.heightScale,
    baseRadius: options.baseRadius ?? DEFAULT_CONFIG.baseRadius,
    rowSpacing: options.rowSpacing ?? DEFAULT_CONFIG.rowSpacing,
  }), [options.showConnectors, options.zSpiral, options.heightScale, options.baseRadius, options.rowSpacing]);
  
  // Calculate positions for hit testing
  const positions = useMemo(() => {
    return calculateStitchPositions(stitches, config);
  }, [stitches, config]);
  
  // Generate vertices
  const { vertices, vertexCount } = useMemo(() => {
    const verts = generateWireframeVertices(stitches, config);
    return {
      vertices: verts,
      vertexCount: verts.length / 3,
    };
  }, [stitches, config]);
  
  // Update geometry when vertices change
  useEffect(() => {
    const geometry = geometryRef.current;
    
    if (vertices.length === 0) {
      geometry.deleteAttribute('position');
      return;
    }
    
    // Update or create position attribute
    const existingAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    
    if (existingAttr && existingAttr.array.length >= vertices.length) {
      // Reuse existing buffer if large enough
      (existingAttr.array as Float32Array).set(vertices);
      // Use setDrawRange to control how many vertices are rendered
      geometry.setDrawRange(0, vertexCount);
      existingAttr.needsUpdate = true;
    } else {
      // Create new buffer
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(vertices, 3)
      );
      geometry.setDrawRange(0, vertexCount);
    }
    
    geometry.computeBoundingSphere();
  }, [vertices, vertexCount]);
  
  // Manual update function for animation frames
  const updateGeometry = () => {
    const attr = geometryRef.current.getAttribute('position');
    if (attr) {
      (attr as THREE.BufferAttribute).needsUpdate = true;
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometryRef.current.dispose();
    };
  }, []);
  
  return {
    geometry: geometryRef.current,
    vertexCount,
    positions,
    updateGeometry,
  };
}

/**
 * Hook for animated geometry updates in useFrame
 */
export function useWireframeAnimation(
  geometry: THREE.BufferGeometry,
  animate: boolean = false,
  rotationSpeed: number = 0.001
) {
  const rotationRef = useRef(0);
  
  return {
    updateFrame: (delta: number) => {
      if (!animate) return;
      rotationRef.current += rotationSpeed * delta * 60;
    },
    rotation: rotationRef.current,
  };
}
