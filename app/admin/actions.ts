"use server";

import { createClient } from "@supabase/supabase-js";

export async function createUser(formData: {
  email: string;
  password: string;
  full_name: string;
  expiry_date: string;
}) {
  // ใช้ Service Role Key (มีสิทธิ์สูง)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // 1. สร้างบัญชีใน Authentication
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true, // ยืนยันอีเมลให้อัตโนมัติ
    });

  if (authError) {
    return { success: false, message: authError.message };
  }

  if (!authData.user) {
    return { success: false, message: "ไม่สามารถสร้างผู้ใช้ได้" };
  }

  // 2. เพิ่มข้อมูลลงตาราง profiles
  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: authData.user.id,
    email: formData.email,
    full_name: formData.full_name,
    expiry_date: formData.expiry_date,
    role: "user",
  });

  if (profileError) {
    return { success: false, message: profileError.message };
  }

  return { success: true, message: "สร้างผู้ใช้สำเร็จ" };
}