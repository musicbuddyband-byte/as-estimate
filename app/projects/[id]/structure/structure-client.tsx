"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AppSidebar from "@/components/AppSidebar";

type Project = { id: string; name: string };

const CATEGORIES = [
  {
    key: "footing",
    name: "ฐานราก",
    nameEn: "Footing",
    href: "footing",
    ready: true,
  },
  {
  key: "Pedestal",  
  name: "เสาตอม่อ",
  nameEn: "Pedestal",
  href: "pedestal",
  ready: true,
},
  { key: "beam", name: "คาน", nameEn: "Beam", href: "", ready: false },
  { key: "column", name: "เสา", nameEn: "Column", href: "", ready: false },
  { key: "floor", name: "พื้น", nameEn: "Floor", href: "", ready: false },
  { key: "stair", name: "บันได", nameEn: "Stairs", href: "", ready: false },
  { key: "machine", name: "เครื่องจักร", nameEn: "Machine", href: "", ready: false },
];

export default function StructureClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
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

    init();
  }, [projectId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">กำลังโหลด...</p>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-slate-50 flex">
    <AppSidebar projectId={projectId} projectName={project?.name ?? null} />
    <div className="flex-1 min-w-0">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/projects/${projectId}`)}
          >
            ← กลับ
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">งานโครงสร้าง</h1>
            <p className="text-xs text-slate-400">{project?.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-slate-500 mb-4">
          เลือกหมวดย่อยเพื่อถอดปริมาณ
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <Card
              key={cat.key}
              className={cat.ready ? "hover:shadow-md transition-shadow" : "opacity-60"}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{cat.name}</CardTitle>
                <CardDescription>{cat.nameEn}</CardDescription>
              </CardHeader>
              <CardContent>
                {cat.ready ? (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      router.push(`/projects/${projectId}/structure/${cat.href}`)
                    }
                  >
                    เปิด
                  </Button>
                ) : (
                  <Button size="sm" disabled className="w-full">
                    เร็ว ๆ นี้
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
    </div>
  );
}