const jsonData = [
  {
    name: 'Others',
    subcategories: ['Others'],
  },
  {
    name: 'Automotive',
    subcategories: [
      'Auto Accessories',
      'Auto Dealers – New',
      'Auto Dealers – Used',
      'Detail & Carwash',
      'Gas Stations',
      'Motorcycle Sales & Repair',
      'Rental & Leasing',
      'Service, Repair & Parts',
      'Towing',
    ],
  },
  {
    name: 'Business Support & Supplies',
    subcategories: [
      'Consultants',
      'Employment Agency',
      'Marketing & Communications',
      'Office Supplies',
      'Printing & Publishing',
    ],
  },
  {
    name: 'Computers & Electronics',
    subcategories: [
      'Computer Programming & Support',
      'Consumer Electronics & Accessories',
    ],
  },
  {
    name: 'Construction & Contractors',
    subcategories: [
      'Architects, Landscape Architects, Engineers & Surveyors',
      'Blasting & Demolition',
      'Building Materials & Supplies',
      'Construction Companies',
      'Electricians',
      'Engineer, Survey',
      'Environmental Assessments',
      'Inspectors',
      'Plaster & Concrete',
      'Plumbers',
      'Roofers',
    ],
  },
  {
    name: 'Education',
    subcategories: [
      'Adult & Continuing Education',
      'Early Childhood Education',
      'Educational Resources',
      'Other Educational',
    ],
  },
  {
    name: 'Entertainment',
    subcategories: [
      'Artists, Writers',
      'Event Planners & Supplies',
      'Golf Courses',
      'Movies',
      'Productions',
    ],
  },
  {
    name: 'Food & Dining',
    subcategories: [
      'Desserts, Catering & Supplies',
      'Fast Food & Carry Out',
      'Grocery, Beverage & Tobacco',
      'Restaurants',
    ],
  },
  {
    name: 'Health & Medicine',
    subcategories: [
      'Acupuncture',
      'Assisted Living & Home Health Care',
      'Audiologist',
      'Chiropractic',
      'Clinics & Medical Centers',
      'Dental',
      'Diet I& Nutrition',
      'Laboratory, Imaging & Diagnostic',
      'Massage Therapy',
      'Mental Health',
      'Nurse',
      'Optical',
      'Pharmacy, Drug & Vitamin Stores',
      'Physical Therapy',
      'Physicians & Assistants',
      'Podiatry',
      'Social Worker',
      'Animal Hospital',
      'Veterinary & Animal Surgeons',
    ],
  },
  {
    name: 'Home & Garden',
    subcategories: [
      'Antiques & Collectibles',
      'Cleaning',
      'Crafts, Hobbies & Sports',
      'Flower Shops',
      'Home Furnishings',
      'Home Goods',
      'Home Improvements & Repairs',
      'Landscape & Lawn Service',
      'Pest Control',
      'Pool Supplies & Service',
      'Security System & Services',
    ],
  },
  {
    name: 'Legal & Financial',
    subcategories: [
      'Accountants',
      'Attorneys',
      'Financial Institutions',
      'Financial Services',
      'Insurance',
      'Other Legal',
    ],
  },
  {
    name: 'Manufacturing, Wholesale, Distribution',
    subcategories: [
      'Distribution, Import/Export',
      'Manufacturing',
      'Wholesale',
    ],
  },
  {
    name: 'Merchants (Retail)',
    subcategories: [
      'Cards & Gifts',
      'Clothing & Accessories',
      'Department Stores, Sporting Goods',
      'General',
      'Jewelry',
      'Shoes',
    ],
  },
  {
    name: 'Miscellaneous',
    subcategories: [
      'Civic Groups',
      'Funeral Service Providers & Cemeteries',
      'Miscellaneous',
      'Utility Companies',
    ],
  },
  {
    name: 'Personal Care & Services',
    subcategories: [
      'Animal Care & Supplies',
      'Barber & Beauty Salons',
      'Beauty Supplies',
      'Dry Cleaners & Laundromats',
      'Exercise & Fitness',
      'Massage & Body Works',
      'Nail Salons',
      'Shoe Repairs',
      'Tailors',
      'Fitness Studio',
    ],
  },
  {
    name: 'Real Estate',
    subcategories: ['Agencies & Brokerage'],
  },
  {
    name: 'Travel & Transportation',
    subcategories: [
      'Agents & Brokers',
      'Apartment & Home Rental',
      'Mortgage Broker & Lender',
      'Property Management',
      'Title Company',
      'Hotel, Motel & Extended Stay',
      'Moving & Storage',
      'Packaging & Shipping',
      'Transportation',
      'Travel & Tourism',
    ],
  },
];

let categories = [],
  sub_categories = [];
let count = 0;

jsonData.forEach((item, index) => {
  categories.push({
    id: index,
    name: item.name,
    img_url: `${item.name}.jpg`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  if (!item?.subcategories) return;
  item?.subcategories.forEach((item) => {
    sub_categories.push({
      id: sub_categories.length + 1,
      name: item,
      img_url: `${item}.jpg`,
      category_id: index,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
});

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('categories', categories, {});
    await queryInterface.bulkInsert('sub_categories', sub_categories, {});

    return Promise.resolve();
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('sub_categories', null, {});
    await queryInterface.bulkDelete('categories', null, {});
    return Promise.resolve();
  },
};
