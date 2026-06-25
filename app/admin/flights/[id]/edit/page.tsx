"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface Airport {
  id: string;
  iataCode: string;
  name: string;
  city: string;
}

interface AircraftType {
  id: string;
  modelName: string;
}

export default function EditFlightPage() {
  const router = useRouter();
  const { id } = useParams();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [aircraft, setAircraft] = useState<AircraftType[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    flightNumber: "",
    aircraftTypeId: "",
    departureAirportId: "",
    arrivalAirportId: "",
    scheduledDepartureDate: "",
    scheduledDepartureTime: "",
    scheduledArrivalDate: "",
    scheduledArrivalTime: "",
    status: "",
  });

  useEffect(() => {
    const load = async () => {
      const [airportsRes, aircraftRes, flightRes] = await Promise.all([
        fetch("/api/airports"),
        fetch("/api/aircraft"),
        fetch(`/api/flights/${id}/admin`),
      ]);

      const airportsData = await airportsRes.json();
      const aircraftData = await aircraftRes.json();
      const flightData = await flightRes.json();

      setAirports(airportsData);
      setAircraft(aircraftData);

      const dep = new Date(flightData.scheduledDeparture);
      const arr = new Date(flightData.scheduledArrival);

      setForm({
        flightNumber: flightData.flightNumber,
        aircraftTypeId: flightData.aircraftTypeId,
        departureAirportId: flightData.departureAirportId,
        arrivalAirportId: flightData.arrivalAirportId,
        scheduledDepartureDate: dep.toISOString().split("T")[0],
        scheduledDepartureTime: dep.toTimeString().slice(0, 5),
        scheduledArrivalDate: arr.toISOString().split("T")[0],
        scheduledArrivalTime: arr.toTimeString().slice(0, 5),
        status: flightData.status,
      });

      setFetching(false);
    };

    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const scheduledDeparture = new Date(
      `${form.scheduledDepartureDate}T${form.scheduledDepartureTime}:00`
    ).toISOString();

    const scheduledArrival = new Date(
      `${form.scheduledArrivalDate}T${form.scheduledArrivalTime}:00`
    ).toISOString();

    const res = await fetch(`/api/flights/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flightNumber: form.flightNumber,
        aircraftTypeId: form.aircraftTypeId,
        departureAirportId: form.departureAirportId,
        arrivalAirportId: form.arrivalAirportId,
        scheduledDeparture,
        scheduledArrival,
        status: form.status,
      }),
    });

    if (res.ok) {
      setMessage("Рейс обновлён!");
      setTimeout(() => setMessage(""), 3000);
    } else {
      const data = await res.json();
      setError(data.error || "Ошибка при обновлении");
    }

    setLoading(false);
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <a href="/admin/flights" className="text-blue-600 hover:underline text-sm">
          ← Назад
        </a>
        <h1 className="text-2xl font-bold">Редактирование рейса</h1>
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-5">
        {/* Номер рейса */}
        <div>
          <label className="block text-sm font-medium mb-1">Номер рейса *</label>
          <input
            type="text"
            value={form.flightNumber}
            onChange={(e) => setForm({ ...form, flightNumber: e.target.value })}
            required
            maxLength={10}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>

        {/* Статус */}
        <div>
          <label className="block text-sm font-medium mb-1">Статус</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            <option value="scheduled">По расписанию</option>
            <option value="active">В воздухе</option>
            <option value="completed">Завершён</option>
            <option value="cancelled">Отменён</option>
          </select>
        </div>

        {/* Тип ВС */}
        <div>
          <label className="block text-sm font-medium mb-1">Тип ВС *</label>
          <select
            value={form.aircraftTypeId}
            onChange={(e) => setForm({ ...form, aircraftTypeId: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            {aircraft.map((a) => (
              <option key={a.id} value={a.id}>
                {a.modelName}
              </option>
            ))}
          </select>
        </div>

        {/* Аэропорты */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Вылет *</label>
            <select
              value={form.departureAirportId}
              onChange={(e) =>
                setForm({ ...form, departureAirportId: e.target.value })
              }
              required
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              {airports.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.iataCode || "?"} — {a.city}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Прилёт *</label>
            <select
              value={form.arrivalAirportId}
              onChange={(e) =>
                setForm({ ...form, arrivalAirportId: e.target.value })
              }
              required
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              {airports.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.iataCode || "?"} — {a.city}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Даты */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Дата вылета *</label>
            <input
              type="date"
              value={form.scheduledDepartureDate}
              onChange={(e) =>
                setForm({ ...form, scheduledDepartureDate: e.target.value })
              }
              required
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Время вылета *</label>
            <input
              type="time"
              value={form.scheduledDepartureTime}
              onChange={(e) =>
                setForm({ ...form, scheduledDepartureTime: e.target.value })
              }
              required
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Дата прилёта *</label>
            <input
              type="date"
              value={form.scheduledArrivalDate}
              onChange={(e) =>
                setForm({ ...form, scheduledArrivalDate: e.target.value })
              }
              required
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Время прилёта *</label>
            <input
              type="time"
              value={form.scheduledArrivalTime}
              onChange={(e) =>
                setForm({ ...form, scheduledArrivalTime: e.target.value })
              }
              required
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {loading ? "Сохранение..." : "💾 Сохранить"}
          </button>
          <a
            href={`/admin/flights/${id}/live`}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 text-sm flex items-center gap-1"
          >
            ▶️ Прямой эфир
          </a>
        </div>
      </form>
    </div>
  );
}
