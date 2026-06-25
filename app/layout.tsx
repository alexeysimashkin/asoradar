import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASOradar",
  description: "Отслеживание рейсов в реальном времени",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
