# Sub-category attribute research spec

Goal: for each of the 118 sub-categories in `inputs/sub_categories.json`, record **every
attribute the catalogue and system should know**, which of them are **variant axes**, and the
**smallest realistic form** a shop must fill (the "basic form"). Everything else stays in the
catalogue and an admin can enable it for a store (existing `shop_form_overrides` flow).

Research output is data, not code. One JSON file per agent in `research/`, shaped as below.

## What is NOT an attribute (already listing columns)

`name`, `description`, `price`, `mrp`, `unit`, `img_url`, `is_available`, `stock_qty`,
`stock_mode`, `low_stock_threshold`, `listing_type`, `section`, `category`, `sub_category`.
Do not redefine these. (`price`, `mrp` and stock will become per-variant; note in
`variant_notes` if MRP rules differ per variant.)

## File shape

```json
{
  "agent": "R1",
  "scope": ["food_groceries", "health_wellness"],
  "generated_at": "2026-11-24",
  "attributes": {
    "<key>": {
      "label": "Fabric",
      "type": "text | textarea | number | boolean | date | enum | multi_enum | measure",
      "unit_family": "mass | volume | length | area | power | energy | data | duration | count | temperature | currency | percent | null",
      "default_unit": "g",
      "values": ["Cotton", "Silk"],
      "open_values": true,
      "description": "one line: what it means",
      "shopify_handle": "fabric",
      "ondc_attribute": "fabric",
      "sources": [{ "kind": "law|ondc|shopify|gs1|bis|regulator|marketplace|industry", "ref": "Legal Metrology (Packaged Commodities) Rules 2011, r.6(1)(c)", "url": "https://...", "verified": true }]
    }
  },
  "sub_categories": {
    "<sub_category_key>": {
      "applies_to": "product | food | service | rental",
      "attributes": [
        {
          "key": "fabric",
          "level": "statutory | required | recommended | optional",
          "owner": "catalog | store",
          "per_variant": false,
          "filterable": true,
          "note": "optional, why"
        }
      ],
      "variant_axes": ["size", "colour"],
      "variant_notes": "e.g. pack size creates separate GTIN and MRP per variant",
      "basic_form": ["gender", "fabric"],
      "basic_form_reason": "one line"
    }
  },
  "open_questions": ["things a human must decide"]
}
```

## Rules

1. **Keys**: `snake_case`, singular, English. **Reuse** a key from
   `inputs/existing_field_keys.json` or from the live catalogue item keys (`diet`, `generic`,
   `dosage_form`, `allergens`, `ingredients`-style) whenever the meaning matches. Use `colour`
   (Indian/British spelling, already used). Define an attribute once in `attributes` and
   reference it from every sub-category that uses it.
2. **Coverage**: aim for the complete set a serious catalogue (ONDC, Shopify taxonomy, GS1,
   large Indian marketplaces) records for that kind of shop — typically 10–40 per product
   sub-category, 6–20 per service/rental. Services and rentals get service attributes
   (duration, service area, licence/registration numbers, capacity, deposit, cancellation…),
   not product ones.
3. **Levels**
   - `statutory`: an Indian law or regulator requires it to be declared/displayed for this
     sale (online or offline). **Must cite the rule with a URL**.
   - `required`: the listing is not meaningful or sellable without it (e.g. metal for
     jewellery, dosage form for medicine).
   - `recommended`: buyers routinely filter or decide on it.
   - `optional`: everything else worth knowing.
4. **Owner**: `catalog` = a fact about the product that is the same in every shop (brand,
   model, ingredients, net quantity, manufacturer). `store` = differs per shop or per sale
   (batch, expiry, service area, visiting charge, condition of a used item).
5. **Variant axes**: an attribute is a variant axis when the same product is sold in
   several values, each with its own stock/price (and often its own GTIN/MRP): size, colour,
   storage, RAM, pack size, weight, flavour, cut, room type, duration plan… List them in
   order of selection. Mark attributes whose value differs per SKU (`gtin`, `net_quantity`,
   `mrp`-related declarations) with `per_variant: true` even if they are not axes.
6. **Basic form**: the **least** a shop must fill for a realistic listing in this
   sub-category, **2–5 keys**, excluding the listing columns above. Include every
   `statutory` attribute with `owner: store`. Prefer fields buyers filter on. Variant axes
   may be in the basic form (they define the SKUs).
7. **Citations**: every attribute needs ≥1 source. Never invent URLs or rule numbers. If you
   could not confirm a rule, keep it with `"verified": false` and add it to
   `open_questions`. Prefer primary sources: legislative.gov.in / egazette.gov.in,
   consumeraffairs.nic.in (Legal Metrology), fssai.gov.in, bis.gov.in, cdsco.gov.in,
   ONDC docs (ondc.org / ONDC GitHub), github.com/Shopify/product-taxonomy, gs1.org.
8. Enum values: canonical display values, Indian context (e.g. sizes include Free Size,
   metals include 22K). Mark `open_values: true` when shops need to type their own.
9. Output must be valid JSON. Validate with `node -e "JSON.parse(require('fs').readFileSync(f))"`.
