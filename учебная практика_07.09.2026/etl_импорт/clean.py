"""
clean.py — очистка исходных файлов перед импортом (этап Transform в ETL).

Запуск:  python clean.py
Читает:  raw/import_partners.csv, raw/import_sales.txt
Пишет:   clean/partner_types.csv, clean/partners.csv,
         clean/product_types.csv, clean/products.csv,
         clean/sales_history.csv
и печатает отчёт о найденных аномалиях.
"""
import csv
import os
import re
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

RAW = "raw"
OUT = "clean"
os.makedirs(OUT, exist_ok=True)

report = []  # список найденных аномалий


def log(msg):
    report.append(msg)


def norm_spaces(s):
    """Убрать пробелы по краям и двойные пробелы внутри."""
    return re.sub(r"\s+", " ", s).strip()


def norm_phone(s):
    """'+7 (999) 111-22-33' -> '+79991112233'. Пусто -> None."""
    digits = re.sub(r"\D", "", s or "")
    if not digits:
        return None
    if len(digits) == 11 and digits[0] == "8":
        digits = "7" + digits[1:]
    return "+" + digits


def parse_date(s):
    """Приводит дату к ISO-формату YYYY-MM-DD."""
    s = s.strip()
    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).date().isoformat(), fmt
        except ValueError:
            pass
    raise ValueError(f"Неизвестный формат даты: {s!r}")


def write_csv(name, header, rows):
    with open(os.path.join(OUT, name), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(header)
        w.writerows(rows)


# ---------------------------------------------------------------------
# 1. Партнёры
# ---------------------------------------------------------------------
KNOWN_TYPES = ["ООО", "ЗАО", "ПАО", "ОАО", "ИП", "ТК"]

partner_types = {}       # название типа -> id
partners = {}            # partner_id -> строка
seen_inn, seen_email = set(), set()

with open(os.path.join(RAW, "import_partners.csv"), encoding="utf-8-sig", newline="") as f:
    for row in csv.DictReader(f):
        pid = int(row["partner_id"].strip())
        raw_name = row["company_name"]
        name = norm_spaces(raw_name)
        if name != raw_name:
            log(f"partners id={pid}: лишние пробелы в названии {raw_name!r}")

        # Тип партнёра вынимаем из начала названия (ООО, ИП, ТК ...)
        ptype = next((t for t in KNOWN_TYPES if name.startswith(t + " ")), None)
        if ptype is None:
            ptype = "Не указан"
            log(f"partners id={pid}: тип организации не распознан, ставим 'Не указан'")
        else:
            name = name[len(ptype):].strip()
        name = name.strip('"«» ')
        partner_types.setdefault(ptype, len(partner_types) + 1)

        inn = row["inn"].strip()
        if not re.fullmatch(r"\d{10}|\d{12}", inn):
            log(f"partners id={pid}: некорректный ИНН {inn!r} — строка пропущена")
            continue

        email = row["contact_email"].strip().lower()

        # Дубликаты: по id, ИНН или email
        if pid in partners or inn in seen_inn or email in seen_email:
            log(f"partners id={pid}: дубликат — строка пропущена")
            continue

        phone = norm_phone(row["phone"])
        if phone is None:
            log(f"partners id={pid}: не указан телефон -> NULL")
        elif phone != row["phone"].strip():
            log(f"partners id={pid}: телефон {row['phone']!r} приведён к {phone}")

        rating = row["rating"].strip()
        if rating == "":
            rating = None
            log(f"partners id={pid}: не указан рейтинг -> NULL")

        seen_inn.add(inn)
        seen_email.add(email)
        partners[pid] = [pid, partner_types[ptype], name, inn, email, phone, rating]

# ---------------------------------------------------------------------
# 2. Продажи
# ---------------------------------------------------------------------
product_types = {"Бытовая химия": 1}
products = {}            # название -> [id, type_id, article, name, min_price]
sales = []
seen_sale_ids = set()

with open(os.path.join(RAW, "import_sales.txt"), encoding="utf-8-sig", newline="") as f:
    for row in csv.DictReader(f, delimiter="\t"):
        sid = int(row["sale_id"].strip())
        pid = int(row["partner_id"].strip())

        if sid in seen_sale_ids:
            log(f"sales id={sid}: дубликат — строка пропущена")
            continue
        if pid not in partners:
            log(f"sales id={sid}: партнёр id={pid} не существует — строка пропущена")
            continue

        date, fmt = parse_date(row["sale_date"])
        if fmt != "%Y-%m-%d":
            log(f"sales id={sid}: дата {row['sale_date']!r} приведена к {date}")

        qty = int(row["quantity"].strip())
        total = Decimal(row["total_amount"].strip())
        if qty <= 0 or total < 0:
            log(f"sales id={sid}: неположительное количество или сумма — строка пропущена")
            continue

        pname = norm_spaces(row["product_name"])
        unit_price = (total / qty).quantize(Decimal("0.01"), ROUND_HALF_UP)
        if pname not in products:
            pid_new = len(products) + 1
            products[pname] = [pid_new, 1, f"ART-{pid_new:04d}", pname, unit_price]
        else:
            products[pname][4] = min(products[pname][4], unit_price)

        seen_sale_ids.add(sid)
        sales.append([sid, pid, products[pname][0], qty, f"{total:.2f}", date])

# ---------------------------------------------------------------------
# 3. Запись результата
# ---------------------------------------------------------------------
write_csv("partner_types.csv", ["id", "name"],
          [[i, n] for n, i in partner_types.items()])
write_csv("partners.csv",
          ["id", "partner_type_id", "name", "inn", "email", "phone", "rating"],
          partners.values())
write_csv("product_types.csv", ["id", "name"],
          [[i, n] for n, i in product_types.items()])
write_csv("products.csv", ["id", "product_type_id", "article", "name", "min_price"],
          [[p[0], p[1], p[2], p[3], f"{p[4]:.2f}"] for p in products.values()])
write_csv("sales_history.csv",
          ["id", "partner_id", "product_id", "quantity", "total_amount", "sale_date"],
          sales)

print("Найденные аномалии:")
for r in report:
    print(" -", r)
print()
print(f"Итого: partner_types={len(partner_types)}, partners={len(partners)}, "
      f"product_types={len(product_types)}, products={len(products)}, "
      f"sales_history={len(sales)}")
