import ContentTable from './ContentTable.astro'

// Rich-text table (Portable Text `table` block), live `.article_body` style.
let n = 0
const cell = (text: string, extra: Record<string, unknown> = {}) => ({ _type: 'tableCell', _key: `c${n++}`, content: [{ _type: 'span', _key: `s${n++}`, text }], ...extra })
const row = (...cells: ReturnType<typeof cell>[]) => ({ _type: 'tableRow', _key: `r${n++}`, cells })
const header = (...texts: string[]) => row(...texts.map((t) => cell(t, { isHeader: true })))

export default {
  title: 'Molecules/ContentTable',
  component: ContentTable,
}

// Impact Report 2025, "Key metrics".
export const Default = {
  args: {
    node: {
      _type: 'table',
      _key: 'metrics',
      hasHeaderRow: true,
      rows: [
        header('Metric', 'Δ FY24-25'),
        row(cell('Participants Growth Rate'), cell('17%')),
        row(cell('Contribution Growth Rate'), cell('254%')),
        row(cell('Support Programs Growth Rate'), cell('38%')),
      ],
    },
  },
}

// Alignment set in the editor wins over the default left alignment.
export const RightAlignedNumbers = {
  args: {
    node: {
      _type: 'table',
      _key: 'programs',
      hasHeaderRow: true,
      rows: [
        row(cell('Program', { isHeader: true }), cell('2025', { isHeader: true, textAlign: 'right' })),
        row(cell('Nutrition Program'), cell('77,300', { textAlign: 'right' })),
        row(cell('Medical Attention Program'), cell('1,012', { textAlign: 'right' })),
        row(cell('Education Program'), cell('99', { textAlign: 'right' })),
      ],
    },
  },
}

// Wider than a phone: scrolls sideways inside the card.
export const Wide = {
  args: {
    node: {
      _type: 'table',
      _key: 'wide',
      hasHeaderRow: true,
      rows: [
        header('Month', 'Meals', 'Visits', 'Classes', 'Sponsors', 'Volunteers', 'Events', 'Donations'),
        row(...['January', '6,100', '84', '12', '40', '22', '1', '$18,200'].map((t) => cell(t))),
        row(...['February', '6,350', '79', '12', '41', '19', '0', '$16,900'].map((t) => cell(t))),
      ],
    },
  },
}
