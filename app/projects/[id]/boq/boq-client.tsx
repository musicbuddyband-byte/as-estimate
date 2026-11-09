"use client";

import { Fragment, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppSidebar from "@/components/AppSidebar";

type ItemRow = {
  item_code: string | null;
  item_name: string;
  item_type: string;
  unit: string;
  quantity: number;
  unit_price: number;
  amount: number;
  major: string;
  level: string;
  group: string;
};

const MAJORS = [
  { key: "structure", name: "หมวดงานโครงสร้าง" },
  { key: "roof", name: "หมวดงานหลังคา" },
  { key: "arch", name: "หมวดงานสถาปัตยกรรม" },
  { key: "sanitary", name: "หมวดงานสุขาภิบาล" },
  { key: "electrical", name: "หมวดงานไฟฟ้า" },
];

const money = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dash = (n: number) => (Math.abs(n) < 0.0005 ? "-" : money(n));

export default function BoqClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [estimateDate, setEstimateDate] = useState("");
  const [overheadPercent, setOverheadPercent] = useState("0");
  const [vatPercent, setVatPercent] = useState("0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [waste, setWaste] = useState(false);
  const [view, setView] = useState<"summary" | "detail">("summary");
  const [loading, setLoading] = useState(true);
  const [savingHead, setSavingHead] = useState(false);

  const load = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("name, client_name, site_address, prepared_by, estimate_date, overhead_percent, vat_percent, discount_amount")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      alert("โหลดโปรเจกต์ไม่สำเร็จ: " + (projectError?.message || "ไม่พบโปรเจกต์"));
      setLoading(false);
      return;
    }

    setProjectName(project.name || "");
    setClientName(project.client_name || "");
    setSiteAddress(project.site_address || "");
    setPreparedBy(project.prepared_by || "");
    setEstimateDate(project.estimate_date || "");
    setOverheadPercent(String(project.overhead_percent ?? 0));
    setVatPercent(String(project.vat_percent ?? 0));
    setDiscountAmount(String(project.discount_amount ?? 0));

    const { data, error: entryError } = await supabase
  .from("project_boq_entries")
  .select("*")
  .eq("project_id", projectId);

if (entryError) {
  alert("อ่าน BOQ ไม่สำเร็จ: " + entryError.message);
}

    const map = new Map<string, ItemRow>();
    for (const r of data || []) {
      const qty = waste ? Number(r.quantity_with_waste) || 0 : Number(r.quantity_raw) || 0;
      const amt = waste ? Number(r.amount_with_waste) || 0 : Number(r.amount_raw) || 0;
      if (Math.abs(qty) < 0.00005 && Math.abs(amt) < 0.005) continue;
            const major = r.major || "structure";
      const level = r.level_name || "ชั้นฐานราก";
      const group = r.group_name || "ฐานราก";
      const key = `${major}|${level}|${group}|${r.item_id || r.item_name}|${r.unit}|${r.item_type}`;
      const found = map.get(key);
      if (!found) {
        map.set(key, {
          item_code: r.item_code,
          item_name: r.item_name,
          item_type: r.item_type,
          unit: r.unit,
          quantity: qty,
          unit_price: Number(r.unit_price) || 0,
          amount: amt,
          major,
          level,
          group,
        });
      } else {
        found.quantity += qty;
        found.amount += amt;
      }
    }

    const merged = Array.from(map.values())
      .map((r) => ({
        ...r,
        quantity: Number(r.quantity.toFixed(4)),
        amount: Number(r.amount.toFixed(2)),
      }))
      .sort((a, b) => {
        if (a.item_type !== b.item_type) return a.item_type === "material" ? -1 : 1;
        return a.item_name.localeCompare(b.item_name, "th");
      });

    setRows(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [projectId, waste]);

  const saveHead = async () => {
    setSavingHead(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("projects")
      .update({
        client_name: clientName,
        site_address: siteAddress,
        prepared_by: preparedBy,
        estimate_date: estimateDate || null,
        overhead_percent: Number(overheadPercent) || 0,
        vat_percent: Number(vatPercent) || 0,
        discount_amount: Number(discountAmount) || 0,
      })
      .eq("id", projectId);
    setSavingHead(false);
    if (error) alert("บันทึกหัวกระดาษไม่สำเร็จ: " + error.message);
    else alert("บันทึกหัวกระดาษแล้ว");
  };

  const sumOf = (list: ItemRow[], type?: string) =>
    list
      .filter((r) => (type ? r.item_type === type : true))
      .reduce((s, r) => s + r.amount, 0);

  const mat = sumOf(rows, "material");
  const lab = sumOf(rows, "labor");
  const base = mat + lab;
  const ohPct = Number(overheadPercent) || 0;
  const vatPct = Number(vatPercent) || 0;
  const discount = Number(discountAmount) || 0;
  const ohMat = mat * ohPct / 100;
  const ohLab = lab * ohPct / 100;
  const vatMat = (mat + ohMat) * vatPct / 100;
  const vatLab = (lab + ohLab) * vatPct / 100;
  const grandMat = mat + ohMat + vatMat;
  const grandLab = lab + ohLab + vatLab;
  const grand = grandMat + grandLab - discount;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex print:block print:bg-white">
      <div className="print:hidden">
        <AppSidebar projectId={projectId} projectName={projectName} />
      </div>
      <div className="flex-1 min-w-0 print:w-full">
        <header className="bg-white border-b sticky top-0 z-10 print:hidden">
          <div className="max-w-5xl mx-auto px-4 py-3 pl-16 lg:pl-4 flex justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-slate-800">BOQ รวม</h1>
              <p className="text-xs text-slate-400">{projectName}</p>
            </div>
            <Button size="sm" onClick={() => window.print()}>ปริ้น / PDF</Button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6 space-y-4 print:max-w-none print:px-0 print:py-0">
          <Card className="print:shadow-none print:border-0">
            <CardHeader className="print:hidden">
              <CardTitle className="text-base">หัวกระดาษเสนอราคา</CardTitle>
              <CardDescription>ใช้ร่วมทุกหน้าที่ปริ้นของโปรเจกต์นี้</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="hidden print:block text-center space-y-1 mb-4">
                <h1 className="text-lg font-semibold">รายการประมาณราคา BOQ</h1>
                <p>โครงการ: {projectName || "-"}</p>
                <p>ลูกค้า: {clientName || "-"}</p>
                <p>สถานที่: {siteAddress || "-"}</p>
                <p>ผู้เสนอราคา: {preparedBy || "-"} · วันที่: {estimateDate || "-"}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 print:hidden">
                <div className="space-y-1">
                  <Label>ชื่อลูกค้า</Label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>สถานที่</Label>
                  <Input value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>ผู้เสนอราคา</Label>
                  <Input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>วันที่</Label>
                  <Input type="date" value={estimateDate} onChange={(e) => setEstimateDate(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <Label>ค่าดำเนินการ %</Label>
                  <Input value={overheadPercent} onChange={(e) => setOverheadPercent(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>ภาษี %</Label>
                  <Input value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>ส่วนลด (บาท)</Label>
                  <Input value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
                </div>
              </div>
              <Button size="sm" className="print:hidden" onClick={saveHead} disabled={savingHead}>
                {savingHead ? "กำลังบันทึก..." : "บันทึกหัวกระดาษ"}
              </Button>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2 print:hidden">
            <Button size="sm" variant={view === "summary" ? "default" : "outline"} onClick={() => setView("summary")}>
              สรุปโครงการ
            </Button>
            <Button size="sm" variant={view === "detail" ? "default" : "outline"} onClick={() => setView("detail")}>
              รายละเอียดตามหมวด
            </Button>
            <Button size="sm" variant={waste ? "outline" : "default"} onClick={() => setWaste(false)}>ไม่เผื่อ</Button>
            <Button size="sm" variant={waste ? "default" : "outline"} onClick={() => setWaste(true)}>เผื่อเสียหาย</Button>
          </div>

          <Card className="print:shadow-none print:border-0">
            <CardContent className="pt-4 overflow-x-auto">
                           {view === "summary" ? (
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="border-b bg-slate-100 text-left">
                      <th className="py-2 px-2 w-20">ลำดับ</th>
                      <th className="py-2 px-2">รายการ</th>
                      <th className="py-2 px-2 text-right">ค่าวัสดุ</th>
                      <th className="py-2 px-2 text-right">ค่าแรง</th>
                      <th className="py-2 px-2 text-right">รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MAJORS.flatMap((major, mi) => {
                      const list = rows.filter((r) => r.major === major.key);
                      const groups = Array.from(
                        new Set(list.map((r) => `${r.level}|||${r.group}`))
                      );
                      const mMat = sumOf(list, "material");
                      const mLab = sumOf(list, "labor");
                      return [
                        <tr key={major.key} className="bg-blue-100 font-medium">
                          <td className="py-2 px-2">{mi + 1}</td>
                          <td className="py-2 px-2" colSpan={4}>{major.name}</td>
                        </tr>,
                        groups.length === 0 ? (
                          <tr key={major.key + "-empty"}>
                            <td />
                            <td className="py-2 px-2 text-slate-400" colSpan={4}>
                              ยังไม่มีรายการ
                            </td>
                          </tr>
                        ) : null,
                        ...groups.map((g, gi) => {
                          const [level, group] = g.split("|||");
                          const glist = list.filter(
                            (r) => r.level === level && r.group === group
                          );
                          const gMat = sumOf(glist, "material");
                          const gLab = sumOf(glist, "labor");
                          return (
                            <tr key={major.key + "-" + g}>
                              <td className="py-2 px-2">{mi + 1}.{gi + 1}</td>
                              <td className="py-2 px-2">{level} · {group}</td>
                              <td className="py-2 px-2 text-right">{money(gMat)}</td>
                              <td className="py-2 px-2 text-right">{money(gLab)}</td>
                              <td className="py-2 px-2 text-right">{money(gMat + gLab)}</td>
                            </tr>
                          );
                        }),
                        <tr key={major.key + "-total"} className="bg-green-100 font-medium">
                          <td className="py-2 px-2" colSpan={2}>TOTAL {major.name}</td>
                          <td className="py-2 px-2 text-right">{money(mMat)}</td>
                          <td className="py-2 px-2 text-right">{money(mLab)}</td>
                          <td className="py-2 px-2 text-right">{money(mMat + mLab)}</td>
                        </tr>,
                      ];
                    })}
                    <tr className="font-medium border-t">
                      <td className="py-2 px-2" colSpan={2}>รวมมูลค่า ค่าวัสดุ และ ค่าแรง</td>
                      <td className="py-2 px-2 text-right">{money(mat)}</td>
                      <td className="py-2 px-2 text-right">{money(lab)}</td>
                      <td className="py-2 px-2 text-right">{money(base)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2" colSpan={2}>ค่าดำเนินการ {ohPct}%</td>
                      <td className="py-2 px-2 text-right">{money(ohMat)}</td>
                      <td className="py-2 px-2 text-right">{money(ohLab)}</td>
                      <td className="py-2 px-2 text-right">{money(ohMat + ohLab)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2" colSpan={2}>ภาษี {vatPct}%</td>
                      <td className="py-2 px-2 text-right">{money(vatMat)}</td>
                      <td className="py-2 px-2 text-right">{money(vatLab)}</td>
                      <td className="py-2 px-2 text-right">{money(vatMat + vatLab)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-2" colSpan={2}>ส่วนลด</td>
                      <td />
                      <td />
                      <td className="py-2 px-2 text-right">{money(discount)}</td>
                    </tr>
                    <tr className="font-semibold bg-amber-50">
                      <td className="py-2 px-2" colSpan={2}>รวมมูลค่าก่อสร้าง</td>
                      <td className="py-2 px-2 text-right">{money(grandMat)}</td>
                      <td className="py-2 px-2 text-right">{money(grandLab)}</td>
                      <td className="py-2 px-2 text-right">{money(grand)}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm min-w-[980px]">
                  <thead>
                    <tr className="border-b bg-slate-100 text-left">
                      <th className="py-2 px-2">ลำดับ</th>
                      <th className="py-2 px-2">รายการ</th>
                      <th className="py-2 px-2 text-right">จำนวน</th>
                      <th className="py-2 px-2">หน่วย</th>
                      <th className="py-2 px-2 text-right">วัสดุ/หน่วย</th>
                      <th className="py-2 px-2 text-right">รวมวัสดุ</th>
                      <th className="py-2 px-2 text-right">แรง/หน่วย</th>
                      <th className="py-2 px-2 text-right">รวมแรง</th>
                      <th className="py-2 px-2 text-right">รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MAJORS.flatMap((major) => {
                      const list = rows.filter((r) => r.major === major.key);
                      const groups = Array.from(
                        new Set(list.map((r) => `${r.level}|||${r.group}`))
                      );
                      return [
                        <tr key={major.key} className="bg-blue-100 font-medium">
                          <td className="py-2 px-2" colSpan={9}>{major.name}</td>
                        </tr>,
                        groups.length === 0 ? (
                          <tr key={major.key + "-empty"}>
                            <td className="py-2 px-2 text-slate-400" colSpan={9}>
                              ยังไม่มีรายการ
                            </td>
                          </tr>
                        ) : null,
                        ...groups.flatMap((g) => {
                          const [level, group] = g.split("|||");
                          const glist = list.filter(
                            (r) => r.level === level && r.group === group
                          );
                          const gMat = sumOf(glist, "material");
                          const gLab = sumOf(glist, "labor");
                          return [
                            <tr key={major.key + "-" + g} className="bg-amber-50 font-medium">
                              <td className="py-2 px-2" colSpan={9}>{level} · {group}</td>
                            </tr>,
                            ...glist.map((r, i) => {
                              const isMat = r.item_type === "material";
                              return (
                                <tr key={major.key + g + i} className="border-b border-slate-100">
                                  <td className="py-2 px-2">{i + 1}</td>
                                  <td className="py-2 px-2">
                                    <div>{r.item_name}</div>
                                    {r.item_code && (
                                      <div className="text-xs text-slate-400">{r.item_code}</div>
                                    )}
                                  </td>
                                  <td className="py-2 px-2 text-right">{r.quantity.toLocaleString()}</td>
                                  <td className="py-2 px-2">{r.unit}</td>
                                  <td className="py-2 px-2 text-right">{dash(isMat ? r.unit_price : 0)}</td>
                                  <td className="py-2 px-2 text-right">{dash(isMat ? r.amount : 0)}</td>
                                  <td className="py-2 px-2 text-right">{dash(isMat ? 0 : r.unit_price)}</td>
                                  <td className="py-2 px-2 text-right">{dash(isMat ? 0 : r.amount)}</td>
                                  <td className="py-2 px-2 text-right">{money(r.amount)}</td>
                                </tr>
                              );
                            }),
                            <tr key={major.key + g + "-total"} className="bg-green-50 font-medium">
                              <td className="py-2 px-2" colSpan={5}>TOTAL {group}</td>
                              <td className="py-2 px-2 text-right">{money(gMat)}</td>
                              <td />
                              <td className="py-2 px-2 text-right">{money(gLab)}</td>
                              <td className="py-2 px-2 text-right">{money(gMat + gLab)}</td>
                            </tr>,
                          ];
                        }),
                      ];
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}