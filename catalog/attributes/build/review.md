# Attribute review V1 (critic) — 2026-11-24

Scope: the merged output (`seeds/attributes/*.json`). I only edited `aliases.json`, `policy.json` and the new `fixes.json`.
Result: `attributes 837, sub-categories 118/118, errors 0, warnings 67, near-duplicates 12, unverified 534`. The seed transform loads with 0 rejects (3155 set rows, 238 axis rows).
The remaining warnings are the research type conflicts, which `fixes.json` settles where it matters (build.js still reports the raw conflict).

## 1. Aliases: 19 true duplicates (`aliases.json`)
- Same registration under two keys: `rera_project_number`→`rera_project_registration_no`, `icai_membership_number`→`icai_membership_no`, `irdai_licence_number`→`irdai_registration_no`, `rbi_registration_number`→`rbi_registration_no`, `coa_registration_number`→`coa_registration_no`, `bis_registration_number`→`bis_crs_registration_no` (both are the CRS R-number), `bis_standard`→`is_standard_no`, `bis_standard_mark`→`isi_marked`.
- Practitioner registers: `vci_registration_number` and `nurse_registration_no` → `practitioner_registration_no`, whose description already names the Veterinary and Nursing Councils.
- Same fact: `advance_payment_percent`→`advance_payment`, `manufacture_date`→`manufacture_month_year`, `warranty_months`→`warranty_period` (R4 flagged this one), `serving_size`→`portion_info`, `battery_type`→`battery_chemistry`, `power_watts`→`wattage`, `package_tier`→`package`, `garment_for`→`service_for`, `mounting`→`indoor_outdoor`.
- I did not merge the 12 near-duplicates still listed in the report. Each pair only shares a label: product_form/formulation, compatibility/compatible_stove_type, gender/service_for, activities/activity, product_type/pet_product_type, garment_length/length, jewellery_style/style, finish/print_finish, vehicle_class/vehicle_type, the `*_item_type` keys, book_format/play_format, and the `*_service_type` keys.

## 2. Policy (`policy.json`)
- `shop_level` +7: `gst_invoice`, plus registrations held by the business rather than the listing: `emigration_rc_number`, `amfi_arn`, `sebi_registration_no`, `irdai_registration_no`, `icai_membership_no`, `coa_registration_no`. R4 and R5 both asked for this. These keys move from listing forms to `shop_attributes` (27 keys now).
- `form_optional` +3: `allergens` (only when the food contains one; a "None declared" value exists), `warranty_days` (disclose it only when a warranty is offered), `rera_project_registration_no` (not needed for resale outside a project or for rentals).

## 3. Definitions (`fixes.json`: 36 entries)
- **Type conflicts settled.**
  - `colour`, `material`, `fragrance`, `flavour` and `delivery_area` become open enums. `flavour` gets food values as well as the pet values; `material` loses "Leatherette".
  - `licence_class` and `guard_type` change from multi_enum to enum, because a variant axis needs a single value.
  - Kept as merged: text for `manufacture_month_year`, `pack_size`, `weight` and `min_order_qty`, because values like "6 x 200 g" don't fit a measure; textarea for `composition` and `storage_instructions`; number (₹, days) for money and day counts; multi_enum for `event_type`, `operator` and `specialty`.
- **Value lists deduplicated** (case or wording variants removed, each list under 50):
  - Pricing and plans: `plan_period`, `pricing_unit`, `sold_by`, `gst_rate`. For `gst_rate` I added 3% (gold) and 0.25%; see the decisions below.
  - Food: `food_type` (kept the legacy lowercase codes `veg/non-veg/egg/vegan`), `allergens` (the FSSAI list plus sesame and mustard).
  - Goods: `size`, `amenities`, `frame_shape`, `bee_star_rating`, `condition`, `country_of_origin`, `finish`, `power_source`, `purity` (BIS grades; dropped the duplicate "Silver 925 (Sterling)" and the non-standard "Silver 958"), `print_type` (relabelled "Print Type").
  - People and modes: `gender`, `age_group`, `vehicle_type`, `mode`, `shift`, `consultation_mode` (dropped "In Clinic and Online", which can't be a variant value).
  - Others: `parts_type`, `delivery_slot`, `indoor_outdoor`. `level` gains school and college levels because `school_college` uses it as an axis.
- **Wrong merges split.**
  - `coverage` was one key for makeup coverage (enum) and paint/tile coverage (sq ft). Added `coverage_sqft` (measure, area) and moved paints and tiles_plywood to it.
  - The `generic_name`→`generic` alias made R1's boolean "Generic Medicine" collide with R5's common name. `generic` stays the common name. Added `generic_medicine` (boolean, which is the key the Jan Aushadhi loader uses) to pharmacy.
  - Relabelled `coverage_area` to "Mehendi Coverage".

## 4. Sub-categories (`fixes.json`: 51 entries)
**Statutory rows downgraded (17 set rows, plus `dimensions` in 10) because the rule does not apply to a local shop:**
- `calorie_kcal_per_serving` and `portion_info` → recommended for restaurant, fast_food, cafe, ice_cream_juice and home_kitchen. FSS L&D reg.9(1) covers only Central-licence or 10+ outlet chains.
- `nutrition_info` and `storage_instructions` → recommended for bakery and sweet_shop, whose goods are mostly shop-made and not prepackaged. For sweet_shop, `expiry_date` → recommended too: loose sweets declare best-before through `shelf_life_days`.
- `rera_project_registration_no` → optional for construction_contractor (RERA binds promoters and agents, not contractors). `irdai_registration_no` → recommended (R4: no confirmed display rule).
- `dimensions` → recommended in 10 sub-categories: its only citation is an unconfirmed LM "where relevant" clause.
- I kept these unverified statutory rows because the law is clear: `age_restricted` (COTPA s.6), `unit_sale_price` (LM(PC) 2022 amendment), the Mfg. licence number on drug and cosmetic labels, and SEBI and AMFI registration numbers.

**Basic forms (31 rewritten).** Visible fields, after removing the axes, are now 2–5 everywhere (20×2, 65×3, 27×4, 6×5; none empty, none over 5).
- Too long, fixed: sweet_shop had 7, catering 6, real_estate 6. The restaurant forms lost the calorie and serving-size fields.
- Too short, fixed: home_nursing (1 → 3: `care_services`, `background_verified`) and marketing_design (1 → 3).
- `condition` dropped from forms for shops that normally sell new goods: electronics_store, home_appliances, inverter_battery, electronics_others, home_others, auto_parts. It stays for mobiles, tyres, furniture, books, instruments and vehicles.
- Statutory registrations moved to the shop profile, so they left the insurance_finance and staffing_security forms. Duplicate warranty fields removed from interior_design.

**Variant axes (6 changed, 15 written out explicitly).**
- bakery: dropped `food_type`. Veg or egg is a listing fact to filter on, and it stays in the form.
- kids_baby: `size, colour, pack_count` (replaces `age_group`, which duplicated size). books: `binding, edition` (`language` is multi_enum and stays a listing field).
- Add-ons removed as axes: tailor loses `lining_included`; beauty_parlour replaces `package_includes` (a textarea) with `package`.
- stationery: `ink_colour, paper_size, page_count`.
- The 15 sub-categories whose research listed more than 3 axes now name their 3 explicitly. Other `per_variant` attributes can still be axes when a store enables them (DESIGN §4).
- vehicle_dealer keeps `variant, colour, fuel_type` for new vehicles. Used vehicles are single-unit listings with no axes, per R3's notes.

**Set rows (5 added, 8 removed).**
- Added: `parts_type` (OEM/aftermarket) to auto_parts, `generic_medicine` to pharmacy, `package` to beauty_parlour, `coverage_sqft` to paints and tiles_plywood.
- Removed:
  - `generic` from restaurant, fast_food and cafe (LM does not apply to dishes).
  - The services' duplicate `warranty_period` from interior_design and vehicle_repair; `warranty_days` covers it.
  - `capacity` (vehicle seats/payload) from wedding_venue, which uses `guest_capacity`.
  - The old `coverage` row from paints and tiles_plywood.

## 5. Decisions a human must take
1. **Tobacco:** COTPA s.5 bars advertising, and some states ban online sale. Should paan_shop, kirana and wholesale allow tobacco listings at all? (R1, R5)
2. **Online medicine sale:** the e-pharmacy rules are not notified. Get legal sign-off before enabling Rx (Schedule H/H1/X) listings; Schedule X should probably be blocked. (R5)
3. **Advocates (BCI r.36) and CAs (ICAI):** prices, ratings and "book now" may count as soliciting. Allow the legal sub-category? Hide price for CAs? (R4, R5)
4. **Doctor listings:** IMC 2002 advertising limits, and whether the NMC 2023 regulations have been revived. (R5)
5. **E-commerce display duties:** confirm against the gazette text which LM(PC) r.6(10) / CP(E-Com) r.6(5) items must show online. In particular: month/year of manufacture, expiry/best-before, and the r.6(10A) country-of-origin filter (in force 01-07-2026?). The answer can add statutory fields to every packaged-goods form. (R2–R5)
6. **FSS L&D reg.9(2)–(4):** do the veg/non-veg logo and allergen duties on menus apply to every eatery or only to chains? I made restaurant calories recommended and allergens shown but not enforced; reverse this if it applies to all. (R1, R5)
7. **`food_type` values:** egg is legally non-veg (brown mark), but buyers filter on "egg". Should `vegan` move to `dietary_preference`? The legacy lowercase codes are kept until this is decided. (R1)
8. **Hallmarking:** mandatory only in notified districts (with exemptions, e.g. under 2 g). Should `hallmarked`, `huid` and `purity` be statutory for every jeweller, or depend on the store's district? (R2, R5)
9. **BIS QCO and BEE coverage:** whether the ISI mark, CRS R-number and star rating are statutory depends on product type, not sub-category. This needs a per-product-type list. (R2, R3, R5)
10. **GST slabs after the 2025 rationalisation:** confirm the `gst_rate` values (12% and 28% were kept; 3% and 0.25% added). (R4)
11. **Shop-profile vs listing:** `timings`, `service_area`, `practitioner_registration_no` and `bar_council_enrolment_no` are still per listing. Confirm, and build the shop onboarding form for the 27 `shop_attributes`. (R4, R5)
12. **Conditional fields:** the form engine has no "show if" (e.g. AMFI ARN only for mutual funds, RERA only for project units, vehicle registration only for used vehicles). `form_optional` is a stopgap. (R4)
13. **Live animals and pet-shop registration:** allow live-animal listings? The State AWB registration under the Pet Shop Rules 2018 is unverified. (R4)
14. **Vehicle registration numbers** are personal data under the DPDP Act 2023: store them masked on public listings? (R5)
15. **Rentals inside product sub-categories** (medical_supply rentals, used/new vehicle dealer): keep them in one sub-category with flags, or route them to rental sub-categories? `product_type` and `service_type` are single open enums whose examples differ per sub-category; should they be split? (R1, R3)
