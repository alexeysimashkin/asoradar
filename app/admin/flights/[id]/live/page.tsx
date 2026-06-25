"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function LiveFlightPage() {
  const { id } = useParams();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);
  const plannedRef = useRef<L.Polyline | null>(null);
  const departureMarkerRef = useRef<L.CircleMarker | null>(null);
  const arrivalMarkerRef = useRef<L.CircleMarker | null>(null);

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
    try {
      const res = await fetch(`/api/flights/${id}/admin`);
      const data = await res.json();
      setFlight(data);

      const posRes = await fetch(`/api/flights/${id}/positions/all`);
      const posData = await posRes.json();
      setPositions(posData || []);
    } catch (err) {
      console.error("Ошибка загрузки:", err);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchFlight();
  }, [fetchFlight]);

  // Инициализация карты
  useEffect(() => {
    if (!mapContainer.current || map.current || loading) return;

    const defaultLat = flight?.departureAirport?.latitude || 55.7558;
    const defaultLng = flight?.departureAirport?.longitude || 37.6173;

    map.current = L.map(mapContainer.current).setView([defaultLat, defaultLng], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current);

    // Клик по карте
    map.current.on("click", (e: L.LeafletMouseEvent) => {
      setNewPoint((prev) => ({
        ...prev,
        latitude: e.latlng.lat.toFixed(6),
        longitude: e.latlng.lng.toFixed(6),
      }));
      setMessage("📍 Координаты установлены! Нажми «Обновить позицию»");
      setTimeout(() => setMessage(""), 3000);
    });
  }, [loading]);

  // Обновление маркеров и линий
  useEffect(() => {
    if (!map.current || !flight) return;

    // Очистка
    if (markerRef.current) map.current.removeLayer(markerRef.current);
    if (trailRef.current) map.current.removeLayer(trailRef.current);
    if (plannedRef.current) map.current.removeLayer(plannedRef.current);
    if (departureMarkerRef.current) map.current.removeLayer(departureMarkerRef.current);
    if (arrivalMarkerRef.current) map.current.removeLayer(arrivalMarkerRef.current);

    // Аэропорты
    if (flight.departureAirport?.latitude && flight.departureAirport?.longitude) {
      departureMarkerRef.current = L.circleMarker(
        [flight.departureAirport.latitude, flight.departureAirport.longitude],
        { radius: 8, color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 2 }
      ).addTo(map.current).bindPopup(`🛫 ${flight.departureAirport.name || "Вылет"}`);
    }

    if (flight.arrivalAirport?.latitude && flight.arrivalAirport?.longitude) {
      arrivalMarkerRef.current = L.circleMarker(
        [flight.arrivalAirport.latitude, flight.arrivalAirport.longitude],
        { radius: 8, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.9, weight: 2 }
      ).addTo(map.current).bindPopup(`🛬 ${flight.arrivalAirport.name || "Прилёт"}`);
    }

    // Плановый маршрут
    if (flight.departureAirport && flight.arrivalAirport) {
      plannedRef.current = L.polyline(
        [
          [flight.departureAirport.latitude, flight.departureAirport.longitude],
          [flight.arrivalAirport.latitude, flight.arrivalAirport.longitude],
        ],
        { color: "#94a3b8", weight: 2, dashArray: "8, 8", opacity: 0.7 }
      ).addTo(map.current);
    }

    // Фактический след
    if (positions.length >= 2) {
      trailRef.current = L.polyline(
        positions.map((p: any) => [p.latitude, p.longitude]),
        { color: "#eab308", weight: 3, opacity: 0.9 }
      ).addTo(map.current);
    }

    // Самолёт
    const lastPos = positions[positions.length - 1];
    const markerPos: [number, number] = lastPos
      ? [lastPos.latitude, lastPos.longitude]
      : flight.departureAirport?.latitude
      ? [flight.departureAirport.latitude, flight.departureAirport.longitude]
      : [55.7558, 37.6173];

    const icon = L.divIcon({
      html: `<div style="font-size: 32px; transform: rotate(${lastPos?.heading || 0}deg); filter: ${flight.isEmergency ? 'drop-shadow(0 0 8px red) brightness(0.7) sepia(1) hue-rotate(-50deg) saturate(5)' : 'none'}; transition: transform 0.3s;">✈️</div>`,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    markerRef.current = L.marker(markerPos, { icon }).addTo(map.current);

    // Границы карты
    const allPoints: [number, number][] = [];
    if (flight.departureAirport?.latitude) {
      allPoints.push([flight.departureAirport.latitude, flight.departureAirport.longitude]);
    }
    if (flight.arrivalAirport?.latitude) {
      allPoints.push([flight.arrivalAirport.latitude, flight.arrivalAirport.longitude]);
    }
    positions.forEach((p: any) => allPoints.push([p.latitude, p.longitude]));

    if (allPoints.length > 1) {
      map.current.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50] });
    }
  }, [flight, positions]);

  const addPoint = async () => {
    if (!newPoint.latitude || !newPoint.longitude) {
      setMessage("❌ Введите широту и долготу");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
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
        setMessage("✅ Точка добавлена!");
        setFlight((prev: any) => (prev ? { ...prev, status: "active" } : prev));
      } else {
        setMessage("❌ Ошибка сервера");
      }
    } catch {
      setMessage("❌ Ошибка сети");
    }

    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const toggleEmergency = async () => {
    try {
      const res = await fetch(`/api/flights/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEmergency: !flight.isEmergency }),
      });

      if (res.ok) {
        const updated = await res.json();
        setFlight(updated);
        setMessage(updated.isEmergency ? "🔴 Тревога!" : "🟡 Норма");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("❌ Ошибка");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">✈️</div>
          <p>Загрузка...</p>
        </div>
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
      {/* Верхняя панель */}
      <div className="bg-gray-900 text-white p-3 flex items-center gap-4 flex-shrink-0 flex-wrap">
        <a href="/admin/flights" className="text-blue-400 hover:underline text-sm font-medium">
          ← К рейсам
        </a>
        <h1 className="font-bold text-lg">{flight.flightNumber}</h1>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${flight.status === "active" ? "bg-green-600" : "bg-yellow-600"}`}>
          {flight.status === "active" ? "В воздухе" : "По расписанию"}
        </span>
        <span className="text-sm text-gray-400">Точек: {positions.length}</span>
        <button
          onClick={toggleEmergency}
          className={`ml-auto px-4 py-1.5 rounded text-sm font-bold transition ${flight.isEmergency ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-gray-600 hover:bg-gray-700"}`}
        >
          {flight.isEmergency ? "🔴 ТРЕВОГА" : "🟡 Сигнал бедствия"}
        </button>
      </div>

      {/* Сообщение */}
      {message && (
        <div className={`px-4 py-2 text-sm text-center font-medium text-white ${message.includes("❌") ? "bg-red-600" : "bg-green-600"}`}>
          {message}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Панель управления */}
        <div className="w-80 bg-gray-800 text-white shadow-lg p-4 overflow-y-auto flex-shrink-0">
          <h2 className="font-bold text-lg mb-2">🎮 Управление</h2>
          <p className="text-xs text-gray-400 mb-4">
            💡 Кликните по карте — координаты заполнятся автоматически
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Широта *</label>
              <input type="number" step="any" value={newPoint.latitude}
                onChange={(e) => setNewPoint({ ...newPoint, latitude: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="55.7558" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Долгота *</label>
              <input type="number" step="any" value={newPoint.longitude}
                onChange={(e) => setNewPoint({ ...newPoint, longitude: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="37.6173" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Высота (м)</label>
              <input type="number" value={newPoint.altitude}
                onChange={(e) => setNewPoint({ ...newPoint, altitude: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Скорость (км/ч)</label>
              <input type="number" value={newPoint.speed}
                onChange={(e) => setNewPoint({ ...newPoint, speed: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Курс (0-360°)</label>
              <input type="number" value={newPoint.heading}
                onChange={(e) => setNewPoint({ ...newPoint, heading: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white" />
            </div>

            <button onClick={addPoint} disabled={saving}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold text-sm transition">
              {saving ? "⏳ Обновление..." : "✅ Обновить позицию"}
            </button>
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">⚡ Быстрые точки</h3>
            <div className="space-y-1">
              {[
                { label: "Москва, центр", lat: 55.7558, lng: 37.6173, alt: 0, spd: 0, hdg: 0 },
                { label: "Москва, север", lat: 55.85, lng: 37.6, alt: 3000, spd: 400, hdg: 0 },
                { label: "Клин", lat: 56.3333, lng: 36.7333, alt: 10000, spd: 800, hdg: 315 },
                { label: "Тверь", lat: 56.8587, lng: 35.9176, alt: 10000, spd: 850, hdg: 315 },
                { label: "Санкт-Петербург", lat: 59.9343, lng: 30.3351, alt: 0, spd: 0, hdg: 0 },
              ].map((pt) => (
                <button key={pt.label}
                  onClick={() => setNewPoint({
                    latitude: pt.lat.toString(),
                    longitude: pt.lng.toString(),
                    altitude: pt.alt.toString(),
                    speed: pt.spd.toString(),
                    heading: pt.hdg.toString(),
                  })}
                  className="w-full text-left px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 transition">
                  📍 {pt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Карта */}
        <div ref={mapContainer} className="flex-1" style={{ minHeight: "400px" }} />
      </div>
    </div>
  );
}
