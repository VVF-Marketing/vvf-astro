import StatTileRow from './StatTileRow.astro'
import type { Stat } from './StatTileRow.astro'

// Live home page "About Us" figures.
const stats: Stat[] = [
  { value: '77,300+', label: 'Meals served', caption: 'Nutrition reaching hungry children daily' },
  { value: '1,012+', label: 'Medical visits for children', caption: 'Health restored through our clinics' },
  { value: '1000+', label: 'Children in programs', caption: 'Education opening doors to tomorrow' },
  { value: '41+', label: 'Corporate sponsors', caption: 'Partners believing in this mission' },
]

export default {
  title: 'Molecules/StatTileRow',
  component: StatTileRow,
}

export const TwoByTwo = {
  args: { stats },
}

export const FourAcross = {
  args: { stats, columns: 4 },
}
