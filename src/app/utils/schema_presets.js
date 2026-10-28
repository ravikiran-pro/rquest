/**
 * Form Schema Presets for different business verticals
 */

export const SCHEMA_PRESETS = {
  grocery: [
    { name: 'unit', label: 'Unit / Weight', type: 'select', options: ['kg', 'g', 'litre', 'ml', 'piece', 'packet', 'bunch'], required: true },
    { name: 'brand', label: 'Brand Name', type: 'text', required: false },
    { name: 'shelf_life', label: 'Shelf Life / Expiry', type: 'text', required: false },
  ],
  restaurant: [
    { name: 'dietary', label: 'Dietary Type', type: 'select', options: ['Veg', 'Non-Veg', 'Egg', 'Vegan'], required: true },
    { name: 'portion_size', label: 'Portion / Serves', type: 'text', required: false },
    { name: 'spiciness', label: 'Spiciness Level', type: 'select', options: ['Mild', 'Medium', 'Spicy', 'Extra Spicy'], required: false },
  ],
  service: [
    { name: 'duration', label: 'Estimated Duration (mins)', type: 'number', required: false },
    { name: 'warranty', label: 'Service Warranty (days)', type: 'number', required: false },
    { name: 'service_location', label: 'Location Type', type: 'select', options: ['At Store / Center', 'Home Visit / Doorstep'], required: false },
  ],
};

export default SCHEMA_PRESETS;

