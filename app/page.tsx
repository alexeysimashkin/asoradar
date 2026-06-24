"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Flight {
  id: string;
  flightNumber: string;
  isEmergency: boolean;
  departureAirport: { iataCode: string; city: string };
  arrivalAirport: { iataCode: string; city: string };
  positions: { latitude: number; longitude: number; altitude: number }[];
}

export default function HomePage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [flights, setFlights] = useState<Flight[]>([]);
  const [search, setSearch] = useState("");

  // Инициализация карты
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [55, 65],
      zoom: 3,
    });

    map.current.addControl(new maplibregl.NavigationControl());
  }, []);

  // Long polling: запрашиваем активные рейсы каждые 3 секунды
  const fetchFlights = useCallback(async () => {
    const res = await fetch("/api/flights/active");
    const data = await res.json();
    setFlights(data);
  }, []);

  useEffect(() => {
    fetchFlights();
    const interval = setInterval(fetchFlights, 3000);
    return () => clearInterval(interval);
  }, [fetchFlights]);

  // Обновляем маркеры на карте
  useEffect(() => {
    if (!map.current) return;

    // Удаляем старые маркеры, которых больше нет в списке
    const currentIds = new Set(flights.map((f) => f.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Добавляем или обновляем маркеры
    flights.forEach((flight) => {
      const lastPos = flight.positions[flight.positions.length - 1];
      if (!lastPos) return;

      const el = document.createElement("div");
      el.className = "flight-marker";
      el.style.width = "24px";
      el.style.height = "24px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = flight.isEmergency ? "#ef4444" : "#eab308";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";
      el.title = `${flight.flightNumber}: ${flight.departureAirport.iataCode} → ${flight.arrivalAirport.iataCode}`;

      if (markersRef.current.has(flight.id)) {
        markersRef.current.get(flight.id)!.setLngLat([lastPos.longitude, lastPos.latitude]);
      } else {
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lastPos.longitude, lastPos.latitude])
          .addTo(map.current!);

        el.addEventListener("click", () => {
          window.location.href = `/flight/${flight.flightNumber}`;
        });

        markersRef.current.set(flight.id, marker);
      }
    });
  }, [flights]);

  const filteredFlights = flights.filter((f) =>
    f.flightNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="h-screen w-screen relative">
      {/* Поиск */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-2 w-80">
        <input
          type="text"
          placeholder="Поиск рейса (например, SU1234)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
        {search && (
          <ul className="mt-2 max-h-40 overflow-y-auto">
            {filteredFlights.map((f) => (
              <li
                key={f.id}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={() => (window.location.href = `/flight/${f.flightNumber}`)}
              >
                {f.flightNumber} — {f.departureAirport.iataCode} → {f.arrivalAirport.iataCode}
                {f.isEmergency && " 🔴"}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Легенда */}
      <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-lg p-3 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>
          Обычный рейс
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
          Сигнал бедствия
        </div>
      </div>

      <div ref={mapContainer} className="h-full w-full" />
    </main>
  );
}
