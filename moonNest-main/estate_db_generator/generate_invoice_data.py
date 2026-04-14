# generate_invoice_data.py
# Chức năng:
#  - Với mỗi contract: sinh utility_meter, invoice, invoice_detail
#  - Từ contract.start_date → tháng trước của tháng hiện tại (NOW - 1)
#  - Tháng trước (gần nhất) -> PENDING, paid_date = NULL
#  - Các tháng trước nữa   -> PAID,    paid_date random
#
# Hỗ trợ đa loại hình building (OFFICE / SHOPHOUSE / APARTMENT / WAREHOUSE):
#  - Các fee có thể NULL trong DB (service_fee, car_fee, motorbike_fee,
#    water_fee, electricity_fee) → tự động bỏ qua khi tính tổng và
#    KHÔNG tạo invoice_detail cho khoản đó.
#  - Tiền thuê luôn được tính (rent_price * rent_area).

import mysql.connector
from datetime import datetime, timedelta
import random

db = mysql.connector.connect(
    host="127.0.0.1",
    port=3306,
    user="root",
    password="123456",
    database="estate",
    connection_timeout=5
)
cursor = db.cursor(dictionary=True)

cursor.execute("SELECT * FROM contract")
contracts = cursor.fetchall()

cursor.execute("SELECT * FROM building")
buildings = {b["id"]: b for b in cursor.fetchall()}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def month_year_iter(start_date, end_date):
    cur = start_date.replace(day=1)
    end = end_date.replace(day=1)
    while cur <= end:
        yield cur.month, cur.year
        if cur.month == 12:
            cur = cur.replace(month=1, year=cur.year + 1)
        else:
            cur = cur.replace(month=cur.month + 1)

def get_invoice_created_date(month, year):
    if month == 12:
        return datetime(year + 1, 1, 1, 0, 0, 0)
    return datetime(year, month + 1, 1, 0, 0, 0)

def random_datetime_between(start_dt, end_dt):
    delta = int((end_dt - start_dt).total_seconds())
    if delta <= 5:
        return start_dt + timedelta(seconds=3)
    return start_dt + timedelta(seconds=random.randint(3, delta - 1))

def to_float(value):
    """Chuyển giá trị DB về float, trả về None nếu NULL."""
    return float(value) if value is not None else None

# ─── Cleanup data cũ trước khi generate ─────────────────────────────────────
# Tránh lỗi Duplicate entry khi chạy lại script nhiều lần
print("Cleaning up old data...")
cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
cursor.execute("TRUNCATE TABLE invoice_detail")
cursor.execute("TRUNCATE TABLE invoice")
cursor.execute("TRUNCATE TABLE utility_meter")
cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
db.commit()
print("Cleanup done. Generating...")

# ─── Thời điểm tham chiếu ────────────────────────────────────────────────────

NOW = datetime.now()
if NOW.month == 1:
    LAST_MONTH, LAST_YEAR = 12, NOW.year - 1
else:
    LAST_MONTH, LAST_YEAR = NOW.month - 1, NOW.year

# ─── Main loop ────────────────────────────────────────────────────────────────

for c in contracts:

    if c["building_id"] not in buildings:
        print(f"Skip contract {c['id']}: building không tồn tại")
        continue

    building = buildings[c["building_id"]]

    contract_start = c["start_date"]
    contract_end   = c["end_date"]

    last_month_date  = datetime(LAST_YEAR, LAST_MONTH, 1)
    start_month_first = contract_start.replace(day=1)

    # Chỉ generate đến tháng chứa (end_date - 1 ngày)
    real_end        = contract_end - timedelta(days=1)
    end_month_first = min(real_end.replace(day=1), last_month_date)

    if start_month_first > end_month_first:
        print(f"Contract {c['id']} has no months to generate.")
        continue

    print(f"Contract {c['id']} [{building['property_type']}]"
          f"... generating from {start_month_first} → {end_month_first}")

    last_elec  = 0
    last_water = 0

    for m, y in month_year_iter(start_month_first, end_month_first):

        created_date = get_invoice_created_date(m, y)
        due_date     = created_date + timedelta(days=15)

        if m == LAST_MONTH and y == LAST_YEAR:
            status    = "PENDING"
            paid_date = None
        else:
            status    = "PAID"
            paid_date = random_datetime_between(created_date, due_date)

        # Chỉ số điện nước
        elec_new  = last_elec  + random.randint(150, 800)
        water_new = last_water + random.randint(20, 120)

        cursor.execute("""
            INSERT INTO utility_meter (
                contract_id, month, year,
                electricity_old, electricity_new,
                water_old, water_new,
                created_at
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            c["id"], m, y,
            last_elec, elec_new,
            last_water, water_new,
            created_date
        ))

        elec_used  = elec_new  - last_elec
        water_used = water_new - last_water

        last_elec  = elec_new
        last_water = water_new

        # ── Tính các khoản phí, bỏ qua nếu NULL ──────────────────────────────
        rent_total = float(c["rent_price"]) * int(c["rent_area"])

        service_fee_val     = to_float(building["service_fee"])
        car_fee_val         = to_float(building["car_fee"])
        motorbike_fee_val   = to_float(building["motorbike_fee"])

        elec_unit           = to_float(building["electricity_fee"])
        water_unit          = to_float(building["water_fee"])
        electricity_fee_val = elec_used  * elec_unit  if elec_unit  is not None else None
        water_fee_val       = water_used * water_unit if water_unit is not None else None

        # ── Chỉ tạo line_item khi khoản phí != NULL ──────────────────────────
        line_items = [("Tiền thuê mặt bằng", rent_total)]

        if service_fee_val   is not None: line_items.append(("Phí dịch vụ",    service_fee_val))
        if car_fee_val        is not None: line_items.append(("Phí gửi ô tô",   car_fee_val))
        if motorbike_fee_val  is not None: line_items.append(("Phí gửi xe máy", motorbike_fee_val))
        if electricity_fee_val is not None: line_items.append(("Phí điện",       electricity_fee_val))
        if water_fee_val      is not None: line_items.append(("Phí nước",        water_fee_val))

        total_amount = sum(amount for _, amount in line_items)

        # ── Payment info ──────────────────────────────────────────────────────
        payment_method   = None
        transaction_code = None
        if status == "PAID":
            payment_method   = "BANK_QR"
            transaction_code = f"SEED-{c['id']}-{m}{y}-{random.randint(100000,999999)}"

        cursor.execute("""
            INSERT INTO invoice (
                contract_id, customer_id, month, year,
                total_amount, status,
                created_date, due_date, paid_date,
                payment_method, transaction_code
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            c["id"], c["customer_id"],
            m, y,
            total_amount, status,
            created_date, due_date, paid_date,
            payment_method, transaction_code
        ))

        invoice_id = cursor.lastrowid

        for desc, amount in line_items:
            cursor.execute("""
                INSERT INTO invoice_detail (invoice_id, description, amount)
                VALUES (%s,%s,%s)
            """, (invoice_id, desc, amount))

    db.commit()

cursor.close()
db.close()

print("=== DONE: generate successfully ===")