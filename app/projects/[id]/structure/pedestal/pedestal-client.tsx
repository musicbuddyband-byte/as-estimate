"use client";

import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppSidebar from "@/components/AppSidebar";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type MasterItem = {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
  unit: string;
  item_type: string;
  unit_price?: number | null;
  unit_weight?: number | null;
  default_waste?: number | null;
  standard_length?: number | null;
};

type ElementRow = { id: string; name: string; sort_order: number };

type ResultRow = {
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

type FormState = {
  name: string;
  width_m: string;
  length_m: string;
  height_m: string;
  quantity: string;
  concrete_item_id: string;
  concrete_labor_item_id: string;
  use_formwork: boolean;
  formwork_item_id: string;
  formwork_labor_item_id: string;
  use_nail: boolean;
  nail_item_id: string;
  use_wire: boolean;
  wire_item_id: string;
  main_item_id: string;
  main_bar_count: string;
  main_length_m: string;
  main_auto: boolean;
  main_cover_m: string;
  main_hook_m: string;
  tie_item_id: string;
  tie_spacing_m: string;
  tie_bar_count: string;
  tie_length_m: string;
  tie_auto: boolean;
  tie_cover_m: string;
  tie_hook_m: string;
  rebar_labor_item_id: string;
  note: string;
shape: "rect" | "round";
  diameter_m: string;
  main_bend_m: string;
  main_lap_m: string;
  main_embed_m: string;
  tie_layers: string;
  
};

const emptyForm = (): FormState => ({
  name: "",
  width_m: "",
  length_m: "",
  height_m: "",
  quantity: "1",
  concrete_item_id: "",
  concrete_labor_item_id: "",
  use_formwork: true,
  formwork_item_id: "",
  formwork_labor_item_id: "",
  use_nail: false,
  nail_item_id: "",
  use_wire: false,
  wire_item_id: "",
  main_item_id: "",
  main_bar_count: "4",
  main_length_m: "",
  main_auto: true,
  main_cover_m: "0.04",
  main_hook_m: "0",
  tie_item_id: "",
  tie_spacing_m: "0.15",
  tie_bar_count: "",
  tie_length_m: "",
  tie_auto: true,
  tie_cover_m: "0.04",
  tie_hook_m: "0.14",
  rebar_labor_item_id: "",
  note: "",
    shape: "rect",
  diameter_m: "",
  main_bend_m: "0",
  main_lap_m: "0",
  main_embed_m: "0",
  tie_layers: "1"
});

function compute(form: FormState): FormState {
  const w = parseFloat(form.width_m) || 0;
  const l = parseFloat(form.length_m) || 0;
  const h = parseFloat(form.height_m) || 0;
  const next = { ...form };

    if (next.main_auto) {
    const h = parseFloat(next.height_m) || 0;
    const bend = parseFloat(next.main_bend_m) || 0;
    const lap = parseFloat(next.main_lap_m) || 0;
    const embed = parseFloat(next.main_embed_m) || 0;
    const len = h + bend + lap + embed;
    if (len > 0) next.main_length_m = String(Number(len.toFixed(4)));
  }

 if (next.tie_auto) {
  const cover = parseFloat(next.tie_cover_m) || 0;
  const hook = parseFloat(next.tie_hook_m) || 0;
  const spacing = parseFloat(next.tie_spacing_m) || 0;
  const count = spacing > 0 ? Math.floor(h / spacing) + 1 : 0;
  let len = 0;
  if (next.shape === "round") {
    const radius = parseFloat(next.diameter_m) || 0;
    len = 2 * Math.PI * Math.max(radius - cover, 0) + hook;
  } else {
    const innerW = Math.max(w - cover * 2, 0);
    const innerL = Math.max(l - cover * 2, 0);
    len = (innerW + innerL) * 2 + hook;
  }
  if (count > 0) next.tie_bar_count = String(count);
  if (len > 0) next.tie_length_m = String(Number(len.toFixed(4)));
}

  return next;
}

function MasterSelect({
  items,
  value,
  onChange,
  placeholder = "-- เลือก --",
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const [box, setBox] = useState({ top: 0, left: 0, width: 0, maxH: 240 });

  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const spaceAbove = r.top - 8;
    const maxH = Math.max(160, Math.min(280, Math.max(spaceBelow, spaceAbove)));
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;
    setBox({
      top: openUp ? Math.max(8, r.top - maxH - 4) : r.bottom + 4,
      left: r.left,
      width: r.width,
      maxH,
    });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if ((t as HTMLElement).closest?.("[data-master-menu]")) return;
      setOpen(false);
    };
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    window.addEventListener("mousedown", close);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("mousedown", close);
    };
  }, [open]);

  const selected = items.find((i) => i.id === value);
  const filtered = items.filter((i) =>
    !q.trim() ? true : i.label.toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <div>
      <button
        ref={btnRef}
        type="button"
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-white px-3 text-left text-sm"
        onClick={() => {
          setOpen((o) => !o);
          setQ("");
        }}
      >
        <span className={selected ? "truncate text-slate-800" : "truncate text-slate-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="text-xs text-slate-400">{open ? "▲" : "▼"}</span>
      </button>
      {open &&
        createPortal(
          <div
            data-master-menu
            className="fixed z-[80] rounded-md border bg-white shadow-lg"
            style={{ top: box.top, left: box.left, width: box.width }}
          >
            <div className="border-b p-2">
              <input
                autoFocus
                className="h-8 w-full rounded-md border px-2 text-sm"
                placeholder="พิมพ์ค้นหา..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: box.maxH }}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                {placeholder}
              </button>
              {filtered.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                  onClick={() => {
                    onChange(i.id);
                    setOpen(false);
                  }}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default function PedestalClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"add" | "check" | "report">("add");
  const [items, setItems] = useState<MasterItem[]>([]);
  const [elements, setElements] = useState<ElementRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [checkElementId, setCheckElementId] = useState("");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [reportRows, setReportRows] = useState<ResultRow[]>([]);
  const [reportWaste, setReportWaste] = useState(false);
  const [reportAsBar, setReportAsBar] = useState(false);
const [loadingReport, setLoadingReport] = useState(false);

  const loadElements = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("project_structure_elements")
      .select("id, name, sort_order")
      .eq("project_id", projectId)
      .eq("category", "pedestal")
      .order("sort_order");
    setElements(data || []);
  };

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: project } = await supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .single();
      setProjectName(project?.name || "");
      const { data: master } = await supabase
        .from("master_items")
        .select("id, code, name, short_name, unit, item_type, unit_price, unit_weight, default_waste, standard_length")
        .eq("is_active", true)
        .order("name");
      setItems(master || []);
      await loadElements();
      setLoading(false);
    };
    init();
  }, [projectId]);

  const materialOptions = items
    .filter((i) => i.item_type === "material")
    .map((i) => ({ id: i.id, label: `${i.short_name ? i.short_name + " — " : ""}${i.name} (${i.code})` }));
  const laborOptions = items
    .filter((i) => i.item_type === "labor")
    .map((i) => ({ id: i.id, label: `${i.short_name ? i.short_name + " — " : ""}${i.name} (${i.code})` }));

  const getItem = (id: string | null | undefined) => items.find((i) => i.id === id) || null;

  const pushResult = (list: ResultRow[], item: MasterItem | null, qty: number, source: string, sort: number) => {
    if (qty <= 0) return;
    const wastePct = item?.default_waste != null ? Number(item.default_waste) : 0;
    const factor = wastePct > 1.5 ? 1 + wastePct / 100 : wastePct > 0 ? wastePct : 1;
    const qtyWaste = qty * factor;
    const price = item?.unit_price != null ? Number(item.unit_price) : 0;
    list.push({
      item_id: item?.id || null,
      item_code: item?.code || null,
      item_name: item?.name || source,
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

  const loadOne = async (elementId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("project_pedestal_inputs")
      .select("*")
      .eq("element_id", elementId)
      .maybeSingle();
    const el = elements.find((e) => e.id === elementId);
    const next = emptyForm();
    next.name = el?.name || "";
    if (data) {
      next.width_m = String(data.width_m ?? "");
      next.length_m = String(data.length_m ?? "");
      next.height_m = String(data.height_m ?? "");
      next.quantity = String(data.quantity ?? 1);
      next.concrete_item_id = data.concrete_item_id || "";
      next.concrete_labor_item_id = data.concrete_labor_item_id || "";
      next.use_formwork = data.use_formwork !== false;
      next.formwork_item_id = data.formwork_item_id || "";
      next.formwork_labor_item_id = data.formwork_labor_item_id || "";
      next.use_nail = !!data.use_nail;
      next.nail_item_id = data.nail_item_id || "";
      next.use_wire = !!data.use_wire;
      next.wire_item_id = data.wire_item_id || "";
      next.main_item_id = data.main_item_id || "";
      next.main_bar_count = String(data.main_bar_count ?? "");
      next.main_length_m = String(data.main_length_m ?? "");
      next.main_auto = !!data.main_auto;
      next.main_cover_m = String(data.main_cover_m ?? "0.04");
      next.main_hook_m = String(data.main_hook_m ?? "0");
      next.tie_item_id = data.tie_item_id || "";
      next.tie_spacing_m = String(data.tie_spacing_m ?? "0.15");
      next.tie_bar_count = String(data.tie_bar_count ?? "");
      next.tie_length_m = String(data.tie_length_m ?? "");
      next.tie_auto = !!data.tie_auto;
      next.tie_cover_m = String(data.tie_cover_m ?? "0.04");
      next.tie_hook_m = String(data.tie_hook_m ?? "0.14");
      next.rebar_labor_item_id = data.rebar_labor_item_id || "";
      next.note = data.note || "";
      next.shape = data.shape === "round" ? "round" : "rect";
next.diameter_m = String(data.diameter_m ?? "");
next.main_bend_m = String(data.main_bend_m ?? "0");
next.main_lap_m = String(data.main_lap_m ?? "0");
next.main_embed_m = String(data.main_embed_m ?? "0");
next.tie_layers = String(data.tie_layers ?? 1);
    }
    setForm(next);
    setSelectedId(elementId);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("กรุณาใส่ชื่อเสาตอม่อ");
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
          category: "pedestal",
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
      await supabase
        .from("project_structure_elements")
        .update({ name: form.name.trim(), updated_at: new Date().toISOString() })
        .eq("id", elementId);
    }

    const payload = {
      element_id: elementId,
      project_id: projectId,
      width_m: parseFloat(form.width_m) || 0,
      length_m: parseFloat(form.length_m) || 0,
      height_m: parseFloat(form.height_m) || 0,
      quantity: parseFloat(form.quantity) || 1,
      concrete_item_id: form.concrete_item_id || null,
      concrete_labor_item_id: form.concrete_labor_item_id || null,
      use_formwork: form.use_formwork,
      formwork_item_id: form.use_formwork && form.formwork_item_id ? form.formwork_item_id : null,
      formwork_labor_item_id: form.use_formwork && form.formwork_labor_item_id ? form.formwork_labor_item_id : null,
      use_nail: form.use_nail,
      nail_item_id: form.use_nail && form.nail_item_id ? form.nail_item_id : null,
      use_wire: form.use_wire,
      wire_item_id: form.use_wire && form.wire_item_id ? form.wire_item_id : null,
      main_item_id: form.main_item_id || null,
      main_bar_count: parseFloat(form.main_bar_count) || 0,
      main_length_m: parseFloat(form.main_length_m) || 0,
      main_auto: form.main_auto,
      main_cover_m: parseFloat(form.main_cover_m) || 0,
      main_hook_m: parseFloat(form.main_hook_m) || 0,
      tie_item_id: form.tie_item_id || null,
      tie_spacing_m: parseFloat(form.tie_spacing_m) || 0,
      tie_bar_count: parseFloat(form.tie_bar_count) || 0,
      tie_length_m: parseFloat(form.tie_length_m) || 0,
      tie_auto: form.tie_auto,
      tie_cover_m: parseFloat(form.tie_cover_m) || 0,
      tie_hook_m: parseFloat(form.tie_hook_m) || 0,
      rebar_labor_item_id: form.rebar_labor_item_id || null,
      note: form.note.trim() || null,
      updated_at: new Date().toISOString(),
      shape: form.shape,
diameter_m: parseFloat(form.diameter_m) || 0,
main_bend_m: parseFloat(form.main_bend_m) || 0,
main_lap_m: parseFloat(form.main_lap_m) || 0,
main_embed_m: parseFloat(form.main_embed_m) || 0,
tie_layers: parseFloat(form.tie_layers) || 1,
    };

    const { error } = await supabase
      .from("project_pedestal_inputs")
      .upsert(payload, { onConflict: "element_id" });
    setSaving(false);
    if (error) {
      alert("บันทึกไม่สำเร็จ: " + error.message);
      return;
    }
    await loadElements();
    setSelectedId(elementId);
    alert("บันทึกสำเร็จ");
  };

  const handleDelete = async () => {
    if (!selectedId || !confirm("ลบเสาตอม่อนี้?")) return;
    const supabase = createClient();
    await supabase.from("project_boq_entries").delete().eq("element_id", selectedId);
    const { error } = await supabase.from("project_structure_elements").delete().eq("id", selectedId);
    if (error) {
      alert("ลบไม่สำเร็จ: " + error.message);
      return;
    }
    setSelectedId(null);
    setForm(emptyForm());
    await loadElements();
  };

  const loadResults = async (elementId: string) => {
    if (!elementId) {
      setResults([]);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("project_pedestal_results")
      .select("*")
      .eq("element_id", elementId)
      .order("sort_order");
    setResults((data as ResultRow[]) || []);
  };

  const addSteel = (
    list: ResultRow[],
    itemId: string,
    count: number,
    length: number,
    n: number,
    source: string,
    sort: number
  ) => {
    const totalM = count * length * n;
    if (totalM <= 0) return { sort, kg: 0 };
    const item = getItem(itemId);
    let qty = totalM;
    let kg = 0;
    if (item?.unit_weight != null && Number(item.unit_weight) > 0) {
      qty = totalM * Number(item.unit_weight);
      kg = qty;
    }
    const wastePct = item?.default_waste != null ? Number(item.default_waste) : 0;
    const factor = wastePct > 1.5 ? 1 + wastePct / 100 : wastePct > 0 ? wastePct : 1;
    const price = item?.unit_price != null ? Number(item.unit_price) : 0;
    list.push({
      item_id: item?.id || null,
      item_code: item?.code || null,
      item_name: item?.name || source,
      item_type: item?.item_type || "material",
      unit: kg > 0 ? "กก." : item?.unit || "ม.",
      quantity_raw: Number(qty.toFixed(4)),
      quantity_with_waste: Number((qty * factor).toFixed(4)),
      unit_price: price,
      amount_raw: Number((qty * price).toFixed(2)),
      amount_with_waste: Number((qty * factor * price).toFixed(2)),
      source,
      sort_order: sort,
    });
    return { sort: sort + 1, kg };
  };

  const handleRefresh = async () => {
    if (!checkElementId) return;
    setRefreshing(true);
    const supabase = createClient();
    const { data: input } = await supabase
      .from("project_pedestal_inputs")
      .select("*")
      .eq("element_id", checkElementId)
      .maybeSingle();
    if (!input) {
      alert("ยังไม่มีข้อมูล Add — บันทึกก่อน");
      setRefreshing(false);
      return;
    }

   const w = Number(input.width_m) || 0;
const l = Number(input.length_m) || 0;
const h = Number(input.height_m) || 0;
const n = Number(input.quantity) || 1;
const r = Number(input.diameter_m) || 0;
const round = input.shape === "round";
    const list: ResultRow[] = [];
    let sort = 0;

   const conc = round ? Math.PI * r * r * h * n : w * l * h * n;
pushResult(list, getItem(input.concrete_item_id), conc, "concrete", sort++);
pushResult(list, getItem(input.concrete_labor_item_id), conc, "concrete_labor", sort++);

let formArea = 0;
if (input.use_formwork) {
  formArea = round ? 2 * Math.PI * r * h * n : (w + l) * 2 * h * n;
  pushResult(list, getItem(input.formwork_item_id), formArea, "formwork", sort++);
  pushResult(list, getItem(input.formwork_labor_item_id), formArea, "formwork_labor", sort++);
}
if (input.use_nail) {
  pushResult(list, getItem(input.nail_item_id), formArea * 0.25, "nail", sort++);
}

    const main = addSteel(list, input.main_item_id, Number(input.main_bar_count) || 0, Number(input.main_length_m) || 0, n, "main_bar", sort);
    sort = main.sort;
    const layers = Number(input.tie_layers) || 1;
const tie = addSteel(
  list,
  input.tie_item_id,
  (Number(input.tie_bar_count) || 0) * layers,
  Number(input.tie_length_m) || 0,
  n,
  "tie_bar",
  sort
);
    const steelKg = main.kg + tie.kg;

    if (input.use_wire && steelKg > 0) {
      pushResult(list, getItem(input.wire_item_id), steelKg * 0.03, "wire", sort++);
    }
    if (input.rebar_labor_item_id && steelKg > 0) {
      pushResult(list, getItem(input.rebar_labor_item_id), steelKg, "rebar_labor", sort++);
    }

    await supabase.from("project_pedestal_results").delete().eq("element_id", checkElementId);
    if (list.length > 0) {
      const { error } = await supabase.from("project_pedestal_results").insert(
        list.map((r) => ({
          ...r,
          element_id: checkElementId,
          project_id: projectId,
          calculated_at: new Date().toISOString(),
        }))
      );
      if (error) {
        alert("บันทึกผลไม่สำเร็จ: " + error.message);
        setRefreshing(false);
        return;
      }
    }

    await supabase.from("project_boq_entries").delete().eq("element_id", checkElementId);
    if (list.length > 0) {
      const { error: boqError } = await supabase.from("project_boq_entries").insert(
        list.map((r) => ({
          element_id: checkElementId,
          project_id: projectId,
          source: "pedestal",
          major: "structure",
          level_name: "ชั้นฐานราก",
          group_name: "เสาตอม่อ",
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
        }))
      );
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
    const { data: els } = await supabase
      .from("project_structure_elements")
      .select("id")
      .eq("project_id", projectId)
      .eq("category", "pedestal");
    const ids = (els || []).map((e) => e.id);
    if (ids.length === 0) {
      setReportRows([]);
     
      return;
    }
    const { data } = await supabase
      .from("project_pedestal_results")
      .select("*")
      .in("element_id", ids);
    const map = new Map<string, ResultRow>();
    for (const r of data || []) {
      const key = r.item_id || `${r.item_name}|${r.unit}|${r.item_type}`;
      const found = map.get(key);
      if (!found) {
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
          source: "",
          sort_order: 0,
        });
      } else {
        found.quantity_raw += Number(r.quantity_raw) || 0;
        found.quantity_with_waste += Number(r.quantity_with_waste) || 0;
        found.amount_raw += Number(r.amount_raw) || 0;
        found.amount_with_waste += Number(r.amount_with_waste) || 0;
      }
    }
    setReportRows(Array.from(map.values()));
    setLoadingReport(false);
  };

  useEffect(() => {
    if (tab === "report") loadReport();
  }, [tab]);

  const barFromKg = (row: ResultRow, qtyKg: number) => {
  const unit = String(row.unit || "");
  if (!unit.includes("กก")) return null;
  const item = items.find((i) => i.id === row.item_id);
  const w = item?.unit_weight != null ? Number(item.unit_weight) : 0;
  const len = item?.standard_length != null ? Number(item.standard_length) : 0;
  if (w <= 0 || len <= 0) return null;
  return qtyKg / (w * len);
};

const visibleReport = reportRows.filter((r) => {
  const qty = reportWaste ? r.quantity_with_waste : r.quantity_raw;
  const amt = reportWaste ? r.amount_with_waste : r.amount_raw;
  return Math.abs(qty) > 0.00005 || Math.abs(amt) > 0.005;
});

const totalMaterial = visibleReport
  .filter((r) => r.item_type === "material")
  .reduce((s, r) => s + (reportWaste ? r.amount_with_waste : r.amount_raw), 0);

const totalLabor = visibleReport
  .filter((r) => r.item_type === "labor")
  .reduce((s, r) => s + (reportWaste ? r.amount_with_waste : r.amount_raw), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">กำลังโหลด...</p>
      </div>
    );
  }

  const patch = (part: Partial<FormState>, recompute = false) => {
    setForm((prev) => (recompute ? compute({ ...prev, ...part }) : { ...prev, ...part }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AppSidebar projectId={projectId} projectName={projectName} />
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-10 border-b bg-white">
          <div className="mx-auto max-w-5xl space-y-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => router.push(`/projects/${projectId}/structure`)}>
                ← โครงสร้าง
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-slate-800">เสาตอม่อ</h1>
                <p className="text-xs text-slate-400">{projectName}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {(["add", "check", "report"] as const).map((key) => (
                <Button key={key} size="sm" variant={tab === key ? "default" : "outline"} onClick={() => setTab(key)}>
                  {key === "add" ? "Add Data" : key === "check" ? "Check Data" : "Report"}
                </Button>
              ))}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6">
          {tab === "add" && (
            <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-base">ชิ้นงาน</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button size="sm" className="w-full" onClick={() => { setSelectedId(null); setForm(emptyForm()); }}>
                    + เพิ่มเสาตอม่อ
                  </Button>
                  {elements.map((el) => (
                    <button
                      key={el.id}
                      type="button"
                      onClick={() => loadOne(el.id)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm ${selectedId === el.id ? "border-blue-300 bg-blue-50" : "bg-white"}`}
                    >
                      {el.name}
                    </button>
                  ))}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">ขนาด</CardTitle>
                    <CardDescription>คอนกรีต = กว้าง × ยาว × สูง × จำนวน</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label>ชื่อ *</Label>
                      <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="C1" />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
  <Label>ชนิดเสา</Label>
  <div className="flex gap-2">
    <Button
      type="button"
      size="sm"
      variant={form.shape === "rect" ? "default" : "outline"}
      onClick={() => patch({ shape: "rect" }, true)}
    >
      เสาเหลี่ยม
    </Button>
    <Button
      type="button"
      size="sm"
      variant={form.shape === "round" ? "default" : "outline"}
      onClick={() => patch({ shape: "round" }, true)}
    >
      เสากลม
    </Button>
  </div>
</div>
                    {form.shape === "rect" && (
  <>
    <div className="space-y-1">
      <Label>กว้าง (ม.)</Label>
      <Input value={form.width_m} onChange={(e) => patch({ width_m: e.target.value }, true)} />
    </div>
    <div className="space-y-1">
      <Label>ยาว (ม.)</Label>
      <Input value={form.length_m} onChange={(e) => patch({ length_m: e.target.value }, true)} />
    </div>
  </>
)}

{form.shape === "round" && (
  <div className="space-y-1">
    <Label>เส้นผ่านศูนย์กลาง (ม.)</Label>
    <Input
      value={form.diameter_m}
      onChange={(e) => patch({ diameter_m: e.target.value }, true)}
    />
  </div>
)}
                    <div className="space-y-1">
                      <Label>สูง (ม.)</Label>
                      <Input value={form.height_m} onChange={(e) => patch({ height_m: e.target.value }, true)} />
                    </div>
                    <div className="space-y-1">
                      <Label>จำนวน (ต้น)</Label>
                      <Input value={form.quantity} onChange={(e) => patch({ quantity: e.target.value })} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">วัสดุและค่าแรง</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <MasterSelect items={materialOptions} value={form.concrete_item_id} onChange={(id) => patch({ concrete_item_id: id })} placeholder="-- คอนกรีต --" />
                    <MasterSelect items={laborOptions} value={form.concrete_labor_item_id} onChange={(id) => patch({ concrete_labor_item_id: id })} placeholder="-- ค่าแรงคอนกรีต --" />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.use_formwork} onChange={(e) => patch({ use_formwork: e.target.checked })} />
                      ใช้ไม้แบบ
                    </label>
                    {form.use_formwork && (
                      <>
                        <MasterSelect items={materialOptions} value={form.formwork_item_id} onChange={(id) => patch({ formwork_item_id: id })} placeholder="-- ไม้แบบ --" />
                        <MasterSelect items={laborOptions} value={form.formwork_labor_item_id} onChange={(id) => patch({ formwork_labor_item_id: id })} placeholder="-- ค่าแรงไม้แบบ --" />
                      </>
                    )}
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.use_nail} onChange={(e) => patch({ use_nail: e.target.checked })} />
                      ตะปู 0.25 กก. ต่อ ตร.ม. ไม้แบบ
                    </label>
                    {form.use_nail && (
                      <MasterSelect items={materialOptions} value={form.nail_item_id} onChange={(id) => patch({ nail_item_id: id })} placeholder="-- ตะปู --" />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">เหล็ก</CardTitle>
                    <CardDescription>  ยาวเหล็กยืน = สูง + งอฉาก + เผื่อต่อทาบ + ระยะฝัง</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <MasterSelect items={laborOptions} value={form.rebar_labor_item_id} onChange={(id) => patch({ rebar_labor_item_id: id })} placeholder="-- ค่าแรงเหล็ก --" />
                    <div className="space-y-2 rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
  <p className="text-sm font-medium">เหล็กยืน</p>
  <label className="flex items-center gap-1 text-xs text-slate-500">
    <input
      type="checkbox"
      checked={form.main_auto}
      onChange={(e) => patch({ main_auto: e.target.checked }, e.target.checked)}
    />
    คำนวณอัตโนมัติ
  </label>
</div>
                      <MasterSelect items={materialOptions} value={form.main_item_id} onChange={(id) => patch({ main_item_id: id })} placeholder="-- ชนิดเหล็กยืน --" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
  name="main_bar_count"
  autoComplete="off"
  placeholder="จำนวนเส้น/ต้น"
  value={form.main_bar_count}
  onChange={(e) => patch({ main_bar_count: e.target.value })}
/>
                        <Input placeholder="ยาว/เส้น (ม.)" value={form.main_length_m} onChange={(e) => patch({ main_length_m: e.target.value, main_auto: false })} />
                        <Input
  placeholder="งอฉาก ม."
  value={form.main_bend_m}
  onChange={(e) => patch({ main_bend_m: e.target.value }, true)}
/>
<Input
  placeholder="เผื่อต่อทาบ ม."
  value={form.main_lap_m}
  onChange={(e) => patch({ main_lap_m: e.target.value }, true)}
/>
<Input
  placeholder="ระยะฝัง ม."
  value={form.main_embed_m}
  onChange={(e) => patch({ main_embed_m: e.target.value }, true)}
/>
                   
                      </div>
                    </div>
                    <div className="space-y-2 rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
  <p className="text-sm font-medium">เหล็กปลอก</p>
  <label className="flex items-center gap-1 text-xs text-slate-500">
    <input
      type="checkbox"
      checked={form.tie_auto}
      onChange={(e) => patch({ tie_auto: e.target.checked }, e.target.checked)}
    />
    คำนวณอัตโนมัติ
  </label>
</div>
                      <MasterSelect items={materialOptions} value={form.tie_item_id} onChange={(id) => patch({ tie_item_id: id })} placeholder="-- ชนิดเหล็กปลอก --" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="ระยะ @ ม." value={form.tie_spacing_m} onChange={(e) => patch({ tie_spacing_m: e.target.value, tie_auto: true }, true)} />
                        <Input
  name="tie_bar_count"
  autoComplete="off"
  placeholder="จำนวนปลอก/ต้น"
  value={form.tie_bar_count}
  onChange={(e) => patch({ tie_bar_count: e.target.value, tie_auto: false })}
/>
<Input
  name="tie_layers"
  autoComplete="off"
  placeholder="จำนวนชั้น"
  value={form.tie_layers}
  onChange={(e) => patch({ tie_layers: e.target.value })}
/>
                        <Input placeholder="ยาว/เส้น (ม.)" value={form.tie_length_m} onChange={(e) => patch({ tie_length_m: e.target.value, tie_auto: false })} />
                        <Input placeholder="cover ม." value={form.tie_cover_m} onChange={(e) => patch({ tie_cover_m: e.target.value }, true)} />
                        <Input placeholder="งอหัวรวม ม." value={form.tie_hook_m} onChange={(e) => patch({ tie_hook_m: e.target.value }, true)} />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.use_wire} onChange={(e) => patch({ use_wire: e.target.checked })} />
                      ลวดผูกเหล็ก 0.03 กก. ต่อ 1 กก. เหล็ก
                    </label>
                    {form.use_wire && (
                      <MasterSelect items={materialOptions} value={form.wire_item_id} onChange={(id) => patch({ wire_item_id: id })} placeholder="-- ลวด --" />
                    )}
                    <Input placeholder="หมายเหตุ" value={form.note} onChange={(e) => patch({ note: e.target.value })} />
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</Button>
                  {selectedId && (
                    <Button variant="outline" className="text-red-600" onClick={handleDelete}>ลบชิ้นงาน</Button>
                  )}
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
  <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
    <div className="flex-1 space-y-1">
      <Label>ชิ้นงาน</Label>
      <select
        className="h-9 w-full rounded-md border px-3 text-sm"
        value={checkElementId}
        onChange={(e) => {
          setCheckElementId(e.target.value);
          loadResults(e.target.value);
        }}
      >
        <option value="">-- เลือก --</option>
        {elements.map((el) => (
          <option key={el.id} value={el.id}>{el.name}</option>
        ))}
      </select>
    </div>
    <Button onClick={handleRefresh} disabled={refreshing || !checkElementId}>
      {refreshing ? "กำลังคำนวณ..." : "Refresh"}
    </Button>
  </CardContent>
</Card>
    <Card>
      <CardContent className="pt-4">
        {results.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">ยังไม่มีผล</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2 pr-2">รายการ</th>
                  <th className="py-2 pr-2 text-right">ปริมาณ (ดิบ)</th>
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
                  return (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2 pr-2">{r.item_name}</td>
                      <td className="py-2 pr-2 text-right">{r.quantity_raw.toLocaleString()}</td>
                      <td className="py-2 pr-2">{r.unit}</td>
                      <td className="py-2 pr-2 text-right">{(isMat ? r.unit_price : 0).toLocaleString()}</td>
                      <td className="py-2 pr-2 text-right">{(isMat ? 0 : r.unit_price).toLocaleString()}</td>
                      <td className="py-2 pr-2 text-right">{(isMat ? r.amount_raw : 0).toLocaleString()}</td>
                      <td className="py-2 text-right">{(isMat ? 0 : r.amount_raw).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
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
                <CardTitle className="text-base">Report — เสาตอม่อ</CardTitle>
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