import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface MapPoint {
  lat: number;
  lng: number;
}

interface TravelMapProps {
  places: MapPlace[];
  start: MapPoint | null;
  onPickStart?: (point: MapPoint) => void;
  /** Road geometry as [lat, lng] pairs, drawn as a highlighted route. */
  route?: [number, number][];
  /** Destination marker shown at the end of the route. */
  routeEnd?: { lat: number; lng: number; label: string } | null;
  className?: string;
  label?: string;
}

// Ethiopia's approximate centre, used until there is a place or start point to fit.
const ETHIOPIA_CENTRE: L.LatLngExpression = [9.145, 40.4897];

const placeIcon = L.divIcon({
  className: "",
  html: '<div class="eq-marker eq-marker-place"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const startIcon = L.divIcon({
  className: "",
  html: '<div class="eq-marker eq-marker-start"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const endIcon = L.divIcon({
  className: "",
  html: '<div class="eq-marker eq-marker-end"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export function TravelMap({
  places,
  start,
  onPickStart,
  route,
  routeEnd,
  className,
  label = "Map of recommended places",
}: TravelMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onPickRef = useRef(onPickStart);
  onPickRef.current = onPickStart;

  // Create the map once. Clicking it sets a start point only when the parent
  // asks for one (the route planner keeps the map read-only).
  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(ETHIOPIA_CENTRE, 6);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    map.on("click", (event: L.LeafletMouseEvent) => {
      onPickRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Redraw markers, the route and the view whenever the data changes.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const points: L.LatLngExpression[] = [];

    for (const place of places) {
      L.marker([place.lat, place.lng], { icon: placeIcon, title: place.name })
        .bindTooltip(place.name)
        .addTo(layer);
      points.push([place.lat, place.lng]);
    }

    if (start) {
      L.marker([start.lat, start.lng], { icon: startIcon, title: "Your start", zIndexOffset: 1000 })
        .bindTooltip("Your start")
        .addTo(layer);
      points.push([start.lat, start.lng]);
    }

    if (route && route.length > 1) {
      // A white casing under the coloured line keeps it readable on busy tiles.
      L.polyline(route, { color: "#ffffff", weight: 10, opacity: 0.85, lineCap: "round", lineJoin: "round" }).addTo(layer);
      L.polyline(route, { color: "#0284c7", weight: 5.5, opacity: 1, lineCap: "round", lineJoin: "round" }).addTo(layer);
      points.push(...route);
    }

    if (routeEnd) {
      L.marker([routeEnd.lat, routeEnd.lng], { icon: endIcon, title: routeEnd.label, zIndexOffset: 1200 })
        .bindTooltip(routeEnd.label)
        .addTo(layer);
      points.push([routeEnd.lat, routeEnd.lng]);
    }

    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 10);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 12 });
    }
  }, [places, start, route, routeEnd]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={label}
      className={
        className ?? "eq-travel-map h-72 w-full overflow-hidden rounded-2xl border border-line sm:h-96"
      }
    />
  );
}
