"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface FlightData {
  id: string;
  flightNumber: string;
  status: string;
  isEmergency: boolean;
  scheduledDeparture: string;
  scheduledArrival: string;
  aircraftType: { modelName: string; sizeCategory: string };
  departureAirport: { name: string; iataCode: string; city: string; latitude: number; longitude: number };
  arrivalAirport: { name: string; iataCode: string; city: string; latitude: number; longitude: number };
  positions: { latitude: number; longitude: number; altitude: number; speed: number; heading: number; createdAt: string }[];
}

export default function FlightPage() {
  const { flightNumber } = useParams();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);
  const plannedRef = useRef<L.Polyline | null>(null);
  const depMarkerRef = useRef<L.CircleMarker | null>(null);
  const arrMarkerRef = useRef<L.CircleMarker | null>(null);
  const [flight, setFlight] = useState<FlightData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFlight = async () => {
    try {
      const res = await fetch(`/api/flights/${flightNumber}`);
      if (res.ok) {
        const data = await res.json();
        setFlight(data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchFlight();
  }, [flightNumber]);

  useEffect(() => {
    if (!flight || flight.status !== "active") return;

    const interval = setInterval(async () => {
      const lastPosition = flight.positions[flight.positions.length - 1];
      const since = lastPosition?.createdAt || new Date(0).toISOString();

      try {
        const res = await fetch(`/api/flights/${flightNumber}/positions?since=${since}`);
        if (res.ok) {
          const newPositions = await res.json();
          if (newPositions.length > 0) {
            setFlight((prev) =>
              prev ? { ...prev, positions: [...prev.positions, ...newPositions] } : prev
            );
          }
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [flight?.id, flight?.status]);

  useEffect(() => {
    if (!mapContainer.current || map.current || !flight) return;

    map.current = L.map(mapContainer.current).setView(
      [flight.departureAirport.latitude, flight.departureAirport.longitude],
      5
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current);
  }, [flight]);

  useEffect(() => {
    if (!map.current || !flight) return;

    if (markerRef.current) map.current.removeLayer(markerRef.current);
    if (trailRef.current) map.current.removeLayer(trailRef.current);
    if (plannedRef.current) map.current.removeLayer(plannedRef.current);
    if (depMarkerRef.current) map.current.removeLayer(depMarkerRef.current);
    if (arrMarkerRef.current) map.current.removeLayer(arrMarkerRef.current);

    // Аэропорт вылета
    depMarkerRef.current = L.circleMarker(
      [flight.departureAirport.latitude, flight.departureAirport.longitude],
      { radius: 8, color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 2 }
    ).addTo(map.current).bindPopup(`🛫 ${flight.departureAirport.name}`);

    // Аэропорт прилёта
    arrMarkerRef.current = L.circleMarker(
      [flight.arrivalAirport.latitude, flight.arrivalAirport.longitude],
      { radius: 8, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.9, weight: 2 }
    ).addTo(map.current).bindPopup(`🛬 ${flight.arrivalAirport.name}`);

    // Плановый маршрут
    plannedRef.current = L.polyline(
      [
        [flight.departureAirport.latitude, flight.departureAirport.longitude],
        [flight.arrivalAirport.latitude, flight.arrivalAirport.longitude],
      ],
      { color: "#94a3b8", weight: 2, dashArray: "8, 8", opacity: 0.7 }
    ).addTo(map.current);

    // Фактический след
    if (flight.positions.length >= 2) {
      trailRef.current = L.polyline(
        flight.positions.map((p) => [p.latitude, p.longitude]),
        { color: "#eab308", weight: 3, opacity: 0.9 }
      ).addTo(map.current);
    }

    // Самолёт
    const lastPos = flight.positions[flight.positions.length - 1];
    const markerPos: [number, number] = lastPos
      ? [lastPos.latitude, lastPos.longitude]
      : [flight.departureAirport.latitude, flight.departureAirport.longitude];

    const icon = L.divIcon({
      html: `<div style="font-size: 32px; transform: rotate(${lastPos?.heading || 0}deg); filter: ${flight.isEmergency ? 'drop-shadow(0 0 8px red)' : 'none'};">✈️</div>`,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    markerRef.current = L.marker(markerPos, { icon }).addTo(map.current);

    // Границы
    const bounds = L.latLngBounds([
      [flight.departureAirport.latitude, flight.departureAirport.longitude],
      [flight.arrivalAirport.latitude, flight.arrivalAirport.longitude],
    ]);
    flight.positions.forEach((p) => bounds.extend([p.latitude, p.longitude]));
    map.current.fitBounds(bounds, { padding: [50, 50] });
  }, [flight?.positions.length, flight?.isEmergency]);

  if (loading) return <div className="flex items-center justify-center h-screen"><p>Загрузка...</p></div>;
  if (!flight) return <div className="flex items-center justify-center h-screen"><p>Рейс не найден</p></div>;

  return (
    <main className="h-screen w-screen flex flex-col">
      <div className="bg-white shadow-md p-4 flex items-center gap-6 flex-shrink-0 flex-wrap">
        <a href="/" className="text-blue-600 hover:underline text-sm">← На главную</a>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            {flight.flightNumber}
            {flight.isEmergency && <span className="text-red-500 animate-pulse">🔴 Тревога</span>}
          </h1>
          <p className="text-sm text-gray-500">
            {flight.departureAirport.city} ({flight.departureAirport.iataCode}) → {flight.arrivalAirport.city} ({flight.arrivalAirport.iataCode})
          </p>
        </div>
        <div className="ml-auto flex gap-6 text-sm">
          <div><span className="text-gray-400">Тип ВС:</span> <span className="font-medium">{flight.aircraftType.modelName}</span></div>
          <div><span className="text-gray-400">Статус:</span> <span className={`font-medium ${flight.status === "active" ? "text-green-600" : flight.status === "scheduled" ? "text-blue-600" : "text-gray-600"}`}>{flight.status === "active" ? "В воздухе" : flight.status === "scheduled" ? "По расписанию" : flight.status}</span></div>
          {flight.positions.length > 0 && (
            <>
              <div><span className="text-gray-400">Высота:</span> <span className="font-medium">{flight.positions[flight.positions.length - 1].altitude} м</span></div>
              <div><span className="text-gray-400">Скорость:</span> <span className="font-medium">{flight.positions[flight.positions.length - 1].speed} км/ч</span></div>
            </>
          )}
        </div>
      </div>
      <div ref={mapContainer} className="flex-1 w-full" />
    </main>
  );
}
