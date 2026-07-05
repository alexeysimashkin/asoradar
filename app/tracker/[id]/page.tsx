import dynamic from "next/dynamic";

const FlightPage = dynamic(() => import("./FlightPage"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <p>Загрузка...</p>
    </div>
  ),
});

export default function Page() {
  return <FlightPage />;
}
