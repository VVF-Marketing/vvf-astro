import ReportList from './ReportList.astro'

// Financial report cards (live `.fin_report-card`).
const reports = [
  { slug: 'impact-report-2025', title: 'Impact Report 2025', excerpt: 'Since 2022 we have served 77,300 meals and given 1,012 medical visits to children.', publishedAt: '2026-02-03', fileUrl: '/report.pdf' },
  { slug: 'annual-report-2023', title: 'Annual Report 2023', excerpt: 'In 2023 we served 24,800 meals and gave 500 children critical medical attention.', publishedAt: '2024-01-16' },
]

export default {
  title: 'Organisms/ReportList',
  component: ReportList,
}

export const Stack = { args: { reports } }
export const Grid = { args: { reports: [...reports, ...reports], layout: 'grid' } }
