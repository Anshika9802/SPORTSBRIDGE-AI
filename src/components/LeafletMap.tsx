import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
  onSelect?: () => void;
}

interface LeafletMapProps {
  markers: MapMarker[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  heightClass?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  markers,
  centerLat,
  centerLng,
  zoom = 12,
  heightClass = 'h-72',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const first = markers[0];
    const lat = centerLat ?? first?.lat ?? 12.9716;
    const lng = centerLng ?? first?.lng ?? 77.5946;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        center: [lat, lng],
        zoom,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(mapRef.current);
    } else {
      mapRef.current.setView([lat, lng], zoom);
    }

    const map = mapRef.current;
    const layerGroup = L.layerGroup().addTo(map);

    markers.forEach((m) => {
      const marker = L.circleMarker([m.lat, m.lng], {
        radius: 9,
        fillColor: '#2563eb',
        color: '#ffffff',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.95,
      }).addTo(layerGroup);

      const popupEl = document.createElement('div');
      popupEl.className = 'text-xs leading-snug';
      const strong = document.createElement('strong');
      strong.className = 'block text-slate-900 font-semibold';
      strong.textContent = m.title;
      const sub = document.createElement('span');
      sub.className = 'block text-slate-600 mt-0.5';
      sub.textContent = m.subtitle;
      popupEl.appendChild(strong);
      popupEl.appendChild(sub);

      if (m.onSelect) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className =
          'mt-2 inline-block px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-medium cursor-pointer';
        btn.textContent = 'View opportunity';
        btn.onclick = m.onSelect;
        popupEl.appendChild(btn);
      }

      marker.bindPopup(popupEl);
    });

    if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
      map.fitBounds(bounds.pad(0.2));
    }

    return () => {
      layerGroup.remove();
    };
  }, [markers, centerLat, centerLng, zoom]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClass} rounded-xl border border-slate-200 overflow-hidden bg-slate-100`}
      aria-label="Opportunity location map"
    />
  );
};
