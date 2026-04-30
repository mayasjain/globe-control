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
  tick: (dt: number) => void;
  isGrabbingRef?: React.MutableRefObject<boolean>;
}

function GlobeInner({ controlsRef, markers, tick, isGrabbingRef }: GlobeInnerProps) {
  const { scene, camera } = useThree();
  const globeRef = useRef<ThreeGlobe | null>(null);
  const cloudsRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const globe = new ThreeGlobe({ animateIn: true })
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
      .showAtmosphere(true)
      .atmosphereColor('#a5d8ff')
      .atmosphereAltitude(0.28)
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
      .ringRepeatPeriod(1500)
      .labelsData(markers)
      .labelLat((d) => (d as GlobeMarker).lat)
      .labelLng((d) => (d as GlobeMarker).lng)
      .labelText((d) => (d as GlobeMarker).label)
      .labelColor(() => '#ffffff')
      .labelSize(0.6)
      .labelDotRadius(0.25)
      .labelDotOrientation(() => 'bottom')
      .labelAltitude(0.012)
      .labelResolution(3);

    // Tighten material for crisper visuals
    const globeMaterial = globe.globeMaterial() as THREE.MeshPhongMaterial;
    globeMaterial.shininess = 12;
    globeMaterial.specular = new THREE.Color('#445e88');

    scene.add(globe);
    globeRef.current = globe;

    // Cloud layer: a transparent sphere just above the surface, slowly rotating
    const cloudsTex = new THREE.TextureLoader().load(
      'https://unpkg.com/three-globe/example/img/clouds.png',
    );
    const cloudsGeom = new THREE.SphereGeometry(GLOBE_RADIUS * 1.012, 64, 64);
    const cloudsMat = new THREE.MeshPhongMaterial({
      map: cloudsTex,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    const clouds = new THREE.Mesh(cloudsGeom, cloudsMat);
    scene.add(clouds);
    cloudsRef.current = clouds;

    return () => {
      scene.remove(globe);
      globe.clear();
      scene.remove(clouds);
      cloudsGeom.dispose();
      cloudsMat.dispose();
      cloudsTex.dispose();
      cloudsRef.current = null;
    };
  }, [scene, markers]);

  useFrame((_, dt) => {
    if (!globeRef.current) return;
    tick(dt);
    if (cloudsRef.current) cloudsRef.current.rotation.y += dt * 0.012;

    // Grab affordance: when held, lift the atmosphere slightly so the user
    // sees the globe respond. Cheap and unambiguous.
    if (isGrabbingRef && globeRef.current) {
      const targetAlt = isGrabbingRef.current ? 0.36 : 0.28;
      const cur = globeRef.current.atmosphereAltitude();
      globeRef.current.atmosphereAltitude(cur + (targetAlt - cur) * Math.min(1, dt * 6));
    }

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
  tick: (dt: number) => void;
  isGrabbingRef?: React.MutableRefObject<boolean>;
}

export function GlobeScene({ controlsRef, markers, tick, isGrabbingRef }: GlobeSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 350], fov: 45, near: 0.1, far: 5000 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{
        background:
          'radial-gradient(ellipse at 50% 40%, #4a6a9c 0%, #2a3e5e 35%, #14213a 70%, #0a1326 100%)',
      }}
    >
      <ambientLight intensity={0.95} color="#dbe7ff" />
      <directionalLight position={[250, 180, 220]} intensity={1.6} color="#ffffff" />
      <directionalLight position={[-200, -100, -150]} intensity={0.55} color="#88aaff" />
      <hemisphereLight color="#cfe0ff" groundColor="#1a2540" intensity={0.5} />
      <Stars radius={900} depth={120} count={5000} factor={4} saturation={0} fade speed={0.3} />
      <GlobeInner controlsRef={controlsRef} markers={markers} tick={tick} isGrabbingRef={isGrabbingRef} />
    </Canvas>
  );
}
