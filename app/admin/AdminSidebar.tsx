"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function AdminSidebar({ user }: { user: any }) {
  const pathname = usePathname();

  const links = [
    { href: "/admin", label: "📊 Дашборд" },
    { href: "/admin/flights", label: "✈️ Рейсы" },
    { href: "/admin/airports", label: "🛫 Аэропорты" },
    { href: "/admin/aircraft", label: "🛩️ Типы ВС" },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6">
        <h2 className="text-lg font-bold">ASOradar Admin</h2>
        <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
      </div>

      <nav className="flex-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block px-6 py-3 text-sm hover:bg-gray-800 transition ${
              pathname === link.href ? "bg-gray-800 border-l-4 border-blue-500" : ""
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full text-left px-2 py-2 text-sm text-gray-400 hover:text-white transition"
        >
          🚪 Выйти
        </button>
      </div>
    </aside>
  );
}
