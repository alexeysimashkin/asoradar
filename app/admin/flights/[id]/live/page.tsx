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

  const [newPoint, setNewPoint] = useState({
    latitude: "",
    longitude: "",
    altitude: "10000",
    speed: "850",
    heading: "90",
  });

  const fetchFlight = useCallback(async () => {
    const res = await fetch(`/api/flights/${id}/admin`);
    const data = await res.json();
    setFlight(data);

    const posRes = await fetch(`/api/flights/${id}/positions/all`);
    const posData = await posRes.json();
    setPositions(posData);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchFlight();
  }, [fetchFlight]);

  useEffect(() => {
    if (!mapContainer.current || map.current || !flight) return;

    const dep = flight.departureAirport || { latitude: 55, longitude: 37 };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: [dep.longitude || 37, dep.latitude || 55],
      zoom: 5,
    });

    map.current.addControl(new maplibregl.NavigationControl());

    map.current.on("click", (e) => {
      setNewPoint((prev) => ({
        ...prev,
        latitude: e.lngLat.lat.toFixed(6),
        longitude: e.lngLat.lng.toFixed(6),
      }));
      setMessage("Координаты установлены по клику! Нажми «Обновить позицию»");
      setTimeout(() => setMessage(""), 3000);
    });
  }, [flight]);

  useEffect(() => {
    if (!map.current || !flight) return;

    const draw = () => {
      if (!map.current || !flight) return;

      ["planned-route", "actual-trail", "departure-marker", "arrival-marker", "departure-label", "arrival-label"].forEach((id) => {
        if (map.current!.getLayer(id)) map.current!.removeLayer(id);
        if (map.current!.getSource(id)) map.current!.removeSource(id);
      });

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

        // Аэропорт вылета
        map.current.addSource("departure-marker", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [flight.departureAirport.longitude, flight.departureAirport.latitude],
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
          },
        });

        // Аэропорт прилёта
        map.current.addSource("arrival-marker", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [flight.arrivalAirport.longitude, flight.arrivalAirport.latitude],
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
          },
        });
      }

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

      updateMarker();

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
      el.style.filter = flight.isEmergency ? "drop-shadow(0 0 6px red)" : "none";

      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(pos as [number, number])
        .addTo(map.current!);
    };

    if (map.current.loaded()) {
      draw();
    } else {
      map.current.once("load", draw);
    }
  }, [flight, positions]);

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
      setFlight((prev: any) => (prev ? { ...prev, status: "active" } : prev));
      setTimeout(() => setMessage(""), 3000);
    } else {
      setMessage("Ошибка при добавлении точки");
    }

    setSaving(false);
  };

  const toggleEmergency = async () => {
    const res = await fetch(`/api/flights/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEmergency: !flight.isEmergency }),
    });

    if (res.ok) {
      const updated = await res.json();
      setFlight(updated);
      setMessage(updated.isEmergency ? "🔴 Сигнал бедствия включён!" : "🟡 Сигнал бедствия отключён");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!flight) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p>Рейс не найден</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-gray-900 text-white p-3 flex items-center gap-4 flex-shrink-0 flex-wrap">
        <a href="/admin/flights" className="text-blue-400 hover:underline text-sm">
          ← К рейсам
        </a>
        <h1 className="font-bold">Прямой эфир: {flight.flightNumber}</h1>
        <span className={`px-2 py-0.5 rounded text-xs ${flight.status === "active" ? "bg-green-600" : "bg-yellow-600"}`}>
          {flight.status === "active" ? "В воздухе" : "По расписанию"}
        </span>
        <span className="text-sm text-gray-400">Точек: {positions.length}</span>
        <button
          onClick={toggleEmergency}
          className={`ml-auto px-3 py-1 rounded text-sm ${flight.isEmergency ? "bg-red-600 hover:bg-red-700" : "bg-gray-600 hover:bg-gray-700"}`}
        >
          {flight.isEmergency ? "🔴 Отключить тревогу" : "🟡 Сигнал бедствия"}
        </button>
      </div>

      {message && (
        <div className={`px-4 py-2 text-sm text-center ${message.includes("Ошибка") || message.includes("Введите") ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}>
          {message}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 bg-gray-800 text-white shadow-lg p-4 overflow-y-auto flex-shrink-0">
          <h2 className="font-semibold mb-4">Управление самолётом</h2>

          <p className="text-xs text-gray-400 mb-4">
            💡 Кликните по карте, чтобы автоматически заполнить координаты
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Широта *</label>
              <input
                type="number"
                step="any"
                value={newPoint.latitude}
                onChange={(e) => setNewPoint({ ...newPoint, latitude: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                placeholder="55.7558"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Долгота *</label>
              <input
                type="number"
                step="any"
                value={newPoint.longitude}
                onChange={(e) => setNewPoint({ ...newPoint, longitude: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                placeholder="37.6173"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Высота (м)</label>
              <input
                type="number"
                value={newPoint.altitude}
                onChange={(e) => setNewPoint({ ...newPoint, altitude: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Скорость (км/ч)</label>
              <input
                type="number"
                value={newPoint.speed}
                onChange={(e) => setNewPoint({ ...newPoint, speed: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Курс (градусы)</label>
              <input
                type="number"
                value={newPoint.heading}
                onChange={(e) => setNewPoint({ ...newPoint, heading: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
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

          <div className="mt-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Быстрые точки</h3>
            <div className="space-y-1">
              {[
                { label: "Москва (центр)", lat: 55.7558, lng: 37.6173, alt: 0, spd: 0, hdg: 0 },
                { label: "Москва (север)", lat: 55.85, lng: 37.6, alt: 5000, spd: 400, hdg: 0 },
                { label: "Клин", lat: 56.3333, lng: 36.7333, alt: 10000, spd: 800, hdg: 315 },
                { label: "Тверь", lat: 56.8587, lng: 35.9176, alt: 10000, spd: 850, hdg: 315 },
                { label: "Санкт-Петербург", lat: 59.9343, lng: 30.3351, alt: 0, spd: 0, hdg: 0 },
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
                  className="w-full text-left px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded border border-gray-600"
                >
                  {pt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div ref={mapContainer} className="flex-1" />
      </div>
    </div>
  );
}
