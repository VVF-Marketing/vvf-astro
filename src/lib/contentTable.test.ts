import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { layoutContentTable } from './contentTable'

const seed = JSON.parse(readFileSync(path.join(process.cwd(), 'seed/seed.json'), 'utf8'))
const impactReport = seed.content.resources.find((e: { slug?: string; locale?: string }) => e.slug === 'impact-report-2025' && (e.locale ?? 'en') === 'en')
const seedTables = (impactReport.data.body as { _type: string }[]).filter((b) => b._type === 'table')

let n = 0
const cell = (text: string, extra: Record<string, unknown> = {}) => ({ _type: 'tableCell', _key: `c${n++}`, content: [{ _type: 'span', _key: `s${n++}`, text }], ...extra })
const row = (...cells: ReturnType<typeof cell>[]) => ({ _type: 'tableRow', _key: `r${n++}`, cells })
const table = (rows: ReturnType<typeof row>[], extra: Record<string, unknown> = {}) => ({ _type: 'table', _key: `t${n++}`, rows, ...extra })
const text = (c: { block: { children: { text: string }[] } }) => c.block.children.map((s) => s.text).join('')

describe('layoutContentTable', () => {
  it('lays out the impact report tables with a header row', () => {
    expect(seedTables).toHaveLength(5)
    const layout = layoutContentTable(seedTables[0])
    if (!layout.ok) throw new Error('expected a valid table')
    expect(layout.headerRow?.map(text)).toEqual(['Program', '2025', 'What it means'])
    expect(layout.headerRow?.every((c) => c.header && c.scope === 'col')).toBe(true)
    expect(layout.bodyRows[0].map(text)).toEqual(['Nutrition Program', '77,300', 'Meals served to at risk children'])
    expect(layout.bodyRows.flat().some((c) => c.header)).toBe(false)
    expect(layout.minWidth).toBe(3 * 96)
  })

  it('has no header row when the first row is ordinary cells', () => {
    const layout = layoutContentTable(table([row(cell('a'), cell('b')), row(cell('c'), cell('d'))]))
    if (!layout.ok) throw new Error('expected a valid table')
    expect(layout.headerRow).toBeUndefined()
    expect(layout.bodyRows).toHaveLength(2)
  })

  it('places merged cells and keeps their spans', () => {
    const layout = layoutContentTable(
      table([
        row(cell('H1', { isHeader: true }), cell('H2', { isHeader: true }), cell('H3', { isHeader: true })),
        row(cell('tall', { rowspan: 2 }), cell('wide', { colspan: 2 })),
        row(cell('x'), cell('y')),
      ], { hasHeaderRow: true })
    )
    if (!layout.ok) throw new Error('expected a valid table')
    const [r1, r2] = layout.bodyRows
    expect(r1.map((c) => [text(c), c.rowspan, c.colspan])).toEqual([
      ['tall', 2, undefined],
      ['wide', undefined, 2],
    ])
    expect(r2.map(text)).toEqual(['x', 'y'])
  })

  it('marks a header cell starting a body row as a row header', () => {
    const layout = layoutContentTable(table([row(cell('Metric'), cell('Value')), row(cell('Growth', { isHeader: true }), cell('17%'))]))
    if (!layout.ok) throw new Error('expected a valid table')
    expect(layout.bodyRows[1][0]).toMatchObject({ header: true, scope: 'row' })
    expect(layout.bodyRows[1][1]).toMatchObject({ header: false, scope: undefined })
  })

  it('keeps editor alignment and column widths', () => {
    const layout = layoutContentTable(
      table([
        row(cell('Item', { isHeader: true, colwidth: [240] }), cell('Amount', { isHeader: true, colwidth: [120], textAlign: 'right' })),
        row(cell('Meals', { colwidth: [240] }), cell('77,300', { colwidth: [120], textAlign: 'right' })),
      ], { hasHeaderRow: true })
    )
    if (!layout.ok) throw new Error('expected a valid table')
    expect(layout.columnWidths).toEqual([240, 120])
    expect(layout.minWidth).toBe(360)
    expect(layout.bodyRows[0][1].textAlign).toBe('right')
    expect(layout.bodyRows[0][0].textAlign).toBeUndefined()
  })

  it('still shows the text of a table it cannot repair', () => {
    const layout = layoutContentTable({ _type: 'table', rows: [{ cells: [{ content: [{ text: 'Only' }] }, 'loose text'] }], hasHeaderRow: 'yes' })
    const texts = layout.ok ? [...(layout.headerRow ?? []), ...layout.bodyRows.flat()].map(text) : layout.rawRows.flat()
    expect(texts.join(' ')).toContain('Only')
  })
})
