"use client";

import { useEffect, useState } from "react";

interface Airport {
  id: string;
  icaoCode: string;
  iataCode: string;
  name: string;
  city: string;
  country: string;
}

export default function AirportsPage() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    icaoCode: "",
    iataCode: "",
    name: "",
    city: "",
    country: "",
    latitude: "",
    longitude: "",
  });
  const [message, setMessage] = useState("");

  const fetchAirports = async () => {
    const res = await fetch("/api/airports");
    const data = await res.json();
    setAirports(data);
  };

  useEffect(() => {
    fetchAirports();
  }, []);

  const resetForm = () => {
    setForm({ icaoCode: "", iataCode: "", name: "", city: "", country: "", latitude: "", longitude: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (airport: Airport) => {
    setForm({
      icaoCode: airport.icaoCode,
      iataCode: airport.iataCode || "",
      name: airport.name,
      city: airport.city,
      country: airport.country,
      latitude: "",
      longitude: "",
    });
    setEditingId(airport.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const body: any = {
      icaoCode: form.icaoCode.toUpperCase(),
      iataCode: form.iataCode.toUpperCase() || null,
      name: form.name,
      city: form.city,
      country: form.country,
    };

    if (form.latitude) body.latitude = parseFloat(form.latitude);
    if (form.longitude) body.longitude = parseFloat(form.longitude);

    const url = editingId ? `/api/airports/${editingId}` : "/api/airports";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setMessage(editingId ? "Аэропорт обновлён!" : "Аэропорт добавлен!");
      resetForm();
      fetchAirports();
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить аэропорт?")) return;
    await fetch(`/api/airports/${id}`, { method: "DELETE" });
    fetchAirports();
    setMessage("Аэропорт удалён");
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Аэропорты</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
        >
          {showForm ? "✕ Отмена" : "+ Добавить"}
        </button>
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm">
          {message}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Редактировать" : "Новый аэропорт"}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">ICAO код *</label>
              <input
                type="text"
                value={form.icaoCode}
                onChange={(e) => setForm({ ...form, icaoCode: e.target.value })}
                required
                maxLength={4}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="UUEE"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">IATA код</label>
              <input
                type="text"
                value={form.iataCode}
                onChange={(e) => setForm({ ...form, iataCode: e.target.value })}
                maxLength={3}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="SVO"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Название *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Шереметьево"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Город *</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Москва"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Страна</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Россия"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Широта</label>
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="55.9726"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Долгота</label>
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="37.4146"
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 text-sm"
          >
            {editingId ? "💾 Сохранить" : "➕ Добавить"}
          </button>
        </form>
      )}

      {/* Таблица аэропортов */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3">ICAO</th>
              <th className="text-left px-4 py-3">IATA</th>
              <th className="text-left px-4 py-3">Название</th>
              <th className="text-left px-4 py-3">Город</th>
              <th className="text-left px-4 py-3">Страна</th>
              <th className="text-right px-4 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {airports.map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono">{a.icaoCode}</td>
                <td className="px-4 py-3 font-mono">{a.iataCode || "—"}</td>
                <td className="px-4 py-3">{a.name}</td>
                <td className="px-4 py-3">{a.city}</td>
                <td className="px-4 py-3">{a.country}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleEdit(a)}
                    className="text-blue-600 hover:underline mr-3"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-red-600 hover:underline"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {airports.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Нет аэропортов. Добавьте первый!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
