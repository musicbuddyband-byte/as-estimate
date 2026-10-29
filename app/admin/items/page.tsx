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
  category: string;
  sub_category: string | null;
  item_type: "material" | "labor";
  unit: string;
  unit_price: number;
  is_active: boolean;
};

const CATEGORIES = [
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

const SUB_CATEGORY_CODES: Record<string, string> = {
  "เตรียมการ": "T",
  "เสาเข็ม": "B",
  "งานดินและปรับระดับ": "C",
  "คอนกรีต": "D",
  "ไม้แบบ": "E",
  "ลวด,ตะปู": "F",
  "เหล็กเส้น": "G",
  "แผ่นพื้นสำเร็จรูป": "H",
  "เหล็กรูปพรรณ": "I",
  "หลังคา": "J",
  "ฝ้าเพดาน": "K",
  "ประปา": "L",
  "ผนัง": "M",
  "พื้น": "N",
  "บันได": "O",
  "ประตู-หน้าต่าง": "P",
  "สี": "Q",
  "สุขภัณฑ์และอุปกรณ์": "R",
  "ไฟฟ้า": "S",
  "อื่นๆ": "T",
  "เครื่องจักร": "U",
  "Pipe Fitting": "V",
};

const SUB_CATEGORIES = Object.keys(SUB_CATEGORY_CODES);

const emptyForm = {
  code: "",
  name: "",
  category: "โครงสร้าง",
  sub_category: "",
  item_type: "material" as "material" | "labor",
  unit: "",
  unit_price: "",
};

export default function MasterItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filterCategory, setFilterCategory] = useState("ทั้งหมด");
  const [filterType, setFilterType] = useState("ทั้งหมด");
  const [search, setSearch] = useState("");

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
      await loadItems();
      setLoading(false);
    };

    init();
  }, [router]);

  const loadItems = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("master_items")
      .select("*")
      .order("category")
      .order("name");

    if (!error) setItems(data || []);
  };

    const generateCode = async () => {
    const catCode = CATEGORY_CODES[form.category] || "X";
    const subCode = form.sub_category
      ? SUB_CATEGORY_CODES[form.sub_category] || "T"
      : "T";
    const typeCode = form.item_type === "labor" ? "a2" : "a1";
    const prefix = `${catCode}-${subCode}-${typeCode}-`;

    const supabase = createClient();
    const { data } = await supabase
      .from("master_items")
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
      if (nums.length > 0) {
        nextNum = Math.max(...nums) + 1;
      }
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
      sub_category: form.sub_category.trim() || null,
      item_type: form.item_type,
      unit: form.unit.trim(),
      unit_price: parseFloat(form.unit_price) || 0,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase
        .from("master_items")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        alert("แก้ไขไม่สำเร็จ: " + error.message);
      } else {
        await loadItems();
        resetForm();
      }
    } else {
      const { error } = await supabase.from("master_items").insert(payload);

      if (error) {
        alert("เพิ่มไม่สำเร็จ: " + error.message);
      } else {
        await loadItems();
        resetForm();
      }
    }

    setFormLoading(false);
  };

  const startEdit = (item: MasterItem) => {
    setEditingId(item.id);
    setForm({
      code: item.code,
      name: item.name,
      category: item.category,
      sub_category: item.sub_category || "",
      item_type: item.item_type,
      unit: item.unit,
      unit_price: String(item.unit_price),
    });
    setShowForm(true);
  };

  const toggleActive = async (item: MasterItem) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("master_items")
      .update({ is_active: !item.is_active, updated_at: new Date().toISOString() })
      .eq("id", item.id);

    if (error) {
      alert("อัปเดตไม่สำเร็จ: " + error.message);
    } else {
      await loadItems();
    }
  };

    const handleDelete = async (item: MasterItem) => {
    if (!confirm(`ต้องการลบ "${item.name}" จริงหรือไม่?\n\nถ้ารายการนี้ถูกใช้ในมาตรฐานการคำนวณ จะลบไม่ได้`)) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("master_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      alert("ลบไม่สำเร็จ: " + error.message + "\n\nอาจถูกใช้งานอยู่ในมาตรฐานการคำนวณ");
    } else {
      await loadItems();
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const filtered = items.filter((item) => {
    if (filterCategory !== "ทั้งหมด" && item.category !== filterCategory) return false;
    if (filterType !== "ทั้งหมด" && item.item_type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

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
            <h1 className="text-lg font-semibold text-slate-800">Master รายการวัสดุ/ค่าแรง</h1>
            <p className="text-xs text-slate-400">จัดการรายการกลางทั้งระบบ</p>
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
              {showForm && !editingId ? "ปิดฟอร์ม" : "+ เพิ่มรายการ"}
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
                {editingId ? "แก้ไขรายการ" : "เพิ่มรายการใหม่"}
              </CardTitle>
              <CardDescription>
                รหัสต้องไม่ซ้ำ เช่น MAT-001 หรือ LAB-001
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
                        placeholder="S-M-a1-001"
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
                    <p className="text-xs text-slate-400">
                      เลือกหมวด + หมวดย่อย + ประเภท แล้วกดสร้างรหัส
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>ชื่อรายการ *</Label>
                    <Input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="อิฐมอญ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>หมวด *</Label>
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
                    <Label>หมวดย่อย</Label>
                    <select
                      className="w-full border rounded-md h-9 px-3 text-sm"
                      value={form.sub_category}
                      onChange={(e) => setForm({ ...form, sub_category: e.target.value })}
                    >
                      <option value="">-- เลือก --</option>
                      {SUB_CATEGORIES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                                    <div className="space-y-2">
                    <Label>ประเภท *</Label>
                    <select
                      className="w-full border rounded-md h-9 px-3 text-sm"
                      value={form.item_type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          item_type: e.target.value as "material" | "labor",
                        })
                      }
                    >
                      <option value="material">วัสดุ</option>
                      <option value="labor">ค่าแรง</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>หน่วย *</Label>
                    <Input
                      required
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      placeholder="ก้อน / ตร.ม. / ลบ.ม."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ราคาต่อหน่วย *</Label>
                    <Input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.unit_price}
                      onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={formLoading}>
                    {formLoading ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}
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

        {/* ตัวกรอง */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="ค้นหาชื่อหรือรหัส..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <select
            className="border rounded-md h-9 px-3 text-sm"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="ทั้งหมด">ทุกหมวด</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="border rounded-md h-9 px-3 text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ทั้งหมด">ทุกประเภท</option>
            <option value="material">วัสดุ</option>
            <option value="labor">ค่าแรง</option>
          </select>
        </div>

        <p className="text-sm text-slate-500">พบ {filtered.length} รายการ</p>

        {/* มือถือ: การ์ด */}
        <div className="space-y-3 md:hidden">
          {filtered.map((item) => (
            <Card key={item.id} className={!item.is_active ? "opacity-50" : ""}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.code}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      item.item_type === "material"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {item.item_type === "material" ? "วัสดุ" : "ค่าแรง"}
                  </span>
                </div>
                <div className="text-sm text-slate-600">
                  {item.category}
                  {item.sub_category ? ` / ${item.sub_category}` : ""} · {item.unit}
                </div>
                <div className="font-medium">
                  {Number(item.unit_price).toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  บาท
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                    แก้ไข
                  </Button>
                                    <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(item)}
                  >
                    {item.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(item)}
                  >
                    ลบ
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* คอม: ตาราง */}
        <div className="hidden md:block">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">รหัส</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">ชื่อ</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">หมวด</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">ประเภท</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">หน่วย</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">ราคา</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-b hover:bg-slate-50 ${!item.is_active ? "opacity-50" : ""}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{item.code}</td>
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3">
                        {item.category}
                        {item.sub_category ? (
                          <span className="text-slate-400"> / {item.sub_category}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            item.item_type === "material"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {item.item_type === "material" ? "วัสดุ" : "ค่าแรง"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.unit}</td>
                      <td className="px-4 py-3 text-right">
                        {Number(item.unit_price).toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                            แก้ไข
                          </Button>
                                                    <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleActive(item)}
                          >
                            {item.is_active ? "ปิด" : "เปิด"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(item)}
                          >
                            ลบ
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-slate-400">
              ยังไม่มีรายการ
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}