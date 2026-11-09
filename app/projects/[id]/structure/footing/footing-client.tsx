"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppSidebar from "@/components/AppSidebar";
import { FootingPreview } from "@/components/FootingPreview";
import {
  FOOTING_BAR_SHAPES,
  calcBarLength,
  legacyShapeToCode,
  isBarShapeCode,
  type BarShapeCode,
} from "@/lib/bar-shapes";



type Project = { id: string; name: string };
type TabKey = "add" | "check" | "report";

type MasterItem = {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
  unit: string;
  item_type: string;
  category: string;
  sub_category: string | null;
  unit_price?: number | null;
  unit_weight?: number | null;
  standard_length?: number | null;
  default_waste?: number | null;
};

type ElementRow = {
  id: string;
  name: string;
  sort_order: number;
};

type FootingType = "pad" | "pile" | "septic";
type PositionCode = "A" | "B" | "C" | "D";

type BarShape = "U" | "U_INV" | "L" | "RECT" | "";
type Orientation = "width" | "length" | "";

type RebarRow = {
  position_code: PositionCode;
  label: string;
  item_id: string;
  spacing_m: string;
  bar_count: string;
  length_per_bar_m: string;
  bar_shape: BarShape;
  orientation: Orientation;
  covering_m: string;
  hook_total_m: string;
  auto_calc: boolean;
};

type ResultRow = {
  id?: string;
  item_id: string | null;
  item_code: string | null;
  item_name: string;
  item_type: string;
  unit: string;
  quantity_raw: number;
  quantity_with_waste: number;
  unit_price: number;
  amount_raw: number;
  amount_with_waste: number;
  source: string;
  sort_order: number;
};

const FOOTING_TYPES: { value: FootingType; label: string }[] = [
  { value: "pad", label: "ฐานแผ่" },
  { value: "pile", label: "ฐานเสาเข็ม" },
  { value: "septic", label: "ฐานบ่อเกรอะ" },
];

const REBAR_POSITIONS: { code: PositionCode; label: string }[] = [
  { code: "A", label: "A — เหล็กบน" },
  { code: "B", label: "B — เหล็กล่าง" },
  { code: "C", label: "C — เหล็กรัดรอบ" },
  { code: "D", label: "D — ตะแกรง" },
];

const emptyRebar = (): RebarRow[] =>
  REBAR_POSITIONS.map((p) => ({
    position_code: p.code,
    label: p.label,
    item_id: "",
    spacing_m: "",
    bar_count: "",
    length_per_bar_m: "",
    bar_shape: "",
    orientation: "",
    covering_m: "0.05",
    hook_total_m: "0.14",
    auto_calc: true,
  }));

type FormState = {
  name: string;
  footing_type: FootingType;
  width_m: string;
  length_m: string;
  height_m: string;
  quantity: string;
  use_lean: boolean;
  lean_item_id: string;
  lean_thickness_m: string;
  concrete_item_id: string;
  use_pile: boolean;
  pile_item_id: string;
  pile_per_footing: string;
  use_sand: boolean;
  sand_item_id: string;
  sand_thickness_m: string;
  use_formwork: boolean;
  formwork_item_id: string;
  use_backfill: boolean;
  backfill_item_id: string;
  covering_m: string;
  hook_m: string;
  note: string;
    // ดินขุด
  use_excavate: boolean;
  excavate_item_id: string;
  excavate_width_m: string;
  excavate_length_m: string;
  excavate_height_m: string;
  // ถมดินกลับ ใช้ use_backfill / backfill_item_id เดิม
  // ตะปู ลวด
  use_nail: boolean;
  nail_item_id: string;
  use_wire: boolean;
  wire_item_id: string;
  // ค้ำยัน เคร่า
  use_prop: boolean;
  prop_item_id: string;
  prop_per_footing: string;
  use_kera: boolean;
  kera_item_id: string;
  kera_per_footing: string;
  // ค่าแรงไม้แบบ (ถ้ามี)
  formwork_labor_item_id: string;
    concrete_labor_item_id: string;
  lean_labor_item_id: string;
  pile_labor_item_id: string;
  rebar_labor_item_id: string;
  rebar: RebarRow[];
};

const emptyForm = (): FormState => ({
  name: "",
  footing_type: "pad",
  width_m: "",
  length_m: "",
  height_m: "",
  quantity: "1",
  use_lean: false,
  lean_item_id: "",
  lean_thickness_m: "0.05",
  concrete_item_id: "",
  use_pile: false,
  pile_item_id: "",
  pile_per_footing: "1",
  use_sand: false,
  sand_item_id: "",
  sand_thickness_m: "0.10",
  use_formwork: true,
  formwork_item_id: "",
  use_backfill: false,
  backfill_item_id: "",
  covering_m: "0.025",
  hook_m: "0.24",
  note: "",
    use_excavate: false,
  excavate_item_id: "",
  excavate_width_m: "",
  excavate_length_m: "",
  excavate_height_m: "",
  use_nail: false,
  nail_item_id: "",
  use_wire: false,
  wire_item_id: "",
  use_prop: false,
  prop_item_id: "",
  prop_per_footing: "",
  use_kera: false,
  kera_item_id: "",
  kera_per_footing: "",
  formwork_labor_item_id: "",
    concrete_labor_item_id: "",
  lean_labor_item_id: "",
  pile_labor_item_id: "",
  rebar_labor_item_id: "",
  rebar: emptyRebar(),
});

function MasterSelect({
  items,
  value,
  onChange,
  placeholder = "-- เลือก --",
  allowEmpty = true,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = items.find((i) => i.id === value);
  const filtered = items.filter((i) => {
    if (!q.trim()) return true;
    return i.label.toLowerCase().includes(q.trim().toLowerCase());
  });

  return (
    <div className="relative">
      <button
        type="button"
        className="w-full border rounded-md h-9 px-3 text-sm text-left bg-white flex items-center justify-between gap-2"
        onClick={() => {
          setOpen((o) => !o);
          setQ("");
        }}
      >
        <span className={selected ? "text-slate-800 truncate" : "text-slate-400 truncate"}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="text-slate-400 text-xs shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow-lg">
          <div className="p-2 border-b">
            <input
              autoFocus
              className="w-full border rounded-md h-8 px-2 text-sm"
              placeholder="พิมพ์ค้นหา..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {allowEmpty && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setQ("");
                }}
              >
                {placeholder}
              </button>
            )}
            {filtered.map((i) => (
              <button
                key={i.id}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                  i.id === value ? "bg-blue-50 text-blue-800" : ""
                }`}
                onClick={() => {
                  onChange(i.id);
                  setOpen(false);
                  setQ("");
                }}
              >
                {i.label}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-400">ไม่พบรายการ</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FootingClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("add");
  const [items, setItems] = useState<MasterItem[]>([]);
  const [elements, setElements] = useState<ElementRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [checkElementId, setCheckElementId] = useState<string>("");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [reportRows, setReportRows] = useState<ResultRow[]>([]);
  const [reportWaste, setReportWaste] = useState(true); // true = เผื่อ
  const [reportAsBar, setReportAsBar] = useState(false); // แสดงเส้น
  const [loadingReport, setLoadingReport] = useState(false);
  const [hoverRebar, setHoverRebar] = useState<string | null>(null);

    

   useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: projectData, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("id", projectId)
        .single();

      if (error || !projectData) {
        alert("ไม่พบโปรเจกต์");
        router.push("/");
        return;
      }

      setProject(projectData);
      await Promise.all([loadItems(), loadElements()]);
      setLoading(false);
    };

    init();
  }, [projectId, router]);

  useEffect(() => {
    if (tab === "report") {
      loadReport();
    }
  }, [tab, projectId]);

  const loadItems = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("master_items")
      .select("id, code, name, short_name, unit, item_type, category, sub_category, unit_price, unit_weight, default_waste, standard_length")
      .eq("is_active", true)
      .order("name");
    setItems(data || []);
  };

  const loadElements = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("project_structure_elements")
      .select("id, name, sort_order")
      .eq("project_id", projectId)
      .eq("category", "footing")
      .order("sort_order")
      .order("created_at");
    setElements(data || []);
  };

    const loadResults = async (elementId: string) => {
    if (!elementId) {
      setResults([]);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
.from("project_footing_results")
      .select("*")
      .eq("element_id", elementId)
      .order("sort_order");
    setResults((data as ResultRow[]) || []);
  };

  const getItem = (id: string | null | undefined) =>
    items.find((i) => i.id === id) || null;

    const filterItems = (type: "material" | "labor") =>
    items.filter((i) => i.item_type === type);

  const pushResult = (
    list: ResultRow[],
    item: MasterItem | null,
    qty: number,
    source: string,
    sort: number,
    fallbackName?: string
  ) => {
    if (qty <= 0) return;
    const wastePct = item?.default_waste != null ? Number(item.default_waste) : 0;
    // default_waste เก็บแบบ 1.05 = เผื่อ 5% หรือ 5 = 5% — รองรับทั้งสอง
    const factor =
      wastePct > 1.5 ? 1 + wastePct / 100 : wastePct > 0 ? wastePct : 1;
    const qtyWaste = qty * factor;
    const price = item?.unit_price != null ? Number(item.unit_price) : 0;

    list.push({
      item_id: item?.id || null,
      item_code: item?.code || null,
      item_name: item?.name || fallbackName || source,
      item_type: item?.item_type || "material",
      unit: item?.unit || "-",
      quantity_raw: Number(qty.toFixed(4)),
      quantity_with_waste: Number(qtyWaste.toFixed(4)),
      unit_price: price,
      amount_raw: Number((qty * price).toFixed(2)),
      amount_with_waste: Number((qtyWaste * price).toFixed(2)),
      source,
      sort_order: sort,
    });
  };

    const handleRefresh = async () => {
    if (!checkElementId) {
      alert("เลือกชิ้นงานก่อน");
      return;
    }

    setRefreshing(true);
    const supabase = createClient();

    const { data: input } = await supabase
      .from("project_footing_inputs")
      .select("*")
      .eq("element_id", checkElementId)
      .maybeSingle();

    const { data: rebarRows } = await supabase
      .from("project_footing_rebar")
      .select("*")
      .eq("element_id", checkElementId)
      .order("sort_order");

    if (!input) {
      alert("ยังไม่มีข้อมูล Add ของชิ้นนี้ — บันทึกที่ Add Data ก่อน");
      setRefreshing(false);
      return;
    }

    const w = Number(input.width_m) || 0;
    const l = Number(input.length_m) || 0;
    const h = Number(input.height_m) || 0;
    const n = Number(input.quantity) || 1;

    const list: ResultRow[] = [];
    let sort = 0;

    const concVol = w * l * h * n;
    pushResult(list, getItem(input.concrete_item_id), concVol, "concrete", sort++);
    if (input.concrete_labor_item_id) {
      pushResult(
        list,
        getItem(input.concrete_labor_item_id),
        concVol,
        "concrete_labor",
        sort++
      );
    }

    let leanVol = 0;
    if (input.use_lean) {
      const leanTh = Number(input.lean_thickness_m) || 0;
      leanVol = w * l * leanTh * n;
      pushResult(list, getItem(input.lean_item_id), leanVol, "lean", sort++);
    }
          if (input.lean_labor_item_id) {
        pushResult(
          list,
          getItem(input.lean_labor_item_id),
          leanVol,
          "lean_labor",
          sort++
        );
      }

        let pileQty = 0;
    if (input.use_pile) {
      pileQty = (Number(input.pile_per_footing) || 0) * n;
      pushResult(list, getItem(input.pile_item_id), pileQty, "pile", sort++);
      if (input.pile_labor_item_id) {
        pushResult(
          list,
          getItem(input.pile_labor_item_id),
          pileQty,
          "pile_labor",
          sort++
        );
      }
    }

    let sandVol = 0;
    if (input.use_sand) {
      const sandTh = Number(input.sand_thickness_m) || 0;
      sandVol = w * l * sandTh * n;
      pushResult(list, getItem(input.sand_item_id), sandVol, "sand", sort++);
    }

    let excVol = 0;
    if (input.use_excavate) {
      const ew = Number(input.excavate_width_m) || 0;
      const el = Number(input.excavate_length_m) || 0;
      const eh = Number(input.excavate_height_m) || 0;
      excVol = ew * el * eh * n;
      pushResult(list, getItem(input.excavate_item_id), excVol, "excavate", sort++);
    }

    if (input.use_backfill) {
      const backfillVol = Math.max(excVol - (concVol + leanVol + sandVol), 0);
      pushResult(list, getItem(input.backfill_item_id), backfillVol, "backfill", sort++);
    }

    let formArea = 0;
    if (input.use_formwork) {
      formArea = h * (w + l * 2) * n;
      pushResult(list, getItem(input.formwork_item_id), formArea, "formwork", sort++);
      if (input.formwork_labor_item_id) {
        pushResult(
          list,
          getItem(input.formwork_labor_item_id),
          formArea,
          "formwork_labor",
          sort++
        );
      }
    }

    if (input.use_nail) {
      pushResult(list, getItem(input.nail_item_id), formArea * 0.25, "nail", sort++);
    }

    if (input.use_prop) {
      const propQty = (Number(input.prop_per_footing) || 0) * n;
      pushResult(list, getItem(input.prop_item_id), propQty, "prop", sort++);
    }

    if (input.use_kera) {
      const keraQty = (Number(input.kera_per_footing) || 0) * n;
      pushResult(list, getItem(input.kera_item_id), keraQty, "kera", sort++);
    }

    let steelKgTotal = 0;
    for (const row of rebarRows || []) {
      const count = Number(row.bar_count) || 0;
      const len = Number(row.length_per_bar_m) || 0;
      const totalM = count * len * n;
      if (totalM <= 0) continue;

      const item = getItem(row.item_id);
      let qty = totalM;
      let unit = item?.unit || "ม.";

      if (item?.unit_weight != null && Number(item.unit_weight) > 0) {
        qty = totalM * Number(item.unit_weight);
        unit = "กก.";
        steelKgTotal += qty;
      }

      const wastePct = item?.default_waste != null ? Number(item.default_waste) : 0;
      const factor =
        wastePct > 1.5 ? 1 + wastePct / 100 : wastePct > 0 ? wastePct : 1;
      const qtyWaste = qty * factor;
      const price = item?.unit_price != null ? Number(item.unit_price) : 0;

      list.push({
        item_id: item?.id || null,
        item_code: item?.code || null,
        item_name: item?.name || `เหล็ก ${row.position_code}`,
        item_type: item?.item_type || "material",
        unit,
        quantity_raw: Number(qty.toFixed(4)),
        quantity_with_waste: Number(qtyWaste.toFixed(4)),
        unit_price: price,
        amount_raw: Number((qty * price).toFixed(2)),
        amount_with_waste: Number((qtyWaste * price).toFixed(2)),
        source: `rebar_${row.position_code}`,
        sort_order: sort++,
      });
    }

    if (input.use_wire && steelKgTotal > 0) {
      pushResult(list, getItem(input.wire_item_id), steelKgTotal * 0.03, "wire", sort++);
    }
        if (input.rebar_labor_item_id && steelKgTotal > 0) {
      pushResult(
        list,
        getItem(input.rebar_labor_item_id),
        steelKgTotal,
        "rebar_labor",
        sort++
      );
    }

    await supabase
  .from("project_footing_results")
  .delete()
  .eq("element_id", checkElementId);

    if (list.length > 0) {
      const payload = list.map((r) => ({
        element_id: checkElementId,
        project_id: projectId,
        item_id: r.item_id,
        item_code: r.item_code,
        item_name: r.item_name,
        item_type: r.item_type,
        unit: r.unit,
        quantity_raw: r.quantity_raw,
        quantity_with_waste: r.quantity_with_waste,
        unit_price: r.unit_price,
        amount_raw: r.amount_raw,
        amount_with_waste: r.amount_with_waste,
        source: r.source,
        sort_order: r.sort_order,
        calculated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("project_footing_results").insert(payload);
      if (error) {
        alert("บันทึกผลไม่สำเร็จ: " + error.message);
        setRefreshing(false);
        return;
      }
    }

        await supabase.from("project_boq_entries").delete().eq("element_id", checkElementId);

    if (list.length > 0) {
      const boqPayload = list.map((r) => ({
        element_id: checkElementId,
        project_id: projectId,
        source: "footing",
        major: "structure",
        level_name: "ชั้นฐานราก",
        group_name: "ฐานราก",
        item_id: r.item_id,
        item_code: r.item_code,
        item_name: r.item_name,
        item_type: r.item_type,
        unit: r.unit,
        quantity_raw: r.quantity_raw,
        quantity_with_waste: r.quantity_with_waste,
        unit_price: r.unit_price,
        amount_raw: r.amount_raw,
        amount_with_waste: r.amount_with_waste,
        sort_order: r.sort_order,
        calculated_at: new Date().toISOString(),
      }));

      const { error: boqError } = await supabase.from("project_boq_entries").insert(boqPayload);
      if (boqError) {
        alert("บันทึก BOQ รวมไม่สำเร็จ: " + boqError.message);
        setRefreshing(false);
        return;
      }
    }

    await loadResults(checkElementId);
    setRefreshing(false);
    alert("Refresh สำเร็จ");
  };

  
  
    const loadReport = async () => {
    setLoadingReport(true);
    const supabase = createClient();

    // ชิ้นงานฐานรากทั้งหมดในโปรเจกต์
    const { data: els } = await supabase
      .from("project_structure_elements")
      .select("id")
      .eq("project_id", projectId)
      .eq("category", "footing");

    const ids = (els || []).map((e) => e.id);
    if (ids.length === 0) {
      setReportRows([]);
      setLoadingReport(false);
      return;
    }

    const { data } = await supabase
      .from("project_footing_results")
      .select("*")
      .eq("project_id", projectId)
      .in("element_id", ids);

    // รวมรายการซ้ำ ตาม item_id หรือชื่อ+หน่วย
    const map = new Map<string, ResultRow>();

    for (const r of data || []) {
      const key = r.item_id || `${r.item_name}|${r.unit}|${r.item_type}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          item_id: r.item_id,
          item_code: r.item_code,
          item_name: r.item_name,
          item_type: r.item_type,
          unit: r.unit,
          quantity_raw: Number(r.quantity_raw) || 0,
          quantity_with_waste: Number(r.quantity_with_waste) || 0,
          unit_price: Number(r.unit_price) || 0,
          amount_raw: Number(r.amount_raw) || 0,
          amount_with_waste: Number(r.amount_with_waste) || 0,
          source: r.source || "",
          sort_order: Number(r.sort_order) || 0,
        });
      } else {
        existing.quantity_raw += Number(r.quantity_raw) || 0;
        existing.quantity_with_waste += Number(r.quantity_with_waste) || 0;
        existing.amount_raw += Number(r.amount_raw) || 0;
        existing.amount_with_waste += Number(r.amount_with_waste) || 0;
      }
    }

    const merged = Array.from(map.values()).map((r) => ({
      ...r,
      quantity_raw: Number(r.quantity_raw.toFixed(4)),
      quantity_with_waste: Number(r.quantity_with_waste.toFixed(4)),
      amount_raw: Number(r.amount_raw.toFixed(2)),
      amount_with_waste: Number(r.amount_with_waste.toFixed(2)),
    }));

    // เรียง: วัสดุก่อน แรงงานทีหลัง แล้วตามชื่อ
    merged.sort((a, b) => {
      if (a.item_type !== b.item_type) {
        return a.item_type === "material" ? -1 : 1;
      }
      return a.item_name.localeCompare(b.item_name, "th");
    });

    setReportRows(merged);
    setLoadingReport(false);
  };


  const materialItems = items.filter((i) => i.item_type === "material");

  const itemLabel = (item: MasterItem) =>
    `${item.short_name ? item.short_name + " — " : ""}${item.name} (${item.code})`;

  const loadElementDetail = async (elementId: string) => {
    const supabase = createClient();

    const { data: input } = await supabase
      .from("project_footing_inputs")
      .select("*")
      .eq("element_id", elementId)
      .maybeSingle();

    const { data: rebarRows } = await supabase
      .from("project_footing_rebar")
      .select("*")
      .eq("element_id", elementId);

    const el = elements.find((e) => e.id === elementId);
    const next = emptyForm();
    next.name = el?.name || "";

    if (input) {
      next.footing_type = input.footing_type;
      next.width_m = String(input.width_m ?? "");
      next.length_m = String(input.length_m ?? "");
      next.height_m = String(input.height_m ?? "");
      next.quantity = String(input.quantity ?? "1");
      next.use_lean = !!input.use_lean;
      next.lean_item_id = input.lean_item_id || "";
      next.lean_labor_item_id = input.lean_labor_item_id || "";
      next.lean_thickness_m = String(input.lean_thickness_m ?? "");
      next.concrete_item_id = input.concrete_item_id || "";
      next.concrete_labor_item_id = input.concrete_labor_item_id || "";
      next.use_pile = !!input.use_pile;
      next.pile_item_id = input.pile_item_id || "";
      next.pile_labor_item_id = input.pile_labor_item_id || "";
      next.pile_per_footing = String(input.pile_per_footing ?? "");
      next.use_sand = !!input.use_sand;
      next.sand_item_id = input.sand_item_id || "";
      next.sand_thickness_m = String(input.sand_thickness_m ?? "");
      next.use_formwork = input.use_formwork !== false;
      next.formwork_item_id = input.formwork_item_id || "";
      next.use_backfill = !!input.use_backfill;
      next.backfill_item_id = input.backfill_item_id || "";
      next.covering_m = String(input.covering_m ?? "0.025");
      next.hook_m = String(input.hook_m ?? "0.24");
      next.note = input.note || "";
        next.use_excavate = !!input.use_excavate;
      next.excavate_item_id = input.excavate_item_id || "";
      next.excavate_width_m =
        input.excavate_width_m != null ? String(input.excavate_width_m) : "";
      next.excavate_length_m =
        input.excavate_length_m != null ? String(input.excavate_length_m) : "";
      next.excavate_height_m =
        input.excavate_height_m != null ? String(input.excavate_height_m) : "";
      next.use_nail = !!input.use_nail;
      next.nail_item_id = input.nail_item_id || "";
      next.use_wire = !!input.use_wire;
      next.wire_item_id = input.wire_item_id || "";
      next.use_prop = !!input.use_prop;
      next.prop_item_id = input.prop_item_id || "";
      next.prop_per_footing =
        input.prop_per_footing != null ? String(input.prop_per_footing) : "";
      next.use_kera = !!input.use_kera;
      next.kera_item_id = input.kera_item_id || "";
      next.kera_per_footing =
        input.kera_per_footing != null ? String(input.kera_per_footing) : "";
      next.formwork_labor_item_id = input.formwork_labor_item_id || ""; 
      next.rebar_labor_item_id = input.rebar_labor_item_id || "";     
    }

        next.rebar = emptyRebar().map((row) => {
      const found = (rebarRows || []).find((r) => r.position_code === row.position_code);
      if (!found) return row;
      return {
        ...row,
        item_id: found.item_id || "",
        spacing_m: found.spacing_m != null ? String(found.spacing_m) : "",
        bar_count: found.bar_count != null ? String(found.bar_count) : "",
        length_per_bar_m:
          found.length_per_bar_m != null ? String(found.length_per_bar_m) : "",
        bar_shape: (found.bar_shape as BarShape) || "",
        orientation: (found.orientation as Orientation) || "",
        covering_m:
          found.covering_m != null ? String(found.covering_m) : "0.05",
        hook_total_m:
          found.hook_total_m != null ? String(found.hook_total_m) : "0.14",
        auto_calc: true,
      };
    });

    setForm(next);
    setSelectedId(elementId);
  };

  const handleNew = () => {
    setSelectedId(null);
    setForm(emptyForm());
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("กรุณาใส่ชื่อฐานราก");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    let elementId = selectedId;

    if (!elementId) {
      const { data: el, error } = await supabase
        .from("project_structure_elements")
        .insert({
          project_id: projectId,
          category: "footing",
          name: form.name.trim(),
          sort_order: elements.length,
        })
        .select("id")
        .single();

      if (error || !el) {
        alert("สร้างชิ้นงานไม่สำเร็จ: " + (error?.message || ""));
        setSaving(false);
        return;
      }
      elementId = el.id;
    } else {
      const { error } = await supabase
        .from("project_structure_elements")
        .update({ name: form.name.trim(), updated_at: new Date().toISOString() })
        .eq("id", elementId);
      if (error) {
        alert("อัปเดตชื่อไม่สำเร็จ: " + error.message);
        setSaving(false);
        return;
      }
    }

    const inputPayload = {
      element_id: elementId,
      project_id: projectId,
      footing_type: form.footing_type,
      width_m: parseFloat(form.width_m) || 0,
      length_m: parseFloat(form.length_m) || 0,
      height_m: parseFloat(form.height_m) || 0,
      quantity: parseFloat(form.quantity) || 1,
      use_lean: form.use_lean,
      lean_item_id: form.use_lean && form.lean_item_id ? form.lean_item_id : null,
      lean_thickness_m: parseFloat(form.lean_thickness_m) || 0,
      concrete_item_id: form.concrete_item_id || null,
      use_pile: form.use_pile,
      pile_item_id: form.use_pile && form.pile_item_id ? form.pile_item_id : null,
      pile_per_footing: parseFloat(form.pile_per_footing) || 0,
      use_sand: form.use_sand,
      sand_item_id: form.use_sand && form.sand_item_id ? form.sand_item_id : null,
      sand_thickness_m: parseFloat(form.sand_thickness_m) || 0,
      use_formwork: form.use_formwork,
      formwork_item_id:
        form.use_formwork && form.formwork_item_id ? form.formwork_item_id : null,
      use_backfill: form.use_backfill,
      backfill_item_id:
        form.use_backfill && form.backfill_item_id ? form.backfill_item_id : null,
      covering_m: parseFloat(form.covering_m) || 0,
      hook_m: parseFloat(form.hook_m) || 0,
      note: form.note.trim() || null,
      updated_at: new Date().toISOString(),
            use_excavate: form.use_excavate,
      excavate_item_id:
        form.use_excavate && form.excavate_item_id ? form.excavate_item_id : null,
      excavate_width_m: parseFloat(form.excavate_width_m) || 0,
      excavate_length_m: parseFloat(form.excavate_length_m) || 0,
      excavate_height_m: parseFloat(form.excavate_height_m) || 0,

      use_nail: form.use_nail,
      nail_item_id: form.use_nail && form.nail_item_id ? form.nail_item_id : null,
      use_wire: form.use_wire,
      wire_item_id: form.use_wire && form.wire_item_id ? form.wire_item_id : null,

      use_prop: form.use_prop,
      prop_item_id: form.use_prop && form.prop_item_id ? form.prop_item_id : null,
      prop_per_footing: parseFloat(form.prop_per_footing) || 0,
      use_kera: form.use_kera,
      kera_item_id: form.use_kera && form.kera_item_id ? form.kera_item_id : null,
      kera_per_footing: parseFloat(form.kera_per_footing) || 0,

      formwork_labor_item_id:
        form.use_formwork && form.formwork_labor_item_id
          ? form.formwork_labor_item_id
          : null,

        concrete_labor_item_id: form.concrete_labor_item_id || null,
      lean_labor_item_id:
        form.use_lean && form.lean_labor_item_id ? form.lean_labor_item_id : null,
      pile_labor_item_id:
        form.use_pile && form.pile_labor_item_id ? form.pile_labor_item_id : null,
      rebar_labor_item_id: form.rebar_labor_item_id || null,
    };

    const { error: inputError } = await supabase
      .from("project_footing_inputs")
      .upsert(inputPayload, { onConflict: "element_id" });

    if (inputError) {
      alert("บันทึกอินพุตไม่สำเร็จ: " + inputError.message);
      setSaving(false);
      return;
    }

    // ลบเหล็กเก่าแล้วใส่ใหม่
    await supabase.from("project_footing_rebar").delete().eq("element_id", elementId);

        const rebarPayload = form.rebar
      .filter((r) => r.item_id || r.spacing_m || r.bar_count || r.length_per_bar_m)
      .map((r, index) => ({
        element_id: elementId,
        project_id: projectId,
        position_code: r.position_code,
        item_id: r.item_id || null,
        spacing_m: parseFloat(r.spacing_m) || 0,
        bar_count: parseFloat(r.bar_count) || 0,
        length_per_bar_m: parseFloat(r.length_per_bar_m) || 0,
        bar_shape: r.bar_shape || null,
        orientation: r.orientation || null,
        covering_m: parseFloat(r.covering_m) || 0,
        hook_total_m: parseFloat(r.hook_total_m) || 0,
        is_auto_count: r.auto_calc,
        is_auto_length: r.auto_calc,
        sort_order: index,
      }));

    if (rebarPayload.length > 0) {
      const { error: rebarError } = await supabase
        .from("project_footing_rebar")
        .insert(rebarPayload);
      if (rebarError) {
        alert("บันทึกเหล็กไม่สำเร็จ: " + rebarError.message);
        setSaving(false);
        return;
      }
    }

    await loadElements();
    setSelectedId(elementId);
    setSaving(false);
    alert("บันทึกสำเร็จ");
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("ลบชิ้นงานนี้?")) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("project_structure_elements")
      .delete()
      .eq("id", selectedId);

    if (error) {
      alert("ลบไม่สำเร็จ: " + error.message);
      return;
    }

    setSelectedId(null);
    setForm(emptyForm());
    await loadElements();
  };



function calcRebarLength(
  positionCode: string,
  barShape: string,
  orientation: string,
  w: number,
  l: number,
  h: number,
  cover: number,
  hook: number
) {
  const shapeCode = isBarShapeCode(barShape)
    ? barShape
    : legacyShapeToCode(barShape);

  // ปลอก C หรือรหัส 61 ใช้สูตรรอบฐาน
  if (positionCode === "C" || shapeCode === "61") {
    return calcBarLength({
      code: "61",
      A: 0,
      BC: hook,
      H: h,
      cover,
      width: w,
      length: l,
    });
  }

  const alongWidth = orientation === "width";
  const A = Math.max((alongWidth ? w : l) - 2 * cover, 0);

  return calcBarLength({
    code: shapeCode,
    A,
    BC: hook,
    H: h,
    cover,
    width: w,
    length: l,
  });
}

  const calcRebarCount = (
    orientation: Orientation,
    width: number,
    length: number,
    spacing: number
  ): number => {
    if (!orientation || spacing <= 0) return 0;
    // แนวด้านยาว → นับจากด้านสั้น (กว้าง)
    // แนวด้านกว้าง → นับจากด้านยาว
    const measure = orientation === "length" ? width : length;
    return measure / spacing + 1;
  };

  const applyRebarAuto = (row: RebarRow, base: FormState): RebarRow => {
    if (!row.auto_calc) return row;
    const w = parseFloat(base.width_m) || 0;
    const l = parseFloat(base.length_m) || 0;
    const h = parseFloat(base.height_m) || 0;
    const cover = parseFloat(row.covering_m) || 0;
    const hook = parseFloat(row.hook_total_m) || 0;
    const spacing = parseFloat(row.spacing_m) || 0;

    const lengthVal = calcRebarLength(
      row.position_code,
      row.bar_shape,
      row.orientation,
      w,
      l,
      h,
      cover,
      hook
    );
    const countVal = calcRebarCount(row.orientation, w, l, spacing);

    return {
      ...row,
      length_per_bar_m: lengthVal > 0 ? String(Number(lengthVal.toFixed(4))) : row.length_per_bar_m,
      bar_count: countVal > 0 ? String(Number(countVal.toFixed(4))) : row.bar_count,
    };
  };

  const updateRebarField = (
    code: PositionCode,
    field: keyof RebarRow,
    value: string | boolean
  ) => {
    setForm((prev) => {
      const nextRebar = prev.rebar.map((r) => {
        if (r.position_code !== code) return r;
        const updated = { ...r, [field]: value } as RebarRow;
        return applyRebarAuto(updated, prev);
      });
      return { ...prev, rebar: nextRebar };
    });
  };

  // เมื่อเปลี่ยนขนาดฐาน ให้คำนวณเหล็กใหม่ทุกแถวที่เปิด auto
  const updateFormDim = (field: keyof FormState, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      return {
        ...next,
        rebar: next.rebar.map((r) => applyRebarAuto(r, next)),
      };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">กำลังโหลด...</p>
      </div>
    );
  }

     const barFromKg = (row: ResultRow, qtyKg: number) => {
    const item = items.find((i) => i.id === row.item_id);
    if (!item) return null;

    const uw = item.unit_weight != null ? Number(item.unit_weight) : 0; // กก./ม.
    const stdLen =
      item.standard_length != null ? Number(item.standard_length) : 0; // ม./เส้น

    if (uw <= 0 || stdLen <= 0) return null;
    if (qtyKg <= 0) return null;

    // เส้น = กก. ÷ (กก./ม. × ม./เส้น)
    return qtyKg / (uw * stdLen);
  };

    const materialOptions = filterItems("material").map((i) => ({
    id: i.id,
    label: itemLabel(i),
  }));
  const laborOptions = filterItems("labor").map((i) => ({
    id: i.id,
    label: itemLabel(i),
  }));

  const visibleReport = reportRows.filter((r) => {
    const qty = reportWaste ? r.quantity_with_waste : r.quantity_raw;
    const amt = reportWaste ? r.amount_with_waste : r.amount_raw;
    return Math.abs(qty) > 0.00005 || Math.abs(amt) > 0.005;
  });

  const totalMaterial = visibleReport
    .filter((r) => r.item_type === "material")
    .reduce(
      (s, r) => s + (reportWaste ? r.amount_with_waste : r.amount_raw),
      0
    );

  const totalLabor = visibleReport
    .filter((r) => r.item_type === "labor")
    .reduce(
      (s, r) => s + (reportWaste ? r.amount_with_waste : r.amount_raw),
      0
    );
    
  const tabs: { key: TabKey; label: string }[] = [
    { key: "add", label: "Add Data" },
    { key: "check", label: "Check Data" },
    { key: "report", label: "Report" },
  ];

  return (
       <div className="min-h-screen bg-slate-50 flex">
      <AppSidebar projectId={projectId} projectName={project?.name ?? null} />
      <div className="flex-1 min-w-0">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/projects/${projectId}/structure`)}
            >
              ← โครงสร้าง
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">ฐานราก</h1>
              <p className="text-xs text-slate-400">{project?.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {tabs.map((t) => (
              <Button
                key={t.key}
                size="sm"
                variant={tab === t.key ? "default" : "outline"}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
 {tab === "add" && (
  <div className="grid gap-4 lg:grid-cols-[200px_minmax(260px,320px)_1fr]">
    {/* รายการชิ้นงาน */}
    <Card className="h-fit">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">ชิ้นงาน</CardTitle>
        <CardDescription>{elements.length} รายการ</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button size="sm" className="w-full" onClick={handleNew}>
          + เพิ่มฐานราก
        </Button>
        <div className="space-y-1 max-h-[420px] overflow-y-auto">
          {elements.map((el) => (
            <button
              key={el.id}
              type="button"
              onClick={() => loadElementDetail(el.id)}
              className={`w-full text-left text-sm px-3 py-2 rounded-md border ${
                selectedId === el.id
                  ? "bg-blue-50 border-blue-300"
                  : "bg-white hover:bg-slate-50"
              }`}
            >
              {el.name}
            </button>
          ))}
          {elements.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">
              ยังไม่มีชิ้นงาน
            </p>
          )}
        </div>
      </CardContent>
    </Card>

    {/* แบบสด */}
    <Card className="h-fit lg:sticky lg:top-20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">แบบฐานราก</CardTitle>
        <CardDescription>เปลี่ยนตามค่าที่กรอก</CardDescription>
      </CardHeader>
      <CardContent>
        <FootingPreview
          widthM={parseFloat(form.width_m) || 0}
          lengthM={parseFloat(form.length_m) || 0}
          heightM={parseFloat(form.height_m) || 0}
          rebar={form.rebar}
          highlight={hoverRebar}
          usePile={form.use_pile}
        />
      </CardContent>
    </Card>

    {/* ฟอร์มจริง */}
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedId ? "แก้ไขฐานราก" : "ฐานรากใหม่"}
          </CardTitle>
          <CardDescription>กลุ่ม 1 — ข้อมูลพื้นฐาน</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>ชื่อฐานราก *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="F1"
            />
          </div>
          <div className="space-y-1">
            <Label>ชนิดฐานราก</Label>
            <select
              className="w-full border rounded-md h-9 px-3 text-sm"
              value={form.footing_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  footing_type: e.target.value as FootingType,
                })
              }
            >
              {FOOTING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>จำนวน (ฐาน)</Label>
            <Input
              type="number"
              step="1"
              min="0"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>กว้าง (ม.)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.width_m}
              onChange={(e) => updateFormDim("width_m", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>ยาว (ม.)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.length_m}
              onChange={(e) => updateFormDim("length_m", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>สูง / หนา (ม.)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.height_m}
              onChange={(e) => updateFormDim("height_m", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">กลุ่ม 2 — วัสดุ</CardTitle>
          <CardDescription>Dropdown จาก Master · ติ๊กเฉพาะที่ใช้</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>คอนกรีตโครงสร้าง</Label>
            <MasterSelect
              items={materialOptions}
              value={form.concrete_item_id}
              onChange={(id) => setForm({ ...form, concrete_item_id: id })}
              placeholder="-- เลือกคอนกรีต --"
            />
          </div>
          <div className="space-y-1">
            <Label>ค่าแรงคอนกรีตโครงสร้าง</Label>
            <MasterSelect
              items={laborOptions}
              value={form.concrete_labor_item_id}
              onChange={(id) =>
                setForm({ ...form, concrete_labor_item_id: id })
              }
              placeholder="-- ไม่ระบุ --"
            />
          </div>

          <div className="border rounded-md p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.use_lean}
                onChange={(e) =>
                  setForm({ ...form, use_lean: e.target.checked })
                }
              />
              ใช้ Lean
            </label>
            {form.use_lean && (
              <div className="grid gap-2 sm:grid-cols-2">
                <MasterSelect
                  items={materialOptions}
                  value={form.lean_item_id}
                  onChange={(id) => setForm({ ...form, lean_item_id: id })}
                  placeholder="-- ชนิด Lean --"
                />
                <MasterSelect
                  items={laborOptions}
                  value={form.lean_labor_item_id}
                  onChange={(id) =>
                    setForm({ ...form, lean_labor_item_id: id })
                  }
                  placeholder="-- ค่าแรงเท Lean (ไม่บังคับ) --"
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="ความหนา (ม.)"
                  value={form.lean_thickness_m}
                  onChange={(e) =>
                    setForm({ ...form, lean_thickness_m: e.target.value })
                  }
                />
              </div>
            )}
          </div>

          <div className="border rounded-md p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.use_pile}
                onChange={(e) =>
                  setForm({ ...form, use_pile: e.target.checked })
                }
              />
              ใช้เสาเข็ม
            </label>
            {form.use_pile && (
              <div className="grid gap-2 sm:grid-cols-2">
                <MasterSelect
                  items={materialOptions}
                  value={form.pile_item_id}
                  onChange={(id) => setForm({ ...form, pile_item_id: id })}
                  placeholder="-- ชนิดเสาเข็ม --"
                />
                <MasterSelect
                  items={laborOptions}
                  value={form.pile_labor_item_id}
                  onChange={(id) =>
                    setForm({ ...form, pile_labor_item_id: id })
                  }
                  placeholder="-- ค่าแรงตัดหัวเสาเข็ม (ไม่บังคับ) --"
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="จำนวน/ฐาน"
                  value={form.pile_per_footing}
                  onChange={(e) =>
                    setForm({ ...form, pile_per_footing: e.target.value })
                  }
                />
              </div>
            )}
          </div>

          <div className="border rounded-md p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.use_sand}
                onChange={(e) =>
                  setForm({ ...form, use_sand: e.target.checked })
                }
              />
              ใช้ทรายรอง
            </label>
            {form.use_sand && (
              <div className="grid gap-2 sm:grid-cols-2">
                <MasterSelect
                  items={materialOptions}
                  value={form.sand_item_id}
                  onChange={(id) => setForm({ ...form, sand_item_id: id })}
                  placeholder="-- ชนิดทราย --"
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="ความหนา (ม.)"
                  value={form.sand_thickness_m}
                  onChange={(e) =>
                    setForm({ ...form, sand_thickness_m: e.target.value })
                  }
                />
              </div>
            )}
          </div>

          <div className="border rounded-md p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.use_formwork}
                onChange={(e) =>
                  setForm({ ...form, use_formwork: e.target.checked })
                }
              />
              ใช้ไม้แบบ
            </label>
            {form.use_formwork && (
              <div className="space-y-2">
                <MasterSelect
                  items={materialOptions}
                  value={form.formwork_item_id}
                  onChange={(id) =>
                    setForm({ ...form, formwork_item_id: id })
                  }
                  placeholder="-- วัสดุไม้แบบ --"
                />
                <MasterSelect
                  items={laborOptions}
                  value={form.formwork_labor_item_id}
                  onChange={(id) =>
                    setForm({ ...form, formwork_labor_item_id: id })
                  }
                  placeholder="-- ค่าแรงไม้แบบ (ไม่บังคับ) --"
                />
              </div>
            )}
          </div>

          <div className="border rounded-md p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.use_nail}
                onChange={(e) =>
                  setForm({ ...form, use_nail: e.target.checked })
                }
              />
              ใช้ตะปู (0.25 กก. ต่อ 1 ตร.ม. ไม้แบบ)
            </label>
            {form.use_nail && (
              <MasterSelect
                items={materialOptions}
                value={form.nail_item_id}
                onChange={(id) => setForm({ ...form, nail_item_id: id })}
                placeholder="-- ตะปู --"
              />
            )}
          </div>

          <div className="border rounded-md p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.use_wire}
                onChange={(e) =>
                  setForm({ ...form, use_wire: e.target.checked })
                }
              />
              ใช้ลวดผูกเหล็ก (0.03 กก. ต่อ 1 กก. เหล็ก)
            </label>
            {form.use_wire && (
              <MasterSelect
                items={materialOptions}
                value={form.wire_item_id}
                onChange={(id) => setForm({ ...form, wire_item_id: id })}
                placeholder="-- ลวดผูกเหล็ก --"
              />
            )}
          </div>

          <div className="border rounded-md p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.use_prop}
                onChange={(e) =>
                  setForm({ ...form, use_prop: e.target.checked })
                }
              />
              ใช้ไม้ค้ำยัน
            </label>
            {form.use_prop && (
              <div className="grid gap-2 sm:grid-cols-2">
                <MasterSelect
                  items={materialOptions}
                  value={form.prop_item_id}
                  onChange={(id) => setForm({ ...form, prop_item_id: id })}
                  placeholder="-- ไม้ค้ำยัน --"
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="จำนวนต่อ 1 ฐาน"
                  value={form.prop_per_footing}
                  onChange={(e) =>
                    setForm({ ...form, prop_per_footing: e.target.value })
                  }
                />
              </div>
            )}
          </div>

          <div className="border rounded-md p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.use_kera}
                onChange={(e) =>
                  setForm({ ...form, use_kera: e.target.checked })
                }
              />
              ใช้ไม้เคร่า
            </label>
            {form.use_kera && (
              <div className="grid gap-2 sm:grid-cols-2">
                <MasterSelect
                  items={materialOptions}
                  value={form.kera_item_id}
                  onChange={(id) => setForm({ ...form, kera_item_id: id })}
                  placeholder="-- ไม้เคร่า --"
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="จำนวนต่อ 1 ฐาน"
                  value={form.kera_per_footing}
                  onChange={(e) =>
                    setForm({ ...form, kera_per_footing: e.target.value })
                  }
                />
              </div>
            )}
          </div>

          <div className="border rounded-md p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.use_excavate}
                onChange={(e) =>
                  setForm({ ...form, use_excavate: e.target.checked })
                }
              />
              ใช้งานขุดดิน (ค่าแรง)
            </label>
            {form.use_excavate && (
              <div className="space-y-2">
                <MasterSelect
                  items={laborOptions}
                  value={form.excavate_item_id}
                  onChange={(id) =>
                    setForm({ ...form, excavate_item_id: id })
                  }
                  placeholder="-- รายการค่าแรงขุดดิน --"
                />
                <p className="text-xs text-slate-500">
                  ขนาดหลุมขุด (แยกจากขนาดฐาน)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="กว้าง ม."
                    value={form.excavate_width_m}
                    onChange={(e) =>
                      setForm({ ...form, excavate_width_m: e.target.value })
                    }
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="ยาว ม."
                    value={form.excavate_length_m}
                    onChange={(e) =>
                      setForm({ ...form, excavate_length_m: e.target.value })
                    }
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="ลึก ม."
                    value={form.excavate_height_m}
                    onChange={(e) =>
                      setForm({ ...form, excavate_height_m: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border rounded-md p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.use_backfill}
                onChange={(e) =>
                  setForm({ ...form, use_backfill: e.target.checked })
                }
              />
              ใช้งานถมดินกลับ (ค่าแรง)
            </label>
            {form.use_backfill && (
              <>
                <MasterSelect
                  items={laborOptions}
                  value={form.backfill_item_id}
                  onChange={(id) =>
                    setForm({ ...form, backfill_item_id: id })
                  }
                  placeholder="-- รายการค่าแรงถมดินกลับ --"
                />
                <p className="text-xs text-slate-400">
                  ปริมาตร = ดินขุด − (คอนกรีตฐาน + Lean + ทราย) คิดตอน Check
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">กลุ่ม 3 — เหล็กเสริม</CardTitle>
          <CardDescription>
            A บน · B ล่าง · C รัด · D ตะแกรง — ค่าแรงเลือกครั้งเดียวด้านบน
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 border rounded-md p-3 bg-slate-50">
            <Label>ค่าแรงงานเหล็ก (A–D รวม) — เลือกครั้งเดียว</Label>
            <MasterSelect
              items={laborOptions}
              value={form.rebar_labor_item_id}
              onChange={(id) =>
                setForm({ ...form, rebar_labor_item_id: id })
              }
              placeholder="-- ไม่ระบุ --"
            />
            <p className="text-xs text-slate-400">
              คิดจากน้ำหนักเหล็กรวม (กก.) ตอน Refresh
            </p>
          </div>

          {form.rebar.map((row) => {
            const isTie = row.position_code === "C";

            return (
              <div
                key={row.position_code}
                className="border rounded-md p-3 space-y-2"
                onMouseEnter={() => setHoverRebar(row.position_code)}
                onMouseLeave={() => setHoverRebar(null)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{row.label}</p>
                  {!isTie && (
                    <label className="flex items-center gap-1 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={row.auto_calc}
                        onChange={(e) =>
                          updateRebarField(
                            row.position_code,
                            "auto_calc",
                            e.target.checked
                          )
                        }
                      />
                      คำนวณอัตโนมัติ
                    </label>
                  )}
                </div>

                {isTie && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={
                        !!row.item_id || parseFloat(row.length_per_bar_m) > 0
                      }
                      onChange={(e) => {
                        if (!e.target.checked) {
                          updateRebarField(row.position_code, "item_id", "");
                          updateRebarField(
                            row.position_code,
                            "length_per_bar_m",
                            ""
                          );
                          updateRebarField(row.position_code, "bar_count", "");
                          updateRebarField(
                            row.position_code,
                            "auto_calc",
                            false
                          );
                        } else {
                          updateRebarField(
                            row.position_code,
                            "auto_calc",
                            true
                          );
                          updateRebarField(
                            row.position_code,
                            "covering_m",
                            row.covering_m || "0.05"
                          );
                        }
                      }}
                    />
                    ใช้เหล็กรัดรอบ
                  </label>
                )}

                {(!isTie || row.auto_calc || row.item_id) && (
                  <>
                    <MasterSelect
                      items={materialOptions}
                      value={row.item_id}
                      onChange={(id) =>
                        updateRebarField(row.position_code, "item_id", id)
                      }
                      placeholder="-- ชนิดเหล็ก --"
                    />

                    {!isTie && (
                      <div className="grid grid-cols-2 gap-2">
                        <select
  className="w-full border rounded-md h-9 px-3 text-sm relative z-10"
  value={
    isBarShapeCode(String(row.bar_shape))
      ? row.bar_shape
      : legacyShapeToCode(row.bar_shape)
  }
  onChange={(e) =>
    updateRebarField(row.position_code, "bar_shape", e.target.value)
  }
>
  {FOOTING_BAR_SHAPES.map((s) => (
    <option key={s.code} value={s.code}>
      {s.code} — {s.nameTh}
    </option>
  ))}
</select>
                        <select
                          className="w-full border rounded-md h-9 px-3 text-sm"
                          value={row.orientation}
                          onChange={(e) =>
                            updateRebarField(
                              row.position_code,
                              "orientation",
                              e.target.value
                            )
                          }
                        >
                          <option value="">-- แนวจัดวาง --</option>
                          <option value="width">ด้านกว้าง</option>
                          <option value="length">ด้านยาว</option>
                        </select>
                      </div>
                    )}

                    <div
                      className={`grid gap-2 ${
                        isTie ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
                      }`}
                    >
                      {!isTie && (
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="ระยะ @ ม."
                          value={row.spacing_m}
                          onChange={(e) =>
                            updateRebarField(
                              row.position_code,
                              "spacing_m",
                              e.target.value
                            )
                          }
                        />
                      )}
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="Cover ม."
                        value={row.covering_m}
                        onChange={(e) =>
                          updateRebarField(
                            row.position_code,
                            "covering_m",
                            e.target.value
                          )
                        }
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="งอหัวรวม 2 ด้าน ม."
                        value={row.hook_total_m}
                        onChange={(e) =>
                          updateRebarField(
                            row.position_code,
                            "hook_total_m",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-slate-500">
                          จำนวนเส้น
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={row.bar_count}
                          onChange={(e) => {
                            updateRebarField(
                              row.position_code,
                              "auto_calc",
                              false
                            );
                            updateRebarField(
                              row.position_code,
                              "bar_count",
                              e.target.value
                            );
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500">
                          ยาว/ท่อน (ม.)
                        </Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={row.length_per_bar_m}
                          onChange={(e) => {
                            updateRebarField(
                              row.position_code,
                              "auto_calc",
                              false
                            );
                            updateRebarField(
                              row.position_code,
                              "length_per_bar_m",
                              e.target.value
                            );
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          <div className="space-y-1">
            <Label>หมายเหตุ</Label>
            <Input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="ถ้ามี"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
        {selectedId && (
          <Button
            variant="outline"
            className="text-red-600"
            onClick={handleDelete}
          >
            ลบชิ้นงาน
          </Button>
        )}
        <Button variant="outline" onClick={handleNew}>
          ล้างฟอร์ม / ใหม่
        </Button>
      </div>
    </div>
  </div>
)}

                {tab === "check" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Check Data</CardTitle>
                <CardDescription>
                  เลือกชิ้นงานแล้วกด Refresh เพื่อคำนวณจากข้อมูลที่บันทึกใน Add
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1 space-y-1">
                  <Label>ชิ้นงาน</Label>
                  <select
                    className="w-full border rounded-md h-9 px-3 text-sm"
                    value={checkElementId}
                    onChange={async (e) => {
                      const id = e.target.value;
                      setCheckElementId(id);
                      await loadResults(id);
                    }}
                  >
                    <option value="">-- เลือก --</option>
                    {elements.map((el) => (
                      <option key={el.id} value={el.id}>
                        {el.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing || !checkElementId}
                >
                  {refreshing ? "กำลังคำนวณ..." : "Refresh"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">ผลคำนวณ</CardTitle>
                <CardDescription>
                  ปริมาณดิบ / เผื่อเสียหาย · ราคา snapshot ตอน Refresh
                </CardDescription>
              </CardHeader>
              <CardContent>
                {results.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    ยังไม่มีผล — กด Refresh หลังบันทึก Add Data
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm min-w-[720px]">
                      <thead>
                        <tr className="border-b text-left text-slate-500">
                          <th className="py-2 pr-2">รายการ</th>
                          <th className="py-2 pr-2">ที่มา</th>
                          <th className="py-2 pr-2 text-right">ปริมาณ</th>
                          <th className="py-2 pr-2">หน่วย</th>
                          <th className="py-2 pr-2 text-right">ราคาวัสดุ</th>
                          <th className="py-2 pr-2 text-right">ราคาค่าแรง</th>
                          <th className="py-2 pr-2 text-right">เงินวัสดุ</th>
                          <th className="py-2 text-right">เงินค่าแรง</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => {
                          const isMat = r.item_type === "material";
                          const priceMat = isMat ? r.unit_price : 0;
                          const priceLab = isMat ? 0 : r.unit_price;
                          const amtMat = isMat ? r.amount_raw : 0;
                          const amtLab = isMat ? 0 : r.amount_raw;
                          return (
                            <tr key={i} className="border-b border-slate-100">
                              <td className="py-2 pr-2">{r.item_name}</td>
                              <td className="py-2 pr-2 text-xs text-slate-400">
                                {r.source}
                              </td>
                              <td className="py-2 pr-2 text-right">
                                {r.quantity_raw.toLocaleString()}
                              </td>
                              <td className="py-2 pr-2">{r.unit}</td>
                              <td className="py-2 pr-2 text-right">
                                {priceMat.toLocaleString()}
                              </td>
                              <td className="py-2 pr-2 text-right">
                                {priceLab.toLocaleString()}
                              </td>
                              <td className="py-2 pr-2 text-right">
                                {amtMat.toLocaleString()}
                              </td>
                              <td className="py-2 text-right">
                                {amtLab.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="font-medium border-t">
                          <td colSpan={6} className="py-2 text-right">
                            รวมวัสดุ (ดิบ)
                          </td>
                          <td className="py-2 pr-2 text-right">
                            {results
                              .filter((r) => r.item_type === "material")
                              .reduce((s, r) => s + (r.amount_raw || 0), 0)
                              .toLocaleString()}
                          </td>
                          <td className="py-2 text-right">0</td>
                        </tr>
                        <tr className="font-medium">
                          <td colSpan={6} className="py-2 text-right">
                            รวมค่าแรง (ดิบ)
                          </td>
                          <td className="py-2 pr-2 text-right">0</td>
                          <td className="py-2 text-right">
                            {results
                              .filter((r) => r.item_type === "labor")
                              .reduce((s, r) => s + (r.amount_raw || 0), 0)
                              .toLocaleString()}
                          </td>
                        </tr>
                        <tr className="font-semibold">
                          <td colSpan={6} className="py-2 text-right">
                            รวมทั้งหมด (ดิบ)
                          </td>
                          <td colSpan={2} className="py-2 text-right">
                            {results
                              .reduce((s, r) => s + (r.amount_raw || 0), 0)
                              .toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

                {tab === "report" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Report — ฐานราก</CardTitle>
                <CardDescription>
                  รวมทุกชิ้นงาน · ซ่อนค่า 0 · สลับเผื่อ / หน่วยที่นี่ที่เดียว
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 items-center">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={reportWaste ? "outline" : "default"}
                    onClick={() => setReportWaste(false)}
                  >
                    ไม่เผื่อ
                  </Button>
                  <Button
                    size="sm"
                    variant={reportWaste ? "default" : "outline"}
                    onClick={() => setReportWaste(true)}
                  >
                    เผื่อเสียหาย
                  </Button>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={reportAsBar}
                    onChange={(e) => setReportAsBar(e.target.checked)}
                  />
                  แสดงเทียบเป็นเส้น (ถ้ามีข้อมูล Master)
                </label>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadReport}
                  disabled={loadingReport}
                >
                  {loadingReport ? "กำลังโหลด..." : "รีโหลด"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                {loadingReport ? (
                  <p className="text-sm text-slate-400 text-center py-8">กำลังโหลด...</p>
                ) : visibleReport.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    ยังไม่มีข้อมูล — ไป Check แล้ว Refresh ทีละชิ้นงานก่อน
                  </p>
                ) : (
                                    <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[800px]">
                      <thead>
                        <tr className="border-b text-left text-slate-500">
                          <th className="py-2 pr-2">รายการ</th>
                          <th className="py-2 pr-2">ประเภท</th>
                          <th className="py-2 pr-2 text-right">จำนวน</th>
                          <th className="py-2 pr-2">หน่วย</th>
                          {reportAsBar && (
                            <th className="py-2 pr-2 text-right">เทียบเส้น</th>
                          )}
                          <th className="py-2 pr-2 text-right">ราคาวัสดุ</th>
                          <th className="py-2 pr-2 text-right">ราคาค่าแรง</th>
                          <th className="py-2 pr-2 text-right">เงินวัสดุ</th>
                          <th className="py-2 text-right">เงินค่าแรง</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleReport.map((r, i) => {
                          const qty = reportWaste
                            ? r.quantity_with_waste
                            : r.quantity_raw;
                          const amt = reportWaste
                            ? r.amount_with_waste
                            : r.amount_raw;
                          const isMat = r.item_type === "material";
                          const priceMat = isMat ? r.unit_price : 0;
                          const priceLab = isMat ? 0 : r.unit_price;
                          const amtMat = isMat ? amt : 0;
                          const amtLab = isMat ? 0 : amt;
                          const bars = reportAsBar ? barFromKg(r, qty) : null;

                          return (
                            <tr key={i} className="border-b border-slate-100">
                              <td className="py-2 pr-2">
                                <div>{r.item_name}</div>
                                {r.item_code && (
                                  <div className="text-xs text-slate-400">
                                    {r.item_code}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 pr-2 text-xs">
                                {isMat ? "วัสดุ" : "ค่าแรง"}
                              </td>
                              <td className="py-2 pr-2 text-right">
                                {qty.toLocaleString()}
                              </td>
                              <td className="py-2 pr-2">{r.unit}</td>
                              {reportAsBar && (
                                <td className="py-2 pr-2 text-right text-slate-500">
                                  {bars != null
                                    ? `${bars.toFixed(2)} เส้น`
                                    : "—"}
                                </td>
                              )}
                              <td className="py-2 pr-2 text-right">
                                {priceMat.toLocaleString()}
                              </td>
                              <td className="py-2 pr-2 text-right">
                                {priceLab.toLocaleString()}
                              </td>
                              <td className="py-2 pr-2 text-right">
                                {amtMat.toLocaleString()}
                              </td>
                              <td className="py-2 text-right">
                                {amtLab.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t font-medium">
                          <td
                            colSpan={reportAsBar ? 7 : 6}
                            className="py-2 text-right"
                          >
                            รวมวัสดุ
                          </td>
                          <td className="py-2 pr-2 text-right">
                            {totalMaterial.toLocaleString()}
                          </td>
                          <td className="py-2 text-right">0</td>
                        </tr>
                        <tr className="font-medium">
                          <td
                            colSpan={reportAsBar ? 7 : 6}
                            className="py-2 text-right"
                          >
                            รวมค่าแรง
                          </td>
                          <td className="py-2 pr-2 text-right">0</td>
                          <td className="py-2 text-right">
                            {totalLabor.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="font-semibold">
                          <td
                            colSpan={reportAsBar ? 7 : 6}
                            className="py-2 text-right"
                          >
                            รวมทั้งหมด
                          </td>
                          <td colSpan={2} className="py-2 text-right">
                            {(totalMaterial + totalLabor).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
    </div>
  );
}