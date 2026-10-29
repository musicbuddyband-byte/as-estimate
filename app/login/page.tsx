"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    console.log("1. เริ่ม Login...");

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      console.log("Login Error:", loginError);
      setError(loginError.message);
      setLoading(false);
      return;
    }

    console.log("2. Login สำเร็จ", data.user?.id);

    // ตรวจสอบวันหมดอายุ
    if (data.user) {
      console.log("3. กำลังดึงข้อมูล profile...");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("expiry_date")
        .eq("id", data.user.id)
        .maybeSingle();

      console.log("4. ผลลัพธ์ profile:", profile);
      console.log("4.1 profileError:", profileError);

      if (profileError) {
        setError("ไม่สามารถตรวจสอบสิทธิ์ได้: " + profileError.message);
        setLoading(false);
        return;
      }

      if (profile?.expiry_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(profile.expiry_date);
        expiry.setHours(0, 0, 0, 0);

        console.log("5. วันหมดอายุ:", profile.expiry_date, "วันนี้:", today);

        if (expiry < today) {
          await supabase.auth.signOut();
          setError("บัญชีของคุณหมดอายุแล้ว กรุณาติดต่อผู้ดูแลระบบเพื่อต่ออายุ");
          setLoading(false);
          return;
        }
      }
    }

    console.log("6. ผ่านการตรวจสอบ → ไปหน้าแรก");
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">เข้าสู่ระบบ</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">อีเมล</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}