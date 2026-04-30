import { useEffect, useRef } from 'react';
import maplibregl, { Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import type { GlobeControlValues } from '../hooks/useGlobeControls';
import type { GlobeMarker } from '../data/globeMarkers';

const ALT_REF = 2.5;
const ZOOM_AT_REF = 1.5;
const MIN_ZOOM = 0;
const MAX_ZOOM = 16;

function altitudeToZoom(altitude: number): number {
  const z = ZOOM_AT_REF - Math.log2(altitude / ALT_REF);
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

interface GlobeSceneProps {
  controlsRef: React.MutableRefObject<GlobeControlValues>;
  markers: GlobeMarker[];
  tick: (dt: number) => void;
  isGrabbingRef?: React.MutableRefObject<boolean>;
}

export function GlobeScene({ controlsRef, markers, tick, isGrabbingRef }: GlobeSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log('[GlobeScene] mount', containerRef.current);
    if (!containerRef.current) return;

    const initial = controlsRef.current;
    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE_URL as unknown as StyleSpecification,
        center: [initial.lng, initial.lat],
        zoom: altitudeToZoom(initial.altitude),
        interactive: false,
        attributionControl: { compact: true },
      });
    } catch (err) {
      console.error('[MapLibre] constructor threw', err);
      return;
    }
    mapRef.current = map;
    console.log('[GlobeScene] map created', {
      w: containerRef.current.clientWidth,
      h: containerRef.current.clientHeight,
    });
    requestAnimationFrame(() => map.resize());

    map.on('error', (e) => {
      console.error('[MapLibre]', e?.error ?? e);
    });

    map.on('load', () => console.log('[MapLibre] load'));

    map.on('style.load', () => {
      console.log('[MapLibre] style.load');
      try {
        map.setProjection({ type: 'globe' });
      } catch (err) {
        console.warn('[MapLibre] setProjection failed', err);
      }

      // Highlight curated markers as a small pulsing circle layer on top of OSM labels.
      if (markers.length > 0) {
        const fc = {
          type: 'FeatureCollection' as const,
          features: markers.map((m) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
            properties: { label: m.label, color: m.color, size: m.size },
          })),
        };
        if (!map.getSource('curated-markers')) {
          map.addSource('curated-markers', { type: 'geojson', data: fc });
          map.addLayer({
            id: 'curated-markers-glow',
            type: 'circle',
            source: 'curated-markers',
            paint: {
              'circle-radius': 14,
              'circle-color': ['get', 'color'],
              'circle-opacity': 0.18,
              'circle-blur': 0.6,
            },
          });
          map.addLayer({
            id: 'curated-markers-dot',
            type: 'circle',
            source: 'curated-markers',
            paint: {
              'circle-radius': 5,
              'circle-color': ['get', 'color'],
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1.5,
              'circle-opacity': 0.95,
            },
          });
        }
      }
    });

    let rafId = 0;
    let lastT = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastT) / 1000);
      lastT = now;
      tick(dt);

      const { lat, lng, altitude } = controlsRef.current;
      const zoom = altitudeToZoom(altitude);
      map.jumpTo({ center: [lng, lat], zoom });

      if (overlayRef.current && isGrabbingRef) {
        const target = isGrabbingRef.current ? 1 : 0;
        const cur = parseFloat(overlayRef.current.dataset.intensity ?? '0');
        const next = cur + (target - cur) * Math.min(1, dt * 6);
        overlayRef.current.dataset.intensity = String(next);
        overlayRef.current.style.opacity = String(next * 0.55);
      }

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      map.remove();
      mapRef.current = null;
    };
  }, [controlsRef, tick, isGrabbingRef, markers]);

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background:
            'radial-gradient(ellipse at 50% 40%, #4a6a9c 0%, #2a3e5e 35%, #14213a 70%, #0a1326 100%)',
        }}
      />
      <div
        ref={overlayRef}
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0,
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(165,216,255,0.35) 0%, rgba(165,216,255,0) 60%)',
          mixBlendMode: 'screen',
        }}
      />
    </div>
  );
}
