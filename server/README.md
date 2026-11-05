# เซิร์ฟเวอร์ AI ของ Score Snap (Cloudflare Worker)

ทำให้ผู้ใช้ให้ AI อ่านโน้ตได้โดยไม่ต้องมี API key: เซิร์ฟเวอร์นี้เก็บ key ของผู้ดูแลไว้ และรับเฉพาะคำขอจากเว็บของคุณที่มีรหัสห้องเรียนถูกต้อง
ค่าใช้จ่าย AI คิดจากบัญชี Anthropic ของเจ้าของ key · Cloudflare Workers แบบฟรีรับได้ 100,000 คำขอต่อวัน

## ติดตั้ง (ครั้งเดียว ประมาณ 10 นาที)

1. สมัคร Cloudflare ฟรีที่ dash.cloudflare.com
2. Workers & Pages › Create › Create Worker › ตั้งชื่อ `score-snap-ai` › Deploy
3. กด Edit code › ลบโค้ดเดิมทั้งหมด › วางโค้ดจากไฟล์ `worker.js` › Deploy
4. Settings › Variables and Secrets › Add แล้วเพิ่ม 3 ค่า แล้วกด Deploy

| ชื่อ | ชนิด | ค่า |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Secret | key จาก console.anthropic.com (`sk-ant-…`) |
| `PASSCODE` | Secret | รหัสห้องเรียนที่จะแจกนักเรียน |
| `ALLOWED_ORIGINS` | Text | `https://wanlopn-spec.github.io` |

5. เปิดที่อยู่ของ Worker เช่น `https://score-snap-ai.<ชื่อของคุณ>.workers.dev` ต้องขึ้นว่า `Score Snap AI server is running.`
6. ใส่ที่อยู่นั้นในไฟล์ `config.js` ของเว็บ: `window.SCORESNAP_SERVER = 'https://score-snap-ai.<ชื่อของคุณ>.workers.dev';`
7. ตั้งวงเงินสูงสุดที่ console.anthropic.com › Billing › Limits เพื่อกันค่าใช้จ่ายเกิน

## เปลี่ยนรหัสห้องเรียน

Settings › Variables and Secrets › แก้ `PASSCODE` › Deploy รหัสเดิมจะใช้ไม่ได้ทันที

## จำกัดจำนวนครั้งต่อวัน (ไม่บังคับ)

1. Storage & Databases › KV › Create namespace ชื่อ `score-snap-usage`
2. ที่ Worker › Settings › Bindings › Add › KV namespace › ชื่อตัวแปร `USAGE` › เลือก `score-snap-usage`
3. เพิ่มตัวแปร `DAILY_LIMIT` (Text) เช่น `200` = ทั้งห้องอ่านได้รวม 200 ครั้งต่อวัน

ห้ามใส่ API key ลงในไฟล์ใดๆ ใน GitHub ใส่เฉพาะใน Cloudflare (ชนิด Secret) เท่านั้น
