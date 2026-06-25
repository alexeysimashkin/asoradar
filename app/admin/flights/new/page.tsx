"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function NewFlightPage() {
  const router = useRouter();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [aircraft, setAircraft] = useState<AircraftType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    flightNumber: "",
    aircraftTypeId: "",
    departureAirportId: "",
    arrivalAirportId: "",
    scheduledDepartureDate: "",
    scheduledDepartureTime: "",
    scheduledArrivalDate: "",
    scheduledArrivalTime: "",
  });

  useEffect(() => {
    fetch("/api/airports").then((r) => r.json()).then(setAirports);
    fetch("/api/aircraft").then((r) => r.json()).then(setAircraft);
  }, []);

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

    const res = await fetch("/api/flights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flightNumber: form.flightNumber.toUpperCase(),
        aircraftTypeId: form.aircraftTypeId,
        departureAirportId: form.departureAirportId,
        arrivalAirportId: form.arrivalAirportId,
        scheduledDeparture,
        scheduledArrival,
      }),
    });

    if (res.ok) {
      router.push("/admin/flights");
    } else {
      const data = await res.json();
      setError(data.error || "Ошибка при создании рейса");
    }

    setLoading(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <a href="/admin/flights" className="text-blue-600 hover:underline text-sm">
          ← Назад
        </a>
        <h1 className="text-2xl font-bold">Новый рейс</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-5">
        {/* Номер рейса */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Номер рейса *
          </label>
          <input
            type="text"
            value={form.flightNumber}
            onChange={(e) => setForm({ ...form, flightNumber: e.target.value })}
            required
            maxLength={10}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            placeholder="SU1234"
          />
        </div>

        {/* Тип ВС */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Тип воздушного судна *
          </label>
          <select
            value={form.aircraftTypeId}
            onChange={(e) =>
              setForm({ ...form, aircraftTypeId: e.target.value })
            }
            required
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Выберите тип ВС...</option>
            {aircraft.map((a) => (
              <option key={a.id} value={a.id}>
                {a.modelName}
              </option>
            ))}
          </select>
        </div>

        {/* Аэропорт вылета */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Аэропорт вылета *
          </label>
          <select
            value={form.departureAirportId}
            onChange={(e) =>
              setForm({ ...form, departureAirportId: e.target.value })
            }
            required
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Выберите аэропорт...</option>
            {airports.map((a) => (
              <option key={a.id} value={a.id}>
                {a.iataCode || "?"} — {a.name} ({a.city})
              </option>
            ))}
          </select>
        </div>

        {/* Аэропорт прилёта */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Аэропорт прилёта *
          </label>
          <select
            value={form.arrivalAirportId}
            onChange={(e) =>
              setForm({ ...form, arrivalAirportId: e.target.value })
            }
            required
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Выберите аэропорт...</option>
            {airports.map((a) => (
              <option key={a.id} value={a.id}>
                {a.iataCode || "?"} — {a.name} ({a.city})
              </option>
            ))}
          </select>
          {form.departureAirportId === form.arrivalAirportId &&
            form.departureAirportId !== "" && (
              <p className="text-amber-600 text-xs mt-1">
                Аэропорт вылета и прилёта совпадают
              </p>
            )}
        </div>

        {/* Даты и время */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Дата вылета *
            </label>
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
            <label className="block text-sm font-medium mb-1">
              Время вылета *
            </label>
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
            <label className="block text-sm font-medium mb-1">
              Дата прилёта *
            </label>
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
            <label className="block text-sm font-medium mb-1">
              Время прилёта *
            </label>
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {loading ? "Создание..." : "Создать рейс"}
        </button>
      </form>
    </div>
  );
}
