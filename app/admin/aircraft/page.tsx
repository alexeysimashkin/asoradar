"use client";

import { useEffect, useState } from "react";

interface AircraftType {
  id: string;
  modelName: string;
  sizeCategory: string;
}

export default function AircraftPage() {
  const [aircraft, setAircraft] = useState<AircraftType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [modelName, setModelName] = useState("");
  const [sizeCategory, setSizeCategory] = useState("medium");
  const [message, setMessage] = useState("");

  const fetchAircraft = async () => {
    const res = await fetch("/api/aircraft");
    const data = await res.json();
    setAircraft(data);
  };

  useEffect(() => {
    fetchAircraft();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/aircraft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelName, sizeCategory }),
    });

    if (res.ok) {
      setMessage("Тип ВС добавлен!");
      setModelName("");
      setSizeCategory("medium");
      setShowForm(false);
      fetchAircraft();
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить тип ВС?")) return;
    await fetch(`/api/aircraft/${id}`, { method: "DELETE" });
    fetchAircraft();
  };

  const sizeLabels: Record<string, string> = {
    small: "Маленький",
    medium: "Средний",
    large: "Большой",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Типы воздушных судов</h1>
        <button
          onClick={() => setShowForm(!showForm)}
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
          <h2 className="text-lg font-semibold mb-4">Новый тип ВС</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Модель *</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Boeing 737-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Размер на карте *</label>
              <select
                value={sizeCategory}
                onChange={(e) => setSizeCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="small">Маленький</option>
                <option value="medium">Средний</option>
                <option value="large">Большой</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 text-sm"
          >
            ➕ Добавить
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3">Модель</th>
              <th className="text-left px-4 py-3">Размер иконки</th>
              <th className="text-right px-4 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {aircraft.map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">{a.modelName}</td>
                <td className="px-4 py-3">{sizeLabels[a.sizeCategory]}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-red-600 hover:underline"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {aircraft.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  Нет типов ВС. Добавьте первый!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
