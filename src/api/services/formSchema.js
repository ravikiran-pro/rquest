/**
 * Category form schemas: the custom fields a category (or one shop) asks for on
 * every listing. This module is the single source of truth for
 *   - the ready-made templates a new category starts from,
 *   - what a valid schema looks like (normalizeSchema),
 *   - checking a listing's metadata against a schema (validateMetadata),
 *   - turning search filters into typed values (buildMetadataFilter).
 *
 * A field is: { key, label, type, required, placeholder, options, defaultValue, filterable,
 *               source, catalog_path, statutory }
 *   source        'store' (the shop fills it, the default) or 'catalog' (a fact owned by the
 *                 master catalogue, read from the listing's catalog_snapshot)
 *   catalog_path  where the value lives in a catalogue snapshot (brand, quantity_text,
 *                 attributes.<key>, ...). On a store field it is only a prefill default.
 *   statutory     a store override may not hide or rename it (e.g. Rx, veg marking)
 * The three are optional and only kept when set, so older schemas compare unchanged.
 * Listing values live in shop_listings.metadata[key].
 */

const FIELD_TYPES = ['text', 'number', 'select', 'radio', 'boolean', 'date', 'textarea'];
const CHOICE_TYPES = ['select', 'radio'];
// Only fields with a closed set of values make useful search filters.
const FILTERABLE_TYPES = ['select', 'radio', 'boolean'];

// metadata keys the app itself writes; a custom field must not overwrite them.
const RESERVED_KEYS = [
  'section',
  'category',
  'category_id',
  'category_name',
  'sub_category_id',
  'sub_category_name',
  'catalog_item_id',
  'allow_instant_order',
  'allow_enquiry',
  'imported_from_master',
];

const MAX_FIELDS = 40;
const MAX_OPTIONS = 50;
const MAX_LABEL = 60;
const MAX_PLACEHOLDER = 120;
const MAX_TEXT = 500;
const MAX_TEXTAREA = 2000;
const KEY_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;
const FIELD_SOURCES = ['store', 'catalog'];
// Snapshot paths a field may read (see routes/catalog/items.js snapshotFromEnriched)
const CATALOG_PATH_PATTERN =
  /^(brand|manufacturer|gtin|quantity_text|net_quantity|unit|hsn_code|gst_rate|country_of_origin|attributes\.[a-z][a-z0-9_]{0,39})$/;

const FORM_TEMPLATES = [
  {
    key: 'grocery',
    label: 'Grocery & Provisions',
    icon: '🛒',
    description: 'Supermarkets, provision stores, fruits and vegetables',
    keywords: ['grocer', 'provision', 'supermarket', 'kirana', 'vegetable', 'fruit', 'dairy', 'milk'],
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Aashirvaad, Amul', source: 'catalog', catalog_path: 'brand' },
      { key: 'pack_size', label: 'Pack Size', type: 'text', placeholder: 'e.g. 1 kg, 500 ml, pack of 6', source: 'catalog', catalog_path: 'quantity_text' },
      { key: 'food_type', label: 'Dietary Tag', type: 'select', options: ['veg', 'non-veg', 'vegan', 'egg'], defaultValue: 'veg', filterable: true, source: 'catalog', catalog_path: 'attributes.food_type', statutory: true },
      { key: 'organic', label: 'Organic', type: 'boolean', defaultValue: false, filterable: true, source: 'catalog', catalog_path: 'attributes.organic' },
      { key: 'shelf_life', label: 'Shelf Life', type: 'text', placeholder: 'e.g. 6 months from packing', source: 'catalog', catalog_path: 'attributes.shelf_life' },
    ],
  },
  {
    key: 'pharmacy',
    label: 'Pharmacy & Medical Store',
    icon: '💊',
    description: 'Medicines, health products and medical equipment',
    keywords: ['pharma', 'medic', 'chemist', 'drug', 'health', 'clinic'],
    fields: [
      { key: 'composition', label: 'Salt / Active Chemical Composition', type: 'text', placeholder: 'e.g. Paracetamol 500mg, Phenylephrine 5mg', source: 'catalog', catalog_path: 'attributes.generic' },
      { key: 'dosage_form', label: 'Dosage Form', type: 'select', required: true, filterable: true, options: ['Strip / Tablets', 'Syrup / Liquid', 'Capsules', 'Injection', 'Cream / Ointment', 'Drops', 'Powder', 'Medical Equipment'], source: 'catalog', catalog_path: 'attributes.dosage_form' },
      { key: 'manufacturer', label: 'Manufacturer', type: 'text', placeholder: 'e.g. Cipla, Sun Pharma', source: 'catalog', catalog_path: 'manufacturer' },
      { key: 'pack_size', label: 'Pack', type: 'text', placeholder: 'e.g. Strip of 10, 100 ml', source: 'catalog', catalog_path: 'quantity_text' },
      { key: 'prescription_required', label: 'Prescription Required (Rx)', type: 'boolean', defaultValue: false, filterable: true, source: 'catalog', catalog_path: 'attributes.prescription_required', statutory: true },
      { key: 'schedule_drug', label: 'Schedule H / Controlled Substance', type: 'boolean', defaultValue: false, source: 'catalog', catalog_path: 'attributes.schedule_drug', statutory: true },
      { key: 'batch_no', label: 'Batch / Lot Number', type: 'text', placeholder: 'e.g. B-2024-X9', source: 'store' },
      // One expiry per listing is wrong once batches exist (LATER), so it is optional
      { key: 'expiry_date', label: 'Expiry Date', type: 'date', source: 'store' },
    ],
  },
  {
    key: 'food',
    label: 'Restaurant & Food Menu',
    icon: '🍽️',
    description: 'Restaurants, cafes, tiffin centres and cloud kitchens',
    keywords: ['restaurant', 'food', 'cafe', 'hotel', 'biryani', 'biriyani', 'tiffin', 'mess', 'kitchen', 'juice', 'ice cream', 'fast food'],
    fields: [
      { key: 'food_type', label: 'Dietary Tag', type: 'radio', options: ['veg', 'non-veg', 'vegan', 'egg'], defaultValue: 'veg', required: true, filterable: true, source: 'store', statutory: true },
      { key: 'prep_time_mins', label: 'Prep Time (Minutes)', type: 'number', defaultValue: 15, placeholder: '15' },
      { key: 'spice_level', label: 'Spice Level', type: 'select', options: ['Mild', 'Medium', 'Spicy', 'Extra Hot'], defaultValue: 'Medium', filterable: true },
      { key: 'portion_info', label: 'Portion / Serves', type: 'text', placeholder: 'e.g. Serves 1-2 persons' },
    ],
  },
  {
    key: 'bakery',
    label: 'Bakery & Sweets',
    icon: '🧁',
    description: 'Bakeries, cake shops and sweet stalls',
    keywords: ['bakery', 'bake', 'cake', 'sweet', 'confection', 'dessert'],
    fields: [
      { key: 'food_type', label: 'Dietary Tag', type: 'radio', options: ['veg', 'egg', 'eggless', 'vegan'], defaultValue: 'veg', required: true, filterable: true, source: 'store', statutory: true },
      { key: 'weight', label: 'Weight / Size', type: 'text', placeholder: 'e.g. 500 g, 1 kg, box of 6' },
      { key: 'flavour', label: 'Flavour', type: 'text', placeholder: 'e.g. Chocolate truffle, Butterscotch' },
      { key: 'made_to_order', label: 'Made to Order', type: 'boolean', defaultValue: false, filterable: true },
      { key: 'shelf_life_days', label: 'Shelf Life (Days)', type: 'number', placeholder: '2' },
    ],
  },
  {
    key: 'fashion',
    label: 'Clothing & Fashion',
    icon: '👕',
    description: 'Clothing, footwear, boutiques and accessories',
    keywords: ['cloth', 'fashion', 'garment', 'boutique', 'apparel', 'textile', 'saree', 'shoe', 'footwear', 'tailor', 'wear'],
    fields: [
      { key: 'gender', label: 'For', type: 'select', options: ['Men', 'Women', 'Kids', 'Unisex'], required: true, filterable: true },
      { key: 'size', label: 'Size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'], filterable: true },
      { key: 'colour', label: 'Colour', type: 'text', placeholder: 'e.g. Navy blue' },
      { key: 'material', label: 'Material / Fabric', type: 'text', placeholder: 'e.g. Cotton, Silk, Leather' },
      { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Levis, Bata', source: 'catalog', catalog_path: 'brand' },
    ],
  },
  {
    key: 'electronics',
    label: 'Electronics & Appliances',
    icon: '💻',
    description: 'Mobiles, computers, appliances and accessories',
    keywords: ['electronic', 'mobile', 'computer', 'laptop', 'appliance', 'gadget', 'phone'],
    fields: [
      { key: 'brand', label: 'Brand / Manufacturer', type: 'text', placeholder: 'e.g. Sony, Dell, Samsung, Apple', source: 'catalog', catalog_path: 'brand' },
      { key: 'model_number', label: 'Model Number / Specs', type: 'text', placeholder: 'e.g. WH-1000XM5, 16GB RAM / 512GB SSD', source: 'catalog', catalog_path: 'attributes.model_number' },
      { key: 'warranty_period', label: 'Warranty (Months)', type: 'number', placeholder: '12' },
      { key: 'condition', label: 'Condition', type: 'select', options: ['Brand New Sealed', 'Open Box', 'Refurbished Certified', 'Pre-Owned'], defaultValue: 'Brand New Sealed', filterable: true },
    ],
  },
  {
    key: 'automotive',
    label: 'Automotive & Spare Parts',
    icon: '🚗',
    description: 'Spare parts, accessories and tyres',
    keywords: ['auto', 'spare', 'vehicle', 'car', 'bike part', 'tyre', 'garage', 'motor'],
    fields: [
      { key: 'vehicle_type', label: 'Vehicle Class', type: 'select', options: ['2-Wheeler (Bike/Scooter)', '4-Wheeler (Car/SUV)', 'Commercial / Truck', 'Universal'], defaultValue: '4-Wheeler (Car/SUV)', filterable: true },
      { key: 'compatibility', label: 'Compatible Models & Make', type: 'text', placeholder: 'e.g. Honda City 2018-2023, Hyundai Creta' },
      { key: 'part_number', label: 'OEM / Part Number', type: 'text', placeholder: 'e.g. 12345-ABC-01' },
      { key: 'warranty_months', label: 'Warranty (Months)', type: 'number', placeholder: '12' },
      { key: 'condition', label: 'Condition', type: 'select', options: ['Brand New OEM', 'Aftermarket New', 'Refurbished', 'Pre-Owned Tested'], defaultValue: 'Brand New OEM', filterable: true },
    ],
  },
  {
    key: 'hardware',
    label: 'Hardware & Building Supplies',
    icon: '🔩',
    description: 'Hardware, paints, electricals and plumbing supplies',
    keywords: ['hardware', 'paint', 'sanitary', 'cement', 'building', 'tool', 'electrical'],
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Asian Paints, Finolex', source: 'catalog', catalog_path: 'brand' },
      { key: 'material', label: 'Material', type: 'text', placeholder: 'e.g. Stainless steel, PVC' },
      { key: 'dimensions', label: 'Size / Dimensions', type: 'text', placeholder: 'e.g. 1 inch x 3 m' },
      { key: 'warranty_months', label: 'Warranty (Months)', type: 'number', placeholder: '12' },
    ],
  },
  {
    key: 'services',
    label: 'Technicians & Home Repairs',
    icon: '🔧',
    description: 'Electricians, plumbers, appliance repair and other services',
    keywords: ['service', 'repair', 'technician', 'plumb', 'electrician', 'carpenter', 'laundry', 'clean', 'mechanic'],
    fields: [
      { key: 'service_mode', label: 'Service Mode', type: 'select', options: ['Doorstep / Home Visit', 'Workshop / Site Visit', 'Both Available'], defaultValue: 'Doorstep / Home Visit', filterable: true },
      { key: 'visiting_charge', label: 'Visiting / Inspection Fee (₹)', type: 'number', placeholder: '199' },
      { key: 'duration_mins', label: 'Estimated Duration (Minutes)', type: 'number', defaultValue: 60 },
      { key: 'warranty_days', label: 'Service Warranty (Days)', type: 'number', placeholder: '30' },
    ],
  },
  {
    key: 'salon',
    label: 'Salon, Spa & Beauty',
    icon: '💇',
    description: 'Salons, spas, parlours and beauty services',
    keywords: ['salon', 'spa', 'beauty', 'parlour', 'parlor', 'massage', 'barber', 'makeup'],
    fields: [
      { key: 'service_for', label: 'For', type: 'select', options: ['Men', 'Women', 'Kids', 'Unisex'], defaultValue: 'Unisex', filterable: true, source: 'store', catalog_path: 'attributes.service_for' },
      { key: 'duration_mins', label: 'Duration (Minutes)', type: 'number', defaultValue: 45, source: 'store', catalog_path: 'attributes.duration_mins' },
      { key: 'service_mode', label: 'Service Mode', type: 'select', options: ['At Salon', 'Home Visit', 'Both Available'], defaultValue: 'At Salon', filterable: true },
      { key: 'appointment_required', label: 'Appointment Required', type: 'boolean', defaultValue: false },
    ],
  },
  {
    key: 'rentals',
    label: 'Rentals & Fleet Assets',
    icon: '🏍️',
    description: 'Bike, car, equipment and costume rentals',
    keywords: ['rental', 'rent', 'hire', 'lease'],
    fields: [
      { key: 'security_deposit', label: 'Refundable Security Deposit (₹)', type: 'number', placeholder: '2000' },
      { key: 'min_rental_days', label: 'Minimum Rental Period (Days)', type: 'number', defaultValue: 1 },
      { key: 'id_proof_required', label: 'Government ID Proof Required', type: 'boolean', defaultValue: true },
      { key: 'fuel_policy', label: 'Fuel / Usage Policy', type: 'select', options: ['Full-to-Full', 'Same-as-Received', 'Unlimited', 'Capped km/day'], defaultValue: 'Full-to-Full', filterable: true },
    ],
  },
  {
    key: 'books',
    label: 'Books & Stationery',
    icon: '📚',
    description: 'Book shops, stationery and school supplies',
    keywords: ['book', 'station', 'school suppl', 'xerox', 'print'],
    fields: [
      { key: 'author_brand', label: 'Author / Brand', type: 'text', placeholder: 'e.g. R. K. Narayan, Classmate', source: 'catalog', catalog_path: 'brand' },
      { key: 'language', label: 'Language', type: 'select', options: ['English', 'Tamil', 'Hindi', 'Telugu', 'Kannada', 'Malayalam', 'Other'], filterable: true },
      { key: 'condition', label: 'Condition', type: 'select', options: ['New', 'Used - Like New', 'Used - Good'], defaultValue: 'New', filterable: true },
      { key: 'edition', label: 'Edition / Class', type: 'text', placeholder: 'e.g. 2025 edition, Class 10' },
    ],
  },
  {
    key: 'produce',
    label: 'Fruits & Vegetables',
    icon: '🥦',
    description: 'Fresh fruits, vegetables, greens and herbs',
    keywords: ['vegetable', 'fruit', 'greengrocer', 'produce', 'greens', 'sabzi'],
    fields: [
      { key: 'produce_type', label: 'Type', type: 'select', options: ['Vegetable', 'Fruit', 'Leafy Greens', 'Herbs', 'Exotic'], defaultValue: 'Vegetable', filterable: true },
      { key: 'sold_by', label: 'Sold By', type: 'select', options: ['Per kg', 'Per 500 g', 'Per Piece', 'Per Bunch', 'Per Dozen'], defaultValue: 'Per kg' },
      { key: 'organic', label: 'Organic', type: 'boolean', defaultValue: false, filterable: true },
      { key: 'grade', label: 'Grade', type: 'select', options: ['Premium', 'Regular', 'Economy'], defaultValue: 'Regular', filterable: true },
      { key: 'origin', label: 'Origin', type: 'text', placeholder: 'e.g. Ooty, Nashik, local farm' },
    ],
  },
  {
    key: 'meat_fish',
    label: 'Meat & Fish',
    icon: '🍗',
    description: 'Chicken, mutton, fish, seafood and eggs',
    keywords: ['meat', 'chicken', 'mutton', 'fish', 'seafood', 'butcher'],
    fields: [
      { key: 'meat_type', label: 'Meat', type: 'select', options: ['Chicken', 'Mutton', 'Fish', 'Prawns & Seafood', 'Eggs', 'Other'], required: true, filterable: true },
      { key: 'cut', label: 'Cut', type: 'select', options: ['Whole', 'Curry Cut', 'Boneless', 'Fillet', 'Mince', 'Not Applicable'], defaultValue: 'Curry Cut', filterable: true },
      { key: 'freshness', label: 'Fresh or Frozen', type: 'radio', options: ['Fresh', 'Frozen'], defaultValue: 'Fresh', filterable: true },
      { key: 'net_weight', label: 'Net Weight', type: 'text', placeholder: 'e.g. 500 g, 1 kg', source: 'catalog', catalog_path: 'quantity_text' },
      { key: 'halal', label: 'Halal', type: 'boolean', defaultValue: false, filterable: true },
    ],
  },
  {
    key: 'jewellery',
    label: 'Jewellery',
    icon: '💍',
    description: 'Gold, silver, diamond and fashion jewellery',
    keywords: ['jewel', 'gold', 'silver', 'diamond'],
    fields: [
      { key: 'metal', label: 'Metal', type: 'select', options: ['Gold', 'Silver', 'Platinum', 'Diamond', 'Imitation / Fashion', 'Other'], required: true, filterable: true },
      { key: 'purity', label: 'Purity', type: 'select', options: ['24K', '22K', '18K', '14K', '925 Sterling', 'Not Applicable'], filterable: true },
      { key: 'weight_grams', label: 'Weight (Grams)', type: 'number', placeholder: '8.5' },
      { key: 'hallmarked', label: 'BIS Hallmarked', type: 'boolean', defaultValue: false, filterable: true },
      { key: 'making_charges', label: 'Making Charges', type: 'text', placeholder: 'e.g. 12% or ₹800' },
    ],
  },
  {
    key: 'health_services',
    label: 'Clinics & Health Services',
    icon: '🩺',
    description: 'Clinics, hospitals, labs, physiotherapy, home nursing and vets',
    keywords: ['clinic', 'hospital', 'doctor', 'dental', 'diagnostic', 'physio', 'nursing', 'vet'],
    fields: [
      { key: 'consultation_mode', label: 'Consultation Mode', type: 'select', options: ['In Clinic', 'Home Visit', 'Online / Video', 'In Clinic and Online'], defaultValue: 'In Clinic', filterable: true },
      { key: 'practitioner', label: 'Doctor / Practitioner', type: 'text', placeholder: 'e.g. Dr. A. Kumar, MBBS, MD' },
      { key: 'specialty', label: 'Specialty', type: 'text', placeholder: 'e.g. General physician, Pediatrics' },
      { key: 'duration_mins', label: 'Duration (Minutes)', type: 'number', defaultValue: 15 },
      { key: 'appointment_required', label: 'Appointment Required', type: 'boolean', defaultValue: true, filterable: true },
    ],
  },
  {
    key: 'fitness',
    label: 'Gym, Yoga & Fitness',
    icon: '🏋️',
    description: 'Gyms, yoga studios and fitness memberships',
    keywords: ['gym', 'fitness', 'yoga', 'zumba', 'crossfit'],
    fields: [
      { key: 'plan_period', label: 'Plan', type: 'select', options: ['Per Session', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'], defaultValue: 'Monthly', filterable: true },
      { key: 'for_gender', label: 'For', type: 'select', options: ['Men', 'Women', 'Unisex'], defaultValue: 'Unisex', filterable: true },
      { key: 'trainer_included', label: 'Personal Trainer Included', type: 'boolean', defaultValue: false, filterable: true },
      { key: 'timings', label: 'Timings', type: 'text', placeholder: 'e.g. 5–10 AM, 5–9 PM' },
    ],
  },
  {
    key: 'education',
    label: 'Classes & Education',
    icon: '🎓',
    description: 'Tuition, coaching, hobby classes, schools and driving lessons',
    keywords: ['tuition', 'coaching', 'class', 'academy', 'school', 'college', 'institute', 'training'],
    fields: [
      { key: 'mode', label: 'Mode', type: 'select', options: ['At Centre', 'Online', 'Home Tuition', 'Hybrid'], defaultValue: 'At Centre', filterable: true },
      { key: 'level', label: 'Class / Level', type: 'text', placeholder: 'e.g. Class 6–10, Beginner, NEET' },
      { key: 'subject', label: 'Subject / Skill', type: 'text', placeholder: 'e.g. Maths, Carnatic vocals, Swimming' },
      { key: 'course_duration', label: 'Course Duration', type: 'text', placeholder: 'e.g. 3 months, 24 classes' },
      { key: 'batch_size', label: 'Batch Size', type: 'number', placeholder: '10' },
      { key: 'demo_class', label: 'Free Demo Class', type: 'boolean', defaultValue: false, filterable: true },
    ],
  },
  {
    key: 'events',
    label: 'Events, Photography & Decor',
    icon: '🎉',
    description: 'Photographers, event planners, decorators and entertainers',
    keywords: ['event', 'photograph', 'decoration', 'decorator', 'wedding planner', 'dj'],
    fields: [
      { key: 'event_type', label: 'Event Type', type: 'select', options: ['Wedding', 'Birthday', 'Corporate', 'Religious / Pooja', 'Any Event'], defaultValue: 'Any Event', filterable: true },
      { key: 'guest_capacity', label: 'Guests Up To', type: 'number', placeholder: '200' },
      { key: 'duration_hours', label: 'Duration (Hours)', type: 'number', placeholder: '4' },
      { key: 'advance_booking_days', label: 'Book Days in Advance', type: 'number', placeholder: '7' },
      { key: 'at_your_venue', label: 'Comes to Your Venue', type: 'boolean', defaultValue: true, filterable: true },
    ],
  },
  {
    key: 'venue',
    label: 'Venues & Halls',
    icon: '🏟️',
    description: 'Marriage halls, party halls, turfs, courts, pools and play zones',
    keywords: ['hall', 'mahal', 'mandapam', 'venue', 'turf', 'court', 'swimming pool', 'cinema'],
    fields: [
      { key: 'venue_type', label: 'Venue Type', type: 'select', options: ['Marriage Hall', 'Party Hall', 'Sports Turf / Court', 'Swimming Pool', 'Auditorium', 'Play / Gaming Zone', 'Other'], filterable: true },
      { key: 'capacity', label: 'Capacity (People)', type: 'number', placeholder: '300' },
      { key: 'booking_unit', label: 'Booked', type: 'select', options: ['Per Hour', 'Per Session', 'Per Day'], defaultValue: 'Per Hour', filterable: true },
      { key: 'air_conditioned', label: 'Air Conditioned', type: 'boolean', defaultValue: false, filterable: true },
      { key: 'amenities', label: 'Amenities', type: 'textarea', placeholder: 'e.g. Parking for 50 cars, dining hall, generator backup' },
    ],
  },
  {
    key: 'professional',
    label: 'Professional Services',
    icon: '💼',
    description: 'Accountants, lawyers, consultants, agencies and online services',
    keywords: ['accountant', 'lawyer', 'advocate', 'consultant', 'agency', 'insurance', 'finance', 'software', 'marketing'],
    fields: [
      { key: 'service_mode', label: 'Service Mode', type: 'select', options: ['At Office', 'Online', 'Doorstep Visit', 'Any'], defaultValue: 'At Office', filterable: true },
      { key: 'turnaround', label: 'Turnaround', type: 'text', placeholder: 'e.g. Same day, 3 working days' },
      { key: 'experience_years', label: 'Experience (Years)', type: 'number', placeholder: '5' },
      { key: 'qualification', label: 'Qualification / Licence', type: 'text', placeholder: 'e.g. CA, LLB, IRDAI licensed' },
    ],
  },
  {
    key: 'property',
    label: 'Property & Real Estate',
    icon: '🏠',
    description: 'Houses, flats, plots, shops and PG beds for rent or sale',
    keywords: ['real estate', 'property', 'pg', 'hostel', 'rent', 'flat', 'plot'],
    fields: [
      { key: 'deal_type', label: 'Deal', type: 'select', options: ['Rent', 'Sale', 'Lease', 'PG / Hostel'], required: true, filterable: true },
      { key: 'property_type', label: 'Property Type', type: 'select', options: ['Apartment', 'Independent House', 'Villa', 'Plot / Land', 'Shop / Office', 'Room / PG Bed'], filterable: true },
      { key: 'bedrooms', label: 'Bedrooms', type: 'select', options: ['1 RK', '1 BHK', '2 BHK', '3 BHK', '4+ BHK', 'Not Applicable'], filterable: true },
      { key: 'area_sqft', label: 'Area (sq ft)', type: 'number', placeholder: '1100' },
      { key: 'furnishing', label: 'Furnishing', type: 'select', options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'], filterable: true },
      { key: 'available_from', label: 'Available From', type: 'date' },
    ],
  },
  {
    key: 'travel',
    label: 'Travel & Transport',
    icon: '🚕',
    description: 'Taxis, drivers, travel agents, tours, movers and goods transport',
    keywords: ['taxi', 'cab', 'travels', 'tour', 'movers', 'packers', 'transport', 'driver'],
    fields: [
      { key: 'vehicle_type', label: 'Vehicle', type: 'select', options: ['Bike', 'Auto', 'Car (Hatchback / Sedan)', 'SUV / MUV', 'Tempo / Mini Truck', 'Bus / Van', 'Not Applicable'], filterable: true },
      { key: 'trip_type', label: 'Trip Type', type: 'select', options: ['Within City', 'Outstation', 'Airport / Station', 'Tour Package', 'Not Applicable'], filterable: true },
      { key: 'capacity', label: 'Seats / Load Capacity', type: 'text', placeholder: 'e.g. 4 passengers, 1 tonne' },
      { key: 'advance_booking_hours', label: 'Book Hours in Advance', type: 'number', placeholder: '2' },
    ],
  },
  {
    key: 'lodging',
    label: 'Hotels & Stays',
    icon: '🛏️',
    description: 'Hotel rooms, lodges, homestays and service apartments',
    keywords: ['lodge', 'room', 'homestay', 'resort', 'guest house'],
    fields: [
      { key: 'room_type', label: 'Room Type', type: 'select', options: ['Single', 'Double', 'Deluxe', 'Suite', 'Dormitory Bed', 'Entire Home'], required: true, filterable: true },
      { key: 'max_guests', label: 'Max Guests', type: 'number', defaultValue: 2 },
      { key: 'air_conditioned', label: 'Air Conditioned', type: 'boolean', defaultValue: false, filterable: true },
      { key: 'meals_included', label: 'Meals Included', type: 'select', options: ['None', 'Breakfast', 'All Meals'], defaultValue: 'None', filterable: true },
      { key: 'check_in_time', label: 'Check-in Time', type: 'text', placeholder: 'e.g. 12:00 PM' },
    ],
  },
  {
    key: 'vehicles',
    label: 'Vehicles (New & Used)',
    icon: '🏍️',
    description: 'New and pre-owned bikes, scooters, cars and EVs',
    keywords: ['showroom', 'dealer', 'used car', 'pre-owned'],
    fields: [
      { key: 'vehicle_class', label: 'Vehicle', type: 'select', options: ['Bike / Scooter', 'Car', 'Commercial', 'Electric 2-Wheeler', 'Electric Car'], required: true, filterable: true },
      { key: 'condition', label: 'Condition', type: 'radio', options: ['New', 'Pre-Owned'], defaultValue: 'New', filterable: true },
      { key: 'fuel_type', label: 'Fuel', type: 'select', options: ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'], filterable: true },
      { key: 'model_year', label: 'Model Year', type: 'number', placeholder: '2023' },
      { key: 'km_driven', label: 'Km Driven', type: 'number', placeholder: '12000' },
    ],
  },
  {
    key: 'pets',
    label: 'Pet Supplies',
    icon: '🐾',
    description: 'Pet food, accessories, aquariums and pet care products',
    keywords: ['pet', 'aquarium', 'dog', 'cat'],
    fields: [
      { key: 'pet_type', label: 'For', type: 'select', options: ['Dog', 'Cat', 'Bird', 'Fish', 'Small Pets', 'All Pets'], required: true, filterable: true },
      { key: 'life_stage', label: 'Life Stage', type: 'select', options: ['Puppy / Kitten', 'Adult', 'Senior', 'All Ages'], defaultValue: 'All Ages', filterable: true },
      { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Pedigree, Whiskas', source: 'catalog', catalog_path: 'brand' },
      { key: 'pack_size', label: 'Pack Size', type: 'text', placeholder: 'e.g. 1.2 kg, 400 g', source: 'catalog', catalog_path: 'quantity_text' },
    ],
  },
  {
    key: 'general',
    label: 'General Store',
    icon: '🏪',
    description: 'A simple starting form for any other kind of shop',
    keywords: [],
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. brand or maker', source: 'catalog', catalog_path: 'brand' },
      { key: 'variant', label: 'Variant / Size', type: 'text', placeholder: 'e.g. Large, 500 ml, Blue' },
      { key: 'condition', label: 'Condition', type: 'select', options: ['New', 'Refurbished', 'Used'], defaultValue: 'New', filterable: true },
    ],
  },
];

const GENERAL_TEMPLATE_KEY = 'general';

const isEmpty = (value) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

const getTemplate = (templateKey) => FORM_TEMPLATES.find((t) => t.key === templateKey) || null;

/**
 * Pick the template whose keywords best match a category name.
 * Falls back to the general template so every new category starts with a form.
 */
const suggestTemplate = (categoryName) => {
  const name = String(categoryName || '').toLowerCase();
  let best = null;
  let bestLength = 0;
  if (name.trim()) {
    for (const template of FORM_TEMPLATES) {
      for (const keyword of template.keywords) {
        // The longest matching keyword wins, so "bike part" beats "bike".
        if (name.includes(keyword) && keyword.length > bestLength) {
          best = template;
          bestLength = keyword.length;
        }
      }
    }
  }
  return best || getTemplate(GENERAL_TEMPLATE_KEY);
};

/**
 * Convert one raw value to the field's type.
 * Returns { value } on success or { error } with a message for the user.
 */
const coerceValue = (field, raw) => {
  const label = field.label || field.key;
  switch (field.type) {
    case 'number': {
      const num = typeof raw === 'number' ? raw : Number(String(raw).trim());
      if (typeof raw === 'boolean' || !Number.isFinite(num)) {
        return { error: `${label} must be a number` };
      }
      return { value: num };
    }
    case 'boolean': {
      if (typeof raw === 'boolean') return { value: raw };
      const text = String(raw).trim().toLowerCase();
      if (['true', 'yes', '1'].includes(text)) return { value: true };
      if (['false', 'no', '0'].includes(text)) return { value: false };
      return { error: `${label} must be yes or no` };
    }
    case 'select':
    case 'radio': {
      const text = String(raw).trim();
      const options = Array.isArray(field.options) ? field.options : [];
      const match = options.find((opt) => String(opt).toLowerCase() === text.toLowerCase());
      if (match === undefined) {
        return { error: `${label} must be one of: ${options.join(', ')}` };
      }
      return { value: match };
    }
    case 'date': {
      const text = String(raw).trim().slice(0, 10);
      const parsed = new Date(`${text}T00:00:00Z`);
      const valid =
        /^\d{4}-\d{2}-\d{2}$/.test(text) &&
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === text;
      if (!valid) {
        return { error: `${label} must be a date in YYYY-MM-DD format` };
      }
      return { value: text };
    }
    default: {
      if (typeof raw === 'object') {
        return { error: `${label} must be text` };
      }
      const text = String(raw).trim();
      const max = field.type === 'textarea' ? MAX_TEXTAREA : MAX_TEXT;
      if (text.length > max) {
        return { error: `${label} must be at most ${max} characters` };
      }
      return { value: text };
    }
  }
};

/**
 * Clean and check a schema sent by the admin form builder.
 * Returns { schema, errors }; errors is a list of { index, key, message }.
 */
const normalizeSchema = (input) => {
  const errors = [];
  if (input === undefined || input === null) {
    return { schema: [], errors };
  }
  if (!Array.isArray(input)) {
    return { schema: [], errors: [{ index: -1, key: null, message: 'form_schema must be a list of fields' }] };
  }
  if (input.length > MAX_FIELDS) {
    return {
      schema: [],
      errors: [{ index: -1, key: null, message: `A form can have at most ${MAX_FIELDS} fields` }],
    };
  }

  const seenKeys = new Set();
  const schema = [];

  input.forEach((raw, index) => {
    const fail = (message, key = null) => errors.push({ index, key, message });

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      fail(`Field ${index + 1} is not a valid field`);
      return;
    }

    const label = String(raw.label || '').trim();
    const key = slugify(raw.key || label);
    const name = label || key || `Field ${index + 1}`;
    const type = raw.type === undefined || raw.type === null || raw.type === '' ? 'text' : String(raw.type);

    if (!label) fail(`Field ${index + 1} needs a label`, key);
    if (label.length > MAX_LABEL) fail(`${name}: label must be at most ${MAX_LABEL} characters`, key);

    if (!KEY_PATTERN.test(key)) {
      fail(`${name}: key must start with a letter and use only lowercase letters, numbers and underscores`, key);
    } else if (RESERVED_KEYS.includes(key)) {
      fail(`${name}: "${key}" is used by the system, choose another key`, key);
    } else if (seenKeys.has(key)) {
      fail(`${name}: key "${key}" is used by more than one field`, key);
    }
    seenKeys.add(key);

    if (!FIELD_TYPES.includes(type)) {
      fail(`${name}: unknown field type "${type}"`, key);
      return;
    }

    const field = { key, label, type, required: Boolean(raw.required) };

    if (CHOICE_TYPES.includes(type)) {
      const options = [];
      (Array.isArray(raw.options) ? raw.options : []).forEach((opt) => {
        const text = String(opt === undefined || opt === null ? '' : opt).trim();
        if (text && !options.some((o) => o.toLowerCase() === text.toLowerCase())) {
          options.push(text);
        }
      });
      if (options.length < 2) fail(`${name}: add at least 2 options`, key);
      if (options.length > MAX_OPTIONS) fail(`${name}: at most ${MAX_OPTIONS} options are allowed`, key);
      field.options = options;
    } else {
      const placeholder = String(raw.placeholder || '').trim();
      if (placeholder.length > MAX_PLACEHOLDER) {
        fail(`${name}: placeholder must be at most ${MAX_PLACEHOLDER} characters`, key);
      }
      if (placeholder) field.placeholder = placeholder;
    }

    if (!isEmpty(raw.defaultValue)) {
      const coerced = coerceValue(field, raw.defaultValue);
      if (coerced.error) {
        fail(`Default value: ${coerced.error}`, key);
      } else {
        field.defaultValue = coerced.value;
      }
    }

    // Free-text and numeric fields have no fixed list of values to filter by.
    field.filterable = Boolean(raw.filterable) && FILTERABLE_TYPES.includes(type);

    // Ownership (optional; only kept when set so older schemas stay byte-for-byte equal)
    if (!isEmpty(raw.source)) {
      if (!FIELD_SOURCES.includes(raw.source)) {
        fail(`${name}: source must be store or catalog`, key);
      } else {
        field.source = raw.source;
      }
    }
    if (!isEmpty(raw.catalog_path)) {
      const path = String(raw.catalog_path).trim();
      if (!CATALOG_PATH_PATTERN.test(path)) {
        fail(`${name}: catalog path "${path}" is not a catalogue fact (e.g. brand, quantity_text, attributes.dosage_form)`, key);
      } else {
        field.catalog_path = path;
      }
    }
    if (raw.statutory === true || raw.statutory === 'true') field.statutory = true;

    schema.push(field);
  });

  return { schema: errors.length ? [] : schema, errors };
};

/**
 * Check a listing's metadata against a schema.
 * Values are converted to the field's type, defaults fill empty optional fields,
 * and keys outside the schema are kept as they are.
 * With enforceRequired false, empty required fields are let through; this is for
 * items the system adds for the owner to complete later (starter items, imports
 * from the master library).
 * Returns { metadata, errors }; errors is a list of { key, message }.
 */
const validateMetadata = (schema, metadata, { enforceRequired = true } = {}) => {
  const source = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
  const result = { ...source };
  const errors = [];

  (Array.isArray(schema) ? schema : []).forEach((field) => {
    if (!field || !field.key) return;
    const raw = source[field.key];

    if (isEmpty(raw)) {
      if (!isEmpty(field.defaultValue)) {
        result[field.key] = field.defaultValue;
      } else if (field.required && enforceRequired) {
        errors.push({ key: field.key, message: `${field.label || field.key} is required` });
      } else {
        delete result[field.key];
      }
      return;
    }

    const coerced = coerceValue(field, raw);
    if (coerced.error) {
      errors.push({ key: field.key, message: coerced.error });
    } else {
      result[field.key] = coerced.value;
    }
  });

  return { metadata: result, errors };
};

const hasFields = (record) =>
  Boolean(record) && Array.isArray(record.form_schema) && record.form_schema.length > 0;

/**
 * The schema a shop's listings follow, most specific first: the shop's own form,
 * then its sub-category's form, then its category's form.
 */
const resolveSchema = (shop, category, subCategory) => {
  if (hasFields(shop)) return shop.form_schema;
  if (hasFields(subCategory)) return subCategory.form_schema;
  if (category && Array.isArray(category.form_schema)) return category.form_schema;
  return [];
};

const getFilterableFields = (schema) =>
  (Array.isArray(schema) ? schema : []).filter(
    (field) => field && field.filterable && FILTERABLE_TYPES.includes(field.type)
  );

/**
 * One list of filter fields for search results that span several forms.
 * Fields sharing a key are merged: the first label wins and choice options
 * are combined, so "Condition" from two categories shows as one filter.
 */
const mergeFilterFields = (schemas) => {
  const merged = new Map();
  (Array.isArray(schemas) ? schemas : []).forEach((schema) => {
    getFilterableFields(schema).forEach((field) => {
      const existing = merged.get(field.key);
      if (!existing) {
        const entry = {
          key: field.key,
          label: field.label || field.key,
          type: field.type,
          filterable: true,
        };
        if (CHOICE_TYPES.includes(field.type)) entry.options = [...(field.options || [])];
        merged.set(field.key, entry);
        return;
      }
      // A toggle and a dropdown with the same key cannot share one filter
      if (!existing.options || !CHOICE_TYPES.includes(field.type)) return;
      (field.options || []).forEach((opt) => {
        if (!existing.options.some((o) => String(o).toLowerCase() === String(opt).toLowerCase())) {
          existing.options.push(opt);
        }
      });
    });
  });
  return [...merged.values()];
};

/**
 * Turn search filters ({ key: value }) into a typed object for a JSONB
 * containment query. With a schema, only its filterable fields are accepted and
 * values are converted to the field's type. Returns { filter, errors }.
 */
const buildMetadataFilter = (filters, schema) => {
  const filter = {};
  const errors = [];
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
    return { filter, errors };
  }

  const fields = schema ? getFilterableFields(schema) : null;

  Object.keys(filters).forEach((key) => {
    const raw = filters[key];
    if (isEmpty(raw)) return;

    if (fields) {
      const field = fields.find((f) => f.key === key);
      if (!field) {
        errors.push({ key, message: `"${key}" is not a filter for this category` });
        return;
      }
      const coerced = coerceValue(field, raw);
      if (coerced.error) {
        errors.push({ key, message: coerced.error });
      } else {
        filter[key] = coerced.value;
      }
      return;
    }

    // No schema to check against: accept plain values on well-formed keys only.
    if (!KEY_PATTERN.test(key) || !['string', 'number', 'boolean'].includes(typeof raw)) {
      errors.push({ key, message: `"${key}" is not a valid filter` });
      return;
    }
    filter[key] = raw;
  });

  return { filter, errors };
};

// Which keys are catalogue facts, for forms built without explicit ownership (taxonomy
// extra fields, admin forms saved before the field had a source). Template fields carry
// their own props; this only fills fields that have no source yet.
const FIELD_SOURCE_DEFAULTS = {
  brand: { source: 'catalog', catalog_path: 'brand' },
  pack_size: { source: 'catalog', catalog_path: 'quantity_text' },
  composition: { source: 'catalog', catalog_path: 'attributes.generic' },
  dosage_form: { source: 'catalog', catalog_path: 'attributes.dosage_form' },
  manufacturer: { source: 'catalog', catalog_path: 'manufacturer' },
  model_number: { source: 'catalog', catalog_path: 'attributes.model_number' },
  author_brand: { source: 'catalog', catalog_path: 'brand' },
  net_weight: { source: 'catalog', catalog_path: 'quantity_text' },
  prescription_required: { source: 'catalog', catalog_path: 'attributes.prescription_required', statutory: true },
  schedule_drug: { source: 'catalog', catalog_path: 'attributes.schedule_drug', statutory: true },
};

/** Fields with ownership filled in from FIELD_SOURCE_DEFAULTS where they have none. */
const annotateFieldSources = (fields) =>
  (Array.isArray(fields) ? fields : []).map((field) => {
    if (!field || typeof field !== 'object' || !isEmpty(field.source)) return field;
    const defaults = FIELD_SOURCE_DEFAULTS[field.key];
    return defaults ? { ...field, ...defaults } : field;
  });

/** Templates as sent to the admin form builder (keywords stay server-side). */
const listTemplates = () =>
  FORM_TEMPLATES.map(({ key, label, icon, description, fields }) => ({
    key,
    label,
    icon,
    description,
    fields: normalizeSchema(fields).schema,
  }));

module.exports = {
  FIELD_TYPES,
  FIELD_SOURCES,
  CATALOG_PATH_PATTERN,
  FIELD_SOURCE_DEFAULTS,
  annotateFieldSources,
  coerceValue,
  isEmpty,
  FILTERABLE_TYPES,
  RESERVED_KEYS,
  FORM_TEMPLATES,
  getTemplate,
  suggestTemplate,
  listTemplates,
  normalizeSchema,
  validateMetadata,
  resolveSchema,
  getFilterableFields,
  mergeFilterFields,
  buildMetadataFilter,
};
