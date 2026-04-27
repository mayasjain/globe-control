import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import ThreeGlobe from 'three-globe';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import type { GlobeControlValues } from '../hooks/useGlobeControls';
import type { GlobeMarker } from '../data/globeMarkers';

const GLOBE_RADIUS = 100; // three-globe default

interface GlobeInnerProps {
  controlsRef: React.MutableRefObject<GlobeControlValues>;
  markers: GlobeMarker[];
}

function GlobeInner({ controlsRef, markers }: GlobeInnerProps) {
  const { scene, camera } = useThree();
  const globeRef = useRef<ThreeGlobe | null>(null);

  useEffect(() => {
    const globe = new ThreeGlobe({ animateIn: true })
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .showAtmosphere(true)
      .atmosphereColor('#5fa8ff')
      .atmosphereAltitude(0.22)
      .pointsData(markers)
      .pointLat((d) => (d as GlobeMarker).lat)
      .pointLng((d) => (d as GlobeMarker).lng)
      .pointColor((d) => (d as GlobeMarker).color)
      .pointRadius((d) => (d as GlobeMarker).size)
      .pointAltitude(0.01)
      .pointsMerge(true)
      .ringsData(markers)
      .ringLat((d) => (d as GlobeMarker).lat)
      .ringLng((d) => (d as GlobeMarker).lng)
      .ringColor(() => (t: number) => `rgba(96, 165, 250, ${1 - t})`)
      .ringMaxRadius(3)
      .ringPropagationSpeed(2)
      .ringRepeatPeriod(1500);

    // Tighten material for crisper visuals
    const globeMaterial = globe.globeMaterial() as THREE.MeshPhongMaterial;
    globeMaterial.shininess = 6;
    globeMaterial.specular = new THREE.Color('#222a44');

    scene.add(globe);
    globeRef.current = globe;

    return () => {
      scene.remove(globe);
      globe.clear();
    };
  }, [scene, markers]);

  useFrame(() => {
    if (!globeRef.current) return;
    const { lat, lng, altitude } = controlsRef.current;

    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    const radius = GLOBE_RADIUS * (1 + altitude);

    camera.position.set(
      -radius * Math.sin(phi) * Math.cos(theta),
       radius * Math.cos(phi),
       radius * Math.sin(phi) * Math.sin(theta),
    );
    camera.lookAt(0, 0, 0);

    // Adjust near plane for very close zoom-in so we don't clip the globe surface
    if ('near' in camera) {
      const persp = camera as THREE.PerspectiveCamera;
      persp.near = Math.max(0.1, GLOBE_RADIUS * altitude * 0.3);
      persp.updateProjectionMatrix();
    }
  });

  return null;
}

interface GlobeSceneProps {
  controlsRef: React.MutableRefObject<GlobeControlValues>;
  markers: GlobeMarker[];
}

export function GlobeScene({ controlsRef, markers }: GlobeSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 350], fov: 45, near: 0.1, far: 5000 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ background: 'radial-gradient(ellipse at center, #050816 0%, #000000 70%)' }}
    >
      <ambientLight intensity={0.35} color="#a4b4ff" />
      <directionalLight position={[200, 100, 200]} intensity={1.4} color="#ffffff" />
      <directionalLight position={[-150, -80, -100]} intensity={0.4} color="#3050ff" />
      <Stars radius={800} depth={120} count={9000} factor={6} saturation={0} fade speed={0.4} />
      <GlobeInner controlsRef={controlsRef} markers={markers} />
    </Canvas>
  );
}
