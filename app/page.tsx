"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

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
      console.log("Home - user:", user);

      if (!user) {
        console.log("Home - ไม่พบ user → กลับไป login");
        router.push("/login");
        return;
      }

      setUser(user);

      // ดึงข้อมูล profile
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      console.log("Home - profile:", profileData);

      if (error) {
        console.error("Error ดึง profile:", error);
      }

      if (profileData) {
        setProfile(profileData);

        // ตรวจสอบวันหมดอายุ
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
      <div className="min-h-screen flex items-center justify-center">
        <p>กำลังตรวจสอบสิทธิ์การใช้งาน...</p>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-3">บัญชีหมดอายุแล้ว</h1>
          <p className="text-gray-600">กำลังนำคุณกลับไปหน้าเข้าสู่ระบบ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">AS Estimate</h1>
          <div className="flex items-center gap-4">
  <div className="text-right">
    <div className="text-sm text-gray-600">{user?.email}</div>
    {profile?.expiry_date && (
      <div className="text-xs text-gray-400">
        ใช้ได้ถึง: {profile.expiry_date}
      </div>
    )}
  </div>

  {profile?.role === "admin" && (
    <button
      onClick={() => router.push("/admin")}
      className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm"
    >
      หน้าแอดมิน
    </button>
  )}

  <button
    onClick={handleLogout}
    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
  >
    ออกจากระบบ
  </button>
</div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold mb-2">ยินดีต้อนรับ</h2>
        <p className="text-gray-600 mb-6">ระบบประมาณราคาก่อสร้าง</p>

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="mb-2">
            สถานะบัญชี: <span className="text-green-600 font-medium">ใช้งานได้</span>
          </p>
          <p className="text-sm text-gray-500">
            วันหมดอายุ: {profile?.expiry_date || "ไม่ระบุ"}
          </p>
        </div>
      </div>
    </div>
  );
}