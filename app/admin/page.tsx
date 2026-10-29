"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { createUser } from "./actions";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  expiry_date: string | null;
  role: string;
  created_at: string;
};

export default function AdminPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // ข้อมูลฟอร์มเพิ่ม User
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    expiry_date: "",
  });

  useEffect(() => {
    const checkAdminAndLoad = async () => {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!myProfile || myProfile.role !== "admin") {
        setMessage("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await loadProfiles();
      setLoading(false);
    };

    checkAdminAndLoad();
  }, [router]);

  const loadProfiles = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setProfiles(data || []);
    }
  };

  const updateExpiry = async (id: string, newDate: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ expiry_date: newDate })
      .eq("id", id);

    if (error) {
      alert("อัปเดตไม่สำเร็จ: " + error.message);
    } else {
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? { ...p, expiry_date: newDate } : p))
      );
      alert("อัปเดตวันหมดอายุสำเร็จ");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    const result = await createUser(form);

    if (result.success) {
      alert(result.message);
      setForm({ email: "", password: "", full_name: "", expiry_date: "" });
      setShowForm(false);
      await loadProfiles(); // โหลดรายชื่อใหม่
    } else {
      alert("เกิดข้อผิดพลาด: " + result.message);
    }

    setFormLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>กำลังโหลด...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{message}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            กลับหน้าแรก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">หน้าแอดมิน - จัดการผู้ใช้</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
            >
              {showForm ? "ปิดฟอร์ม" : "+ เพิ่มผู้ใช้"}
            </button>
            <button
              onClick={() => router.push("/")}
              className="text-sm text-blue-600 hover:underline"
            >
              ← กลับหน้าแรก
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ฟอร์มเพิ่ม User */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">เพิ่มผู้ใช้ใหม่</h2>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">อีเมล</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">รหัสผ่าน</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ชื่อ</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">วันหมดอายุ</label>
                <input
                  type="date"
                  required
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {formLoading ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ตารางรายชื่อ User */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3">อีเมล</th>
                <th className="text-left px-4 py-3">ชื่อ</th>
                <th className="text-left px-4 py-3">วันหมดอายุ</th>
                <th className="text-left px-4 py-3">สิทธิ์</th>
                <th className="text-left px-4 py-3">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{profile.email}</td>
                  <td className="px-4 py-3">{profile.full_name || "-"}</td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      defaultValue={profile.expiry_date || ""}
                      className="border rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        profile.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {profile.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        const input = e.currentTarget
                          .closest("tr")
                          ?.querySelector("input[type=date]") as HTMLInputElement;
                        if (input?.value) {
                          updateExpiry(profile.id, input.value);
                        }
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                    >
                      บันทึก
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {profiles.length === 0 && (
            <p className="text-center py-8 text-gray-500">ยังไม่มีผู้ใช้</p>
          )}
        </div>
      </div>
    </div>
  );
}