# Реализация ядра бизнес-логики (Расчёты и алгоритмы)

JavaScript (Node.js), стиль camelCase, одна команда на строку.

## 1. Скидка партнёра — `src/discount.js`
`calculatePartnerDiscount(totalQuantity)`: `< 10 000` → 0%, `10 000–49 999` → 5%, `50 000–299 999` → 10%, `≥ 300 000` → 15%.
Общее количество берётся из БД в `src/partnerService.js`: `SUM(sh.quantity)` с `LEFT JOIN sales_history` и `GROUP BY`. Партнёр без продаж (`SUM` = NULL) получает 0%.

## 2. Расход сырья — `src/materialCalculator.js`
`calculateMaterialAmount(productTypeId, materialTypeId, quantity, param1, param2, directory)`

```
Расход = ⌈ quantity × param1 × param2 × коэффициент типа продукции × (1 + % брака / 100) ⌉
```
Перед округлением вверх отсекается погрешность дробей (`0.1 × 3 = 0.30000000000000004`), иначе результат завышался бы на 1.

## 3. Обработка ошибок
Метод принимает id типов, сам обращается к справочникам БД (`dbDirectory` в `src/materialService.js`: `product_types.coefficient`, `material_types.defect_percent`) и возвращает **-1** без исключений, если:
- id не целое положительное число или такого типа нет в БД
- `param1` / `param2` ≤ 0, не число или бесконечность
- `quantity` ≤ 0 или дробное

Все запросы к справочникам параметризованы (`WHERE id = $1`).
