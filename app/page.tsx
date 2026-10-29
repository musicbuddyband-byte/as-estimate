"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const checkUserAndExpiry = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error ดึง profile:", error);
      }

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
            setTimeout(() => {
              router.push("/login");
            }, 2000);
            return;
          }
        }
      }

      setLoading(false);
    };

    checkUserAndExpiry();
  }, [router]);

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
              ระยะเวลาการใช้งานของคุณหมดอายุแล้ว กรุณาติดต่อผู้ดูแลระบบเพื่อต่ออายุ
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin")}
              >
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">
            ยินดีต้อนรับ, {displayName}
          </h2>
          <p className="text-slate-500 mt-1">
            ระบบประมาณราคาก่อสร้าง
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">โปรเจกต์ของฉัน</CardTitle>
              <CardDescription>
                สร้างและจัดการโปรเจกต์ประมาณราคา
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                เร็ว ๆ นี้
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">สถานะบัญชี</CardTitle>
              <CardDescription>ข้อมูลการใช้งานของคุณ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">สถานะ</span>
                <span className="text-green-600 font-medium">ใช้งานได้</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">วันหมดอายุ</span>
                <span className="font-medium">{profile?.expiry_date || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">สิทธิ์</span>
                <span className="font-medium capitalize">{profile?.role || "user"}</span>
              </div>
            </CardContent>
          </Card>

          {profile?.role === "admin" && (
            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader>
                <CardTitle className="text-lg text-purple-800">จัดการระบบ</CardTitle>
                <CardDescription>สำหรับผู้ดูแลระบบ</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full border-purple-300 text-purple-700 hover:bg-purple-100"
                  onClick={() => router.push("/admin")}
                >
                  ไปหน้าแอดมิน
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}