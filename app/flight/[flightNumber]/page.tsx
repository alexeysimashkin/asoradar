"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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
  const map = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [flight, setFlight] = useState<FlightData | null>(null);
  const [loading, setLoading] = useState(true);

  // Загрузка данных рейса
  const fetchFlight = async () => {
    const res = await fetch(`/api/flights/${flightNumber}`);
    if (res.ok) {
      const data = await res.json();
      setFlight(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFlight();
  }, [flightNumber]);

  // Long polling: обновление позиций
  useEffect(() => {
    if (!flight || flight.status !== "active") return;

    const interval = setInterval(async () => {
      const lastPosition = flight.positions[flight.positions.length - 1];
      const since = lastPosition?.createdAt || new Date(0).toISOString();

      const res = await fetch(`/api/flights/${flightNumber}/positions?since=${since}`);
      if (!res.ok) return;

      const newPositions = await res.json();
      if (newPositions.length > 0) {
        setFlight((prev) =>
          prev
            ? { ...prev, positions: [...prev.positions, ...newPositions] }
            : prev
        );
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [flight?.id, flight?.status]);

  // Инициализация карты
  useEffect(() => {
    if (!mapContainer.current || map.current || !flight) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [flight.departureAirport.longitude, flight.departureAirport.latitude],
      zoom: 5,
    });

    map.current.addControl(new maplibregl.NavigationControl());
  }, [flight]);

  // Отрисовка маршрута и следа
  useEffect(() => {
    if (!map.current || !flight) return;

    // Ждём загрузки карты
    map.current.once("load", () => {
      drawRoutes();
    });

    // Если карта уже загружена, рисуем сразу
    if (map.current.loaded()) {
      drawRoutes();
    }

    function drawRoutes() {
      if (!map.current || !flight) return;

      // Удаляем старые слои если есть
      ["planned-route", "actual-trail"].forEach((id) => {
        if (map.current!.getLayer(id)) map.current!.removeLayer(id);
        if (map.current!.getSource(id)) map.current!.removeSource(id);
      });

      // --- Запланированный маршрут (пунктир) ---
      const plannedCoords = [
        [flight.departureAirport.longitude, flight.departureAirport.latitude],
        [flight.arrivalAirport.longitude, flight.arrivalAirport.latitude],
      ];

      map.current.addSource("planned-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: plannedCoords,
          },
        },
      });

      map.current.addLayer({
        id: "planned-route",
        type: "line",
        source: "planned-route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#94a3b8",
          "line-width": 2,
          "line-dasharray": [4, 4],
          "line-opacity": 0.7,
        },
      });

      // --- Фактический след (сплошная линия) ---
      if (flight.positions.length >= 2) {
        const trailCoords = flight.positions.map((p) => [p.longitude, p.latitude]);

        map.current.addSource("actual-trail", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: trailCoords,
            },
          },
        });

        map.current.addLayer({
          id: "actual-trail",
          type: "line",
          source: "actual-trail",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#eab308",
            "line-width": 3,
            "line-opacity": 0.9,
          },
        });
      }

      // --- Маркер самолёта ---
      updateMarker();

      // Подгоняем карту под маршрут
      const bounds = new maplibregl.LngLatBounds();
      plannedCoords.forEach((c) => bounds.extend(c as [number, number]));
      flight.positions.forEach((p) => bounds.extend([p.longitude, p.latitude]));
      map.current.fitBounds(bounds, { padding: 80 });
    }

    function updateMarker() {
      if (!map.current || !flight) return;

      // Удаляем старый маркер
      if (markerRef.current) markerRef.current.remove();

      const lastPos = flight.positions[flight.positions.length - 1];
      const markerPos = lastPos
        ? [lastPos.longitude, lastPos.latitude]
        : [flight.departureAirport.longitude, flight.departureAirport.latitude];

      const el = document.createElement("div");
      el.innerHTML = "✈️";
      el.style.fontSize = "28px";
      el.style.transform = lastPos ? `rotate(${lastPos.heading}deg)` : "rotate(0deg)";
      el.style.filter = flight.isEmergency ? "drop-shadow(0 0 6px red) hue-rotate(0deg) saturate(2)" : "none";

      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(markerPos as [number, number])
        .addTo(map.current);
    }
  }, [flight?.positions.length, flight?.isEmergency]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-gray-500">Загрузка...</p>
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-gray-500">Рейс не найден</p>
      </div>
    );
  }

  return (
    <main className="h-screen w-screen flex flex-col">
      {/* Верхняя панель с информацией */}
      <div className="bg-white shadow-md p-4 flex items-center gap-6 flex-shrink-0">
        <a href="/" className="text-blue-600 hover:underline text-sm">
          ← На главную
        </a>

        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            {flight.flightNumber}
            {flight.isEmergency && (
              <span className="text-red-500 text-sm font-normal animate-pulse">
                🔴 Сигнал бедствия
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500">
            {flight.departureAirport.city} ({flight.departureAirport.iataCode}) →{" "}
            {flight.arrivalAirport.city} ({flight.arrivalAirport.iataCode})
          </p>
        </div>

        <div className="ml-auto flex gap-6 text-sm">
          <div>
            <span className="text-gray-400">Тип ВС:</span>{" "}
            <span className="font-medium">{flight.aircraftType.modelName}</span>
          </div>
          <div>
            <span className="text-gray-400">Статус:</span>{" "}
            <span
              className={`font-medium ${
                flight.status === "active"
                  ? "text-green-600"
                  : flight.status === "scheduled"
                  ? "text-blue-600"
                  : "text-gray-600"
              }`}
            >
              {flight.status === "active"
                ? "В воздухе"
                : flight.status === "scheduled"
                ? "По расписанию"
                : flight.status === "completed"
                ? "Завершён"
                : "Отменён"}
            </span>
          </div>
          {flight.positions.length > 0 && (
            <>
              <div>
                <span className="text-gray-400">Высота:</span>{" "}
                <span className="font-medium">
                  {flight.positions[flight.positions.length - 1].altitude} м
                </span>
              </div>
              <div>
                <span className="text-gray-400">Скорость:</span>{" "}
                <span className="font-medium">
                  {flight.positions[flight.positions.length - 1].speed} км/ч
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Карта */}
      <div ref={mapContainer} className="flex-1 w-full" />
    </main>
  );
}
