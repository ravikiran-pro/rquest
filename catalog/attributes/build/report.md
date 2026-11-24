# Attribute build report

Files: R5.json, R1.json, R2.json, R3.json, R4.json  ·  attributes: 854  ·  sub-categories: 118/118  ·  set rows: 3253

## Shop-profile attributes (20) — out of listing forms
- seller_fssai_licence_no (statutory, 26 sub-categories)
- seller_legal_name_address (statutory, 118 sub-categories)
- seller_grievance_officer (statutory, 118 sub-categories)
- return_policy (statutory, 118 sub-categories)
- price_breakup_charges (statutory, 118 sub-categories)
- gstin (statutory, 118 sub-categories)
- shop_establishment_reg_no (statutory, 118 sub-categories)
- drug_licence_no (statutory, 4 sub-categories)
- medical_device_sale_registration_no (statutory, 2 sub-categories)
- clinical_establishment_reg_no (statutory, 8 sub-categories)
- pcpndt_registration_no (statutory, 3 sub-categories)
- bis_jeweller_registration_no (statutory, 1 sub-categories)
- agri_input_dealer_licence_no (statutory, 2 sub-categories)
- rera_agent_registration_no (statutory, 1 sub-categories)
- rto_dealer_authorisation_no (statutory, 1 sub-categories)
- common_carrier_registration_no (statutory, 2 sub-categories)
- driving_school_licence_no (statutory, 1 sub-categories)
- pet_shop_registration_no (statutory, 2 sub-categories)
- coaching_registration_no (statutory, 1 sub-categories)
- psara_licence_no (statutory, 1 sub-categories)

## Errors (0)

## Warnings (87)
- type conflict "manufacture_month_year": R5=text, R1=date (kept text)
- type conflict "storage_instructions": R5=textarea, R1=enum (kept textarea)
- type conflict "composition": R5=textarea, R1=text (kept textarea)
- type conflict "generic": R5=text, R1=boolean (kept text)
- type conflict "manufacturer": R5=text, R2=textarea (kept text)
- type conflict "consumer_care_details": R5=textarea, R2=text (kept textarea)
- type conflict "colour": R1=text, R2=enum (kept text)
- type conflict "material": R1=text, R2=enum (kept text)
- type conflict "duration_mins": R1=number, R2=measure (kept number)
- type conflict "event_type": R1=multi_enum, R2=enum (kept multi_enum)
- type conflict "cancellation_policy": R1=textarea, R2=text (kept textarea)
- type conflict "visiting_charge": R1=number, R2=measure (kept number)
- type conflict "warranty_days": R5=number, R2=measure (kept number)
- type conflict "security_deposit": R1=number, R2=measure (kept number)
- type conflict "advance_booking_days": R1=number, R3=measure (kept number)
- type conflict "battery_capacity": R2=number, R3=measure (kept number)
- type conflict "care_instructions": R2=enum, R3=textarea (kept enum)
- type conflict "colour": R1=text, R3=enum (kept text)
- type conflict "composition": R5=textarea, R3=text (kept textarea)
- type conflict "consumer_care_details": R5=textarea, R3=text (kept textarea)
- type conflict "coverage": R2=enum, R3=measure (kept enum)
- type conflict "delivery_area": R1=text, R3=enum (kept text)
- type conflict "duration_mins": R1=number, R3=measure (kept number)
- type conflict "experience_years": R1=number, R3=measure (kept number)
- type conflict "manufacturer": R5=text, R3=textarea (kept text)
- type conflict "material": R1=text, R3=enum (kept text)
- type conflict "min_order_qty": R2=text, R3=number (kept text)
- type conflict "operator": R2=multi_enum, R3=enum (kept multi_enum)
- type conflict "pack_size": R1=text, R3=measure (kept text)
- type conflict "security_deposit": R1=number, R3=measure (kept number)
- type conflict "service_type": R2=enum, R3=multi_enum (kept enum)
- type conflict "session_count": R1=enum, R3=number (kept enum)
- type conflict "sweep_size": R2=measure, R3=enum (kept measure)
- type conflict "visiting_charge": R1=number, R3=measure (kept number)
- type conflict "voltage": R2=number, R3=measure (kept number)
- type conflict "warranty_days": R5=number, R3=measure (kept number)
- type conflict "warranty_months": R1=number, R3=measure (kept number)
- type conflict "weight": R1=text, R3=measure (kept text)
- type conflict "manufacturer": R5=text, R4=textarea (kept text)
- type conflict "manufacture_month_year": R5=text, R4=date (kept text)
- type conflict "colour": R1=text, R4=enum (kept text)
- type conflict "material": R1=text, R4=enum (kept text)
- type conflict "weight": R1=text, R4=measure (kept text)
- type conflict "delivery_days": R2=measure, R4=number (kept measure)
- type conflict "piece_count": R1=text, R4=number (kept text)
- type conflict "frame_size": R1=enum, R4=text (kept enum)
- type conflict "level": R1=enum, R4=text (kept enum)
- type conflict "delivery_slot": R1=multi_enum, R4=enum (kept multi_enum)
- type conflict "fragrance": R2=text, R4=enum (kept text)
- type conflict "flavour": R1=text, R4=enum (kept text)
- type conflict "pack_size": R1=text, R4=measure (kept text)
- type conflict "duration_hours": R2=measure, R4=number (kept measure)
- type conflict "inclusions": R3=multi_enum, R4=textarea (kept multi_enum)
- type conflict "advance_booking_hours": R3=measure, R4=number (kept measure)
- type conflict "specialty": R1=multi_enum, R4=text (kept multi_enum)
- type conflict "capacity": R3=measure, R4=number (kept measure)
- type conflict "area_sqft": R3=measure, R4=number (kept measure)
- type conflict "min_rental_days": R3=measure, R4=number (kept measure)
- type conflict "fuel_policy": R3=enum, R4=text (kept enum)
- type conflict "damage_policy": R2=text, R4=textarea (kept text)
- type conflict "print_type": R2=enum, R4=multi_enum (kept enum)
- type conflict "min_order_qty": R2=text, R4=measure (kept text)
- type conflict "grade": R1=enum, R4=text (kept enum)
- bakery: basic form trimmed from 9 to 6
- sweet_shop: basic form trimmed from 9 to 7
- restaurant: basic form trimmed from 7 to 6
- fast_food: basic form trimmed from 7 to 6
- ice_cream_juice: basic form trimmed from 7 to 6
- home_kitchen: basic form trimmed from 7 to 6
- kids_baby: 4 variant axes, kept the first 3
- computers: 4 variant axes, kept the first 3
- home_appliances: 5 variant axes, kept the first 3
- hardware_store: 5 variant axes, kept the first 3
- electrical_supplies: 8 variant axes, kept the first 3
- plumbing_sanitary: 5 variant axes, kept the first 3
- building_materials: 4 variant axes, kept the first 3
- tiles_plywood: 4 variant axes, kept the first 3
- furniture: 5 variant axes, kept the first 3
- kitchenware: 5 variant axes, kept the first 3
- variety_store: 4 variant axes, kept the first 3
- interior_design: 5 variant axes, kept the first 3
- auto_parts: 4 variant axes, kept the first 3
- tyres: 4 variant axes, kept the first 3
- vehicle_dealer: 4 variant axes, kept the first 3
- taxi_auto: 4 variant axes, kept the first 3
- stationery: 5 variant axes, kept the first 3
- books: 4 variant axes, kept the first 3

## Possible duplicate keys (18) — add to aliases.json
- "indian standard is": is_standard_no, bis_standard
- "rera project registration": rera_project_registration_no, rera_project_number
- "form": product_form, formulation
- "advance payment": advance_payment_percent, advance_payment
- "compatible with": compatibility, compatible_stove_type
- "for": gender, service_for, garment_for
- "activities": activities, activity
- "product type": product_type, pet_product_type
- "length": garment_length, length
- "style": jewellery_style, style
- "finish": finish, print_finish
- "coverage": coverage, coverage_area
- "battery type": battery_chemistry, battery_type
- "indoor outdoor": mounting, indoor_outdoor
- "vehicle": vehicle_class, vehicle_type
- "item type": sports_item_type, stationery_type, pooja_item_type
- "format": book_format, play_format
- "services": vet_service_type, photo_service_type, event_service_type, esevai_service, tax_service, it_service_type, marketing_service_type, staffing_service_type

## Unverified citations (534)
- manufacturer: Legal Metrology (Packaged Commodities) Rules 2011, r.6(1) mandatory declarations on every retail package (manufacturer/packer/importer name and address, common or generic name, net quantity, month and year of manufacture/packing/import, retail sale price, consumer-care details). Clause letters not confirmed from gazette text. https://legalmetrology.nagaland.gov.in/documents/11/9_The_Legal_Metrology_Package_Commodities_Rules_2011.pdf
- country_of_origin: LM(PC) Second Amendment Rules 2026 (reported to substitute r.6(10A) w.e.f. 01-07-2027) https://www.teamleaseregtech.com/updates/article/55254/legal-metrology-packaged-commodities-second-amendment-rules-2026/
- country_of_origin: Consumer Protection (E-Commerce) Rules 2020, r.6(5): marketplace sellers to provide product details incl. country of origin and expiry date (sub-rule number not confirmed from text) https://PRSINDIA.org/files/bills_acts/bills_parliament/2021/Consumer%20Protection%20(E-Commerce)%20Rules,%202020.pdf
- country_of_origin: Legal Metrology (Packaged Commodities) Amendment Rules 2026, r.6(10A): e-commerce must offer searchable/sortable country-of-origin filter for imported goods (commencement date to confirm) https://www.scconline.com/blog/post/2026/02/21/legal-metrology-packaged-commodities-amendment-rules-2026-explained/
- country_of_origin: Legal Metrology (Packaged Commodities) Amendment Rules 2026 (notified 13 Feb 2026): r.6(10A) searchable and sortable country-of-origin filter for imported goods on e-commerce (reported in secondary sources; consolidated text not read) https://www.khaitanco.com/sites/default/files/2026-03/Legal%20Metrology%20%28Packaged%20Commodities%29%20Rules%202011.pdf
- generic: Legal Metrology (Packaged Commodities) Rules 2011, r.6(1) mandatory declarations on every retail package (manufacturer/packer/importer name and address, common or generic name, net quantity, month and year of manufacture/packing/import, retail sale price, consumer-care details). Clause letters not confirmed from gazette text. https://legalmetrology.nagaland.gov.in/documents/11/9_The_Legal_Metrology_Package_Commodities_Rules_2011.pdf
- net_quantity: Legal Metrology (Packaged Commodities) Rules 2011, r.6(1) mandatory declarations on every retail package (manufacturer/packer/importer name and address, common or generic name, net quantity, month and year of manufacture/packing/import, retail sale price, consumer-care details). Clause letters not confirmed from gazette text. https://legalmetrology.nagaland.gov.in/documents/11/9_The_Legal_Metrology_Package_Commodities_Rules_2011.pdf
- unit_sale_price: LM(PC) Rules 2011 r.6(1) unit sale price declaration (inserted by LM(PC) Amendment Rules 2022; exact clause letter not confirmed) https://consumeraffairs.nic.in/organisation-and-units/division/legal-metrology/updated-package-commodity-rule
- manufacture_month_year: Legal Metrology (Packaged Commodities) Rules 2011, r.6(1) mandatory declarations on every retail package (manufacturer/packer/importer name and address, common or generic name, net quantity, month and year of manufacture/packing/import, retail sale price, consumer-care details). Clause letters not confirmed from gazette text. https://legalmetrology.nagaland.gov.in/documents/11/9_The_Legal_Metrology_Package_Commodities_Rules_2011.pdf
- consumer_care_details: Legal Metrology (Packaged Commodities) Rules 2011, r.6(1) mandatory declarations on every retail package (manufacturer/packer/importer name and address, common or generic name, net quantity, month and year of manufacture/packing/import, retail sale price, consumer-care details). Clause letters not confirmed from gazette text. https://legalmetrology.nagaland.gov.in/documents/11/9_The_Legal_Metrology_Package_Commodities_Rules_2011.pdf
- dimensions: LM(PC) Rules 2011 r.6(1) / Schedules: dimensions/size declaration for commodities where relevant (exact clause not confirmed) https://consumeraffairs.nic.in/organisation-and-units/division/legal-metrology/updated-package-commodity-rule
- dimensions: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- expiry_date: Drugs and Cosmetics Rules 1945, r.96: label particulars (proper name, net content, active ingredient content, batch no., mfg licence no., mfg and expiry dates, manufacturer name/address) – clause list not confirmed in this research https://cdsco.gov.in/opencms/opencms/en/Acts-and-rules/Drugs-Rules/
- expiry_date: Consumer Protection (E-Commerce) Rules 2020, r.6(5): marketplace sellers to provide product details incl. country of origin and expiry date (sub-rule number not confirmed from text) https://PRSINDIA.org/files/bills_acts/bills_parliament/2021/Consumer%20Protection%20(E-Commerce)%20Rules,%202020.pdf
- expiry_date: Common Indian trade practice for this kind of shop (no single primary source)
- batch_no: Cosmetics Rules 2020, r.34 labelling of cosmetics (name, manufacturer & address, ingredients, net content, batch, date of manufacture, use-before date, manufacturing licence no. where required); import registration (Form COS-1/COS-2) https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2022/cos_rules/Cosmetics%20Rules%202020.pdf
- batch_no: Drugs and Cosmetics Rules 1945, r.96: label particulars (proper name, net content, active ingredient content, batch no., mfg licence no., mfg and expiry dates, manufacturer name/address) – clause list not confirmed in this research https://cdsco.gov.in/opencms/opencms/en/Acts-and-rules/Drugs-Rules/
- batch_no: Common Indian trade practice for this kind of shop (no single primary source)
- warranty_days: Indian service marketplaces (Urban Company, Justdial) booking/listing fields
- warranty_days: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- warranty_days: Urban Company service listings (packages, duration, inclusions, cancellation/reschedule) — not fetched in this session https://www.urbancompany.com/
- seller_legal_name_address: Consumer Protection (E-Commerce) Rules 2020, r.5: marketplace e-commerce entity must display seller details (business name, address, customer care) and grievance mechanism https://hsalegal.com/wp-content/uploads/2020/09/HSA-Corp-Comm-Law-Policy-The-Consumer-Protection-E-commerce-Rules-2020.pdf
- hsn_code: CGST Rules 2017, r.46 — tax invoice particulars incl. HSN/SAC code, rate of tax (not confirmed from primary text)
- hsn_code: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- food_type: FSS (Labelling and Display) Regulations 2020, reg.9(2)-(4): veg/non-veg mark and allergen information on menus of food service establishments (text not retrieved) https://www.fssai.gov.in/upload/uploadfiles/files/Compendium_Labelling_Display_17_10_2022.pdf
- food_type: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- ingredients: Cosmetics Rules 2020, r.34 labelling of cosmetics (name, manufacturer & address, ingredients, net content, batch, date of manufacture, use-before date, manufacturing licence no. where required); import registration (Form COS-1/COS-2) https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2022/cos_rules/Cosmetics%20Rules%202020.pdf
- allergens: FSS (Labelling and Display) Regulations 2020, reg.9(2)-(4): veg/non-veg mark and allergen information on menus of food service establishments (text not retrieved) https://www.fssai.gov.in/upload/uploadfiles/files/Compendium_Labelling_Display_17_10_2022.pdf
- calorie_kcal_per_serving: FSSAI order to e-commerce FBOs (14 Jun 2022) extending reg.9 display requirements to online platforms (secondary report) https://www.mondaq.com/india/healthcare/1231230/display-of-information-by-ecommerce-food-business-operators-fssai
- composition: Drugs and Cosmetics Rules 1945, r.96: label particulars (proper name, net content, active ingredient content, batch no., mfg licence no., mfg and expiry dates, manufacturer name/address) – clause list not confirmed in this research https://cdsco.gov.in/opencms/opencms/en/Acts-and-rules/Drugs-Rules/
- schedule_drug: Draft Drugs and Cosmetics (Amendment) Rules 2018 on e-pharmacy (Form 18AA registration) - NOT notified; status of online sale of drugs unsettled https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2018/UploadCommitteeFiles/CommitteeReport_e-pharmacy_14.pdf
- drug_manufacturing_licence_no: Drugs Rules 1945 r.96: manufacturing licence number on label ("Mfg. Lic. No.") (clause not confirmed) https://cdsco.gov.in/opencms/opencms/en/Acts-and-rules/Drugs-Rules/
- drug_licence_no: Drugs Rules 1945: retail/wholesale sale licences (Forms 20, 21, 20B, 21B; 20C for homoeopathic) and display of licence at premises (rule/clause not confirmed) https://cdsco.gov.in/opencms/opencms/en/Acts-and-rules/Drugs-Rules/
- drug_licence_no: Draft Drugs and Cosmetics (Amendment) Rules 2018 on e-pharmacy (Form 18AA registration) - NOT notified; status of online sale of drugs unsettled https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2018/UploadCommitteeFiles/CommitteeReport_e-pharmacy_14.pdf
- medical_device_sale_registration_no: Medical Devices Rules 2017 (as amended 2022): registration for sale/stock/distribution of medical devices (Form MD-41 application, MD-42 certificate) - rule number not confirmed https://cdsco.gov.in/opencms/opencms/en/Acts-and-rules/Medical-Devices-Rules/
- cosmetic_licence_no: Cosmetics Rules 2020, r.34 labelling of cosmetics (name, manufacturer & address, ingredients, net content, batch, date of manufacture, use-before date, manufacturing licence no. where required); import registration (Form COS-1/COS-2) https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2022/cos_rules/Cosmetics%20Rules%202020.pdf
- bis_licence_no: BIS: 10 steps for BIS toy certification (licence CM/L number, IS 9873 / IS 15644) https://www.bis.gov.in/wp-content/uploads/2020/10/10-steps-for-BIS-toy-certification.pdf
- bee_star_rating: BEE Standards & Labelling (Energy Conservation Act 2001): star label mandatory on appliance/packaging for notified appliances; BEE has no rule on display manner on e-commerce (Prayas analysis) https://energy.prayaspune.org/power-perspectives/stars-on-web-energy-efficiency-star-labels-should-be-prominently-and-uniformly-displayed-on-the-e-commerce-platforms
- bee_star_rating: Press report: star labelling mandatory from 1 Jan 2026 for refrigerators, televisions, LPG stoves, cooling towers, chillers (and others) https://www.freepressjournal.in/business/government-mandates-star-labelling-for-more-appliances-from-january-1
- bee_star_rating: BEE (Appliance Labelling) Regulations 2025 (notified 10 Jul 2025): revised label incl. QR code https://www.business-standard.com/india-news/appliance-labels-india-qr-code-star-rating-origin-bee-2025-rules-125071800380_1.html
- tobacco_product: Cigarettes and Other Tobacco Products Act 2003: no sale to persons under 18 or within 100 m/yards of educational institutions; pictorial health warnings (section numbers s.6 / s.7 not confirmed from primary text) https://en.wikipedia.org/wiki/Cigarettes_and_Other_Tobacco_Products_Act
- practitioner_registration_no: NMC Registered Medical Practitioner (Professional Conduct) Regulations 2023 - unique registration ID on prescriptions; reported held in abeyance 23-08-2023 https://www.nmc.org.in/rules-regulations/national-medical-commission-registered-medical-practitioner-professional-conduct-regulations-2023-reg/
- clinical_establishment_reg_no: Clinical Establishments (Registration and Regulation) Act 2010: registration of clinical establishments (adopting States/UTs; others have own Acts e.g. state nursing-home Acts) https://clinicalestablishments.mohfw.gov.in/sites/default/files/2025-12/Minutes_of_16th_meeting%20%281%29.pdf
- pcpndt_registration_no: PC&PNDT Rules (India Code notification) https://www.indiacode.nic.in/bitstream/123456789/13676/1/pcnpndtnotification.pdf
- pcpndt_registration_no: PC&PNDT Act 1994 and Rules 1996: registration of ultrasound/imaging centres; display of registration certificate and bilingual board that sex determination is not done (rule number not confirmed) https://dhsr.hp.gov.in/Files/PC-PNDT%20RULES%20-1996_0.pdf
- rera_agent_registration_no: AP RERA advertisement guidelines (state example of registration number in advertisements) https://rera.ap.gov.in/RERA/Views/AdvertisementGuidelines.aspx
- rera_project_registration_no: AP RERA advertisement guidelines (state example of registration number in advertisements) https://rera.ap.gov.in/RERA/Views/AdvertisementGuidelines.aspx
- irdai_registration_no: IRDAI (Insurance Advertisements and Disclosure) Regulations 2021: advertisements to carry registered name, IRDAI registration number (regulations reported since replaced) https://financialservices.gov.in/beta/sites/default/files/2022-12/70.%20IRDAI%20Insurance%20Advertisements%20and%20Disclosure%20Regulations%202021_0.pdf
- sebi_registration_no: SEBI circular (Feb 2026, Ease of Doing Investment): regulated entities and agents to show SEBI-registered name and registration number on social-media/online communications https://www.sebi.gov.in/sebi_data/attachdocs/feb-2026/1772103201432.pdf
- sebi_registration_no: AMFI/SEBI: mutual fund distributors must describe themselves as 'AMFI Registered Mutual Fund Distributor' with ARN on communications; SEBI circular (26 Feb 2026, w.e.f. 1 May 2026) requires regulated entities and agents to show registered name and registration number on marketing material (secondary reports) https://www.amfiindia.com/Themes/Theme1/downloads/FAQsonRoleofMFDsAdvts.pdf
- vehicle_registration_no: Central Motor Vehicles Rules 1989 (r.24 driving school licence in Form 11; registration provisions; r.55A/55B authorisation of dealers in registered pre-owned vehicles - 2022 amendment, not confirmed) https://cgtransport.gov.in/Notification/CMVR_1989.pdf
- rto_dealer_authorisation_no: Central Motor Vehicles Rules 1989 (r.24 driving school licence in Form 11; registration provisions; r.55A/55B authorisation of dealers in registered pre-owned vehicles - 2022 amendment, not confirmed) https://cgtransport.gov.in/Notification/CMVR_1989.pdf
- brand: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- gtin: GS1 Global Trade Item Number (GTIN); one per trade item / size / colour / pack https://www.gs1.org/standards/id-keys/gtin
- gtin: GS1 GTIN (EAN-13) one per trade item / pack variant; GS1 India issues Indian prefixes https://www.gs1.org/standards/id-keys/gtin
- pack_size: IndiaMART building-material/hardware listing specs (grade, size, brand, packaging size, minimum order quantity) https://www.indiamart.com/
- pack_size: Legal Metrology (Packaged Commodities) Rules 2011, r.6(1) mandatory declarations on every retail package (manufacturer/packer/importer name and address, common or generic name, net quantity, month and year of manufacture/packing/import, retail sale price, consumer-care details). Clause letters not confirmed from gazette text. https://legalmetrology.nagaland.gov.in/documents/11/9_The_Legal_Metrology_Package_Commodities_Rules_2011.pdf
- shelf_life: Cosmetic labels PAO symbol; Nykaa PDP 'shelf life'
- sold_by: Legal Metrology (Packaged Commodities) Rules 2011, r.26 (exemptions, incl. loose goods weighed at sale) – exact clause not confirmed https://legalmetrology.nagaland.gov.in/documents/11/9_The_Legal_Metrology_Package_Commodities_Rules_2011.pdf
- sold_by: Fabric shops sell per metre or per piece/set
- sold_by: IndiaMART building-material/hardware listing specs (grade, size, brand, packaging size, minimum order quantity) https://www.indiamart.com/
- sold_by: Common Indian trade practice for this kind of shop (no single primary source)
- fortified: FSS (Fortification of Foods) Regulations 2018: "+F" logo on fortified staples (not confirmed in this research) https://fssai.gov.in/cms/food-safety-and-standards-regulations.php
- grade: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- age_restricted: Cigarettes and Other Tobacco Products Act 2003: no sale to persons under 18 or within 100 m/yards of educational institutions; pictorial health warnings (section numbers s.6 / s.7 not confirmed from primary text) https://en.wikipedia.org/wiki/Cigarettes_and_Other_Tobacco_Products_Act
- piece_count: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- weight: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- custom_orders: Furniture marketplaces (Pepperfry, Urban Ladder) filters: material, wood type, finish, seating capacity, bed size, storage, assembly https://www.pepperfry.com/
- custom_orders: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- custom_orders: Common Indian trade practice for this kind of shop (no single primary source)
- delivery_area: IndiaMART building-material/hardware listing specs (grade, size, brand, packaging size, minimum order quantity) https://www.indiamart.com/
- delivery_area: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- service_area: Urban Company/Justdial service coverage
- service_area: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- delivery_slot: Common Indian trade practice for this kind of shop (no single primary source)
- variant: Common Indian trade practice for this kind of shop (no single primary source)
- plan_period: Indian service marketplaces (Urban Company, Justdial) booking/listing fields
- plan_period: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- plan_period: Playo venue booking (sport, slot, duration, amenities, price per slot) — not fetched in this session https://playo.co/
- plan_period: Common Indian trade practice for this kind of shop (no single primary source)
- advance_booking_days: Indian service marketplaces (Urban Company, Justdial) booking/listing fields
- advance_booking_days: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- advance_booking_days: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- guest_capacity: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- event_type: WedMeGood/Urban Company makeup packages
- event_type: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- at_your_venue: Indian service marketplaces (Urban Company, Justdial) booking/listing fields
- at_your_venue: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- setup_included: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- setup_included: Common Indian trade practice for this kind of shop (no single primary source)
- cancellation_policy: Service booking platforms
- cancellation_policy: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- cancellation_policy: Urban Company service listings (packages, duration, inclusions, cancellation/reschedule) — not fetched in this session https://www.urbancompany.com/
- strength: Drugs and Cosmetics Rules 1945, r.96: label particulars (proper name, net content, active ingredient content, batch no., mfg licence no., mfg and expiry dates, manufacturer name/address) – clause list not confirmed in this research https://cdsco.gov.in/opencms/opencms/en/Acts-and-rules/Drugs-Rules/
- mfg_licence_no: Drugs and Cosmetics Rules 1945, r.96: label particulars (proper name, net content, active ingredient content, batch no., mfg licence no., mfg and expiry dates, manufacturer name/address) – clause list not confirmed in this research https://cdsco.gov.in/opencms/opencms/en/Acts-and-rules/Drugs-Rules/
- system_of_medicine: National Commission for Indian System of Medicine Act 2020: Board of Ethics and Registration for Ayurveda, Unani, Siddha, Sowa-Rigpa practitioners https://PRSINDIA.org/files/bills_acts/bills_parliament/2019/Nationl%20commission%20for%20Indian%20system%20of%20medicine%20bill,%202019.pdf
- age_group: IS 9873 (Part 1) safety-of-toys warning/age-grading markings (e.g. 'Not suitable for children under 3 years') — clause not confirmed https://services.bis.gov.in/tmp/Toys-Guidelines-Final_2BsA_2020-07-24.pdf
- age_group: Flipkart toys store filters (age, type, brand, character) — not fetched in this session https://flipkart.com/toys-online-store
- device_type: Urban Company / brand service categories
- model_number: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- warranty_months: IndiaMART building-material/hardware listing specs (grade, size, brand, packaging size, minimum order quantity) https://www.indiamart.com/
- warranty_months: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- frame_size: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- gender: NoBroker rental filters (preferred tenant Family/Bachelors/Company, BHK, furnishing, price, area) — via third-party scraper documentation https://apify.com/solidcode/nobroker-scraper
- gender: Common Indian trade practice for this kind of shop (no single primary source)
- condition: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- consultation_mode: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- practitioner: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- qualification: Indian service marketplaces (Urban Company, Justdial) booking/listing fields
- qualification: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- qualification: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- experience_years: Indian service marketplaces (Urban Company, Justdial) booking/listing fields
- experience_years: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- experience_years: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- specialty: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- language: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- duration_mins: Urban Company shows service duration
- duration_mins: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- duration_mins: Urban Company service listings (packages, duration, inclusions, cancellation/reschedule) — not fetched in this session https://www.urbancompany.com/
- appointment_required: Indian service marketplaces (Urban Company, Justdial) booking/listing fields
- appointment_required: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- timings: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- timings: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- visiting_charge: Urban Company/brand service visiting charge
- visiting_charge: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- visiting_charge: Urban Company service listings (packages, duration, inclusions, cancellation/reschedule) — not fetched in this session https://www.urbancompany.com/
- insurance_cashless: NABH accreditation of hospitals – voluntary; not confirmed in this research
- accreditation: NABH accreditation of hospitals – voluntary; not confirmed in this research
- emergency_24x7: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- bed_count: Clinical Establishments (Registration and Regulation) Act 2010: registration of clinical establishments (adopting States/UTs; others have own Acts e.g. state nursing-home Acts) https://clinicalestablishments.mohfw.gov.in/sites/default/files/2025-12/Minutes_of_16th_meeting%20%281%29.pdf
- room_type: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- amenities: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- amenities: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- amenities: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- amenities: Playo venue booking (sport, slot, duration, amenities, price per slot) — not fetched in this session https://playo.co/
- pricing_unit: Laundry per piece / per kg
- pricing_unit: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- pricing_unit: IndiaMART building-material/hardware listing specs (grade, size, brand, packaging size, minimum order quantity) https://www.indiamart.com/
- pricing_unit: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- pricing_unit: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- imaging_modality: PC&PNDT Act 1994 and Rules 1996: registration of ultrasound/imaging centres; display of registration certificate and bilingual board that sex determination is not done (rule number not confirmed) https://dhsr.hp.gov.in/Files/PC-PNDT%20RULES%20-1996_0.pdf
- prescription_needed_for_test: PC&PNDT Act 1994 and Rules 1996: registration of ultrasound/imaging centres; display of registration certificate and bilingual board that sex determination is not done (rule number not confirmed) https://dhsr.hp.gov.in/Files/PC-PNDT%20RULES%20-1996_0.pdf
- caregiver_type: Indian Nursing Council Act 1947 / State Nursing Council registration of nurses (ANM/GNM/B.Sc) – not confirmed in this research
- shift: Common Indian trade practice for this kind of shop (no single primary source)
- background_verified: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- security_deposit: Indian service marketplaces (Urban Company, Justdial) booking/listing fields
- security_deposit: NoBroker rental filters (preferred tenant Family/Bachelors/Company, BHK, furnishing, price, area) — via third-party scraper documentation https://apify.com/solidcode/nobroker-scraper
- security_deposit: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- nurse_registration_no: Indian Nursing Council Act 1947 / State Nursing Council registration of nurses (ANM/GNM/B.Sc) – not confirmed in this research
- demo_class: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- demo_class: Common Indian trade practice for this kind of shop (no single primary source)
- batch_size: Common Indian trade practice for this kind of shop (no single primary source)
- level: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- level: Common Indian trade practice for this kind of shop (no single primary source)
- mode: Common Indian trade practice for this kind of shop (no single primary source)
- air_conditioned: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- air_conditioned: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- manufacture_date: Legal Metrology (Packaged Commodities) Amendment Rules 2017: e-commerce entity must display r.6(1) declarations online (reported as r.6(10)); online display reportedly excludes date of manufacture/packing — sub-rule number and exception not confirmed against the gazette https://www.lkslaw.com/insights/articles/aiming-greater-transparency-on-sale-of-packaged-commodity-online
- gst_rate: CGST Rules 2017, r.46 — tax invoice particulars incl. HSN/SAC code, rate of tax (not confirmed from primary text)
- warranty_type: Amazon.in / Flipkart / Croma listing 'warranty type' field
- warranty_terms: Battery/appliance listings on Amazon.in, Croma (free replacement + pro-rata; compressor warranty)
- size_chart: Myntra/Ajio size chart on every apparel PDP
- size_chart: Myntra listing attributes (via Fynd Myntra attribute API docs) https://documentation.fynd.com/commerce/docs/openapi/listings-management/myntra/attribute-myntra
- fabric_width: Fabric-by-metre listings (width in inches/cm)
- loom_type: India Handloom Brand / Handloom Mark (Ministry of Textiles) voluntary label
- weave: Saree weave filters on Myntra/Ajio/Taneira
- weave: Geographical Indications of Goods (Registration and Protection) Act 1999 - registered GI textiles (e.g. Kanchipuram silk, Banarasi brocade)
- silk_mark: Silk Mark (Silk Mark Organisation of India, Central Silk Board) voluntary pure-silk label
- handloom_mark: India Handloom Brand / Handloom Mark (Ministry of Textiles) voluntary label
- bis_standard_mark: Toys (Quality Control) Order 2020: BIS Standard Mark mandatory for toys (IS 9873 / IS 15644) https://www.services.bis.gov.in/php/BIS_2.0/BISBlog/toys-quality-control-order/
- weight_grams: BIS (Hallmarking) Regulations 2018: invoice of hallmarked jewellery to show net weight, purity (carat & fineness) and hallmarking charges separately
- net_metal_weight: BIS (Hallmarking) Regulations 2018: invoice of hallmarked jewellery to show net weight, purity (carat & fineness) and hallmarking charges separately
- net_metal_weight: Tanishq/CaratLane/Kalyan PDPs show gross vs net weight
- making_charges: BIS (Hallmarking) Regulations 2018: invoice of hallmarked jewellery to show net weight, purity (carat & fineness) and hallmarking charges separately
- making_charges: Jewellers' price breakup (metal value + making + stone + GST)
- making_charge_basis: Jewellers' price breakup
- stone_weight: Diamond jewellery PDPs list carat weight
- diamond_clarity: Diamond jewellery PDPs (IGI/GIA grading)
- diamond_colour: Diamond jewellery PDPs (IGI/GIA grading)
- certification: Diamond jewellery PDPs (IGI/GIA/SGL certificates)
- jewellery_style: Indian jewellery filters (Temple, Kundan, Antique...)
- buyback_policy: Jeweller lifetime exchange/buyback policies
- capacity_litres: Backpack/appliance listings show capacity in litres
- diaper_type: FirstCry/Amazon.in diaper filters
- baby_weight_range: FirstCry diaper/carrier listings
- recommended_age: Toys (Quality Control) Order 2020: BIS Standard Mark mandatory for toys (IS 9873 / IS 15644) https://www.services.bis.gov.in/php/BIS_2.0/BISBlog/toys-quality-control-order/
- bpa_free: Feeding bottle listings (BPA-free claim)
- shade: Nykaa shade selector on PDPs
- coverage: IndiaMART building-material/hardware listing specs (grade, size, brand, packaging size, minimum order quantity) https://www.indiamart.com/
- fragrance_concentration: Nykaa fragrance filters (EDP/EDT/Body Mist/Attar)
- import_registration_no: CDSCO guidance on registration and import of cosmetics (import registration certificate number for imported cosmetics) https://cdsco.gov.in/opencms/export/sites/CDSCO_WEB/Pdf-documents/cosmetics/Guidance-Document-on-Registration-and-Import-of-cosmetics-into-India-converted.pdf
- service_type: Urban Company / Justdial service menus
- service_type: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- service_for: Urban Company salon for women/men
- duration_hours: Indian service marketplaces (Urban Company, Justdial) booking/listing fields
- duration_hours: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- service_mode: Urban Company/Justdial at-home vs at-salon
- service_mode: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- service_mode: Urban Company service listings (packages, duration, inclusions, cancellation/reschedule) — not fetched in this session https://www.urbancompany.com/
- hair_length: Salon menus price by hair length
- brands_used: Salon/parlour menus (L'Oreal, Schwarzkopf, O3+, Lotus...)
- stylist_gender: Urban Company women-only professionals
- package_includes: Makeup/salon package listings
- trial_available: Bridal makeup artist listings
- booking_advance: Makeup artist / service booking terms
- mehendi_style: Mehendi artist listings
- coverage_area: Mehendi artist price by coverage
- organic_henna: Mehendi artist listings
- garment_for: Indian service marketplaces (Urban Company, Justdial) booking/listing fields
- delivery_days: Indian service marketplaces (Urban Company, Justdial) booking/listing fields
- delivery_days: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- delivery_speed: Tailor/laundry express charges
- fabric_provided_by: Tailoring service listings
- lining_included: Blouse stitching price lists
- measurement_mode: Online tailoring services
- trial_fitting: Tailoring service listings
- turnaround: Indian service marketplaces (Urban Company, Justdial) booking/listing fields
- turnaround: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- turnaround: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- pickup_drop: Indian service marketplaces (Urban Company, Justdial) booking/listing fields
- pickup_drop: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- min_order_qty: Indian service marketplaces (Urban Company, Justdial) booking/listing fields
- min_order_qty: IndiaMART building-material/hardware listing specs (grade, size, brand, packaging size, minimum order quantity) https://www.indiamart.com/
- min_order_qty: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- garment_type: Laundry/dry clean rate cards
- damage_policy: Laundry service terms
- damage_policy: Common Indian trade practice for this kind of shop (no single primary source)
- brands_serviced: Repair shop listings on Justdial
- parts_type: Mobile repair price lists (original vs compatible display)
- parts_type: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- authorised_service: Brand service-centre locators
- free_estimate: Repair service listings
- operator: Paytm/PhonePe recharge operator lists
- operator: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- data_allowance: Operator plan listings
- speed_mbps: Broadband plan listings
- connection_type: Broadband/DTH plan listings
- installation_charge: Broadband/CCTV/appliance installation charges
- id_proof_required: DoT requirement for registration/verification of SIM Point-of-Sale (PoS) agents (2023)
- id_proof_required: Immigration and Foreigners Act 2025: hotels/guest houses/homestays must report foreign guests (form name and timeline per rules not confirmed) https://www.mondaq.com/india/general-immigration/1685320/new-immigration-and-foreigners-act
- id_proof_required: Common Indian trade practice for this kind of shop (no single primary source)
- ott_included: Operator plan listings
- refresh_rate: Flipkart/Amazon.in phone & TV filters
- rear_camera: Flipkart/Amazon.in phone filters (primary camera)
- front_camera: Flipkart/Amazon.in phone filters
- charging_wattage: Phone spec sheets
- imei: Pre-owned phone listings (Cashify) show IMEI-verified units
- battery_health: Refurbished phone listings (Cashify, Amazon Renewed)
- power_watts: Appliance spec sheets
- voltage: Appliance/battery spec sheets
- hdmi_ports: Flipkart TV filters
- battery_life: Headphone/laptop listings
- camera_resolution: CCTV listings 2MP/4MP/5MP
- print_type: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- print_type: Common Indian trade practice for this kind of shop (no single primary source)
- paper_size: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- paper_size: Common Indian trade practice for this kind of shop (no single primary source)
- ms_office: Laptop listings on Flipkart/Croma
- load_capacity_kg: Washing machine filters by kg
- cooling_capacity: AC filters by ton
- sweep_size: Fan listings 900/1200/1400 mm
- inverter_technology: Croma/Amazon.in appliance filters
- refrigerant: AC/fridge spec sheets
- condenser: AC listings (copper vs aluminium)
- jars: Mixer grinder listings
- installation_included: Croma/Amazon.in 'free installation'
- installation_included: Furniture marketplaces (Pepperfry, Urban Ladder) filters: material, wood type, finish, seating capacity, bed size, storage, assembly https://www.pepperfry.com/
- component_warranty: Appliance listings (compressor/motor warranty)
- battery_ah: Inverter battery listings 100/150/200 Ah
- va_rating: Inverter listings 700/900/1100 VA
- waveform: Inverter listings (pure sine vs square)
- panel_wattage: Solar panel listings
- epr_registration: Battery Waste Management (Amendment) Rules 2025: barcode/QR with EPR registration number on battery/pack or brochure https://egazette.gov.in/writeReadData/2025/261281.pdf
- old_battery_exchange: Battery dealer exchange offers
- channels: DVR/NVR listings 4/8/16 channel
- max_storage: DVR/Wi-Fi camera listings
- accident_free: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- advance_booking_hours: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- advance_booking_hours: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- advance_booking_hours: Playo venue booking (sport, slot, duration, amenities, price per slot) — not fetched in this session https://playo.co/
- area_basis: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- area_sqft: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- area_sqft: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- authorised_dealer: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- available_from: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- bathrooms: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- bed_type: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- bedrooms: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- bedrooms: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- booking_amount: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- brokerage: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- capacity: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- capacity: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- check_in_time: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- check_out_time: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- child_policy: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- construction_status: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- couple_friendly: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- deal_type: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- delivery_charge: IndiaMART building-material/hardware listing specs (grade, size, brand, packaging size, minimum order quantity) https://www.indiamart.com/
- departure_city: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- departure_dates: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- design_3d_included: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- design_fee: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- destination: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- distance_band: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- driving_range: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- electricity_billing: NoBroker rental filters (preferred tenant Family/Bachelors/Company, BHK, furnishing, price, area) — via third-party scraper documentation https://apify.com/solidcode/nobroker-scraper
- emergency_available: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- emission_norm: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- engine_capacity: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- exchange_accepted: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- exclusions: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- extra_bed_charge: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- facing: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- finance_available: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- floor: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- foreign_guests_accepted: Immigration and Foreigners Act 2025: hotels/guest houses/homestays must report foreign guests (form name and timeline per rules not confirmed) https://www.mondaq.com/india/general-immigration/1685320/new-immigration-and-foreigners-act
- fuel_efficiency: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- fuel_grade: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- fuel_policy: Common Indian trade practice for this kind of shop (no single primary source)
- fuel_type: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- furnishing: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- furnishing: NoBroker rental filters (preferred tenant Family/Bachelors/Company, BHK, furnishing, price, area) — via third-party scraper documentation https://apify.com/solidcode/nobroker-scraper
- gst_invoice: IndiaMART building-material/hardware listing specs (grade, size, brand, packaging size, minimum order quantity) https://www.indiamart.com/
- hardware_brand: Furniture marketplaces (Pepperfry, Urban Ladder) filters: material, wood type, finish, seating capacity, bed size, storage, assembly https://www.pepperfry.com/
- hotel_category: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- house_rules: NoBroker rental filters (preferred tenant Family/Bachelors/Company, BHK, furnishing, price, area) — via third-party scraper documentation https://apify.com/solidcode/nobroker-scraper
- house_rules: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- inclusions: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- inclusions: Urban Company service listings (packages, duration, inclusions, cancellation/reschedule) — not fetched in this session https://www.urbancompany.com/
- inclusions: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- kitchen_layout: Furniture marketplaces (Pepperfry, Urban Ladder) filters: material, wood type, finish, seating capacity, bed size, storage, assembly https://www.pepperfry.com/
- km_driven: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- loading_included: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- local_id_accepted: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- locality: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- lock_in_period: NoBroker rental filters (preferred tenant Family/Bachelors/Company, BHK, furnishing, price, area) — via third-party scraper documentation https://apify.com/solidcode/nobroker-scraper
- luggage_capacity: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- maintenance_charge: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- maintenance_charge: NoBroker rental filters (preferred tenant Family/Bachelors/Company, BHK, furnishing, price, area) — via third-party scraper documentation https://apify.com/solidcode/nobroker-scraper
- maintenance_included: Furniture marketplaces (Pepperfry, Urban Ladder) filters: material, wood type, finish, seating capacity, bed size, storage, assembly https://www.pepperfry.com/
- materials_included: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- max_guests: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- meals_included: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- meals_included: NoBroker rental filters (preferred tenant Family/Bachelors/Company, BHK, furnishing, price, area) — via third-party scraper documentation https://apify.com/solidcode/nobroker-scraper
- min_rental_days: Common Indian trade practice for this kind of shop (no single primary source)
- model_year: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- nearby_landmark: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- notice_period: NoBroker rental filters (preferred tenant Family/Bachelors/Company, BHK, furnishing, price, area) — via third-party scraper documentation https://apify.com/solidcode/nobroker-scraper
- occupancy_type: NoBroker rental filters (preferred tenant Family/Bachelors/Company, BHK, furnishing, price, area) — via third-party scraper documentation https://apify.com/solidcode/nobroker-scraper
- occupancy_type: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- ownership_type: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- package_tier: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- packing_type: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- parking: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- parking: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- payment_terms: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- pest_type: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- pet_friendly: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- pet_friendly: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- pieces_per_box: IndiaMART building-material/hardware listing specs (grade, size, brand, packaging size, minimum order quantity) https://www.indiamart.com/
- pipe_size: IndiaMART building-material/hardware listing specs (grade, size, brand, packaging size, minimum order quantity) https://www.indiamart.com/
- preferred_tenant: NoBroker rental filters (preferred tenant Family/Bachelors/Company, BHK, furnishing, price, area) — via third-party scraper documentation https://apify.com/solidcode/nobroker-scraper
- pressure_rating: IndiaMART building-material/hardware listing specs (grade, size, brand, packaging size, minimum order quantity) https://www.indiamart.com/
- price_basis: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- projects_completed: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- property_age_years: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- property_type: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- registration_year: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- room_view: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- seating_capacity: Furniture marketplaces (Pepperfry, Urban Ladder) filters: material, wood type, finish, seating capacity, bed size, storage, assembly https://www.pepperfry.com/
- service_history: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- stay_type: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- storage_available: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- tank_layers: IndiaMART building-material/hardware listing specs (grade, size, brand, packaging size, minimum order quantity) https://www.indiamart.com/
- team_size: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- team_size: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- test_drive: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- tinted_in_store: IndiaMART building-material/hardware listing specs (grade, size, brand, packaging size, minimum order quantity) https://www.indiamart.com/
- total_floors: Indian property portals (99acres, MagicBricks, NoBroker, Housing.com) listing/filter fields: BHK, carpet/built-up area, furnishing, construction status, facing, floor, parking, preferred tenant, RERA status https://www.99acres.com/
- transmission: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- trip_duration: Hotel/travel OTAs (MakeMyTrip, Goibibo, OYO) filters: room type, meal plan, free cancellation, couple friendly, local ID accepted, star category, amenities, check-in/out https://www.makemytrip.com/
- vehicle_body_type: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- vehicle_class: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- vehicle_model: Indian vehicle marketplaces (CarDekho, Cars24, OLX, BikeDekho) listing fields: make, model, variant, year, km, fuel, transmission, owners, RTO, insurance https://www.cardekho.com/
- volume_capacity: IndiaMART building-material/hardware listing specs (grade, size, brand, packaging size, minimum order quantity) https://www.indiamart.com/
- waterless_wash: Home-service marketplaces (Urban Company, Justdial) listing fields: service type, BHK-based pricing, visit charge, duration, service warranty, professionals assigned https://www.urbancompany.com/
- battery_included: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- safety_warning: IS 9873 (Part 1) safety-of-toys warning/age-grading markings (e.g. 'Not suitable for children under 3 years') — clause not confirmed https://services.bis.gov.in/tmp/Toys-Guidelines-Final_2BsA_2020-07-24.pdf
- gift_wrap: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- theme: Flipkart toys store filters (age, type, brand, character) — not fetched in this session https://flipkart.com/toys-online-store
- same_day_delivery: Common Indian trade practice for this kind of shop (no single primary source)
- toy_type: Flipkart toys store filters (age, type, brand, character) — not fetched in this session https://flipkart.com/toys-online-store
- player_count: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- sport: Playo venue booking (sport, slot, duration, amenities, price per slot) — not fetched in this session https://playo.co/
- sports_item_type: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- max_user_weight: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- instrument_type: Common Indian trade practice for this kind of shop (no single primary source)
- key_count: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- pitch_scale: Common Indian trade practice for this kind of shop (no single primary source)
- hand_orientation: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- accessories_included: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- isbn: GS1 GTIN (EAN-13) one per trade item / pack variant; GS1 India issues Indian prefixes https://www.gs1.org/standards/id-keys/gtin
- author_brand: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- publisher: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- edition: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- board: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- board: Common Indian trade practice for this kind of shop (no single primary source)
- subject: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- subject: Common Indian trade practice for this kind of shop (no single primary source)
- exam: Common Indian trade practice for this kind of shop (no single primary source)
- page_count: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- publication_year: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- stationery_type: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- tip_size: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- paper_gsm: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- paper_gsm: Common Indian trade practice for this kind of shop (no single primary source)
- paper_type: Common Indian trade practice for this kind of shop (no single primary source)
- gift_type: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- recipient: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- flower_type: Common Indian trade practice for this kind of shop (no single primary source)
- arrangement: Common Indian trade practice for this kind of shop (no single primary source)
- stem_count: Common Indian trade practice for this kind of shop (no single primary source)
- add_ons: Common Indian trade practice for this kind of shop (no single primary source)
- pooja_item_type: Common Indian trade practice for this kind of shop (no single primary source)
- deity: Common Indian trade practice for this kind of shop (no single primary source)
- burn_time_mins: Common Indian trade practice for this kind of shop (no single primary source)
- festival: Common Indian trade practice for this kind of shop (no single primary source)
- breed_size: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- feeding_guide: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- aquarium_capacity: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- live_animal: Prevention of Cruelty to Animals (Pet Shop) Rules 2018 — registration of pet shops with State Animal Welfare Board (not confirmed from primary text)
- awb_registration_number: Prevention of Cruelty to Animals (Pet Shop) Rules 2018 — registration of pet shops with State Animal Welfare Board (not confirmed from primary text)
- travel_charge: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- travel_charge: Common Indian trade practice for this kind of shop (no single primary source)
- package: Urban Company service listings (packages, duration, inclusions, cancellation/reschedule) — not fetched in this session https://www.urbancompany.com/
- package: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- advance_payment: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- deliverables: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- portfolio_url: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- client_type: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- free_consultation: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- udyam_number: Udyam Registration (MSME) — Udyam Registration Number (UDYAM-XX-00-0000000) https://udyamregistration.gov.in/
- documents_required: Common Indian trade practice for this kind of shop (no single primary source)
- vet_service_type: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- vet_service_type: Urban Company service listings (packages, duration, inclusions, cancellation/reschedule) — not fetched in this session https://www.urbancompany.com/
- vaccination_proof_required: Common Indian trade practice for this kind of shop (no single primary source)
- sessions_per_week: Common Indian trade practice for this kind of shop (no single primary source)
- admission_fee: Common Indian trade practice for this kind of shop (no single primary source)
- certification_body: Common Indian trade practice for this kind of shop (no single primary source)
- institution_type: Common Indian trade practice for this kind of shop (no single primary source)
- affiliation_number: Common Indian trade practice for this kind of shop (no single primary source)
- recognition: Common Indian trade practice for this kind of shop (no single primary source)
- transport_available: Common Indian trade practice for this kind of shop (no single primary source)
- photo_service_type: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- photo_service_type: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- photo_count: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- event_service_type: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- event_service_type: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- setup_time_hours: Common Indian trade practice for this kind of shop (no single primary source)
- rental_item_type: Common Indian trade practice for this kind of shop (no single primary source)
- rental_item_type: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- power_rating: Amazon.in category refinements (brand, age, binding, language, pack size …) — not fetched in this session https://www.amazon.in/
- booking_unit: Playo venue booking (sport, slot, duration, amenities, price per slot) — not fetched in this session https://playo.co/
- booking_unit: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- venue_type: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- venue_type: Playo venue booking (sport, slot, duration, amenities, price per slot) — not fetched in this session https://playo.co/
- venue_type: BookMyShow listings (format, language, certificate, seat class, showtime, duration) — not fetched in this session https://in.bookmyshow.com/
- indoor_outdoor: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- indoor_outdoor: Playo venue booking (sport, slot, duration, amenities, price per slot) — not fetched in this session https://playo.co/
- dining_capacity: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- room_count: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- parking_capacity: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- catering_policy: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- veg_only: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- price_per_plate_veg: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- price_per_plate_non_veg: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- decor_policy: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- alcohol_allowed: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- slot: WedMeGood venue/vendor filters (capacity, space type, price per plate veg/non-veg, rooms, catering policy, packages) — not fetched in this session https://www.wedmegood.com/
- slot: Playo venue booking (sport, slot, duration, amenities, price per slot) — not fetched in this session https://playo.co/
- surface_type: Playo venue booking (sport, slot, duration, amenities, price per slot) — not fetched in this session https://playo.co/
- play_format: Playo venue booking (sport, slot, duration, amenities, price per slot) — not fetched in this session https://playo.co/
- court_count: Playo venue booking (sport, slot, duration, amenities, price per slot) — not fetched in this session https://playo.co/
- floodlights: Playo venue booking (sport, slot, duration, amenities, price per slot) — not fetched in this session https://playo.co/
- equipment_provided: Playo venue booking (sport, slot, duration, amenities, price per slot) — not fetched in this session https://playo.co/
- coaching_available: Playo venue booking (sport, slot, duration, amenities, price per slot) — not fetched in this session https://playo.co/
- ticket_type: BookMyShow listings (format, language, certificate, seat class, showtime, duration) — not fetched in this session https://in.bookmyshow.com/
- seat_class: BookMyShow listings (format, language, certificate, seat class, showtime, duration) — not fetched in this session https://in.bookmyshow.com/
- screen_format: BookMyShow listings (format, language, certificate, seat class, showtime, duration) — not fetched in this session https://in.bookmyshow.com/
- film_certificate: BookMyShow listings (format, language, certificate, seat class, showtime, duration) — not fetched in this session https://in.bookmyshow.com/
- activity: BookMyShow listings (format, language, certificate, seat class, showtime, duration) — not fetched in this session https://in.bookmyshow.com/
- group_booking: BookMyShow listings (format, language, certificate, seat class, showtime, duration) — not fetched in this session https://in.bookmyshow.com/
- print_sides: Common Indian trade practice for this kind of shop (no single primary source)
- print_finish: Common Indian trade practice for this kind of shop (no single primary source)
- design_included: Common Indian trade practice for this kind of shop (no single primary source)
- delivery_available: Common Indian trade practice for this kind of shop (no single primary source)
- esevai_service: Common Indian trade practice for this kind of shop (no single primary source)
- esevai_service: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- authorisation_id: Common Indian trade practice for this kind of shop (no single primary source)
- govt_fee_included: Common Indian trade practice for this kind of shop (no single primary source)
- tax_service: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- notary_registration_number: Common Indian trade practice for this kind of shop (no single primary source)
- finance_product: AMFI/SEBI: mutual fund distributors must describe themselves as 'AMFI Registered Mutual Fund Distributor' with ARN on communications; SEBI circular (26 Feb 2026, w.e.f. 1 May 2026) requires regulated entities and agents to show registered name and registration number on marketing material (secondary reports) https://www.amfiindia.com/Themes/Theme1/downloads/FAQsonRoleofMFDsAdvts.pdf
- intermediary_type: AMFI/SEBI: mutual fund distributors must describe themselves as 'AMFI Registered Mutual Fund Distributor' with ARN on communications; SEBI circular (26 Feb 2026, w.e.f. 1 May 2026) requires regulated entities and agents to show registered name and registration number on marketing material (secondary reports) https://www.amfiindia.com/Themes/Theme1/downloads/FAQsonRoleofMFDsAdvts.pdf
- amfi_arn: AMFI/SEBI: mutual fund distributors must describe themselves as 'AMFI Registered Mutual Fund Distributor' with ARN on communications; SEBI circular (26 Feb 2026, w.e.f. 1 May 2026) requires regulated entities and agents to show registered name and registration number on marketing material (secondary reports) https://www.amfiindia.com/Themes/Theme1/downloads/FAQsonRoleofMFDsAdvts.pdf
- interest_rate: Common Indian trade practice for this kind of shop (no single primary source)
- claim_assistance: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- it_service_type: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- it_service_type: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- technology: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- certifications: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- marketing_service_type: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- marketing_service_type: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- platform: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- revision_count: Common Indian trade practice for this kind of shop (no single primary source)
- staffing_service_type: JustDial service listings (experience, timings, services offered, languages, verification) — not fetched in this session https://www.justdial.com/
- contract_labour_licence_number: Contract Labour (Regulation and Abolition) Act 1970 s.12 — contractor licence (20+ workmen); status after Labour Codes not confirmed https://labour.delhi.gov.in/it/contract-labour-act-1970-0
- guard_type: Common Indian trade practice for this kind of shop (no single primary source)
- min_staff: Common Indian trade practice for this kind of shop (no single primary source)
- pf_esi_compliant: Common Indian trade practice for this kind of shop (no single primary source)
- uniform_provided: Common Indian trade practice for this kind of shop (no single primary source)
- price_tiers: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- lead_time_days: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- units_per_case: GS1 GTIN (EAN-13) one per trade item / pack variant; GS1 India issues Indian prefixes https://www.gs1.org/standards/id-keys/gtin
- credit_terms: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- sample_available: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- trade_role: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- standard: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- surface_finish: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- process: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- manufacturing_type: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/
- production_capacity: IndiaMART B2B listing fields (MOQ, price per unit, business type, GST, delivery time) — not fetched in this session https://www.indiamart.com/

## Open questions (111)
- R5: Method: primary PDFs on consumeraffairs.nic.in, fssai.gov.in and other gov hosts could not be fetched from this session (network allowlist); "verified": true means the rule number and substance were corroborated by search results quoting the text (official page or several consistent secondary sources), not a full read of the gazette. Re-check before using in UI copy.
- R5: SPEC rule 6 (basic_form must include every store-owned statutory attribute) does not fit shop-level registrations. R5 marks them "[store-profile]" in the note and leaves them out of basic_form; recommend a separate store onboarding form (seller name/address, grievance officer, GSTIN, S&E, seller FSSAI, drug licence, clinical establishment, RERA agent, PSARA, pet shop, etc.). Human decision needed.
- R5: Several sub-categories end up with fewer than 2 basic_form keys (e.g. services where only return_policy / price_breakup_charges apply); the category agent's keys should fill the 2-5 range.
- R5: LM(PC) r.6(1) clause letters (a)-(i) were not confirmed against the current consolidated text (sources disagree on which letter is MRP). Attribute refs cite r.6(1) generally. Unit sale price and "dimensions where relevant" clauses are unverified.
- R5: LM(PC) r.6(10): one secondary source says month/year of manufacture is not required online - confirm the exact proviso and whether "best before/use by" must be shown online (2025 draft amendments).
- R5: LM(PC) Second Amendment Rules 2026 reportedly substitutes r.6(10A) w.e.f. 01-07-2027 - unverified; r.6(10A) (G.S.R. 128(E)) reportedly in force since 01-07-2026, so the platform needs a country-of-origin filter for imported goods now.
- R5: LM(PC) 2022 garments amendment (consumeraffairs.nic.in "2022 3rd amendment in PCR Garments") - content not retrieved; decide whether garments need size/dimension declarations or have MRP/unit-price relaxations.
- R5: CP(E-Com) Rules 2020 sub-clause letters for r.6(5)(a)-(i) and r.5 seller-detail duties taken from secondary text; confirm against the gazette (G.S.R. 462(E), 23-07-2020). Also confirm whether sellers must give GSTIN/PAN to the platform (r.6(?)).
- R5: FSS L&D reg.4(5) e-commerce exemption list: compendium snippet confirms batch/lot exemption; best-before/expiry/manufacture date exemption is from one secondary summary. CP(E-Com) still requires expiry date - R5 treats expiry_date as [LISTING].
- R5: FSS L&D reg.9(2)-(4): whether veg/non-veg logo and allergen info on menus apply to all food service establishments or only chains - text not retrieved. FSSAI 2025 direction to print FSSAI licence on bills - unverified.
- R5: Drugs Rules: rule numbers for retail licence display (Forms 20/21), "Mfg. Lic. No." on label (r.96 clause) and H1 register not confirmed. Online sale of medicines remains unregulated (draft e-pharmacy rules 2018 not notified; Delhi HC proceedings) - legal sign-off needed before enabling Rx drug sale online; block Schedule X and NDPS drugs.
- R5: Registered pharmacist (Pharmacy Act 1948 s.42) name/registration on the pharmacy profile - not researched with a citable URL; consider adding.
- R5: Cosmetics Rules 2020 r.34 exact list (licence number, import registration number on label) not confirmed.
- R5: MDR 2017: rule number for sale registration (Form MD-41/MD-42) not confirmed; Mondaq reports medical devices are now labelled solely under MDR (not LM(PC)) - medical_supply map follows that.
- R5: BIS QCO coverage marked "not confirmed" for footwear, utensils, furniture, plywood/tiles, plumbing, tyres, paints, hardware, electrical accessories - check the live BIS Scheme-I list (187 QCOs / 769 products per Rajya Sabha reply, Mar 2025) and map per product type rather than per sub-category.
- R5: BEE: no primary URL found; mandatory-appliance list unverified. No legal requirement to show star rating online (Prayas analysis) - keep as label-only.
- R5: Gold hallmarking exemptions (articles < 2 g, turnover < Rs 40 lakh jewellers, export, specific artefacts) and the list of notified districts not captured; HUID on invoices under BIS (Hallmarking) Regulations not verified.
- R5: Not researched with a citable URL (excluded as attributes): AERB licence for X-ray/CT (diagnostic_lab, dental, hospital); Insecticides Rules licence for commercial pest-control operators (cleaning_pest_control); PESO licence for fuel stations/LPG storage; LPG (Regulation of Supply and Distribution) Order 2000 distributor authorisation; CBFC certificate category for film listings (entertainment_venue); cinema licences under State Cinemas Acts; Sarais Act / State tourism registration and FRRO Form C for hotels/homestays; school recognition (RTE Act s.18) and board affiliation; Notaries Act certificate of practice; GST practitioner enrolment (CGST r.83); AMFI ARN; Contract Labour licence (now under OSH Code 2020) for staffing; State Nursing/Veterinary/Allied-health council registrations; Lead in paints rules 2016; e-cigarette ban (PECA 2019); Seeds Act s.7 labels; Fertiliser Control Order / Insecticides Act dealer licence wording.
- R5: Real estate: RERA does not cover rentals; Model Tenancy Act / State rent laws and police tenant verification not mapped for house_rental. PG/hostel licences are municipal.
- R5: Legal: BCI r.36 forbids advertising/soliciting beyond the permitted particulars; a marketplace listing for advocates with prices, ratings or "book now" may expose them to misconduct proceedings (BCI 2024 directives). Product decision needed on whether to allow the legal sub-category at all.
- R5: Medical listings: IMC 2002 regs restrict doctor advertising/signboard content; confirm whether NMC 2023 Professional Conduct Regulations were revived after abeyance and what they say about online listings.
- R5: COTPA s.5 (no advertisement) vs online listing of tobacco products, and State bans on online tobacco sale - legal decision needed; consider blocking tobacco listings.
- R5: IMS Act: confirm whether showing discounts/"offers" on infant formula listings counts as an incentive/promotion under s.3/s.4.
- R5: Vehicle registration numbers are personal data: R5 recommends storing but masking on public listings; confirm with DPDP Act 2023 policy.
- R5: ONDC attribute paths in ondc_attribute (e.g. @ondc/org/statutory_reqs_packaged_commodities.*, @ondc/org/statutory_reqs_prepackaged_food.*) were written from memory of ONDC retail specs and not re-verified.
- R5: house_rental, hobby_classes, school_college, sports_venue, salon and other plain services carry only the CP(E-Com)/GST/S&E layer in R5; sector-specific licences for them (e.g. swimming pool licences, salon trade licences) are municipal/State and not mapped.
- R1: food_type values: FSSAI treats egg as non-vegetarian (brown mark), but ONDC has a separate EGG code and buyers filter on it. R1 keeps Veg / Non-Veg / Egg and renders Egg with the brown mark. Existing options also include "vegan" and "eggless": move vegan to dietary_preference and map eggless to Veg?
- R1: The live catalogue uses attributes.diet (OFF) and attributes.food_type (form). One key needs to be chosen (R1 uses food_type).
- R1: composition currently maps to catalog_path attributes.generic, but in the Jan Aushadhi snapshot attributes.generic is a boolean (is a generic medicine). R1 defines composition (text) and generic (boolean) separately, so the catalog_path needs fixing.
- R1: schedule_drug is a boolean in the current form. R1 makes it an enum (OTC / G / H / H1 / X / NDPS / AYUSH) because H1 (register) and X (Form 20F licence) need different handling. This is a type change to approve.
- R1: specialty and language are text in the current forms. R1 makes them multi_enum with open values, because hospitals list many specialties and caregivers speak several languages.
- R1: Does LM r.6(10) oblige the listing to show the batch-specific best-before/expiry date (store-owned), or only the declared shelf life? R1 keeps expiry_date as recommended (pharmacy basic form) and treats shelf_life as the catalogue fact.
- R1: Unconfirmed: Legal Metrology r.26 exemption for loose goods weighed in front of the buyer (clause text not read). Used for fruits_vegetables/loose staples.
- R1: Unconfirmed: exact wording of FSS L&D reg.9(2) (allergens / veg-non-veg logo on menus for all FSEs, or only Central-licence / 10+ outlet chains). Also unconfirmed: the 14 Jun 2022 order extending reg.9 to e-commerce (secondary source only).
- R1: Unconfirmed: the FSSAI allergen list values (R1 uses gluten cereals, crustaceans, milk, eggs, fish, peanuts, tree nuts, soy, sulphites, plus sesame and mustard as extras).
- R1: Unconfirmed: FSS (Fortification of Foods) Regs 2018 +F logo (fortified is optional).
- R1: Unconfirmed: COTPA 2003 section numbers (s.6 sale to minors / near educational institutions; s.7 warnings), and whether tobacco may be listed for online sale/delivery at all. State bans on loose cigarettes also need checking.
- R1: Unconfirmed: D&C Rules r.96 clause list (batch no., mfg/expiry date, mfg licence no. on drug labels).
- R1: Unconfirmed: the PC&PNDT rule number for displaying the registration certificate and the "no sex determination" board. Clinical Establishments Act registration applies only in adopting States/UTs; others use their own Acts.
- R1: Unconfirmed: registration and display duties for AYUSH practitioners (NCISM/NCH), physiotherapists (NCAHP not yet operational) and nurses (State Nursing Councils). R1 marks practitioner_registration_no as recommended outside allopathic/dental listings.
- R1: NMC RMP (Professional Conduct) Regulations 2023 are in abeyance. R1 cites IMC Regulations 2002 reg.1.4.1 for displaying the registration number.
- R1: Mandatory BIS certification for packaged drinking water was omitted on 17 Oct 2024 (per an FSSAI Dec 2025 document). bis_licence_no is optional, so confirm that the current R5 layer does not still require it.
- R1: Medical devices: secondary sources say the LM (Packaged Commodities) Amendment Rules 2025 removed medical devices from LM labelling, leaving MDR 2017 r.44 as the sole label code. If so, net_quantity / consumer_care for medical_supply should come from MDR rather than LM.
- R1: ONDC domain codes conflict: release-2.0.2 has RET18 = Health & Wellness and RET19 = Pharma, but draft-b2c-1.2.5 has RET18 = Agriculture and RET19 = Health & Wellness. inputs/sub_categories.json follows release-2.0.2.
- R1: Should restaurant/catering "menu package" tiers reuse the generic variant key (as R1 does) or get a dedicated key?
- R1: Rentals: medical_supply items such as wheelchairs, hospital beds and oxygen concentrators are often rented. Should rental listings be allowed in this sub-category (rental_available flag) or routed to a rental sub-category?
- R2: Verified flags: government hosts (consumeraffairs.nic.in, cdsco.gov.in, bis.gov.in, beeindia.gov.in, egazette.gov.in, docs.google.com, marketplace sites) could not be fetched from this session; legal facts were confirmed through web-search summaries of those pages and secondary sources. A human should open the primary PDFs before go-live.
- R2: LM(PC) Rules r.6(1)/6(10): confirm whether 'month and year of manufacture/import' must be displayed on e-commerce listings (currently 'recommended', store-owned) or only on the package.
- R2: Consumer Protection (E-Commerce) Rules 2020: confirm the exact sub-rule (cited as r.6(5)) requiring sellers to give country of origin and expiry date.
- R2: LM(PC) Amendment Rules 2026 r.6(10A) country-of-origin search/sort filter: confirm commencement date (reported 1 Jul 2026).
- R2: Gold hallmarking is mandatory only in notified districts; decide whether 'purity'/'hallmarked' are statutory for every store or only for stores in notified districts, and whether silver HUID (voluntary scheme, IS 2112:2025) needs any flag.
- R2: BIS (Hallmarking) Regulations 2018 invoice contents (net weight, purity, hallmarking charges shown separately) are unverified.
- R2: BEE mandatory star-label list keeps changing (ceiling fans 2022/2024, washing machines 2023, refrigerators/TVs/others reportedly from 1 Jan 2026, Appliance Labelling Regulations 2025). Need an authoritative per-product-type list to decide when 'star_rating' is statutory vs optional.
- R2: BIS CRS (R-number), Footwear QCOs and Toys QCO require marks on the product, not a listing declaration; kept as recommended/optional. Confirm whether the catalogue should require the R-number for CRS-notified goods. Toys QCO 2020 citation unverified here.
- R2: Battery Waste Management (Amendment) Rules 2025 QR/EPR requirement is unverified.
- R2: Cosmetics: imported-cosmetic registration number requirement and r.34 sub-clause numbers unverified; batch-number exemption for small packs (<=10 g / <=25 ml) reported but unverified.
- R2: Existing key 'storage' has label 'RAM / Storage'. This research splits it into 'ram' and 'storage'; decide on relabel/migration.
- R2: Existing key 'variant' ('Variant / Size') for cosmetics is replaced here by 'shade' + 'net_quantity'; decide whether to keep 'variant' as an alias.
- R2: Service area: no existing key matches (existing 'delivery_area' means 'Delivers To' for products); new key 'service_area' proposed - confirm or reuse delivery_area.
- R2: Services (salon, parlour, makeup, tailor, laundry, repair, telecom) have no ONDC RET or Shopify attribute schema; attributes are based on Indian service marketplaces (unverified). Consider aligning with ONDC SRV (services) specs.
- R2: Silk Mark, Handloom Mark and GI tags are voluntary schemes; citations unverified (no URL).
- R2: Toys sold in kids_baby stores may belong to a separate toys sub-category (ONDC RET17); baby food belongs to the food attribute set (R1).
- R2: Marketplace-derived attributes (Myntra, Ajio, Nykaa, Flipkart, Amazon.in, Croma, Urban Company) could not be fetched; those sources are marked verified:false.
- R3: Legal Metrology e-commerce display: sub-rule number (reported r.6(10)) and the exemption of month/year of manufacture from online display come from secondary sources (L&S, ONDC compliance handbook); confirm against the consolidated rules on consumeraffairs.nic.in before relying on manufacture_date being non-statutory online.
- R3: Consumer Protection (E-Commerce) Rules 2020: exact sub-rule for seller disclosure of country of origin not confirmed (news/secondary sources only).
- R3: Plywood & Wooden Flush Door Shutters QCO 2024 (S.O.1378(E), IS 303): implementation/extension dates not confirmed — isi_marked marked statutory for tiles_plywood on the strength of the tiles QCO; confirm plywood coverage.
- R3: Cookware/Utensils QCO: stainless steel utensils (IS 14756) status conflicts between the 2024 order and a 2026 revision; kitchenware statutory BIS row currently relies only on pressure cookers and LPG stoves (PIB 2022).
- R3: IS 1293 (plugs & sockets), PVC/CPVC pipes (IS 4985/IS 15778), taps (IS 17650) — could not confirm QCO coverage; left recommended.
- R3: BIS CRS R-number format for LED lamps not confirmed; bis_licence_number description assumes CM/L-… (ISI) and R-… (CRS).
- R3: Steel QCO version (2020 vs reported 2024 order, and the <8 mm bar exemption) not confirmed from an official source.
- R3: Paint lead rules gazette number (reported G.S.R.1030(E)) not confirmed; text seen via Indian Kanoon only.
- R3: Pest control: Insecticides Rules r.10(3A) licence is confirmed for fumigant (aluminium phosphide/methyl bromide) operations; whether states require a PCO licence for all commercial pest control is unconfirmed — licence_number kept recommended.
- R3: Electrician/electrical contractor licensing under CEA Safety Regulations 2023 and state rules not verified; licence_number optional for home_repair.
- R3: CNG/LPG kit retro-fitment centre approval rule under CMVR not verified.
- R3: Whether courier firms must register as common carriers under the Carriage by Road Act 2007 is unconfirmed.
- R3: Immigration and Foreigners Act 2025: hotel reporting form name (Form C vs Form III) and timeline not confirmed; no listing attribute is statutory for hotels.
- R3: Tenant police verification and Model Tenancy Act deposit caps are state-specific; not modelled as statutory for house_rental.
- R3: Shop-level registrations used here (rera_agent_number, dealer_authorisation_number, rental_licence_number, common_carrier_registration, school_licence_number, tourism_registration_number, coa_registration_number) are kept as attributes for completeness but should map to the shop profile (per coordinator / R5); decide whether to drop them from listing attributes.
- R3: rera_project_number is owner=catalog (fact of the project) and statutory for RERA-registrable projects; confirm whether real_estate listings of resale/rent units should hide it.
- R3: Marketplace filter observations (99acres, MagicBricks, NoBroker, CarDekho, Urban Company, Pepperfry, IndiaMART, MakeMyTrip) are from domain knowledge; these sites were not reachable in this session — sources marked verified:false.
- R3: BS-VI emission norm notification and the AIS-142 tyre label display obligation were not verified as listing-display requirements; both kept non-statutory.
- R3: Key merge decisions: country_of_origin vs existing origin (produce region); capacity (seats/payload, existing label) vs new volume_capacity (litres); vehicle_type carries a union of fitment classes and fleet vehicles; bedrooms reused as BHK pricing slab for services.
- R3: min_rental_days is in days but bike/car rentals and hotels often price hourly/day-use — consider a min_rental_hours key or a duration measure.
- R3: Hotel seasonal/weekend tariffs and dynamic fuel prices are not variant axes; need a price-calendar concept outside attributes.
- R3: product_type and service_type are open enums whose example values differ per sub-category (listed in notes); decide whether to split into per-sub-category enums.
- R4: Legal Metrology (Packaged Commodities) Rules 2011 r.6(1): the exact clause letters and current text (as amended to 2026) were not read from a primary source — consumeraffairs.nic.in, egazette.gov.in and khaitanco.com were not reachable from this session. All LM sources marked verified:false except the r.6(10) e-commerce display duty (consistent secondary reports).
- R4: Does r.6(10) require e-commerce platforms to display month/year of manufacture (and best-before) online? Kept mfg_month_year as optional/store; if it must be shown, it becomes statutory+store and enters every packaged-product basic form.
- R4: r.6(10A) (Amendment Rules 2026, country-of-origin searchable/sortable filter) is from secondary reports only — confirm against the gazette before relying on it.
- R4: Are printed books 'packaged commodities' under LM (PC) Rules? Books are modelled without LM declarations (country_of_origin recommended only).
- R4: Toys (QCO) 2020: confirm whether marketplaces must display the BIS CM/L licence number online (modelled as statutory/catalog) and the exact IS 9873 age-warning wording (bis_toys_warn and the BIS '10 steps' PDF marked verified:false). Also confirm the in-force date: most sources say 1 Jan 2021; one says 1 Sep 2020.
- R4: Pet shops: Prevention of Cruelty to Animals (Pet Shop) Rules 2018 registration with the State Animal Welfare Board — no primary URL found; awb_registration_number kept as recommended. Decide whether live-animal listings are allowed at all.
- R4: Pet food: IS 11968:2019 is voluntary (BIS). There is no FSSAI regime for pet food and no confirmed QCO; the import order (2008) source is secondary. Confirm whether any pet-food labelling is mandatory beyond LM.
- R4: IS 19412:2025 (agarbatti): reports differ on whether the Standard Mark is voluntary or mandatory; modelled as optional 'standard'.
- R4: Bar Council of India Rule 36 bars advocates from advertising or soliciting. Listing advocates with prices, ratings or 'book now' on a marketplace may breach it. Legal review needed on whether the legal sub-category can show price, and on limiting fields to the BCI-permitted set (name, contact, enrolment no., State Bar Council, date of enrolment, qualifications, practice areas). The Notaries Act/Rules registration display could not be sourced.
- R4: ICAI guidelines say CA fees and client names may not be published, and a 2026 consultation may drop the membership-no./FRN requirement. Should price be hidden for professional_type = Chartered Accountant?
- R4: AMFI/SEBI: the SEBI circular (26 Feb 2026, w.e.f. 1 May 2026) requiring registration numbers on marketing material is from secondary reports. amfi_arn is modelled as conditional statutory (only when finance_product includes Mutual Funds). The form engine needs conditional fields (same for emigration_rc_number).
- R4: IRDAI: no confirmed rule requires an agent's licence/agency code on adverts or listings. Kept as recommended.
- R4: PSARA 2005: the licence is mandatory to operate (s.4) but no display-in-advertisement rule was confirmed, so psara_licence_number is 'required' not 'statutory'. Police-verification and training provisions not confirmed by section.
- R4: Labour Codes: did the OSH Code 2020 replace the CLRA 1970 contractor licence (and on what date)? contract_labour_licence_number cites the CLRA and is marked verified:false.
- R4: MoE Coaching Centre Guidelines 2024 are guidelines for States to adopt. Statutory force varies by State, so refund_policy, qualification and min_age are 'recommended'. Confirm per launch state (e.g. Tamil Nadu).
- R4: Cinematograph: is a cinema listing required to show the CBFC certificate? Modelled as recommended per show. Rquest may prefer show-level listings to be out of scope.
- R4: Drones in photo_studio: the Drone Rules 2021 UIN/remote-pilot certificate was not researched. Add if drone coverage is listed.
- R4: Event DJ/sound: public-performance music licences (PPL/IPRS) and Noise Pollution Rules 2000 time limits were not researched.
- R4: Bulk SMS/WhatsApp marketing: TRAI TCCCPR 2018 DLT registration was not researched for marketing_design.
- R4: Printing: printer/publisher imprint rules for election material (RP Act 1951 s.127A) and the PRP Act 2023 were not researched. They may justify a printing compliance note rather than a listing attribute.
- R4: GST: CGST r.46 (HSN on invoice) was not confirmed from a primary source. The gst_rate enum values (0/5/12/18/28/40) reflect the 2025 rate rationalisation from memory, not a verified source. Confirm the current slabs.
- R4: Shop-level vs listing-level: gstin, udyam_number, psara_licence_number, bar_enrolment_number, icai_membership_number, vci_registration_number, timings, service_area are really store-profile facts. Decide whether they live on the shop (one entry) or are copied per listing.
- R4: Marketplace sources (Amazon.in, Flipkart, IndiaMART, JustDial, Urban Company, BookMyShow, WedMeGood, Playo) could not be fetched here (network allow-list). The filters they cite come from general knowledge and are marked verified:false.
- R4: ONDC RET17 (Toys) has no category-specific attribute list in the public ONDC repos checked (ONDC-RET-Specifications draft-b2c-1.2.5 / release-2.0.2, protocol-network-extension enums/retail). Toy attributes therefore lean on Shopify and BIS.
- R4: Existing key overlaps: author_brand (books) vs brand (stationery). The current stationery form uses author_brand; recommend migrating it to brand. warranty_period duplicates warranty_months (warranty_months used). gender (products) and for_gender (services) are both kept.
- R4: lifestyle_others and the ONDC RET17 mapping: the sub_categories input maps lifestyle_others to RET17 (toys). Confirm this is intended.

## Coverage

| sub-category | attributes | statutory | variant axes | basic form |
|---|---|---|---|---|
| kirana | 44 | 24 | pack_size, flavour | expiry_date, brand, pack_size, food_type |
| supermarket | 44 | 24 | pack_size, flavour | expiry_date, brand, pack_size, food_type |
| fruits_vegetables | 24 | 11 | sold_by | country_of_origin, produce_type, sold_by, organic |
| dairy | 39 | 19 | pack_size | expiry_date, brand, pack_size, fat_content |
| meat_fish | 30 | 15 | cut, net_weight | expiry_date, meat_type, cut, net_weight, freshness |
| bakery | 32 | 19 | weight, food_type, flavour | food_type, ingredients, allergens, nutrition_info, storage_instructions, expiry_date |
| sweet_shop | 27 | 20 | weight | food_type, ingredients, allergens, nutrition_info, storage_instructions, expiry_date, shelf_life_days |
| dry_fruits_spices | 39 | 19 | pack_size, grade | expiry_date, pack_size, product_form, grade |
| organic_store | 37 | 19 | pack_size | expiry_date, brand, pack_size, organic_certification |
| flour_mill | 30 | 18 | pack_size, grind_texture | expiry_date, grain_type, pack_size, grind_texture |
| drinking_water | 27 | 19 | container, pack_size | expiry_date, water_type, container, pack_size, deposit_amount |
| paan_shop | 26 | 20 | variant | expiry_date, age_restricted, variant, tobacco_product |
| restaurant | 19 | 6 | portion_size | food_type, calorie_kcal_per_serving, portion_info, allergens, course, portion_size |
| fast_food | 19 | 6 | portion_size | food_type, calorie_kcal_per_serving, portion_info, allergens, course, portion_size |
| cafe | 23 | 6 | portion_size | food_type, calorie_kcal_per_serving, portion_info, allergens, course, portion_size |
| ice_cream_juice | 35 | 17 | portion_size | food_type, calorie_kcal_per_serving, portion_info, allergens, expiry_date, portion_size |
| home_kitchen | 21 | 5 | plan_period, portion_size | food_type, calorie_kcal_per_serving, portion_info, allergens, plan_period, meal_slot |
| catering | 21 | 3 | variant | food_type, allergens, cuisine, min_order_plates, advance_booking_days, service_style |
| food_others | 36 | 19 | pack_size | expiry_date, brand, pack_size, food_type |
| pharmacy | 32 | 19 | pack_size | expiry_date, composition, dosage_form, pack_size, prescription_required |
| medical_supply | 28 | 11 | size, pack_size | expiry_date, device_type, brand, size, pack_size |
| optician | 35 | 15 | colour, frame_size | expiry_date, lens_type, frame_material, gender, colour |
| clinic | 22 | 2 | consultation_mode | practitioner, practitioner_registration_no, specialty, consultation_mode, timings |
| hospital | 29 | 2 | room_type | specialty, room_type, insurance_cashless, emergency_24x7 |
| dental | 24 | 2 | material | practitioner, practitioner_registration_no, treatments, pricing_unit |
| diagnostic_lab | 24 | 2 | — | test_category, sample_type, home_sample_collection, report_time, fasting_required |
| physiotherapy | 21 | 2 | consultation_mode, session_count | consultation_mode, practitioner, duration_mins, session_count |
| ayush | 24 | 2 | consultation_mode, session_count | system_of_medicine, practitioner, consultation_mode, duration_mins |
| home_nursing | 18 | 2 | caregiver_type, shift, plan_period | caregiver_type, shift, plan_period, service_area |
| gym_fitness | 17 | 1 | plan_period | plan_period, activities, gender, timings |
| health_others | 21 | 2 | consultation_mode | consultation_mode, specialty, duration_mins, appointment_required |
| clothing | 42 | 14 | size, colour | gender, product_type, size, colour, fabric |
| footwear | 40 | 13 | size, colour | gender, product_type, size, colour |
| fabric | 40 | 13 | colour, fabric_length | product_type, fabric, colour, fabric_length |
| jewellery | 26 | 5 | purity, size, weight_grams | metal, purity, weight_grams, hallmarked, making_charges |
| bags_accessories | 44 | 13 | colour, size | product_type, gender, colour, material |
| kids_baby | 48 | 22 | age_group, size, colour | expiry_date, product_type, age_group, gender, colour |
| cosmetics | 39 | 15 | shade, net_quantity | expiry_date, brand, product_type, shade, net_quantity |
| salon | 15 | 1 | service_for, hair_length | service_type, service_for, duration_mins, service_mode |
| beauty_parlour | 16 | 1 | service_for, package_includes | service_type, service_for, duration_mins, service_mode |
| makeup_artist | 20 | 1 | service_type, coverage_area | service_type, service_mode, duration_hours, advance_booking_days |
| tailor | 15 | 1 | delivery_speed, lining_included | service_type, garment_for, delivery_days, service_mode |
| laundry | 12 | 1 | garment_type, delivery_speed | service_type, pricing_unit, turnaround, pickup_drop |
| fashion_others | 31 | 13 | size, colour | product_type, gender, size, colour |
| mobile_phones | 47 | 14 | ram, storage, colour | brand, model_number, ram, storage, condition |
| electronics_store | 48 | 15 | screen_size, colour | product_type, brand, model_number, condition |
| computers | 50 | 14 | processor, ram, storage | product_type, brand, model_number, ram, storage |
| home_appliances | 51 | 17 | capacity_litres, load_capacity_kg, cooling_capacity | product_type, brand, model_number, warranty_period, condition |
| inverter_battery | 39 | 14 | battery_ah, va_rating, panel_wattage | product_type, brand, model_number, warranty_period, condition |
| cctv_security | 38 | 14 | camera_resolution, channels | product_type, brand, camera_resolution, installation_included, warranty_period |
| electronics_repair | 17 | 2 | parts_type | warranty_days, device_type, service_type, visiting_charge, service_mode |
| telecom_recharge | 15 | 1 | plan_period, speed_mbps | service_type, operator, service_mode, turnaround |
| electronics_others | 36 | 15 | colour | product_type, brand, model_number, condition |
| hardware_store | 40 | 15 | size, length, diameter | product_type, brand, size, material |
| electrical_supplies | 43 | 17 | conductor_size, length, colour | product_type, brand, conductor_size, wattage, current_rating |
| plumbing_sanitary | 38 | 15 | pipe_size, pressure_rating, length | product_type, brand, material, pipe_size |
| paints | 32 | 14 | net_quantity, colour, finish | expiry_date, brand, product_type, net_quantity, finish, colour |
| building_materials | 30 | 15 | grade, diameter, net_quantity | product_type, brand, grade, sold_by |
| tiles_plywood | 37 | 15 | dimensions, thickness, finish | product_type, dimensions, thickness, finish, sold_by |
| furniture | 38 | 14 | bed_size, seating_capacity, colour | product_type, material, dimensions, condition |
| home_decor | 34 | 12 | size, colour, pack_size | product_type, material, size, colour |
| kitchenware | 38 | 15 | volume_capacity, diameter, pack_size | product_type, brand, material, volume_capacity |
| garden_nursery | 29 | 12 | pot_size, plant_height, net_quantity | expiry_date, product_type, plant_name, pot_size, sunlight |
| variety_store | 23 | 12 | colour, size, pack_size | product_type, variant, pack_size |
| lpg_gas | 29 | 15 | cylinder_size, connection_type, burner_count | product_type, operator, cylinder_size, connection_type |
| home_repair | 21 | 2 | service_type, bedrooms | warranty_days, service_type, visiting_charge, service_area |
| cleaning_pest_control | 22 | 2 | service_type, bedrooms, plan_period | warranty_days, service_type, bedrooms, plan_period, service_area |
| interior_design | 25 | 3 | service_type, bedrooms, package_tier | warranty_days, service_type, pricing_unit, delivery_days, warranty_months |
| construction_contractor | 23 | 3 | service_type, package_tier | rera_project_registration_no, service_type, pricing_unit, materials_included, experience_years |
| real_estate | 25 | 3 | — | rera_project_registration_no, deal_type, property_type, bedrooms, locality, area_sqft |
| house_rental | 23 | 1 | occupancy_type, meals_included | property_type, bedrooms, occupancy_type, locality, security_deposit |
| equipment_rental | 21 | 1 | plan_period | product_type, plan_period, security_deposit, min_rental_days |
| home_others | 23 | 12 | variant, colour | product_type, brand, variant, condition |
| auto_parts | 37 | 15 | net_quantity, viscosity_grade, size | product_type, vehicle_type, compatibility, brand, condition |
| tyres | 36 | 15 | tyre_size, tube_type, load_index | vehicle_type, tyre_size, brand, tube_type, condition |
| vehicle_repair | 21 | 2 | vehicle_type, package_tier | warranty_days, service_type, vehicle_type, compatibility, pickup_drop |
| car_wash | 17 | 1 | service_type, vehicle_body_type, plan_period | service_type, vehicle_body_type, service_mode, duration_mins |
| fuel_station | 22 | 11 | fuel_type, fuel_grade, charger_power | fuel_type, brand, pricing_unit, timings |
| vehicle_dealer | 35 | 5 | variant, colour, fuel_type | brand, vehicle_model, condition, model_year, km_driven |
| vehicle_rental | 29 | 3 | plan_period, km_limit | vehicle_class, vehicle_model, plan_period, km_limit, security_deposit |
| taxi_auto | 28 | 3 | vehicle_type, trip_type, air_conditioned | service_type, vehicle_type, trip_type, pricing_unit |
| packers_movers | 21 | 2 | trip_type, bedrooms, vehicle_type | service_type, trip_type, bedrooms, packing_type |
| courier | 20 | 2 | delivery_area, weight_slab, turnaround | service_type, delivery_area, weight_slab, pickup_drop |
| travel_agency | 25 | 2 | hotel_category, occupancy_type, departure_dates | service_type, destination, trip_duration, pricing_unit |
| hotel_lodge | 28 | 1 | room_type, meals_included, air_conditioned | stay_type, room_type, max_guests, meals_included, check_in_time |
| driving_school | 22 | 1 | licence_class, transmission, session_count | licence_class, transmission, course_duration, licence_assistance |
| vehicles_others | 28 | 12 | vehicle_type | service_type, vehicle_type, pricing_unit |
| stationery | 27 | 12 | colour, ink_colour, paper_size | stationery_type, brand, colour, paper_size |
| books | 28 | 12 | language, binding, edition | isbn, author_brand, language, condition |
| toys | 35 | 14 | colour, size | toy_type, age_group, brand |
| sports | 37 | 13 | size, weight, colour | sport, sports_item_type, brand, size |
| gifts | 27 | 12 | dimensions, colour | gift_type, occasion, personalisation |
| florist | 22 | 11 | stem_count, colour | arrangement, flower_type, sold_by |
| pooja_store | 27 | 12 | fragrance, pack_size, dimensions | pooja_item_type, brand, material |
| pet_shop | 33 | 12 | pack_size, flavour, size | expiry_date, pet_type, pet_product_type, brand, pack_size |
| vet_pet_care | 23 | 2 | package, breed_size | vet_service_type, pet_type, consultation_mode, vci_registration_number |
| musical_instruments | 28 | 12 | size, pitch_scale, colour | instrument_type, brand, condition |
| tuition | 22 | 1 | plan_period, mode | subject, level, mode, plan_period |
| hobby_classes | 21 | 1 | plan_period, sessions_per_week | subject, mode, age_group, plan_period |
| school_college | 18 | 1 | level, plan_period | institution_type, board, level, gender |
| photo_studio | 18 | 1 | package | photo_service_type, event_type, package |
| event_planner | 17 | 1 | package | event_service_type, event_type, package |
| tent_sound_rental | 19 | 1 | area_sqft, power_rating, booking_unit | rental_item_type, booking_unit, setup_included, security_deposit |
| wedding_venue | 24 | 1 | slot, booking_unit | venue_type, capacity, air_conditioned, slot |
| sports_venue | 21 | 1 | play_format, slot | sport, venue_type, slot, duration_mins |
| entertainment_venue | 18 | 1 | ticket_type, seat_class | venue_type, ticket_type, timings |
| lifestyle_others | 23 | 12 | size, colour | brand, variant, condition |
| printing | 16 | 1 | print_type, paper_size, print_sides | print_type, paper_size, pricing_unit, turnaround |
| online_services | 10 | 1 | — | esevai_service, turnaround, govt_fee_included |
| accountant_tax | 16 | 2 | plan_period | tax_service, professional_type, service_mode |
| legal | 16 | 2 | — | bar_council_enrolment_no, professional_type, practice_area |
| insurance_finance | 17 | 5 | — | irdai_registration_no, sebi_registration_no, amfi_arn, finance_product, intermediary_type |
| it_services | 17 | 1 | package, plan_period | it_service_type, package, turnaround |
| marketing_design | 14 | 1 | package, plan_period | marketing_service_type, package, plan_period |
| staffing_security | 15 | 2 | guard_type, shift | emigration_rc_number, staffing_service_type, pricing_unit |
| wholesale | 34 | 15 | pack_size, units_per_case | expiry_date, brand, variant, min_order_qty, gst_invoice |
| manufacturing | 40 | 15 | dimensions, grade | material, dimensions, min_order_qty, custom_orders |
| business_others | 10 | 1 | — | service_mode, turnaround, pricing_unit |
