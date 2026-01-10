export const HOSPITALITY_ROLES = [
  'Bartender',
  'Waitstaff',
  'Barista',
  'Barback',
  'Kitchen Hand',
  'Duty Manager',
] as const;

export type HospitalityRole = (typeof HOSPITALITY_ROLES)[number];

export const HOSPITALITY_COMMON_SKILLS = [
  'Customer Service',
  'POS (Point of Sale)',
  'Cash Handling',
  'Food Safety',
  'Manual Handling',
  'Responsible Service of Alcohol (RSA)',
  'Responsible Conduct of Gambling (RCG)',
  'Coffee / Espresso',
  'Cocktail Knowledge',
  'Bar Service',
  'Table Service',
  'Section Management',
  'Kitchen Prep',
  'Dishwashing',
  'Cleaning & Close',
] as const;
