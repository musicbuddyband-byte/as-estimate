/** รหัสรูปดัดเหล็ก — ฐานราก (ไม่มี 35) */
export type BarShapeCode = "00" | "11" | "21" | "61";

export type BarShapeDef = {
  code: BarShapeCode;
  nameTh: string;
  hint: string;
};

export const FOOTING_BAR_SHAPES: BarShapeDef[] = [
  { code: "00", nameTh: "เส้นตรง (+ งอหัว)", hint: "L = A + BC" },
  { code: "11", nameTh: "งอฉากข้างเดียว", hint: "L = A + (H−2c) + BC" },
  { code: "21", nameTh: "ตัว U สองขา", hint: "L = A + BC + 2(H−2c)" },
  { code: "61", nameTh: "ปลอกรอบ", hint: "L = 2(W−2c)+2(L−2c)+BC" },
];

export type BarLengthInput = {
  code: BarShapeCode;
  /** ช่วงตรงตามแนว (ม.) */
  A: number;
  /** งอหัวรวม BC (ม.) */
  BC: number;
  /** ความสูง/หนาฐาน (ม.) */
  H: number;
  /** cover (ม.) */
  cover: number;
  /** กว้างฐาน — ใช้กับ 61 */
  width?: number;
  /** ยาวฐาน — ใช้กับ 61 */
  length?: number;
};

/**
 * สูตรฐานรากที่ล็อกแล้ว
 * 00: A + BC
 * 11: A + (H − 2c) + BC
 * 21: A + BC + 2(H − 2c)
 * 61: 2(W−2c) + 2(L−2c) + BC
 */
export function calcBarLength(p: BarLengthInput): number {
  const A = Math.max(p.A || 0, 0);
  const BC = Math.max(p.BC || 0, 0);
  const H = Math.max(p.H || 0, 0);
  const c = Math.max(p.cover || 0, 0);
  const leg = Math.max(H - 2 * c, 0);
  const W = Math.max(p.width || 0, 0);
  const Ldim = Math.max(p.length || 0, 0);

  let L = 0;
  switch (p.code) {
    case "00":
      L = A + BC;
      break;
    case "11":
      L = A + leg + BC;
      break;
    case "21":
      L = A + BC + 2 * leg;
      break;
    case "61": {
      const innerW = Math.max(W - 2 * c, 0);
      const innerL = Math.max(Ldim - 2 * c, 0);
      L = 2 * innerW + 2 * innerL + BC;
      break;
    }
    default:
      L = A + BC;
  }
  return Math.max(0, Number(L.toFixed(4)));
}

/** ของเก่า U / U_INV / อื่น → รหัสใหม่ */
export function legacyShapeToCode(barShape: string | undefined): BarShapeCode {
  if (barShape === "U" || barShape === "U_INV" || barShape === "21") return "21";
  if (barShape === "11") return "11";
  if (barShape === "61" || barShape === "RECT") return "61";
  if (barShape === "00" || barShape === "L") return "00";
  if (barShape === "35") return "21"; // เคยมี 35 → ใช้ U แทน
  return "00";
}

export function isBarShapeCode(v: string): v is BarShapeCode {
  return v === "00" || v === "11" || v === "21" || v === "61";
}