"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MasterItem = {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
  unit: string;
  item_type: string;
  is_active: boolean;
};

type StandardComponent = {
  id: string;
  item_id: string;
  qty_per_unit: number;
  waste_factor: number;
  is_fixed: boolean;
  note: string | null;
  sort_order: number;
  master_items?: MasterItem;
};

type MasterStandard = {
  id: string;
  code: string;
  name: string;
  category: string;
  input_unit: string;
  waste_percent: number;
  standard_type: "ratio" | "mix" | "conversion" | "manual";
  description: string | null;
  is_active: boolean;
  standard_components?: StandardComponent[];
};

const CATEGORIES = [
  "เตรียมการ",
  "โครงสร้าง",
  "หลังคา",
  "สถาปัตยกรรม",
  "ไฟฟ้า",
  "ประปา-สุขาภิบาล",
  "อื่นๆ",
];

const CATEGORY_CODES: Record<string, string> = {
  "เตรียมการ": "PR",
  "โครงสร้าง": "S",
  "หลังคา": "RF",
  "สถาปัตยกรรม": "A",
  "ไฟฟ้า": "EL",
  "ประปา-สุขาภิบาล": "SN",
  "อื่นๆ": "OW",
};

const STANDARD_TYPES = [
  { value: "ratio", label: "อัตราส่วน (ratio)" },
  { value: "mix", label: "ส่วนผสม (mix)" },
  { value: "conversion", label: "แปลงหน่วย (conversion)" },
  { value: "manual", label: "กรอกเอง (manual)" },
] as const;

const emptyForm = {
  code: "",
  name: "",
  category: "โครงสร้าง",
  input_unit: "ตร.ม.",
  waste_percent: "0",
  standard_type: "ratio" as "ratio" | "mix" | "conversion" | "manual",
  description: "",
};

export default function MasterStandardsPage() {
  const router = useRouter();
  const [standards, setStandards] = useState<MasterStandard[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [selectedStandardId, setSelectedStandardId] = useState<string | null>(null);
  const [compItemId, setCompItemId] = useState("");
  const [compQty, setCompQty] = useState("");
  const [compWaste, setCompWaste] = useState("1.00");
  const [compFixed, setCompFixed] = useState(true);
  const [compNote, setCompNote] = useState("");
  const [compLoading, setCompLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState("ทั้งหมด");

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await Promise.all([loadStandards(), loadItems()]);
      setLoading(false);
    };

    init();
  }, [router]);

  const loadStandards = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("master_standards")
      .select(`
        *,
        standard_components (
          id,
          item_id,
          qty_per_unit,
          waste_factor,
          is_fixed,
          note,
          sort_order,
          master_items ( id, code, name, short_name, unit, item_type, is_active )
        )
      `)
      .order("category")
      .order("code");

    if (!error) setStandards(data || []);
  };

  const loadItems = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("master_items")
      .select("id, code, name, short_name, unit, item_type, is_active")
      .eq("is_active", true)
      .order("name");

    if (!error) setItems(data || []);
  };

  const generateCode = async () => {
    const catCode = CATEGORY_CODES[form.category] || "X";
    const prefix = `${catCode}-`;

    const supabase = createClient();
    const { data } = await supabase
      .from("master_standards")
      .select("code")
      .like("code", `${prefix}%`)
      .order("code", { ascending: false })
      .limit(50);

    let nextNum = 1;
    if (data && data.length > 0) {
      const nums = data
        .map((row) => {
          const part = row.code.replace(prefix, "");
          const n = parseInt(part, 10);
          return isNaN(n) ? 0 : n;
        })
        .filter((n) => n > 0);
      if (nums.length > 0) nextNum = Math.max(...nums) + 1;
    }

    const code = `${prefix}${String(nextNum).padStart(3, "0")}`;
    setForm((prev) => ({ ...prev, code }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    const supabase = createClient();

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      category: form.category,
      input_unit: form.input_unit.trim(),
      waste_percent: parseFloat(form.waste_percent) || 0,
      standard_type: form.standard_type,
      description: form.description.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase
        .from("master_standards")
        .update(payload)
        .eq("id", editingId);

      if (error) alert("แก้ไขไม่สำเร็จ: " + error.message);
      else {
        await loadStandards();
        resetForm();
      }
    } else {
      const { error } = await supabase.from("master_standards").insert(payload);

      if (error) alert("เพิ่มไม่สำเร็จ: " + error.message);
      else {
        await loadStandards();
        resetForm();
      }
    }

    setFormLoading(false);
  };

  const startEdit = (std: MasterStandard) => {
    setEditingId(std.id);
    setForm({
      code: std.code,
      name: std.name,
      category: std.category,
      input_unit: std.input_unit,
      waste_percent: String(std.waste_percent),
      standard_type: std.standard_type || "ratio",
      description: std.description || "",
    });
    setShowForm(true);
  };

  const toggleActive = async (std: MasterStandard) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("master_standards")
      .update({ is_active: !std.is_active, updated_at: new Date().toISOString() })
      .eq("id", std.id);

    if (error) alert("อัปเดตไม่สำเร็จ: " + error.message);
    else await loadStandards();
  };

  const handleDelete = async (std: MasterStandard) => {
    if (!confirm(`ลบมาตรฐาน "${std.name}" และส่วนประกอบทั้งหมด?`)) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("master_standards")
      .delete()
      .eq("id", std.id);

    if (error) alert("ลบไม่สำเร็จ: " + error.message);
    else {
      if (selectedStandardId === std.id) setSelectedStandardId(null);
      await loadStandards();
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const addComponent = async () => {
    if (!selectedStandardId || !compItemId || !compQty) {
      alert("กรุณาเลือกรายการและใส่ปริมาณ");
      return;
    }

    setCompLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("standard_components").insert({
      standard_id: selectedStandardId,
      item_id: compItemId,
      qty_per_unit: parseFloat(compQty) || 0,
      waste_factor: parseFloat(compWaste) || 1,
      is_fixed: compFixed,
      note: compNote.trim() || null,
      sort_order: 0,
    });

    if (error) {
      alert("เพิ่มส่วนประกอบไม่สำเร็จ: " + error.message);
    } else {
      setCompItemId("");
      setCompQty("");
      setCompWaste("1.00");
      setCompFixed(true);
      setCompNote("");
      await loadStandards();
    }
    setCompLoading(false);
  };

  const removeComponent = async (compId: string) => {
    if (!confirm("ลบส่วนประกอบนี้?")) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("standard_components")
      .delete()
      .eq("id", compId);

    if (error) alert("ลบไม่สำเร็จ: " + error.message);
    else await loadStandards();
  };

  const selectedStandard = standards.find((s) => s.id === selectedStandardId);

  const filteredStandards =
    filterCategory === "ทั้งหมด"
      ? standards
      : standards.filter((s) => s.category === filterCategory);

  const typeLabel = (t: string) =>
    STANDARD_TYPES.find((x) => x.value === t)?.label || t;

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
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">
              Master มาตรฐานการคำนวณ
            </h1>
            <p className="text-xs text-slate-400">
              รหัสแบบ S-001 · รองรับ ratio / mix / manual
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (showForm && !editingId) resetForm();
                else {
                  setEditingId(null);
                  setForm(emptyForm);
                  setShowForm(true);
                }
              }}
            >
              {showForm && !editingId ? "ปิดฟอร์ม" : "+ เพิ่มมาตรฐาน"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/admin")}>
              ← กลับ
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {editingId ? "แก้ไขมาตรฐาน" : "เพิ่มมาตรฐานใหม่"}
              </CardTitle>
              <CardDescription>
                เลือกหมวด แล้วกดสร้างรหัส · ประเภท mix ใช้เผื่อรายส่วนประกอบ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>รหัส *</Label>
                    <div className="flex gap-2">
                      <Input
                        required
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                        placeholder="S-001"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateCode}
                        className="whitespace-nowrap"
                      >
                        สร้างรหัส
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>ชื่อมาตรฐาน *</Label>
                    <Input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="คอนกรีต ค.2 / ผนังก่ออิฐมอญ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>หมวดหลัก *</Label>
                    <select
                      className="w-full border rounded-md h-9 px-3 text-sm"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>ประเภทมาตรฐาน *</Label>
                    <select
                      className="w-full border rounded-md h-9 px-3 text-sm"
                      value={form.standard_type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          standard_type: e.target.value as typeof form.standard_type,
                        })
                      }
                    >
                      {STANDARD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>หน่วยที่ผู้ใช้กรอก *</Label>
                    <Input
                      required
                      value={form.input_unit}
                      onChange={(e) => setForm({ ...form, input_unit: e.target.value })}
                      placeholder="ลบ.ม. / ตร.ม. / ม."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>เผื่อระดับมาตรฐาน (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.waste_percent}
                      onChange={(e) => setForm({ ...form, waste_percent: e.target.value })}
                      placeholder="0 = ไม่ใช้ หรือใช้เผื่อรายส่วนประกอบ"
                    />
                    <p className="text-xs text-slate-400">
                      ประเภท mix แนะนำใส่ 0 แล้วกำหนดเผื่อที่ส่วนประกอบ
                    </p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>คำอธิบาย</Label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="รายละเอียดเพิ่มเติม"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={formLoading}>
                    {formLoading ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "เพิ่มมาตรฐาน"}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      ยกเลิก
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* กรองหมวด */}
        <div className="flex gap-3 items-center">
          <Label className="text-sm text-slate-500">กรองหมวด:</Label>
          <select
            className="border rounded-md h-9 px-3 text-sm"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="ทั้งหมด">ทั้งหมด</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="text-sm text-slate-400">
            {filteredStandards.length} รายการ
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* รายการมาตรฐาน */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-slate-500">มาตรฐาน</h2>
            {filteredStandards.map((std) => (
              <Card
                key={std.id}
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  selectedStandardId === std.id ? "ring-2 ring-blue-500" : ""
                } ${!std.is_active ? "opacity-50" : ""}`}
                onClick={() => setSelectedStandardId(std.id)}
              >
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium">{std.name}</p>
                      <p className="text-xs font-mono text-slate-400">{std.code}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        {std.category} · {typeLabel(std.standard_type)} · กรอกเป็น{" "}
                        {std.input_unit}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        ส่วนประกอบ {(std.standard_components || []).length} รายการ
                        {std.waste_percent > 0 ? ` · เผื่อมาตรฐาน ${std.waste_percent}%` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" onClick={() => startEdit(std)}>
                      แก้ไข
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(std)}>
                      {std.is_active ? "ปิด" : "เปิด"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(std)}
                    >
                      ลบ
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredStandards.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-slate-400">
                  ยังไม่มีมาตรฐาน
                </CardContent>
              </Card>
            )}
          </div>

          {/* ส่วนประกอบ */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-slate-500">ส่วนประกอบ</h2>
            {!selectedStandard ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-400">
                  เลือกมาตรฐานทางซ้าย เพื่อจัดการส่วนประกอบ
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{selectedStandard.name}</CardTitle>
                  <CardDescription>
                    {typeLabel(selectedStandard.standard_type)} · ต่อ 1{" "}
                    {selectedStandard.input_unit}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(selectedStandard.standard_components || []).length === 0 ? (
                    <p className="text-sm text-slate-400">ยังไม่มีส่วนประกอบ</p>
                  ) : (
                    <div className="space-y-2">
                      {(selectedStandard.standard_components || [])
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((comp) => (
                          <div
                            key={comp.id}
                            className="border rounded-md p-3 text-sm space-y-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">
                                  {comp.master_items?.short_name ||
                                    comp.master_items?.name ||
                                    "ไม่พบรายการ"}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {comp.master_items?.code} · {comp.master_items?.unit}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 shrink-0"
                                onClick={() => removeComponent(comp.id)}
                              >
                                ลบ
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                              <span>
                                ปริมาณ:{" "}
                                <b>
                                  {Number(comp.qty_per_unit)} {comp.master_items?.unit}
                                </b>
                              </span>
                              <span>
                                เผื่อ: <b>×{Number(comp.waste_factor)}</b>
                              </span>
                              <span>
                                {comp.is_fixed ? (
                                  <span className="text-green-700">ตายตัว</span>
                                ) : (
                                  <span className="text-amber-600">แนะนำ (แก้ได้)</span>
                                )}
                              </span>
                            </div>
                            {comp.note && (
                              <p className="text-xs text-slate-400">หมายเหตุ: {comp.note}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  )}

                  {/* เพิ่มส่วนประกอบ */}
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-sm font-medium">เพิ่มส่วนประกอบ</p>
                    <div className="space-y-2">
                      <Label>เลือกรายการวัสดุ/ค่าแรง</Label>
                      <select
                        className="w-full border rounded-md h-9 px-3 text-sm"
                        value={compItemId}
                        onChange={(e) => setCompItemId(e.target.value)}
                      >
                        <option value="">-- เลือก --</option>
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.short_name ? `${item.short_name} — ` : ""}
                            {item.name} ({item.code}) — {item.unit}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>ปริมาณต่อ 1 {selectedStandard.input_unit}</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={compQty}
                          onChange={(e) => setCompQty(e.target.value)}
                          placeholder="เช่น 314"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ตัวคูณเผื่อ</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={compWaste}
                          onChange={(e) => setCompWaste(e.target.value)}
                          placeholder="1.07"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>ลักษณะค่า</Label>
                      <select
                        className="w-full border rounded-md h-9 px-3 text-sm"
                        value={compFixed ? "fixed" : "manual"}
                        onChange={(e) => setCompFixed(e.target.value === "fixed")}
                      >
                        <option value="fixed">ตายตัว (ใช้ตาม master)</option>
                        <option value="manual">แนะนำอย่างเดียว (แก้ตอนโปรเจกต์)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>หมายเหตุ</Label>
                      <Input
                        value={compNote}
                        onChange={(e) => setCompNote(e.target.value)}
                        placeholder="เช่น ตามจำนวนชั้น / เสริมความแข็งแรง"
                      />
                    </div>
                    <Button
                      onClick={addComponent}
                      disabled={compLoading}
                      className="w-full"
                    >
                      {compLoading ? "กำลังเพิ่ม..." : "+ เพิ่มส่วนประกอบ"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}