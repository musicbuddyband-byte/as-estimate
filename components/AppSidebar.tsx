"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type Props = {
  projectId?: string | null;
  projectName?: string | null;
};

export default function AppSidebar({ projectId, projectName }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setIsAdmin(data?.role === "admin");
    };
    load();
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const linkClass = (href: string) =>
    `w-full text-left px-3 py-2 rounded-md text-sm ${
      isActive(href)
        ? "bg-blue-600 text-white"
        : "text-slate-700 hover:bg-slate-100"
    }`;

  const SidebarBody = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <p className="font-semibold text-slate-800">AS Estimate</p>
        {projectName && (
          <p className="text-xs text-slate-400 mt-1 truncate">{projectName}</p>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="text-xs text-slate-400 px-3 mb-1">ทั่วไป</p>
        <button type="button" className={linkClass("/")} onClick={() => go("/")}>
          หน้าแรก / โปรเจกต์
        </button>

        {projectId && (
          <>
            <p className="text-xs text-slate-400 px-3 mt-4 mb-1">โปรเจกต์นี้</p>
            <button
              type="button"
              className={linkClass(`/projects/${projectId}`)}
              onClick={() => go(`/projects/${projectId}`)}
            >
              ภาพรวมโปรเจกต์
            </button>
            <button
              type="button"
              className={linkClass(`/projects/${projectId}/structure`)}
              onClick={() => go(`/projects/${projectId}/structure`)}
            >
              งานโครงสร้าง
            </button>
            <button
              type="button"
              className={linkClass(`/projects/${projectId}/structure/footing`)}
              onClick={() => go(`/projects/${projectId}/structure/footing`)}
            >
              · ฐานราก
            </button>
            <button
  type="button"
  className={linkClass(`/projects/${projectId}/structure/pedestal`)}
  onClick={() => go(`/projects/${projectId}/structure/pedestal`)}
>
  · เสาตอม่อ
</button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-400 cursor-not-allowed"
              disabled
            >
                
              · คาน (เร็ว ๆ นี้)
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 rounded-md text-sm text-slate-400 cursor-not-allowed"
              disabled
            >
              · เสา (เร็ว ๆ นี้)
            </button>
                       <button
              type="button"
              className={linkClass(`/projects/${projectId}/boq`)}
              onClick={() => go(`/projects/${projectId}/boq`)}
            >
              BOQ รวม
            </button>
          </>
        )}

        {isAdmin && (
          <>
            <p className="text-xs text-slate-400 px-3 mt-4 mb-1">จัดการระบบ</p>
            <button
              type="button"
              className={linkClass("/admin")}
              onClick={() => go("/admin")}
            >
              สมาชิก / ผู้ใช้
            </button>
            <button
              type="button"
              className={linkClass("/admin/items")}
              onClick={() => go("/admin/items")}
            >
              Master วัสดุ
            </button>
            <button
              type="button"
              className={linkClass("/admin/standards")}
              onClick={() => go("/admin/standards")}
            >
              Master มาตรฐาน
            </button>
          </>
        )}
      </nav>

      <div className="p-3 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push("/login");
          }}
        >
          ออกจากระบบ
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* มือถือ: ปุ่มเปิดเมนู */}
      <div className="lg:hidden fixed top-3 left-3 z-40">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          เมนู
        </Button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 bg-white shadow-xl h-full">{SidebarBody}</div>
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
        </div>
      )}

      {/* จอใหญ่: แถบซ้ายคงที่ */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r bg-white h-screen sticky top-0">
        {SidebarBody}
      </aside>
    </>
  );
}