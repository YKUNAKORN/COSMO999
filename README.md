# COSMO999

แอปบันทึกคะแนนเกมไพ่ (Next.js 15 + Firebase Realtime Database) — ผู้เล่น, ขาประจำ (กลุ่ม), ประวัติรอบ, อันดับ และสถิติ

## เริ่มใช้งาน

```bash
npm install
cp .env.example .env.local   # ใส่ค่า Firebase ของคุณ
npm run dev
```

เปิด http://localhost:3000

ถ้าไม่ตั้ง `NEXT_PUBLIC_FIREBASE_API_KEY` / `NEXT_PUBLIC_FIREBASE_DATABASE_URL` แอปจะรันในโหมด local (เก็บข้อมูลใน localStorage ของเบราว์เซอร์) โดยไม่แตะ Firebase

## ตัวแปร env

| ตัวแปร | ความหมาย |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | ค่าตั้งค่าโปรเจกต์ Firebase (ดู `.env.example`) |
| `NEXT_PUBLIC_RTDB_ROOT` | path ราก ค่าเริ่มต้น `dummyRoom` (ตั้งเป็น `dummyRoom_dev` เพื่อทดสอบการเขียนโดยไม่แตะข้อมูลจริง) |

## คำสั่ง

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รันโหมดพัฒนา |
| `npm run build` | build production |
| `npm test` | รันเทสต์ (`node --test`) |
| `npm run lint` | ตรวจโค้ด |
| `npm run backup` | บันทึก snapshot JSON ของข้อมูลทั้งหมดไว้ที่ `backups/` (อ่านอย่างเดียว) |

## โครงข้อมูล

ใต้ `NEXT_PUBLIC_RTDB_ROOT`: `players` (อาร์เรย์), `groups` (อาร์เรย์), `history` (object ตาม match id)

- กลุ่ม (ขาประจำ) ใช้ id = รหัสผู้เล่นที่เรียงแล้วต่อด้วย `_` ดังนั้นผู้เล่นชุดต่างกันคือกลุ่มต่างกัน
- "จำนวนรอบ" ใน dialog ของกลุ่มนับเฉพาะรอบที่ผู้เล่นตรงกันทั้งชุด ส่วน "เล่นด้วยกันทั้งหมด" นับรวมรอบที่มีคนอื่นร่วมด้วย
- การบันทึก/ย้อน/แก้รอบใช้ transaction บน root ตรรกะอยู่ใน `src/lib/roundOps.ts` และ `src/lib/roundEdit.ts` (ทดสอบได้ ไม่พึ่ง Firebase)

## รูปโปรไฟล์

รูปใหม่จะอัปโหลดไป Firebase Storage (`avatars/`) แล้วเก็บเป็นลิงก์ ต้องเปิด Storage และอนุญาตให้เขียน `avatars/` ใน rules ถ้าใช้ไม่ได้ ระบบจะเก็บเป็น base64 ในฐานข้อมูลแทนโดยอัตโนมัติ
