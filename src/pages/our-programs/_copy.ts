// Copy slots for /our-programs (src/lib/copy.ts). Defaults are the live page
// (spec 7.19: page content, as today); the Spanish is the live /es page's.
// The program figures name their source (WHO, UN, UNICEF), as on the live site.
import { defineCopy, seoSlots } from '../../lib/copy'

const photo = (block: string, n: number, alt: string, title: string, text: string) => ({
  [`${block}.photo${n}.alt`]: { label: `${block}: photo ${n} description`, default: alt, maxLength: 140 },
  [`${block}.photo${n}.title`]: { label: `${block}: photo ${n} caption title`, default: title, maxLength: 40 },
  [`${block}.photo${n}.text`]: { label: `${block}: photo ${n} caption`, default: text, maxLength: 120 },
})

export default defineCopy('/our-programs', {
  ...seoSlots({
    title: 'Our Programs | Victoria Venezuela Foundation',
    description: 'Nutrition, medical care and education for children in Venezuela, run with local churches. See how each program works and how you can support it.',
    // The hero photo, cropped to 1200 × 630 (spec 7.19).
    image: '/images/pages/programs-share.jpg',
  }),
  'hero.heading': { label: 'Hero: heading', default: "Our programs transform children's lives", maxLength: 60 },
  'hero.subtext': { label: 'Hero: text', default: 'Nutrition, medical care, and education work together to provide holistic support. We believe every child deserves the foundation to thrive.', maxLength: 210 },
  'hero.imageAlt': { label: 'Hero: image description', default: 'Smiling boy eating food from a blue bowl at a blue table with other children in the background.', maxLength: 120 },
  'hero.cta1': { label: 'Hero: first button', default: 'Explore', maxLength: 20 },
  'hero.cta2': { label: 'Hero: second button', default: 'Donate', maxLength: 20 },
  'together.tagline': { label: 'How our programs work together: tagline', default: 'Integrated', maxLength: 20 },
  'together.heading': { label: 'How our programs work together: heading', default: 'How our programs work together', maxLength: 50 },
  'together.text': { label: 'How our programs work together: text', default: 'We believe children need more than one type of support. They need holistic care. Nutrition feeds the body. Medical care heals the sick. Education opens doors. Faith sustains the spirit and runs through all three. At Victoria Venezuela Foundation, these four pillars work as one, guided by partnerships with local churches that know their communities best.', maxLength: 500 },
  'program.support': { label: 'Program blocks: support button', default: 'Support', maxLength: 20 },
  'nutrition.tagline': { label: 'Nutrition: tagline', default: 'Nourishment', maxLength: 20 },
  'nutrition.heading': { label: 'Nutrition: heading', default: 'Nutrition program feeds hungry children', maxLength: 70 },
  'nutrition.text': { label: 'Nutrition: text', default: 'Around 45% of deaths among children under five are linked to undernutrition, according to the World Health Organization. In Venezuela, families struggle to put food on the table. We serve weekly nutritious meals at local church centers where children gather, learn, and grow strong. Our volunteers prepare balanced meals while sharing faith and hope with every child who walks through the door.', maxLength: 520 },
  ...photo('nutrition', 1, 'Smiling boy eating food from a blue bowl at a blue table with other children in the background.', 'Weekly meals', 'Children share a balanced meal at one of our church centers.'),
  ...photo('nutrition', 2, 'Smiling girl sitting at a table eating empanadas with orange cups nearby.', 'Meal time', 'A girl enjoys empanadas at one of our weekly meals.'),
  'medical.tagline': { label: 'Medical care: tagline', default: 'Healing', maxLength: 20 },
  'medical.heading': { label: 'Medical care: heading', default: 'Medical care restores health and hope', maxLength: 70 },
  'medical.text': { label: 'Medical care: text', default: 'In 2023, 4.8 million children died before their fifth birthday, most from causes that could have been prevented, according to the United Nations. In Venezuela, the healthcare system has collapsed, leaving families without access to basic care. Twice a year we organize medical attention days where volunteer doctors diagnose, treat, and provide medications and vaccines to children who need them most.', maxLength: 520 },
  ...photo('medical', 1, "A volunteer doctor listens to a boy's chest with a stethoscope at a medical attention day.", 'Medical diagnosis', 'Professional assessment identifying conditions requiring immediate attention and care.'),
  ...photo('medical', 2, 'A mother holds her young son at a Victoria Venezuela Foundation medical clinic while a doctor explains a medication.', 'Medical attention days', 'Mothers bring their children to be seen by our volunteer doctors.'),
  'education.tagline': { label: 'Education: tagline', default: 'Learning', maxLength: 20 },
  'education.heading': { label: 'Education: heading', default: 'Education opens doors for Venezuelan children', maxLength: 70 },
  'education.text': { label: 'Education: text', default: 'About 3 million children and young people in Venezuela, aged 3 to 24, are not in school, according to UNICEF. Poverty, displacement, and broken systems keep them out. We distribute school supplies and uniforms every year, provide tuition assistance to families in need, and encourage every child to complete their education.', maxLength: 520 },
  ...photo('education', 1, 'Young girl focused on writing in a notebook at a blue desk in a classroom with other children.', 'School supplies', 'Uniforms and school supplies, handed out every year.'),
  'goals.tagline': { label: 'Global goals: tagline', default: 'Global', maxLength: 20 },
  'goals.heading': { label: 'Global goals: heading', default: 'Our work aligns with global development goals', maxLength: 80 },
  'goals.text': { label: 'Global goals: text', default: "Victoria Venezuela Foundation's programs directly support the United Nations Sustainable Development Goals. We work toward a world where every child has food, health, and education, the foundation for human dignity and opportunity.", maxLength: 350 },
  'goals.cta1': { label: 'Global goals: donate button', default: 'Donate', maxLength: 20 },
  'goals.cta2': { label: 'Global goals: sponsor button', default: 'Sponsor', maxLength: 20 },
  'goals.imageAlt': { label: 'Global goals: image description', default: 'A smiling girl sits at a table with a bowl of rice and a blue cup.', maxLength: 100 },
  'videos.heading': { label: 'Videos: heading', default: 'Stories of transformation', maxLength: 40 },
  'videos.text': { label: 'Videos: text', default: 'Real lives changed by real support', maxLength: 80 },
})
