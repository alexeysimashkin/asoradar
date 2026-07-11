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
  const depMarkerRef = useRef<L.CircleMarker | null>(null);
  const arrMarkerRef = useRef<L.CircleMarker | null>(null);
  const divertMarkerRef = useRef<L.CircleMarker | null>(null);

  const [flight, setFlight] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [airports, setAirports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [message, setMessage] = useState("");
  const [showDivert, setShowDivert] = useState(false);
  const [divertAirportId, setDivertAirportId] = useState("");

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
      if (data.divertedToAirportId) {
        setDivertAirportId(data.divertedToAirportId);
      }

      const posRes = await fetch(`/api/flights/${id}/positions/all`);
      const posData = await posRes.json();
      setPositions(posData || []);
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchFlight();
    fetch("/api/airports").then((r) => r.json()).then(setAirports);
  }, [fetchFlight]);

  useEffect(() => {
    if (!mapContainer.current || map.current || loading) return;

    const lat = flight?.departureAirport?.latitude || 55.7558;
    const lng = flight?.departureAirport?.longitude || 37.6173;

    map.current = L.map(mapContainer.current, {
      attributionControl: false,
    }).setView([lat, lng], 5);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map.current);

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

  const getHeading = (p1: any, p2: any) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;
    const dLng = toRad(p2.longitude - p1.longitude);
    const lat1 = toRad(p1.latitude);
    const lat2 = toRad(p2.latitude);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  };

  useEffect(() => {
    if (!map.current || !flight) return;

    if (markerRef.current) map.current.removeLayer(markerRef.current);
    if (trailRef.current) map.current.removeLayer(trailRef.current);
    if (plannedRef.current) map.current.removeLayer(plannedRef.current);
    if (depMarkerRef.current) map.current.removeLayer(depMarkerRef.current);
    if (arrMarkerRef.current) map.current.removeLayer(arrMarkerRef.current);
    if (divertMarkerRef.current) map.current.removeLayer(divertMarkerRef.current);

    if (flight.departureAirport?.latitude) {
      depMarkerRef.current = L.circleMarker(
        [flight.departureAirport.latitude, flight.departureAirport.longitude],
        { radius: 8, color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 2 }
      ).addTo(map.current).bindPopup(`🛫 ${flight.departureAirport.name || "Вылет"}`);
    }

    if (flight.arrivalAirport?.latitude && !flight.divertedToAirport) {
      arrMarkerRef.current = L.circleMarker(
        [flight.arrivalAirport.latitude, flight.arrivalAirport.longitude],
        { radius: 8, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.9, weight: 2 }
      ).addTo(map.current).bindPopup(`🛬 ${flight.arrivalAirport.name || "Прилёт"}`);
    }

    if (flight.divertedToAirport?.latitude) {
      divertMarkerRef.current = L.circleMarker(
        [flight.divertedToAirport.latitude, flight.divertedToAirport.longitude],
        { radius: 10, color: "#f97316", fillColor: "#f97316", fillOpacity: 0.9, weight: 3 }
      ).addTo(map.current).bindPopup(`⚠️ Перенаправлен: ${flight.divertedToAirport.name}`);
    }

    const target = flight.divertedToAirport || flight.arrivalAirport;
    if (flight.departureAirport && target?.latitude) {
      plannedRef.current = L.polyline(
        [
          [flight.departureAirport.latitude, flight.departureAirport.longitude],
          [target.latitude, target.longitude],
        ],
        { color: flight.divertedToAirport ? "#f97316" : "#94a3b8", weight: 3, dashArray: "10, 10", opacity: 0.8 }
      ).addTo(map.current);
    }

    if (positions.length >= 2) {
      trailRef.current = L.polyline(
        positions.map((p: any) => [p.latitude, p.longitude]),
        { color: "#eab308", weight: 3, opacity: 0.9 }
      ).addTo(map.current);
    }

    const lastPos = positions[positions.length - 1];

    let heading = lastPos?.heading || 0;
    if (positions.length >= 2) {
      heading = getHeading(positions[positions.length - 2], lastPos);
    }

    const markerPos: [number, number] = lastPos
      ? [lastPos.latitude, lastPos.longitude]
      : flight.departureAirport?.latitude
      ? [flight.departureAirport.latitude, flight.departureAirport.longitude]
      : [55.7558, 37.6173];

    const icon = L.divIcon({
      html: `<div style="font-size: 32px; transform: rotate(${heading}deg); filter: ${flight.isEmergency ? 'drop-shadow(0 0 8px red)' : 'none'}; transition: transform 0.5s;">✈️</div>`,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    markerRef.current = L.marker(markerPos, { icon }).addTo(map.current);

    if (lastPos) {
      map.current.setView([lastPos.latitude, lastPos.longitude], map.current.getZoom());
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

  const saveDivert = async () => {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(`/api/flights/${id}/divert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ airportId: divertAirportId || null }),
      });

      if (res.ok) {
        const updated = await res.json();
        setFlight(updated);
        setMessage(divertAirportId ? "✅ Рейс перенаправлен!" : "✅ Перенаправление отменено");
        setShowDivert(false);
      } else {
        setMessage("❌ Ошибка");
      }
    } catch {
      setMessage("❌ Ошибка сети");
    }

    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const completeFlight = async () => {
    if (!confirm("Завершить рейс? Он будет убран с карты.")) return;
    setCompleting(true);
    setMessage("");

    try {
      const res = await fetch(`/api/flights/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (res.ok) {
        const updated = await res.json();
        setFlight(updated);
        setMessage("✅ Рейс прибыл! Статус: " + updated.status);
      } else {
        const err = await res.text();
        setMessage("❌ Ошибка сервера: " + err);
      }
    } catch (e: any) {
      setMessage("❌ Ошибка сети: " + e.message);
    }

    setCompleting(false);
    setTimeout(() => setMessage(""), 5000);
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
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center"><div className="text-4xl mb-4">✈️</div><p>Загрузка...</p></div>
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

  const isActive = flight.status === "active" || flight.status === "scheduled";

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-gray-900 text-white p-3 flex items-center gap-4 flex-shrink-0 flex-wrap">
        <a href="/admin/flights" className="text-blue-400 hover:underline text-sm font-medium">← К рейсам</a>
        <h1 className="font-bold text-lg">{flight.flightNumber}</h1>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
          flight.status === "active" ? "bg-green-600" :
          flight.status === "completed" ? "bg-blue-600" :
          "bg-yellow-600"
        }`}>
          {flight.status === "active" ? "В воздухе" :
           flight.status === "completed" ? "Прибыл" :
           "По расписанию"}
        </span>
        {flight.divertedToAirport && (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-600">
            Перенаправлен в {flight.divertedToAirport.iataCode}
          </span>
        )}
        <span className="text-sm text-gray-400">Точек: {positions.length}</span>

        {isActive && (
          <>
            <button onClick={() => setShowDivert(!showDivert)}
              className="px-3 py-1.5 rounded text-sm font-bold bg-orange-600 hover:bg-orange-700 transition">
              🔄 Перенаправить
            </button>
            <button onClick={toggleEmergency}
              className={`px-3 py-1.5 rounded text-sm font-bold transition ${flight.isEmergency ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-gray-600 hover:bg-gray-700"}`}>
              {flight.isEmergency ? "🔴 ТРЕВОГА" : "🟡 Сигнал бедствия"}
            </button>
            <button onClick={completeFlight} disabled={completing}
              className="px-3 py-1.5 rounded text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition">
              {completing ? "⏳" : "🛬"} Рейс прибыл
            </button>
          </>
        )}
      </div>

      {message && (
        <div className={`px-4 py-2 text-sm text-center font-medium text-white ${message.includes("❌") ? "bg-red-600" : "bg-green-600"}`}>
          {message}
        </div>
      )}

      {showDivert && (
        <div className="bg-gray-800 border-b border-gray-700 p-4 text-white">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium">🔄 Перенаправить в:</span>
            <select
              value={divertAirportId}
              onChange={(e) => setDivertAirportId(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
            >
              <option value="">Отменить перенаправление</option>
              {airports.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.iataCode || "?"} — {a.name} ({a.city})
                </option>
              ))}
            </select>
            <button onClick={saveDivert} disabled={saving}
              className="px-4 py-1.5 rounded text-sm font-bold bg-orange-600 hover:bg-orange-700 disabled:opacity-50">
              {saving ? "⏳" : "💾"} Сохранить
            </button>
            <button onClick={() => setShowDivert(false)}
              className="px-3 py-1.5 rounded text-sm bg-gray-600 hover:bg-gray-700">
              ✕ Закрыть
            </button>
          </div>
        </div>
      )}

      {isActive ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 bg-gray-800 text-white shadow-lg p-4 overflow-y-auto flex-shrink-0">
            <h2 className="font-bold text-lg mb-2">🎮 Управление</h2>
            <p className="text-xs text-gray-400 mb-4">💡 Кликните по карте — координаты заполнятся</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Широта *</label>
                <input type="number" step="any" value={newPoint.latitude}
                  onChange={(e) => setNewPoint({ ...newPoint, latitude: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white" placeholder="55.7558" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Долгота *</label>
                <input type="number" step="any" value={newPoint.longitude}
                  onChange={(e) => setNewPoint({ ...newPoint, longitude: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white" placeholder="37.6173" />
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

              <button onClick={addPoint} disabled={saving}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold text-sm">
                {saving ? "⏳ Обновление..." : "✅ Обновить позицию"}
              </button>
            </div>

            <div className="mt-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">⚡ Быстрые точки</h3>
              <div className="space-y-1">
                {[
                  { label: "Москва, центр", lat: 55.7558, lng: 37.6173, alt: 0, spd: 0 },
                  { label: "Москва, север", lat: 55.85, lng: 37.6, alt: 3000, spd: 400 },
                  { label: "Клин", lat: 56.3333, lng: 36.7333, alt: 10000, spd: 800 },
                  { label: "Тверь", lat: 56.8587, lng: 35.9176, alt: 10000, spd: 850 },
                  { label: "Санкт-Петербург", lat: 59.9343, lng: 30.3351, alt: 0, spd: 0 },
                ].map((pt) => (
                  <button key={pt.label}
                    onClick={() => setNewPoint({
                      latitude: pt.lat.toString(), longitude: pt.lng.toString(),
                      altitude: pt.alt.toString(), speed: pt.spd.toString(), heading: "0",
                    })}
                    className="w-full text-left px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded border border-gray-600">
                    📍 {pt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div ref={mapContainer} className="flex-1" style={{ minHeight: "400px" }} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-800">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">🛬</div>
            <h2 className="text-2xl font-bold mb-2">Рейс завершён</h2>
            <p className="text-gray-400 mb-6">{flight.flightNumber} прибыл</p>
            <a href="/admin/flights" className="text-blue-400 hover:underline">← К списку рейсов</a>
          </div>
        </div>
      )}
    </div>
  );
}
