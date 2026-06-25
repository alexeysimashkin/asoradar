"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Flight {
  id: string;
  flightNumber: string;
  status: string;
  isEmergency: boolean;
  scheduledDeparture: string;
  scheduledArrival: string;
  aircraftType: { modelName: string };
  departureAirport: { iataCode: string; city: string };
  arrivalAirport: { iataCode: string; city: string };
}

const statusLabels: Record<string, string> = {
  scheduled: "По расписанию",
  active: "В воздухе",
  completed: "Завершён",
  cancelled: "Отменён",
};

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState("");

  const fetchFlights = async () => {
    const url = statusFilter
      ? `/api/flights?status=${statusFilter}`
      : "/api/flights";
    const res = await fetch(url);
    const data = await res.json();
    setFlights(data);
  };

  useEffect(() => {
    fetchFlights();
  }, [statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить рейс? Это действие необратимо.")) return;
    const res = await fetch(`/api/flights/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage("Рейс удалён");
      fetchFlights();
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Рейсы</h1>
        <Link
          href="/admin/flights/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
        >
          + Создать рейс
        </Link>
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">
          {message}
        </div>
      )}

      {/* Фильтры */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-2">
        <button
          onClick={() => setStatusFilter("")}
          className={`px-3 py-1 rounded text-sm ${
            !statusFilter ? "bg-gray-800 text-white" : "bg-gray-100"
          }`}
        >
          Все
        </button>
        {Object.entries(statusLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3 py-1 rounded text-sm ${
              statusFilter === key ? "bg-gray-800 text-white" : "bg-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3">Рейс</th>
              <th className="text-left px-4 py-3">Маршрут</th>
              <th className="text-left px-4 py-3">Тип ВС</th>
              <th className="text-left px-4 py-3">Вылет (план)</th>
              <th className="text-left px-4 py-3">Прилёт (план)</th>
              <th className="text-left px-4 py-3">Статус</th>
              <th className="text-right px-4 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {flights.map((f) => (
              <tr key={f.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-bold">
                  {f.flightNumber}
                  {f.isEmergency && " 🔴"}
                </td>
                <td className="px-4 py-3">
                  {f.departureAirport.iataCode || f.departureAirport.city} →{" "}
                  {f.arrivalAirport.iataCode || f.arrivalAirport.city}
                </td>
                <td className="px-4 py-3">{f.aircraftType.modelName}</td>
                <td className="px-4 py-3">{formatDate(f.scheduledDeparture)}</td>
                <td className="px-4 py-3">{formatDate(f.scheduledArrival)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      statusColors[f.status]
                    }`}
                  >
                    {statusLabels[f.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {f.status === "scheduled" && (
                      <Link
                        href={`/admin/flights/${f.id}/live`}
                        className="text-green-600 hover:underline text-xs"
                      >
                        ▶️ Эфир
                      </Link>
                    )}
                    {f.status === "active" && (
                      <Link
                        href={`/admin/flights/${f.id}/live`}
                        className="text-orange-600 hover:underline text-xs"
                      >
                        🔴 Управлять
                      </Link>
                    )}
                    <Link
                      href={`/admin/flights/${f.id}/edit`}
                      className="text-blue-600 hover:underline text-xs"
                    >
                      ✏️
                    </Link>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {flights.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Нет рейсов. Создайте первый!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
