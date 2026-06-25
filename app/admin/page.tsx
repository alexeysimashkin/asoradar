import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
  const [flightsCount, activeFlights, airportsCount, aircraftCount] =
    await Promise.all([
      prisma.flight.count(),
      prisma.flight.count({ where: { status: "active" } }),
      prisma.airport.count(),
      prisma.aircraftType.count(),
    ]);

  const stats = [
    { label: "Всего рейсов", value: flightsCount, color: "bg-blue-500" },
    { label: "В воздухе", value: activeFlights, color: "bg-green-500" },
    { label: "Аэропортов", value: airportsCount, color: "bg-purple-500" },
    { label: "Типов ВС", value: aircraftCount, color: "bg-orange-500" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Дашборд</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold mt-2">{stat.value}</p>
            <div className={`h-1 mt-3 rounded ${stat.color}`}></div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Быстрые действия</h2>
        <div className="flex gap-3">
          <a
            href="/admin/flights/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
          >
            ✈️ Создать рейс
          </a>
          <a
            href="/admin/airports"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
          >
            🛫 Добавить аэропорт
          </a>
          <a
            href="/admin/aircraft"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm"
          >
            🛩️ Добавить тип ВС
          </a>
        </div>
      </div>
    </div>
  );
}
