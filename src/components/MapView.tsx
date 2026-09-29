import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Complaint } from '../types';
import { moduleColors, statusLabels, severityColors } from '../services/ai';

// Fix default marker icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapViewProps {
  complaints: Complaint[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onMarkerClick?: (complaint: Complaint) => void;
  selectable?: boolean;
  selectedPos?: [number, number] | null;
  onSelect?: (lat: number, lng: number) => void;
}

// Create colored circle markers
function createCircleIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
}

export default function MapView({ complaints, center = [24.531, 81.303], zoom = 13, height = '400px', onMarkerClick, selectable, selectedPos, onSelect }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const selectMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapInstance.current = map;

    if (selectable) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (onSelect) onSelect(lat, lng);

        if (selectMarkerRef.current) {
          selectMarkerRef.current.setLatLng([lat, lng]);
        } else {
          selectMarkerRef.current = L.marker([lat, lng], {
            draggable: true,
          }).addTo(map);
          selectMarkerRef.current.on('dragend', () => {
            const pos = selectMarkerRef.current?.getLatLng();
            if (pos && onSelect) onSelect(pos.lat, pos.lng);
          });
        }
      });
    }

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update markers when complaints change
  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();

    for (const c of complaints) {
      if (c.latitude && c.longitude) {
        const color = moduleColors[c.module] || '#6366f1';
        const marker = L.marker([c.latitude, c.longitude], {
          icon: createCircleIcon(color),
        });

        const severityBg = c.severity === 'HIGH' ? '#ef4444' : c.severity === 'MEDIUM' ? '#f59e0b' : '#10b981';
        marker.bindPopup(`
          <div style="min-width:180px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${c.title}</div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:6px;">${c.ticket_number}</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;">
              <span style="background:${color}22;color:${color};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">${c.category}</span>
              <span style="background:${severityBg}22;color:${severityBg};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">${c.severity}</span>
            </div>
            <div style="font-size:11px;color:#64748b;margin-top:6px;">${statusLabels[c.status]} • ${c.address || 'Rewa'}</div>
          </div>
        `);

        if (onMarkerClick) {
          marker.on('click', () => onMarkerClick(c));
        }

        marker.addTo(markersRef.current!);
      }
    }
  }, [complaints, onMarkerClick]);

  // Update selection marker
  useEffect(() => {
    if (selectedPos && mapInstance.current) {
      if (selectMarkerRef.current) {
        selectMarkerRef.current.setLatLng(selectedPos);
      } else {
        selectMarkerRef.current = L.marker(selectedPos, { draggable: true }).addTo(mapInstance.current);
        selectMarkerRef.current.on('dragend', () => {
          const pos = selectMarkerRef.current?.getLatLng();
          if (pos && onSelect) onSelect(pos.lat, pos.lng);
        });
      }
      mapInstance.current.setView(selectedPos, 15);
    }
  }, [selectedPos]);

  return (
    <div className="map-container" style={{ height }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
