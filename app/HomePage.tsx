"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Flight {
  id: string;
  flightNumber: string;
  isEmergency: boolean;
  departureAirport: { iataCode: string; city: string };
  arrivalAirport: { iataCode: string; city: string };
  positions: { latitude: number; longitude: number; altitude: number; heading: number }[];
}

export default function HomePage() {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [flights, setFlights] = useState<Flight[]>([]);
  const [search, setSearch] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      attributionControl: false,
    }).setView([55, 65], 3);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map.current);

    L.control.attribution({ position: "bottomright", prefix: false }).addTo(map.current);
    setInitialized(true);
  }, []);

  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch("/api/flights/active");
      const data = await res.json();
      setFlights(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchFlights();
    const interval = setInterval(fetchFlights, 3000);
    return () => clearInterval(interval);
  }, [fetchFlights]);

  useEffect(() => {
    if (!map.current) return;

    const currentIds = new Set(flights.map((f) => f.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        map.current!.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });

    const bounds: [number, number][] = [];

    flights.forEach((flight) => {
      const lastPos = flight.positions[flight.positions.length - 1];
      if (!lastPos) return;

      bounds.push([lastPos.latitude, lastPos.longitude]);

      const icon = L.divIcon({
        html: `<div style="width: 24px; height: 24px; border-radius: 50%; background: ${flight.isEmergency ? '#ef4444' : '#eab308'}; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 12px; color: white; font-weight: bold;">✈</div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (markersRef.current.has(flight.id)) {
        markersRef.current.get(flight.id)!.setLatLng([lastPos.latitude, lastPos.longitude]);
      } else {
        const marker = L.marker([lastPos.latitude, lastPos.longitude], { icon })
          .addTo(map.current!)
          .on("click", () => router.push(`/tracker/${flight.id}`));
        marker.bindPopup(`<b>${flight.flightNumber}</b><br>${flight.departureAirport.iataCode || flight.departureAirport.city} → ${flight.arrivalAirport.iataCode || flight.arrivalAirport.city}${flight.isEmergency ? ' 🔴 ТРЕВОГА' : ''}`);
        markersRef.current.set(flight.id, marker);
      }
    });

    if (bounds.length > 1 && initialized) {
      map.current.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
    }
  }, [flights, router, initialized]);

  const filteredFlights = flights.filter((f) =>
    f.flightNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="h-screen w-screen relative">
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-2 w-80">
        <input
          type="text"
          placeholder="Поиск рейса (например, 6N2305A)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
        {search && filteredFlights.length > 0 && (
          <ul className="mt-2 max-h-40 overflow-y-auto border rounded-lg">
            {filteredFlights.map((f) => (
              <li key={f.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-b-0"
                onClick={() => router.push(`/tracker/${f.id}`)}>
                <span className="font-bold">{f.flightNumber}</span> — {f.departureAirport.iataCode || f.departureAirport.city} → {f.arrivalAirport.iataCode || f.arrivalAirport.city}
                {f.isEmergency && " 🔴"}
              </li>
            ))}
          </ul>
        )}
        {search && filteredFlights.length === 0 && (
          <div className="mt-2 px-3 py-2 text-sm text-gray-400">Ничего не найдено</div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span> Обычный рейс
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Сигнал бедствия
        </div>
      </div>

      <div ref={mapContainer} className="h-full w-full" />
    </main>
  );
}
