export interface GlobeMarker {
  lat: number;
  lng: number;
  label: string;
  size: number;
  color: string;
}

export const GLOBE_MARKERS: GlobeMarker[] = [
  { lat:  40.71, lng:  -74.01, label: 'New York',     size: 0.9, color: '#fbbf24' },
  { lat:  51.51, lng:   -0.13, label: 'London',       size: 0.9, color: '#fbbf24' },
  { lat:  35.68, lng:  139.69, label: 'Tokyo',        size: 0.9, color: '#fbbf24' },
  { lat:  28.61, lng:   77.21, label: 'Delhi',        size: 0.9, color: '#fbbf24' },
  { lat: -33.87, lng:  151.21, label: 'Sydney',       size: 0.9, color: '#fbbf24' },
  { lat:  37.77, lng: -122.42, label: 'San Francisco',size: 0.9, color: '#fbbf24' },
  { lat: -22.91, lng:  -43.17, label: 'Rio',          size: 0.9, color: '#fbbf24' },
  { lat:   1.35, lng:  103.82, label: 'Singapore',    size: 0.9, color: '#fbbf24' },
];
