/**
 * Category-Aware CSV Helper Utilities for Catalog Bulk Import / Export
 */

export const CATEGORY_PRESETS = {
  medical: {
    archetype: 'medical',
    label: 'Health & Medicine / Pharmacy',
    icon: '💊',
    badgeColor: 'blue',
    listingType: 'product',
    defaultUnit: 'strip',
    unitOptions: ['strip', 'piece', 'bottle', 'box', 'pack', 'tube'],
    headers: [
      'name',
      'price',
      'mrp',
      'unit',
      'section',
      'dosage_form',
      'expiry_date',
      'composition',
      'prescription_required',
      'batch_no',
      'description',
    ],
    headerDescriptions: {
      name: 'Medicine / Item Name (Required)',
      price: 'Selling Price in ₹ (Required)',
      mrp: 'Maximum Retail Price in ₹ (Optional)',
      unit: 'Unit of measure (e.g. strip, piece, bottle, box, tube)',
      section: 'Store Department / Shelf (e.g. Tablets, OTC, Syrups, Equipment)',
      dosage_form: 'Form factor: Strip / Tablets, Syrup / Liquid, Capsules, Injection, Medical Equipment',
      expiry_date: 'Expiration date in YYYY-MM-DD format (e.g. 2026-12-31)',
      composition: 'Active salt / Chemical formulation (e.g. Paracetamol 500mg)',
      prescription_required: 'true if doctor prescription (Rx) required, else false',
      batch_no: 'Manufacturing batch / lot number (e.g. B-2024-X9)',
      description: 'Medical usage, dosage advice or product description',
    },
    sampleRows: [
      {
        name: 'Paracetamol 500mg Tablets (Strip of 10)',
        price: '25',
        mrp: '30',
        unit: 'strip',
        section: 'Tablets & Pain Relief',
        dosage_form: 'Strip / Tablets',
        expiry_date: '2026-12-31',
        composition: 'Paracetamol 500mg',
        prescription_required: 'false',
        batch_no: 'B-2024-X9',
        description: 'Rapid pain relief and antipyretic tablets for headache and fever',
      },
      {
        name: 'Disposable Sterile Syringe 5ml with 24G Needle',
        price: '15',
        mrp: '20',
        unit: 'piece',
        section: 'Medical Equipment',
        dosage_form: 'Medical Equipment',
        expiry_date: '2027-06-30',
        composition: 'Medical grade polypropylene',
        prescription_required: 'false',
        batch_no: 'SY-551',
        description: 'Sterile single use syringe for medical injections and clinics',
      },
      {
        name: 'Amoxicillin 250mg Antibiotic Capsules',
        price: '85',
        mrp: '95',
        unit: 'strip',
        section: 'Prescription Antibiotics',
        dosage_form: 'Capsules',
        expiry_date: '2025-10-15',
        composition: 'Amoxicillin Trihydrate 250mg',
        prescription_required: 'true',
        batch_no: 'AMX-102',
        description: 'Broad-spectrum antibiotic prescription medication',
      },
      {
        name: 'Benadryl Cough Relief Syrup 100ml',
        price: '110',
        mrp: '125',
        unit: 'bottle',
        section: 'Cough & Cold',
        dosage_form: 'Syrup / Liquid',
        expiry_date: '2026-08-20',
        composition: 'Diphenhydramine HCl 14mg/5ml',
        prescription_required: 'false',
        batch_no: 'BD-884',
        description: 'Effective soothing relief from dry allergic cough and throat irritation',
      },
    ],
  },

  food: {
    archetype: 'food',
    label: 'Food & Dining / Restaurant',
    icon: '🍽️',
    badgeColor: 'orange',
    listingType: 'food',
    defaultUnit: 'portion',
    unitOptions: ['portion', 'plate', 'pack', 'piece', 'glass', 'bowl'],
    headers: [
      'name',
      'price',
      'mrp',
      'unit',
      'section',
      'food_type',
      'spice_level',
      'prep_time_mins',
      'portion_info',
      'description',
    ],
    headerDescriptions: {
      name: 'Dish / Beverage Name (Required)',
      price: 'Selling Price in ₹ (Required)',
      mrp: 'Standard menu rate in ₹ (Optional)',
      unit: 'Portion unit (e.g. portion, plate, pack, glass)',
      section: 'Menu Section (e.g. Biryani & Rice, Starters, Main Course, Drinks)',
      food_type: 'Dietary category: veg, non-veg, vegan, egg',
      spice_level: 'Spiciness rating: Mild, Medium, Spicy, Extra Hot',
      prep_time_mins: 'Preparation time in minutes (e.g. 15, 25)',
      portion_info: 'Serving portion details (e.g. Serves 1-2 persons)',
      description: 'Dish description, ingredients, or taste notes',
    },
    sampleRows: [
      {
        name: 'Hyderabadi Chicken Dum Biryani',
        price: '280',
        mrp: '320',
        unit: 'portion',
        section: 'Biryani & Rice',
        food_type: 'non-veg',
        spice_level: 'Medium',
        prep_time_mins: '25',
        portion_info: 'Serves 1-2 persons with Mirchi Ka Salan and Raita',
        description: 'Slow-cooked aromatic basmati rice layered with spiced tender chicken cuts',
      },
      {
        name: 'Paneer Butter Masala',
        price: '220',
        mrp: '250',
        unit: 'plate',
        section: 'Main Course (Veg)',
        food_type: 'veg',
        spice_level: 'Mild',
        prep_time_mins: '20',
        portion_info: 'Serves 2 persons',
        description: 'Fresh cottage cheese cubes simmered in velvety butter and rich tomato gravy',
      },
      {
        name: 'Fresh Mint Lime Soda',
        price: '60',
        mrp: '70',
        unit: 'glass',
        section: 'Beverages & Mocktails',
        food_type: 'veg',
        spice_level: 'Mild',
        prep_time_mins: '5',
        portion_info: '300ml chilled glass',
        description: 'Zesty freshly squeezed lime juice with garden mint and sparkling club soda',
      },
    ],
  },

  grocery: {
    archetype: 'grocery',
    label: 'Grocery & Supermarket',
    icon: '🛒',
    badgeColor: 'green',
    listingType: 'product',
    defaultUnit: 'kg',
    unitOptions: ['kg', 'g', 'litre', 'ml', 'piece', 'pack', 'bunch'],
    headers: [
      'name',
      'price',
      'mrp',
      'unit',
      'section',
      'brand',
      'shelf_life',
      'description',
    ],
    headerDescriptions: {
      name: 'Product Name (Required)',
      price: 'Discounted / Selling Price in ₹ (Required)',
      mrp: 'Printed MRP in ₹ (Optional)',
      unit: 'Measurement unit: kg, g, litre, ml, piece, pack',
      section: 'Aisle / Shelf Category (e.g. Dairy, Staples, Snacks, Produce)',
      brand: 'Manufacturer / Brand Name (e.g. Amul, India Gate)',
      shelf_life: 'Shelf life / expiry timeframe (e.g. 5 days, 12 months)',
      description: 'Product details, net quantity or weight specifications',
    },
    sampleRows: [
      {
        name: 'Amul Taaza Toned Fresh Milk 1L',
        price: '72',
        mrp: '75',
        unit: 'litre',
        section: 'Dairy & Breakfast',
        brand: 'Amul',
        shelf_life: '90 days (Tetra Pak)',
        description: 'Pasteurized homogenized toned milk rich in calcium and protein',
      },
      {
        name: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch',
        price: '135',
        mrp: '155',
        unit: 'litre',
        section: 'Cooking Oils & Ghee',
        brand: 'Fortune',
        shelf_life: '9 months',
        description: 'Light and pure refined cooking oil enriched with vitamins A & D',
      },
      {
        name: 'India Gate Basmati Rice Feast Rozzana 5kg Bag',
        price: '399',
        mrp: '480',
        unit: 'pack',
        section: 'Grains & Rice',
        brand: 'India Gate',
        shelf_life: '24 months',
        description: 'Premium aged fragrant long grain basmati rice for everyday family dining',
      },
    ],
  },

  service: {
    archetype: 'service',
    label: 'Services & Maintenance',
    icon: '🔧',
    badgeColor: 'cyan',
    listingType: 'service',
    defaultUnit: 'service',
    unitOptions: ['service', 'visit', 'session', 'hour'],
    headers: [
      'name',
      'price',
      'unit',
      'section',
      'service_mode',
      'duration_mins',
      'warranty_days',
      'description',
    ],
    headerDescriptions: {
      name: 'Service Title (Required)',
      price: 'Service Charge in ₹ (Required)',
      unit: 'Service unit (service, visit, session, hour)',
      section: 'Service Department (e.g. AC Services, Electrical, Salon)',
      service_mode: 'Location mode: doorstep, at_center, or both',
      duration_mins: 'Typical service duration in minutes (e.g. 45, 60)',
      warranty_days: 'Service guarantee period in days (e.g. 30, 90)',
      description: 'Scope of work, inclusions, and technician details',
    },
    sampleRows: [
      {
        name: 'Split AC Foam Jet Deep Cleaning & Checkup',
        price: '499',
        unit: 'service',
        section: 'AC Repair & Service',
        service_mode: 'doorstep',
        duration_mins: '45',
        warranty_days: '30',
        description: 'High-pressure foam jet wash of indoor cooling coil, filter and outdoor condenser',
      },
      {
        name: 'Ceiling Fan Installation & Wiring Connection',
        price: '199',
        unit: 'visit',
        section: 'Electrical Services',
        service_mode: 'doorstep',
        duration_mins: '30',
        warranty_days: '15',
        description: 'Complete ceiling hook assembly, down-rod attachment and safety wiring',
      },
      {
        name: 'Classic Haircut & Styling with Shampoo Wash',
        price: '250',
        unit: 'session',
        section: 'Hair & Salon',
        service_mode: 'at_center',
        duration_mins: '30',
        warranty_days: '0',
        description: 'Hair cut and beard shaping by senior stylist with cleansing shampoo wash',
      },
    ],
  },

  rental: {
    archetype: 'rental',
    label: 'Equipment & Vehicle Rentals',
    icon: '🏍️',
    badgeColor: 'purple',
    listingType: 'rental',
    defaultUnit: 'day',
    unitOptions: ['day', 'hour', 'week', 'month'],
    headers: [
      'name',
      'price',
      'unit',
      'section',
      'security_deposit',
      'min_rental_days',
      'description',
    ],
    headerDescriptions: {
      name: 'Asset / Equipment Title (Required)',
      price: 'Rental Rate in ₹ per unit time (Required)',
      unit: 'Billing cycle: day, hour, week, month',
      section: 'Asset Category (e.g. Bikes & Scooters, DJ & Audio, Photography)',
      security_deposit: 'Refundable security deposit amount in ₹ (e.g. 3000)',
      min_rental_days: 'Minimum booking duration (e.g. 1, 3)',
      description: 'Asset specifications, condition, and included accessories',
    },
    sampleRows: [
      {
        name: 'Royal Enfield Classic 350 (Dark Stealth Edition)',
        price: '1200',
        unit: 'day',
        section: 'Motorcycles & Scooters',
        security_deposit: '3000',
        min_rental_days: '1',
        description: 'Dual-channel ABS 350cc cruiser bike, comes with 2 ISI certified helmets and mobile mount',
      },
      {
        name: 'JBL PartyBox 310 Bluetooth Sound System 240W',
        price: '1500',
        unit: 'day',
        section: 'Audio & Event Gear',
        security_deposit: '2500',
        min_rental_days: '1',
        description: 'High-power portable party speaker with dynamic LED light show and dual wireless microphones',
      },
    ],
  },

  product: {
    archetype: 'product',
    label: 'Retail Goods & Merchandise',
    icon: '🛍️',
    badgeColor: 'geekblue',
    listingType: 'product',
    defaultUnit: 'piece',
    unitOptions: ['piece', 'pack', 'box', 'set', 'meter'],
    headers: [
      'name',
      'price',
      'mrp',
      'unit',
      'section',
      'brand',
      'color',
      'size',
      'description',
    ],
    headerDescriptions: {
      name: 'Product Name (Required)',
      price: 'Selling Price in ₹ (Required)',
      mrp: 'Retail MRP in ₹ (Optional)',
      unit: 'Package unit (piece, pack, box, set)',
      section: 'Catalog Category (e.g. Apparel, Footwear, Home & Kitchen, Hardware)',
      brand: 'Brand name or manufacturer',
      color: 'Product color variant',
      size: 'Product size variant (e.g. S, M, L, XL or dimensions)',
      description: 'Material specs, care instructions, warranty details',
    },
    sampleRows: [
      {
        name: 'Men Slim Fit Pure Cotton Casual Shirt',
        price: '699',
        mrp: '1299',
        unit: 'piece',
        section: 'Apparel & Clothing',
        brand: 'Roadster',
        color: 'Navy Blue',
        size: 'L',
        description: '100% breathable pre-washed cotton casual button-down shirt',
      },
      {
        name: 'Milton Thermosteel Flip Lid Vacuum Flask 1000ml',
        price: '799',
        mrp: '995',
        unit: 'piece',
        section: 'Kitchen & Dining',
        brand: 'Milton',
        color: 'Silver Metallic',
        size: '1 Litre',
        description: 'Double-walled vacuum insulated flask keeps beverages hot or cold for 24 hours',
      },
    ],
  },
};

/**
 * Determine the shop or category domain archetype
 */
export const getShopArchetype = (shop, category) => {
  const typeStr = (
    (shop?.shop_type || '') +
    ' ' +
    (shop?.shopCategory?.name || '') +
    ' ' +
    (category?.name || '') +
    ' ' +
    (shop?.shopSubCategory?.name || '')
  ).toLowerCase();

  if (
    typeStr.includes('health') ||
    typeStr.includes('med') ||
    typeStr.includes('pharm') ||
    typeStr.includes('clinic') ||
    typeStr.includes('doctor') ||
    typeStr.includes('chemist') ||
    typeStr.includes('drug')
  ) {
    return 'medical';
  }

  if (
    typeStr.includes('restaurant') ||
    typeStr.includes('food') ||
    typeStr.includes('bakery') ||
    typeStr.includes('cafe') ||
    typeStr.includes('biri') ||
    typeStr.includes('tiffin') ||
    typeStr.includes('hotel') ||
    typeStr.includes('eatery') ||
    typeStr.includes('dining') ||
    typeStr.includes('kitchen')
  ) {
    return 'food';
  }

  if (
    typeStr.includes('grocery') ||
    typeStr.includes('supermarket') ||
    typeStr.includes('provision') ||
    typeStr.includes('mart') ||
    typeStr.includes('kirana')
  ) {
    return 'grocery';
  }

  if (
    typeStr.includes('electric') ||
    typeStr.includes('hardware') ||
    typeStr.includes('technician') ||
    typeStr.includes('plumb') ||
    typeStr.includes('service') ||
    typeStr.includes('laundry') ||
    typeStr.includes('repair') ||
    typeStr.includes('clean') ||
    typeStr.includes('mechanic') ||
    typeStr.includes('salon') ||
    typeStr.includes('spa') ||
    typeStr.includes('beauty') ||
    typeStr.includes('barber')
  ) {
    return 'service';
  }

  if (
    typeStr.includes('rental') ||
    typeStr.includes('bike') ||
    typeStr.includes('audio') ||
    typeStr.includes('sport') ||
    typeStr.includes('turf') ||
    typeStr.includes('vehicle')
  ) {
    return 'rental';
  }

  return 'product';
};

/**
 * Retrieve the active CSV configuration tailored for a shop and category
 */
export const getCategoryCsvConfig = (shop, category, customSchema = null) => {
  const archetype = getShopArchetype(shop, category);
  const basePreset = CATEGORY_PRESETS[archetype] || CATEGORY_PRESETS.product;

  // Extract dynamic form fields if configured on shop or category
  const schemaFields = customSchema ||
    (shop?.form_schema && Array.isArray(shop.form_schema) && shop.form_schema.length > 0
      ? shop.form_schema
      : category?.form_schema && Array.isArray(category.form_schema) && category.form_schema.length > 0
      ? category.form_schema
      : []);

  let headers = [...basePreset.headers];
  const headerDescriptions = { ...basePreset.headerDescriptions };

  // Append any extra dynamic schema keys not yet present in standard headers
  if (Array.isArray(schemaFields) && schemaFields.length > 0) {
    schemaFields.forEach((f) => {
      if (f && f.key && !headers.includes(f.key)) {
        headers.push(f.key);
        headerDescriptions[f.key] = `${f.label || f.key}${f.required ? ' (Required)' : ' (Optional)'}${
          f.options?.length ? `: ${f.options.join(', ')}` : ''
        }`;
      }
    });
  }

  // Generate customized sample rows that include any extra dynamic keys
  const sampleRows = basePreset.sampleRows.map((row) => {
    const fullRow = { ...row };
    if (Array.isArray(schemaFields)) {
      schemaFields.forEach((f) => {
        if (f && f.key && fullRow[f.key] === undefined) {
          if (f.defaultValue !== undefined) {
            fullRow[f.key] = String(f.defaultValue);
          } else if (f.options?.length) {
            fullRow[f.key] = String(f.options[0]);
          } else if (f.type === 'number') {
            fullRow[f.key] = '10';
          } else if (f.type === 'boolean') {
            fullRow[f.key] = 'false';
          } else if (f.type === 'date') {
            fullRow[f.key] = '2026-12-31';
          } else {
            fullRow[f.key] = f.placeholder || '';
          }
        }
      });
    }
    return fullRow;
  });

  return {
    ...basePreset,
    archetype,
    headers,
    headerDescriptions,
    sampleRows,
    categoryName: category?.name || shop?.shopCategory?.name || basePreset.label,
  };
};

/**
 * Generate CSV text content tailored to the store's category
 */
export const generateCategorySampleCsv = (shop, category, customSchema = null) => {
  const config = getCategoryCsvConfig(shop, category, customSchema);
  const headerLine = config.headers.join(',');

  const escapeCsvVal = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = config.sampleRows.map((row) => {
    return config.headers.map((h) => escapeCsvVal(row[h] || '')).join(',');
  });

  return `${headerLine}\n${rows.join('\n')}\n`;
};

/**
 * Backwards-compatible wrapper: generate sample CSV
 */
export const generateSampleCsv = (shop = null, category = null, customSchema = null) => {
  return generateCategorySampleCsv(shop, category, customSchema);
};

/**
 * Parse uploaded CSV text into structured product items with metadata.
 * Columns that match a field of the category's form (schemaFields) are read as
 * that field's type, so a number column "1" stays 1 instead of becoming true.
 */
export const parseCSV = (csvText, schemaFields = []) => {
  if (!csvText || typeof csvText !== 'string') return [];
  const lines = csvText.trim().split(/\r\n|\n/);
  if (lines.length < 2) return [];

  // Parse header row
  const rawHeaders = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const cleanHeaders = rawHeaders.map((h) => h.toLowerCase().replace(/[\s\-_]+/g, '_'));

  const standardKeys = [
    'name',
    'price',
    'mrp',
    'unit',
    'section',
    'description',
    'img_url',
    'listing_type',
    'is_available',
  ];

  const fieldTypes = {};
  (Array.isArray(schemaFields) ? schemaFields : []).forEach((f) => {
    if (f?.key) fieldTypes[f.key] = f.type || 'text';
  });

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted commas correctly
    const values = [];
    let insideQuotes = false;
    let currentVal = '';

    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim().replace(/^["']|["']$/g, ''));

    const itemObj = {};
    const metadata = {};

    cleanHeaders.forEach((header, idx) => {
      let val = values[idx] !== undefined ? values[idx].trim() : '';

      // Boolean normalization
      const lower = val.toLowerCase();
      let parsedVal = val;
      const fieldType = fieldTypes[header];
      if (fieldType && fieldType !== 'boolean') {
        // A typed form field: keep the text as written, numbers as numbers
        if (fieldType === 'number' && val !== '' && Number.isFinite(Number(val))) {
          parsedVal = Number(val);
        }
      } else if (lower === 'true' || lower === 'yes' || lower === '1') {
        parsedVal = true;
      } else if (lower === 'false' || lower === 'no' || lower === '0') {
        parsedVal = false;
      }

      if (standardKeys.includes(header)) {
        if (header === 'price') {
          // Clean currency symbols and thousand separators
          const num = parseFloat(val.replace(/[₹$,]/g, ''));
          itemObj.price = isNaN(num) ? 0 : num;
        } else if (header === 'mrp') {
          const num = parseFloat(val.replace(/[₹$,]/g, ''));
          itemObj.mrp = isNaN(num) ? undefined : num;
        } else {
          itemObj[header] = val;
        }
      } else {
        // Collect all category-specific columns into metadata
        metadata[header] = parsedVal;
      }
    });

    if (itemObj.name) {
      if (itemObj.section && !metadata.section) {
        metadata.section = itemObj.section;
      }
      results.push({
        ...itemObj,
        metadata,
      });
    }
  }

  return results;
};
