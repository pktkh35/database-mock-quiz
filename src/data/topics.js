// Client-safe metadata (no answers). Topics follow DB66 LAB 5–9 slides.
export const TOPICS = [
  { id: "select", name: "SELECT & WHERE", desc: "เงื่อนไข =, BETWEEN, IN, LIKE, IS NULL, AND/OR/NOT, ORDER BY" },
  { id: "join", name: "JOIN", desc: "Cross, Equijoin, Natural, ON, USING, self-join, 3 ตาราง" },
  { id: "outer", name: "OUTER JOIN", desc: "LEFT / RIGHT / FULL (UNION) หาแถวที่ไม่มีคู่" },
  { id: "agg", name: "Aggregate & GROUP BY", desc: "COUNT, SUM, AVG, MIN/MAX, DISTINCT, GROUP BY, HAVING" },
  { id: "sub", name: "Subquery", desc: "single-row, multiple-row (IN/ANY/ALL), HAVING, FROM" },
];

export const DATASET_LABELS = {
  hr: "บริษัท (HR)",
  food: "ร้านอาหาร",
  sales: "ยอดขาย",
  shop: "ร้านค้าออนไลน์",
  university: "มหาวิทยาลัย",
  library: "ห้องสมุด",
  classic: "โมเดลรถ (Classic Models)",
};
