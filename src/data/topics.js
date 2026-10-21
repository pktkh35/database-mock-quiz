// Client-safe metadata (no answers). Topics follow the 17 exam techniques.
export const TOPICS = [
  { id: "ddl", name: "DDL: DROP TABLE", desc: "ลบตารางที่ติด FOREIGN KEY ตามลำดับที่ถูกต้อง" },
  { id: "distinct", name: "SELECT DISTINCT", desc: "DISTINCT 2 คอลัมน์ จากตารางเดียว" },
  { id: "str", name: "WHERE ข้อความ/วันที่ + ORDER BY", desc: "เลือก 2 คอลัมน์ กรองข้อความและวันที่ เรียงลำดับ" },
  { id: "like", name: "LIKE และ AND/OR", desc: "pattern %, _ และลำดับความสำคัญของ AND/OR" },
  { id: "between", name: "BETWEEN, IN, IS NOT NULL", desc: "เลือก 3 คอลัมน์ กรองช่วงค่า รายการค่า และค่าว่าง" },
  { id: "equi", name: "Equi-join 2 ตาราง", desc: "FROM a, b WHERE a.k = b.k" },
  { id: "on", name: "JOIN ... ON", desc: "เชื่อม 2 ตารางด้วย ON (รวม self-join)" },
  { id: "using", name: "JOIN ... USING", desc: "เชื่อม 2 ตารางด้วย USING และ WHERE" },
  { id: "join3", name: "Join 3 ตาราง", desc: "เชื่อมสามตารางพร้อม WHERE" },
  { id: "outer", name: "Outer join (เลือกฝั่งเอง)", desc: "หาแถวที่ไม่มีคู่ โจทย์ไม่ระบุ LEFT/RIGHT" },
  { id: "right", name: "RIGHT OUTER JOIN", desc: "Right join พร้อม WHERE" },
  { id: "agg", name: "Aggregate (ไม่มี GROUP BY)", desc: "COUNT, SUM, AVG, MIN, MAX พร้อม alias" },
  { id: "group", name: "Aggregate + GROUP BY", desc: "จัดกลุ่มด้วยคอลัมน์ พร้อม alias" },
  { id: "sub1", name: "Subquery 1 แถว", desc: "scalar subquery ใน WHERE" },
  { id: "subn", name: "Subquery หลายแถว", desc: "IN, ANY, ALL (ผลลัพธ์ห้ามมี NULL)" },
  { id: "gfunc", name: "GROUP BY ฟังก์ชัน", desc: "จัดกลุ่มด้วย YEAR, LEFT, IF ฯลฯ พร้อม alias" },
  { id: "having", name: "GROUP BY ฟังก์ชัน + HAVING", desc: "จัดกลุ่มด้วยฟังก์ชันและกรองกลุ่มด้วย HAVING" },
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
