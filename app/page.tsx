import dynamic from "next/dynamic";

const HomePage = dynamic(() => import("./HomePage"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <p>Загрузка карты...</p>
    </div>
  ),
});

export default function Page() {
  return <HomePage />;
}
