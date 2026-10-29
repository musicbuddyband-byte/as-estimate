"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Project = {
  id: string;
  name: string;
  client_name: string | null;
  location: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export default function ProjectClient({ projectId }: { projectId: string }) {
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error || !data) {
        alert("ไม่พบโปรเจกต์");
        router.push("/");
        return;
      }

      setProject(data);
      setLoading(false);
    };

    loadProject();
  }, [projectId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">กำลังโหลดโปรเจกต์...</p>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              ← กลับ
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-slate-800 line-clamp-1">
                {project.name}
              </h1>
              <p className="text-xs text-slate-400">
                {project.client_name || "ไม่ระบุลูกค้า"}
                {project.location ? ` • ${project.location}` : ""}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>ข้อมูลโครงการ</CardTitle>
            <CardDescription>
              {project.description || "ไม่มีรายละเอียดเพิ่มเติม"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-slate-500">ลูกค้า: </span>
              <span className="font-medium">{project.client_name || "-"}</span>
            </div>
            <div>
              <span className="text-slate-500">สถานที่: </span>
              <span className="font-medium">{project.location || "-"}</span>
            </div>
            <div>
              <span className="text-slate-500">สร้างเมื่อ: </span>
              <span className="font-medium">
                {new Date(project.created_at).toLocaleDateString("th-TH")}
              </span>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-sm font-medium text-slate-500 mb-3">หมวดงานประมาณราคา</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "งานโครงสร้าง",
            "งานหลังคา",
            "งานสถาปัตยกรรม",
            "งานไฟฟ้า",
            "งานประปา-สุขาภิบาล",
            "สรุป BOQ",
          ].map((category) => (
            <Card key={category} className="opacity-60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button size="sm" disabled className="w-full">
                  เร็ว ๆ นี้
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}