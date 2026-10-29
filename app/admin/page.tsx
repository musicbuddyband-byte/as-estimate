"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { createUser } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      await loadProfiles();
    } else {
      alert("เกิดข้อผิดพลาด: " + result.message);
    }

    setFormLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">กำลังโหลด...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-red-600">ไม่มีสิทธิ์เข้าถึง</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")} className="w-full">
              กลับหน้าแรก
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">จัดการผู้ใช้</h1>
            <p className="text-xs text-slate-400">หน้าแอดมิน</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setShowForm(!showForm)}
              className="bg-green-600 hover:bg-green-700"
            >
              {showForm ? "ปิดฟอร์ม" : "+ เพิ่มผู้ใช้"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/")}
            >
              ← กลับ
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* ฟอร์มเพิ่ม User */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">เพิ่มผู้ใช้ใหม่</CardTitle>
              <CardDescription>กรอกข้อมูลเพื่อสร้างบัญชีผู้ใช้</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">อีเมล</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="user@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">รหัสผ่าน</Label>
                    <Input
                      id="password"
                      type="text"
                      required
                      minLength={6}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full_name">ชื่อ</Label>
                    <Input
                      id="full_name"
                      type="text"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="ชื่อ-นามสกุล"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry_date">วันหมดอายุ</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      required
                      value={form.expiry_date}
                      onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={formLoading} className="w-full sm:w-auto">
                  {formLoading ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* รายชื่อ User - แบบการ์ด (มือถือ) + ตาราง (คอม) */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500">
            ผู้ใช้ทั้งหมด ({profiles.length})
          </h2>

          {/* มือถือ: แสดงเป็น Card */}
          <div className="space-y-3 md:hidden">
            {profiles.map((profile) => (
              <Card key={profile.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-slate-800">
                        {profile.full_name || "-"}
                      </p>
                      <p className="text-sm text-slate-500">{profile.email}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        profile.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {profile.role}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      defaultValue={profile.expiry_date || ""}
                      className="text-sm"
                      id={`date-${profile.id}`}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById(
                          `date-${profile.id}`
                        ) as HTMLInputElement;
                        if (input?.value) {
                          updateExpiry(profile.id, input.value);
                        }
                      }}
                    >
                      บันทึก
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* คอม: แสดงเป็นตาราง */}
          <div className="hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left px-4 py-3 font-medium text-slate-600">อีเมล</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">ชื่อ</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">วันหมดอายุ</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">สิทธิ์</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((profile) => (
                      <tr key={profile.id} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-3">{profile.email}</td>
                        <td className="px-4 py-3">{profile.full_name || "-"}</td>
                        <td className="px-4 py-3">
                          <Input
                            type="date"
                            defaultValue={profile.expiry_date || ""}
                            className="w-40 h-8 text-sm"
                            id={`date-desk-${profile.id}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              profile.role === "admin"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {profile.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const input = document.getElementById(
                                `date-desk-${profile.id}`
                              ) as HTMLInputElement;
                              if (input?.value) {
                                updateExpiry(profile.id, input.value);
                              }
                            }}
                          >
                            บันทึก
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {profiles.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-slate-400">
                ยังไม่มีผู้ใช้
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}