"use client";

type RebarRow = {
  position_code: string;
  label: string;
  bar_count: string;
  orientation: string;
  covering_m: string;
  spacing_m?: string;
  length_per_bar_m: string;
  auto_calc: boolean;
  item_id: string;
  bar_shape?: string;
  hook_total_m?: string;
};

type Props = {
  widthM: number;
  lengthM: number;
  heightM: number;
  rebar: RebarRow[];
  highlight?: string | null;
  usePile?: boolean;
};

function n(v: string | number | undefined, fallback = 0) {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(x) ? x : fallback;
}

/** ไอคอนรูปดัดเล็กตามรหัส */
function ShapeIcon({ code }: { code: string }) {
  const c = "#334155";
  if (code === "11") {
    return (
      <svg width="40" height="28" viewBox="0 0 40 28">
        <path d="M4 8 H28 V22" fill="none" stroke={c} strokeWidth="2" />
      </svg>
    );
  }
  if (code === "21") {
    return (
      <svg width="40" height="28" viewBox="0 0 40 28">
        <path d="M8 6 V20 H32 V6" fill="none" stroke={c} strokeWidth="2" />
      </svg>
    );
  }
  if (code === "61") {
    return (
      <svg width="40" height="28" viewBox="0 0 40 28">
        <rect x="6" y="6" width="28" height="16" fill="none" stroke={c} strokeWidth="2" />
      </svg>
    );
  }
  // 00 เส้นตรง
  return (
    <svg width="40" height="28" viewBox="0 0 40 28">
      <line x1="4" y1="14" x2="36" y2="14" stroke={c} strokeWidth="2" />
    </svg>
  );
}

/** วาดเหล็ก 1 เส้นในรูปด้าน ตามรหัสรูปดัด */
function BarProfile({
  code,
  x,
  yTop,
  yBot,
  width,
  color,
  className,
}: {
  code: string;
  x: number;
  yTop: number;
  yBot: number;
  width: number;
  color: string;
  className?: string;
}) {
  const leg = Math.max(yBot - yTop, 4);
  const half = width / 2;

  // 00 เส้นตรง
  if (code === "00" || code === "L") {
    return (
      <line
        x1={x - half}
        y1={yBot}
        x2={x + half}
        y2={yBot}
        stroke={color}
        strokeWidth="2"
        className={className}
      />
    );
  }

  // 11 งอฉากข้างเดียว (ขาซ้าย)
  if (code === "11") {
    return (
      <path
        d={`M ${x - half} ${yTop} L ${x - half} ${yBot} L ${x + half} ${yBot}`}
        fill="none"
        stroke={color}
        strokeWidth="2"
        className={className}
      />
    );
  }

  // 21 / U ตัว U สองขา
  if (code === "21" || code === "U" || code === "U_INV") {
    return (
      <path
        d={`M ${x - half} ${yTop} L ${x - half} ${yBot} L ${x + half} ${yBot} L ${x + half} ${yTop}`}
        fill="none"
        stroke={color}
        strokeWidth="2"
        className={className}
      />
    );
  }

  // อื่น ๆ — จุด
  return (
    <circle cx={x} cy={yBot} r="3" fill={color} className={className} />
  );
}

export function FootingPreview({
  widthM,
  lengthM,
  heightM,
  rebar,
  highlight = null,
  usePile = false,
}: Props) {
  // ใช้มิติจริงที่รับเข้ามา ไม่แทนค่าที่หายด้วยขนาดสมมติ
  const W = Math.max(0, n(widthM));
  const L = Math.max(0, n(lengthM));
  const T = Math.max(0, n(heightM));
  const validDims = W > 0 && L > 0 && T > 0;

  const bot = rebar.find((r) => r.position_code === "B");
  const top = rebar.find((r) => r.position_code === "A");
  const tie = rebar.find((r) => r.position_code === "C");
  const cover = Math.max(0, n(bot?.covering_m ?? top?.covering_m, 0.05));

  const barCount = (row?: RebarRow) => Math.max(0, Math.round(n(row?.bar_count, 0)));
  const hasRow = (row?: RebarRow) => !!row && (barCount(row) > 0 || n(row.length_per_bar_m) > 0 || !!row.item_id);
  const useTie = hasRow(tie);

  function lineClass(code: string) {
    if (!highlight) return "opacity-100";
    return highlight === code ? "opacity-100" : "opacity-20";
  }

  function shapeCode(row?: RebarRow) {
    const shape = String(row?.bar_shape || "00");
    if (["00", "11", "21", "61"].includes(shape)) return shape;
    if (shape === "U" || shape === "U_INV" || shape === "35") return "21";
    if (shape === "RECT") return "61";
    if (shape === "L") return "00";
    return "00";
  }

  // แปลน: รักษาทิศทางเหล็กตาม orientation; จำนวนเส้นอ้างอิง bar_count จริง
  const planScale = validDims ? 240 / Math.max(W, L) : 1;
  const planW = W * planScale;
  const planH = L * planScale;
  const pxCover = Math.min(Math.max(cover * planScale, 1), Math.min(planW, planH) / 2);
  const planX = 48;
  const planY = 34;
  const planViewW = planW + 112;
  const planViewH = planH + 88;
  const innerW = Math.max(0, planW - 2 * pxCover);
  const innerH = Math.max(0, planH - 2 * pxCover);

  const planBars = [
    { row: bot, color: "#0284c7", code: "B", dash: "" },
    { row: top, color: "#7c3aed", code: "A", dash: "5 3" },
  ];

  // รูปตัดตามความกว้างฐาน: เหล็กแนว width เป็นเส้นตามแนวตัด,
  // เหล็กแนว length แสดงเป็นหน้าตัดวงกลม
  const sectionScale = validDims ? Math.min(240 / W, 110 / T) : 1;
  const secW = W * sectionScale;
  const secT = T * sectionScale;
  const secX = 42;
  const secY = 30;
  const secCover = Math.min(cover * sectionScale, Math.max(0, secT / 2));
  const sectionViewW = secW + 112;
  const sectionViewH = secT + 100;
  // เหล็กล่างอยู่ชิด cover ด้านล่าง; เหล็กบนยกจากแนวเหล็กล่างเพียง 0.025 ม.
  // ตามที่ผู้ใช้ระบุ เพื่อให้เห็นความต่างระดับเล็กน้อยในภาพตัด
  const lowerBarY = secY + secT - secCover - 5;
  const upperLiftPx = Math.max(1.5, 0.025 * sectionScale);
  const rebarY = (row?: RebarRow) =>
    row?.position_code === "A" ? lowerBarY - upperLiftPx : lowerBarY;
  const hookTotal = (row?: RebarRow) => Math.max(0, n(row?.hook_total_m, 0));

  const conc = validDims ? W * L * T : 0;
  const formSide = validDims ? 2 * (W + L) * T : 0;

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold tracking-wide text-slate-600">แบบฐานราก 2D — PLAN / SECTION / REBAR</div>

      {!validDims && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          กรุณาระบุความกว้าง ความยาว และความหนาฐานรากให้มากกว่า 0 เพื่อแสดงแบบตามมิติจริง
        </div>
      )}

      {/* PLAN: มองจากด้านบน */}
      <div className="rounded-lg border bg-white p-3 space-y-1">
        <div className="text-xs font-semibold text-slate-700">PLAN — แปลนฐานราก</div>
        <svg width="100%" viewBox={`0 0 ${Math.max(planViewW, 180)} ${Math.max(planViewH, 130)}`} role="img" aria-label="แปลนฐานรากและเหล็กเสริม">
          <defs>
            <marker id="footing-plan-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
              <path d="M0,0 L6,3 L0,6 z" fill="#475569" />
            </marker>
          </defs>
          <text x={planX + planW / 2} y="14" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="600">PLAN</text>
          {validDims && <>
            <rect x={planX} y={planY} width={planW} height={planH} fill="#f1f5f9" stroke="#334155" strokeWidth="1.8" />
            <rect x={planX + pxCover} y={planY + pxCover} width={innerW} height={innerH} fill="none" stroke="#94a3b8" strokeDasharray="4 3" strokeWidth="1" />
            {planBars.map(({ row, color, code, dash }) => {
              if (!row || !hasRow(row)) return null;
              const count = barCount(row);
              const orientation = row.orientation === "width" ? "width" : "length";
              return Array.from({ length: count }).map((_, i) => {
                const t = count <= 1 ? 0.5 : i / (count - 1);
                if (orientation === "width") {
                  const y = planY + pxCover + t * innerH;
                  return <line key={`${code}-w-${i}`} x1={planX + pxCover} y1={y} x2={planX + planW - pxCover} y2={y} stroke={color} strokeWidth={1.6} strokeDasharray={dash || undefined} className={lineClass(code)} />;
                }
                const x = planX + pxCover + t * innerW;
                return <line key={`${code}-l-${i}`} x1={x} y1={planY + pxCover} x2={x} y2={planY + planH - pxCover} stroke={color} strokeWidth={1.6} strokeDasharray={dash || undefined} className={lineClass(code)} />;
              });
            })}
           
{/* เหล็กรัดรอบ C: เส้นประระดับเดียวกับปลายงอหัว U ทั้งสองข้าง */}
{useTie && (() => {
  const tieX1 = secX + secCover;
  const tieX2 = secX + secW - secCover;

  // ให้เส้นประอยู่ระดับเดียวกับปลายงอหัวเหล็กล่าง U
  const tieY = Math.max(
    secY + secCover + 3,
    lowerBarY - Math.max(0, (T - 2 * cover) * sectionScale)
  );

  return (
    <line
      x1={tieX1}
      y1={tieY}
      x2={tieX2}
      y2={tieY}
      fill="none"
      stroke="#059669"
      strokeWidth="1.8"
      strokeDasharray="5 3"
      strokeLinecap="round"
      className={lineClass("C")}
    />
  );
})()}

            {/* มิติกว้าง */}
            <line x1={planX} y1={planY + planH + 17} x2={planX + planW} y2={planY + planH + 17} stroke="#475569" strokeWidth="0.8" markerStart="url(#footing-plan-arrow)" markerEnd="url(#footing-plan-arrow)" />
            <line x1={planX} y1={planY + planH + 4} x2={planX} y2={planY + planH + 22} stroke="#475569" strokeWidth="0.8" />
            <line x1={planX + planW} y1={planY + planH + 4} x2={planX + planW} y2={planY + planH + 22} stroke="#475569" strokeWidth="0.8" />
            <text x={planX + planW / 2} y={planY + planH + 31} textAnchor="middle" fill="#334155" fontSize="10">กว้าง {W.toFixed(2)} ม.</text>
            {/* มิติยาว */}
            <line x1={planX + planW + 17} y1={planY} x2={planX + planW + 17} y2={planY + planH} stroke="#475569" strokeWidth="0.8" markerStart="url(#footing-plan-arrow)" markerEnd="url(#footing-plan-arrow)" />
            <line x1={planX + planW + 4} y1={planY} x2={planX + planW + 22} y2={planY} stroke="#475569" strokeWidth="0.8" />
            <line x1={planX + planW + 4} y1={planY + planH} x2={planX + planW + 22} y2={planY + planH} stroke="#475569" strokeWidth="0.8" />
            <text x={planX + planW + 31} y={planY + planH / 2} textAnchor="middle" fill="#334155" fontSize="10" transform={`rotate(-90 ${planX + planW + 31} ${planY + planH / 2})`}>ยาว {L.toFixed(2)} ม.</text>
          </>}
        </svg>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
          <span><span className="inline-block h-0.5 w-4 align-middle bg-sky-600 mr-1" />B เหล็กล่าง</span>
          <span><span className="inline-block h-0.5 w-4 align-middle bg-violet-600 mr-1" />A เหล็กบน</span>
          {useTie && <span><span className="inline-block h-0.5 w-4 align-middle bg-emerald-600 mr-1" />C เหล็กรัด/ปลอก</span>}
        </div>
      </div>

      {/* SECTION: รูปตัด */}
      <div className="rounded-lg border bg-white p-3 space-y-1">
        <div className="text-xs font-semibold text-slate-700">SECTION A–A — รูปตัดฐานราก</div>
        <svg width="100%" viewBox={`0 0 ${Math.max(sectionViewW, 180)} ${Math.max(sectionViewH, 130)}`} role="img" aria-label="รูปตัดฐานรากและตำแหน่งเหล็กเสริม">
          <defs>
            <marker id="footing-sec-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
              <path d="M0,0 L6,3 L0,6 z" fill="#475569" />
            </marker>
          </defs>
          <text x={secX + secW / 2} y="14" textAnchor="middle" fill="#334155" fontSize="11" fontWeight="600">SECTION A–A</text>
          {validDims && <>
            <rect x={secX} y={secY} width={secW} height={secT} fill="#e2e8f0" stroke="#334155" strokeWidth="1.8" />
            {/* cover บนและล่าง */}
            <line x1={secX} y1={secY + secCover} x2={secX + secW} y2={secY + secCover} stroke="#94a3b8" strokeDasharray="4 3" strokeWidth="0.8" />
            <line x1={secX} y1={secY + secT - secCover} x2={secX + secW} y2={secY + secT - secCover} stroke="#94a3b8" strokeDasharray="4 3" strokeWidth="0.8" />
            {[bot, top].map((row) => {
              if (!row || !hasRow(row)) return null;
              const code = row.position_code;
              const color = code === "A" ? "#7c3aed" : "#0284c7";
              const y = rebarY(row);
              const orient = row.orientation === "width" ? "width" : "length";
              const shape = shapeCode(row);
              const count = barCount(row);

              // เหล็กล่างรูป U: วาดท้องเหล็ก ขา U และงอหัวทั้งสองด้านตาม hook_total_m
              // ความยาวขาอิงความหนาฐานหัก cover; ความยาวงอหัวรวมแบ่งซ้าย/ขวา
              if (code === "B" && shape === "21") {
                const x1 = secX + secCover;
                const x2 = secX + secW - secCover;
                const yBase = lowerBarY;
                const yLegTop = Math.max(secY + secCover + 3, yBase - Math.max(0, (T - 2 * cover) * sectionScale));
                const hookPx = Math.max(0, hookTotal(row) * sectionScale / 2);
                const leftHookEnd = Math.min(x2, x1 + hookPx);
                const rightHookStart = Math.max(x1, x2 - hookPx);
                return <g key={`sec-${code}`} className={lineClass(code)}>
                  <path d={`M ${x1} ${yLegTop} L ${x1} ${yBase} L ${x2} ${yBase} L ${x2} ${yLegTop}`} fill="none" stroke={color} strokeWidth="2.6" />
                  {hookPx > 0 && <path d={`M ${x1} ${yLegTop} L ${leftHookEnd} ${yLegTop} M ${x2} ${yLegTop} L ${rightHookStart} ${yLegTop}`} fill="none" stroke={color} strokeWidth="2.6" />}
                  <line x1={x1 + 7} y1={yLegTop + 2} x2={x1 + 7} y2={yBase - 2} stroke="#475569" strokeWidth="0.7" markerStart="url(#footing-sec-arrow)" markerEnd="url(#footing-sec-arrow)" />
                  <text x={x1 + 11} y={(yLegTop + yBase) / 2} fontSize="7.5" fill="#334155">ขา {(Math.max(0, T - 2 * cover)).toFixed(3)} ม.</text>
                  <text x={secX + secW / 2} y={Math.max(secY + 12, yLegTop - 5)} textAnchor="middle" fontSize="8" fill={color}>U + งอหัวรวม {hookTotal(row).toFixed(3)} ม. (แบ่ง 2 ข้าง)</text>
                </g>;
              }

              // เหล็กบนแสดงเป็นเส้น/จุดที่ยกจากท้องเหล็กล่างเพียง 0.025 ม.
              if (orient === "width") {
                return <line key={`sec-${code}`} x1={secX + secCover} y1={y} x2={secX + secW - secCover} y2={y} stroke={color} strokeWidth={code === "A" ? "2.2" : "1.8"} strokeDasharray={code === "A" ? "4 2" : undefined} className={lineClass(code)} />;
              }
              return Array.from({ length: count }).map((_, i) => {
                const t = count <= 1 ? 0.5 : i / (count - 1);
                const x = secX + secCover + t * Math.max(0, secW - 2 * secCover);
                return <circle key={`sec-${code}-${i}`} cx={x} cy={y} r={Math.max(1.5, Math.min(3, sectionScale * 0.018))} fill={color} className={lineClass(code)} />;
              });
            })}
           
{/* เหล็กรัดรอบ C: เส้นประระดับเดียวกับปลายงอหัว U ทั้งสองข้าง */}
{useTie && (() => {
  const tieX1 = secX + secCover;
  const tieX2 = secX + secW - secCover;

  // ให้เส้นประอยู่ระดับเดียวกับปลายงอหัวเหล็กล่าง U
  const tieY = Math.max(
    secY + secCover + 3,
    lowerBarY - Math.max(0, (T - 2 * cover) * sectionScale)
  );

  return (
    <line
      x1={tieX1}
      y1={tieY}
      x2={tieX2}
      y2={tieY}
      fill="none"
      stroke="#059669"
      strokeWidth="1.8"
      strokeDasharray="5 3"
      strokeLinecap="round"
      className={lineClass("C")}
    />
  );
})()}

            {/* มิติความกว้าง */}
            <line x1={secX} y1={secY + secT + 17} x2={secX + secW} y2={secY + secT + 17} stroke="#475569" strokeWidth="0.8" markerStart="url(#footing-sec-arrow)" markerEnd="url(#footing-sec-arrow)" />
            <text x={secX + secW / 2} y={secY + secT + 30} textAnchor="middle" fill="#334155" fontSize="10">{W.toFixed(2)} ม.</text>
            {/* มิติความหนา */}
            <line x1={secX + secW + 18} y1={secY} x2={secX + secW + 18} y2={secY + secT} stroke="#475569" strokeWidth="0.8" markerStart="url(#footing-sec-arrow)" markerEnd="url(#footing-sec-arrow)" />
            <text x={secX + secW + 31} y={secY + secT / 2} textAnchor="middle" fill="#334155" fontSize="10" transform={`rotate(-90 ${secX + secW + 31} ${secY + secT / 2})`}>หนา {T.toFixed(2)} ม.</text>
          </>}
        </svg>
        <div className="text-[11px] text-slate-500">รูปตัดแสดงเหล็กล่าง U พร้อมขาและงอหัวตามค่าที่คำนวณไว้; เหล็กบนยกจากแนวเหล็กล่าง 0.025 ม. ส่วนเหล็กแนว length แสดงเป็นหน้าตัดวงกลม</div>
      </div>

      {/* ตารางข้อมูลเหล็กและรูปดัด */}
      <div className="rounded-lg border bg-white p-3 space-y-2">
        <div className="text-xs font-semibold text-slate-700">REBAR DETAIL — รายละเอียดเหล็กเสริม</div>
        {rebar.filter((r) => r.position_code !== "D" && hasRow(r)).length === 0 ? (
          <div className="text-xs text-slate-500">ยังไม่มีข้อมูลเหล็กเสริมที่บันทึกไว้</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="p-2 font-medium">ตำแหน่ง</th>
                  <th className="p-2 font-medium">รูปดัด</th>
                  <th className="p-2 font-medium text-right">จำนวน (เส้น)</th>
                  <th className="p-2 font-medium">แนวเหล็ก</th>
                  <th className="p-2 font-medium text-right">ระยะห่าง (ม.)</th>
                  <th className="p-2 font-medium text-right">งอหัวรวม (ม.)</th>
                  <th className="p-2 font-medium text-right">ยาว/เส้น (ม.)</th>
                  <th className="p-2 font-medium text-right">Cover (ม.)</th>
                </tr>
              </thead>
              <tbody>
                {rebar.filter((r) => r.position_code !== "D" && hasRow(r)).map((row) => (
                  <tr key={row.position_code} className={`border-b last:border-0 ${highlight === row.position_code ? "bg-sky-50" : ""}`}>
                    <td className="p-2 whitespace-nowrap">{row.position_code} — {row.label || (row.position_code === "A" ? "เหล็กบน" : row.position_code === "B" ? "เหล็กล่าง" : "เหล็กรัด")}</td>
                    <td className="p-2"><div className="flex items-center gap-1"><ShapeIcon code={shapeCode(row)} /><span>{shapeCode(row)}</span></div></td>
                    <td className="p-2 text-right tabular-nums">{barCount(row)}</td>
                    <td className="p-2">{row.orientation === "width" ? "ตามแนวกว้าง" : row.orientation === "length" ? "ตามแนวยาว" : "ไม่ระบุ"}</td>
                    <td className="p-2 text-right tabular-nums">{n(row.spacing_m) > 0 ? n(row.spacing_m).toFixed(3) : "—"}</td>
                    <td className="p-2 text-right tabular-nums">{n(row.hook_total_m) > 0 ? n(row.hook_total_m).toFixed(3) : "—"}</td>
                    <td className="p-2 text-right tabular-nums">{n(row.length_per_bar_m) > 0 ? n(row.length_per_bar_m).toFixed(3) : "—"}</td>
                    <td className="p-2 text-right tabular-nums">{n(row.covering_m, cover).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-[11px] text-slate-600 space-y-0.5 px-1 border-t pt-2">
        <div>คอนกรีตจากมิติฐาน = {conc.toFixed(3)} ลบ.ม. / ฐาน</div>
        <div>ไม้แบบด้านข้างจากมิติฐาน = {formSide.toFixed(2)} ตร.ม. / ฐาน</div>
        <div className="text-slate-400">* ส่วนนี้เป็นภาพตรวจสอบรูปทรง ไม่ได้เปลี่ยนสูตรหรือค่าที่บันทึกใน BOQ</div>
      </div>
    </div>
  );
}
