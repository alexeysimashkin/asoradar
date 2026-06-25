"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default function LiveFlightPage() {
  const { id } = useParams();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const [flight, setFlight] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Форма для новой точки
  const [newPoint, setNewPoint] = useState({
    latitude: "",
    longitude: "",
    altitude: "10000",
    speed: "850",
    heading: "90",
  });

  // Загрузка рейса
  const fetchFlight = useCallback(async () => {
    const res = await fetch(`/api/flights/${id}/admin`);
    const data = await res.json();
    setFlight(data);

    // Загружаем позиции
    const posRes = await fetch(`/api/flights/${id}/positions/all`);
    const posData = await posRes.json();
    setPositions(posData);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchFlight();
  }, [fetchFlight]);

  // Инициализация карты
  useEffect(() => {
    if (!mapContainer.current || map.current || !flight) return;

    const dep = flight.departureAirport || { latitude: 55, longitude: 37 };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [dep.longitude, dep.latitude],
      zoom: 5,
    });

    map.current.addControl(new maplibregl.NavigationControl());
  }, [flight]);

  // Отрисовка маршрута и маркеров
  useEffect(() => {
    if (!map.current || !flight) return;

    const draw = () => {
      if (!map.current || !flight) return;

      // Удаляем старые слои
      ["planned-route", "actual-trail", "airport-markers"].forEach((id) => {
        if (map.current!.getLayer(id)) map.current!.removeLayer(id);
        if (map.current!.getSource(id)) map.current!.removeSource(id);
      });

      // Запланированный маршрут
      if (flight.departureAirport && flight.arrivalAirport) {
        map.current.addSource("planned-route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [
                [flight.departureAirport.longitude, flight.departureAirport.latitude],
                [flight.arrivalAirport.longitude, flight.arrivalAirport.latitude],
              ],
            },
          },
        });

        map.current.addLayer({
          id: "planned-route",
          type: "line",
          source: "planned-route",
          paint: {
            "line-color": "#94a3b8",
            "line-width": 2,
            "line-dasharray": [4, 4],
          },
        });
      }

      // Фактический след
      if (positions.length >= 2) {
        map.current.addSource("actual-trail", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: positions.map((p: any) => [p.longitude, p.latitude]),
            },
          },
        });

        map.current.addLayer({
          id: "actual-trail",
          type: "line",
          source: "actual-trail",
          paint: {
            "line-color": "#eab308",
            "line-width": 3,
          },
        });
      }

      // Маркер самолёта
      updateMarker();

      // Подгоняем карту
      const bounds = new maplibregl.LngLatBounds();
      if (flight.departureAirport) {
        bounds.extend([flight.departureAirport.longitude, flight.departureAirport.latitude]);
      }
      if (flight.arrivalAirport) {
        bounds.extend([flight.arrivalAirport.longitude, flight.arrivalAirport.latitude]);
      }
      positions.forEach((p: any) => bounds.extend([p.longitude, p.latitude]));
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 80 });
      }
    };

    if (map.current.loaded()) {
      draw();
    } else {
      map.current.once("load", draw);
    }
  }, [flight, positions]);

  const updateMarker = () => {
    if (!map.current || !flight) return;

    if (markerRef.current) markerRef.current.remove();

    const lastPos = positions[positions.length - 1];
    const pos = lastPos
      ? [lastPos.longitude, lastPos.latitude]
      : flight.departureAirport
      ? [flight.departureAirport.longitude, flight.departureAirport.latitude]
      : [37, 55];

    const el = document.createElement("div");
    el.innerHTML = "✈️";
    el.style.fontSize = "28px";
    el.style.transform = lastPos ? `rotate(${lastPos.heading}deg)` : "rotate(0deg)";
    el.style.filter = flight.isEmergency
      ? "drop-shadow(0 0 6px red)"
      : "none";

    markerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat(pos as [number, number])
      .addTo(map.current);
  };

  // Добавить новую точку
  const addPoint = async () => {
    if (!newPoint.latitude || !newPoint.longitude) {
      setMessage("Введите широту и долготу");
      return;
    }

    setSaving(true);
    setMessage("");

    const res = await fetch(`/api/flights/${id}/position`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude: parseFloat(newPoint.latitude),
        longitude: parseFloat(newPoint.longitude),
        altitude: parseInt(newPoint.altitude) || 0,
        speed: parseInt(newPoint.speed) || 0,
        heading: parseInt(newPoint.heading) || 0,
      }),
    });

    if (res.ok) {
      const savedPoint = await res.json();
      setPositions((prev) => [...prev, savedPoint]);
      setMessage("Точка добавлена! Самолёт перемещён.");

      // Если рейс был scheduled, он автоматически станет active в API
      setFlight((prev: any) => (prev ? { ...prev, status: "active" } : prev));

      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage("Ошибка при добавлении точки");
    }

    setSaving(false);
  };

  // Переключить сигнал бедствия
  const toggleEmergency = async () => {
    const res = await fetch(`/api/flights/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isEmergency: !flight.isEmergency,
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setFlight(updated);
      setMessage(
        updated.isEmergency
          ? "🔴 Сигнал бедствия включён!"
          : "🟡 Сигнал бедствия отключён"
      );
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Рейс не найден</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Верхняя панель */}
      <div className="bg-gray-900 text-white p-3 flex items-center gap-4 flex-shrink-0">
        <a href="/admin/flights" className="text-blue-400 hover:underline text-sm">
          ← К рейсам
        </a>
        <h1 className="font-bold">
          Прямой эфир: {flight.flightNumber}
        </h1>
        <span
          className={`px-2 py-0.5 rounded text-xs ${
            flight.status === "active"
              ? "bg-green-600"
              : "bg-yellow-600"
          }`}
        >
          {flight.status === "active" ? "В воздухе" : "По расписанию"}
        </span>
        <span className="text-sm text-gray-400">
          Точек: {positions.length}
        </span>

        <button
          onClick={toggleEmergency}
          className={`ml-auto px-3 py-1 rounded text-sm ${
            flight.isEmergency
              ? "bg-red-600 hover:bg-red-700"
              : "bg-gray-600 hover:bg-gray-700"
          }`}
        >
          {flight.isEmergency ? "🔴 Отключить тревогу" : "🟡 Сигнал бедствия"}
        </button>
      </div>

      {message && (
        <div
          className={`px-4 py-2 text-sm text-center ${
            message.includes("ошибка") || message.includes("Ошибка")
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Панель управления */}
        <div className="w-80 bg-white shadow-lg p-4 overflow-y-auto flex-shrink-0">
          <h2 className="font-semibold mb-4">Управление самолётом</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Широта *
              </label>
              <input
                type="number"
                step="any"
                value={newPoint.latitude}
                onChange={(e) =>
                  setNewPoint({ ...newPoint, latitude: e.target.value })
                }
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder="55.7558"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Долгота *
              </label>
              <input
                type="number"
                step="any"
                value={newPoint.longitude}
                onChange={(e) =>
                  setNewPoint({ ...newPoint, longitude: e.target.value })
                }
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder="37.6173"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Высота (м)
              </label>
              <input
                type="number"
                value={newPoint.altitude}
                onChange={(e) =>
                  setNewPoint({ ...newPoint, altitude: e.target.value })
                }
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Скорость (км/ч)
              </label>
              <input
                type="number"
                value={newPoint.speed}
                onChange={(e) =>
                  setNewPoint({ ...newPoint, speed: e.target.value })
                }
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Курс (градусы)
              </label>
              <input
                type="number"
                value={newPoint.heading}
                onChange={(e) =>
                  setNewPoint({ ...newPoint, heading: e.target.value })
                }
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder="0-360"
              />
            </div>

            <button
              onClick={addPoint}
              disabled={saving}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium mt-2"
            >
              {saving ? "⏳ Обновление..." : "✅ Обновить позицию"}
            </button>
          </div>

          {/* Быстрые координаты */}
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Быстрые точки (Москва — Питер)
            </h3>
            <div className="space-y-1">
              {[
                { label: "Взлёт (Шереметьево)", lat: 55.9726, lng: 37.4146, alt: 0, spd: 0, hdg: 315 },
                { label: "Клин", lat: 56.3333, lng: 36.7333, alt: 10000, spd: 800, hdg: 315 },
                { label: "Тверь", lat: 56.8587, lng: 35.9176, alt: 10000, spd: 850, hdg: 315 },
                { label: "В. Волочёк", lat: 57.5833, lng: 34.5667, alt: 10000, spd: 850, hdg: 315 },
                { label: "Посадка (Пулково)", lat: 59.8003, lng: 30.2625, alt: 0, spd: 0, hdg: 270 },
              ].map((pt) => (
                <button
                  key={pt.label}
                  onClick={() =>
                    setNewPoint({
                      latitude: pt.lat.toString(),
                      longitude: pt.lng.toString(),
                      altitude: pt.alt.toString(),
                      speed: pt.spd.toString(),
                      heading: pt.hdg.toString(),
                    })
                  }
                  className="w-full text-left px-3 py-2 text-xs bg-gray-50 hover:bg-gray-100 rounded border"
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Карта */}
        <div ref={mapContainer} className="flex-1" />
      </div>
    </div>
  );
}
