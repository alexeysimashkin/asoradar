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
  departureAirport: {
    name: string;
    iataCode: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  arrivalAirport: {
    name: string;
    iataCode: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  positions: {
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    heading: number;
    createdAt: string;
  }[];
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

      const res = await fetch(
        `/api/flights/${flightNumber}/positions?since=${since}`
      );
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
      center: [
        flight.departureAirport.longitude,
        flight.departureAirport.latitude,
      ],
      zoom: 5,
    });

    map.current.addControl(new maplibregl.NavigationControl());
  }, [flight]);

  // Отрисовка всего на карте
  useEffect(() => {
    if (!map.current || !flight) return;

    const drawRoutes = () => {
      if (!map.current || !flight) return;

      // Удаляем старые слои и источники
      [
        "planned-route",
        "actual-trail",
        "departure-marker",
        "arrival-marker",
        "departure-label",
        "arrival-label",
      ].forEach((id) => {
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
        const trailCoords = flight.positions.map((p) => [
          p.longitude,
          p.latitude,
        ]);

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

      // --- Маркер аэропорта вылета (синий кружок) ---
      map.current.addSource("departure-marker", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [
              flight.departureAirport.longitude,
              flight.departureAirport.latitude,
            ],
          },
        },
      });

      map.current.addLayer({
        id: "departure-marker",
        type: "circle",
        source: "departure-marker",
        paint: {
          "circle-radius": 8,
          "circle-color": "#3b82f6",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9,
        },
      });

      // --- Маркер аэропорта прилёта (красный кружок) ---
      map.current.addSource("arrival-marker", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [
              flight.arrivalAirport.longitude,
              flight.arrivalAirport.latitude,
            ],
          },
        },
      });

      map.current.addLayer({
        id: "arrival-marker",
        type: "circle",
        source: "arrival-marker",
        paint: {
          "circle-radius": 8,
          "circle-color": "#ef4444",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9,
        },
      });

      // --- Подпись аэропорта вылета ---
      map.current.addSource("departure-label", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {
            name:
              flight.departureAirport.iataCode ||
              flight.departureAirport.city,
          },
          geometry: {
            type: "Point",
            coordinates: [
              flight.departureAirport.longitude,
              flight.departureAirport.latitude,
            ],
          },
        },
      });

      map.current.addLayer({
        id: "departure-label",
        type: "symbol",
        source: "departure-label",
        layout: {
          "text-field": ["get", "name"],
          "text-offset": [0, -1.5],
          "text-size": 12,
        },
        paint: {
          "text-color": "#1e40af",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
        },
      });

      // --- Подпись аэропорта прилёта ---
      map.current.addSource("arrival-label", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {
            name:
              flight.arrivalAirport.iataCode ||
              flight.arrivalAirport.city,
          },
          geometry: {
            type: "Point",
            coordinates: [
              flight.arrivalAirport.longitude,
              flight.arrivalAirport.latitude,
            ],
          },
        },
      });

      map.current.addLayer({
        id: "arrival-label",
        type: "symbol",
        source: "arrival-label",
        layout: {
          "text-field": ["get", "name"],
          "text-offset": [0, -1.5],
          "text-size": 12,
        },
        paint: {
          "text-color": "#991b1b",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
        },
      });

      // --- Маркер самолёта ---
      updateMarker();

      // Подгоняем карту под весь маршрут
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([
        flight.departureAirport.longitude,
        flight.departureAirport.latitude,
      ]);
      bounds.extend([
        flight.arrivalAirport.longitude,
        flight.arrivalAirport.latitude,
      ]);
      flight.positions.forEach((p) => bounds.extend([p.longitude, p.latitude]));

      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 80 });
      }
    };

    const updateMarker = () => {
      if (!map.current || !flight) return;

      if (markerRef.current) markerRef.current.remove();

      const lastPos = flight.positions[flight.positions.length - 1];
      const markerPos = lastPos
        ? ([lastPos.longitude, lastPos.latitude] as [number, number])
        : ([
            flight.departureAirport.longitude,
            flight.departureAirport.latitude,
          ] as [number, number]);

      const el = document.createElement("div");
      el.innerHTML = "✈️";
      el.style.fontSize = "28px";
      el.style.transform = lastPos
        ? `rotate(${lastPos.heading}deg)`
        : "rotate(0deg)";
      el.style.filter = flight.isEmergency
        ? "drop-shadow(0 0 6px red)"
        : "none";

      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(markerPos)
        .addTo(map.current!);
    };

    // Ждём загрузки карты или рисуем сразу
    if (map.current.loaded()) {
      drawRoutes();
    } else {
      map.current.once("load", drawRoutes);
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
            <span className="font-medium">
              {flight.aircraftType.modelName}
            </span>
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
