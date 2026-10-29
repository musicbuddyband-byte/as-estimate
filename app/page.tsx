"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
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
};

type Project = {
  id: string;
  name: string;
  client_name: string | null;
  location: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    client_name: "",
    location: "",
    description: "",
  });

  useEffect(() => {
    const supabase = createClient();

    const checkUserAndLoad = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // ดึง profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);

        if (profileData.expiry_date) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const expiry = new Date(profileData.expiry_date);
          expiry.setHours(0, 0, 0, 0);

          if (expiry < today) {
            setExpired(true);
            await supabase.auth.signOut();
            setTimeout(() => router.push("/login"), 2000);
            return;
          }
        }
      }

      // ดึงโปรเจกต์
      await loadProjects(user.id);
      setLoading(false);
    };

    checkUserAndLoad();
  }, [router]);

  const loadProjects = async (userId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (!error) {
      setProjects(data || []);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setFormLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: form.name,
        client_name: form.client_name || null,
        location: form.location || null,
        description: form.description || null,
      })
      .select()
      .single();

    if (error) {
      alert("สร้างโปรเจกต์ไม่สำเร็จ: " + error.message);
    } else {
      setForm({ name: "", client_name: "", location: "", description: "" });
      setShowForm(false);
      await loadProjects(user.id);
      // เปิดโปรเจกต์ใหม่ทันที
      if (data) {
        router.push(`/projects/${data.id}`);
      }
    }

    setFormLoading(false);
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`ต้องการลบโปรเจกต์ "${name}" จริงหรือไม่?`)) return;

    const supabase = createClient();
    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      alert("ลบไม่สำเร็จ: " + error.message);
    } else if (user) {
      await loadProjects(user.id);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">กำลังตรวจสอบสิทธิ์การใช้งาน...</p>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-red-600">บัญชีหมดอายุแล้ว</CardTitle>
            <CardDescription>
              กรุณาติดต่อผู้ดูแลระบบเพื่อต่ออายุ
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "ผู้ใช้งาน";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              AS
            </div>
            <h1 className="text-lg font-semibold text-slate-800">AS Estimate</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-slate-700">{displayName}</div>
              {profile?.expiry_date && (
                <div className="text-xs text-slate-400">
                  ใช้ได้ถึง {profile.expiry_date}
                </div>
              )}
            </div>

            {profile?.role === "admin" && (
              <Button variant="outline" size="sm" onClick={() => router.push("/admin")}>
                หน้าแอดมิน
              </Button>
            )}

            <Button variant="destructive" size="sm" onClick={handleLogout}>
              ออกจากระบบ
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              ยินดีต้อนรับ, {displayName}
            </h2>
            <p className="text-slate-500 mt-1">ระบบประมาณราคาก่อสร้าง</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {showForm ? "ปิดฟอร์ม" : "+ สร้างโปรเจกต์ใหม่"}
          </Button>
        </div>

        {/* ฟอร์มสร้างโปรเจกต์ */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">สร้างโปรเจกต์ใหม่</CardTitle>
              <CardDescription>กรอกข้อมูลโครงการ</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="name">ชื่อโปรเจกต์ *</Label>
                    <Input
                      id="name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="เช่น บ้านพักอาศัย 3 ชั้น"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client_name">ชื่อลูกค้า</Label>
                    <Input
                      id="client_name"
                      value={form.client_name}
                      onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                      placeholder="ชื่อเจ้าของโครงการ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">สถานที่</Label>
                    <Input
                      id="location"
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="จังหวัด / ที่อยู่"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="description">รายละเอียดเพิ่มเติม</Label>
                    <Input
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="หมายเหตุ (ถ้ามี)"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? "กำลังสร้าง..." : "สร้างโปรเจกต์"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* รายการโปรเจกต์ */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-500">
            โปรเจกต์ของฉัน ({projects.length})
          </h3>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-400 mb-4">ยังไม่มีโปรเจกต์</p>
                <Button onClick={() => setShowForm(true)}>
                  + สร้างโปรเจกต์แรก
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base line-clamp-1">
                      {project.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-1">
                      {project.client_name || "ไม่ระบุลูกค้า"}
                      {project.location ? ` • ${project.location}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push(`/projects/${project.id}`)}
                      >
                        เปิด
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id, project.name);
                        }}
                      >
                        ลบ
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      อัปเดต {new Date(project.updated_at).toLocaleDateString("th-TH")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}