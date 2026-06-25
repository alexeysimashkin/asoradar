import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (token !== "asoradar-admin-2024") {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar user={{ email: "admin@asoradar.ru" }} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
