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

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current).setView([55, 65], 3);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current);
  }, []);

  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch("/api/flights/active");
      const data = await res.json();
      setFlights(data || []);
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

    flights.forEach((flight) => {
      const lastPos = flight.positions[flight.positions.length - 1];
      if (!lastPos) return;

      const icon = L.divIcon({
        html: `<div style="width: 24px; height: 24px; border-radius: 50%; background: ${flight.isEmergency ? '#ef4444' : '#eab308'}; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 14px; transform: rotate(${lastPos.heading || 0}deg);">✈</div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (markersRef.current.has(flight.id)) {
        markersRef.current.get(flight.id)!.setLatLng([lastPos.latitude, lastPos.longitude]);
      } else {
        const marker = L.marker([lastPos.latitude, lastPos.longitude], { icon })
          .addTo(map.current!)
          .on("click", () => router.push(`/tracker/${flight.flightNumber}`));
        markersRef.current.set(flight.id, marker);
      }
    });
  }, [flights, router]);

  const filteredFlights = flights.filter((f) =>
    f.flightNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="h-screen w-screen relative">
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-2 w-80">
        <input
          type="text"
          placeholder="Поиск рейса..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
        {search && (
          <ul className="mt-2 max-h-40 overflow-y-auto">
            {filteredFlights.map((f) => (
              <li key={f.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={() => router.push(`/tracker/${f.flightNumber}`)}>
                {f.flightNumber} — {f.departureAirport.iataCode || f.departureAirport.city} → {f.arrivalAirport.iataCode || f.arrivalAirport.city}
                {f.isEmergency && " 🔴"}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span> Обычный
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Тревога
        </div>
      </div>

      <div ref={mapContainer} className="h-full w-full" />
    </main>
  );
}
