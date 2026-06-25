import dynamic from "next/dynamic";

const LiveFlightPage = dynamic(() => import("./LiveFlightPage"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      <p>Загрузка карты...</p>
    </div>
  ),
});

export default function Page() {
  return <LiveFlightPage />;
}
