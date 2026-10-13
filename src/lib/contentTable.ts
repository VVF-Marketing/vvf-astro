// Layout of a Portable Text `table` block for ContentTable.astro: EmDash's
// own normalization (repairs, malformed-table recovery) plus the cell
// placement and header-row logic of EmDash's Table.astro, as a pure,
// testable function (openspec/changes/add-rich-text-table-style, D1).
import {
  TABLE_CELL_MIN_WIDTH,
  createPortableTextTableCellMarkResolver,
  getPortableTextTableColumnWidths,
  normalizePortableTextTable,
  type PortableTextTableAlignment,
  type PortableTextTableCell,
  type PortableTextTableMarkDef,
} from '@emdash-cms/admin/portable-text-table'

export interface LaidOutCell {
  key: string
  header: boolean
  // `col` for header-row cells, `row` for a header cell starting a body row.
  scope?: 'col' | 'row'
  colspan?: number
  rowspan?: number
  // Set in the editor; rendered inline so it beats the default alignment.
  textAlign?: PortableTextTableAlignment
  // The cell's text as a Portable Text block (marks resolved).
  block: { _type: 'block'; _key: string; style: 'normal'; children: PortableTextTableCell['content']; markDefs: PortableTextTableMarkDef[] }
}

export type ContentTableLayout =
  | {
      ok: true
      columnWidths?: number[]
      minWidth: number
      headerRow?: LaidOutCell[]
      bodyRows: LaidOutCell[][]
    }
  // Malformed table EmDash couldn't repair: plain cell text, row by row.
  | { ok: false; minWidth: number; rawRows: string[][] }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function rawText(value: unknown, depth = 0): string {
  if (depth > 32) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map((v) => rawText(v, depth + 1)).join('')
  if (!isRecord(value)) return ''
  if (typeof value.text === 'string') return value.text
  if (typeof value.content === 'string') return value.content
  return rawText(Array.isArray(value.content) ? value.content : Array.isArray(value.children) ? value.children : [], depth + 1)
}

export function layoutContentTable(node: unknown): ContentTableLayout {
  let generated = 0
  const normalized = normalizePortableTextTable(node, { path: 'render:table', createKey: () => `render-table-${generated++}` })
  const table = normalized.ok ? normalized.table : normalized.renderFallback

  if (!table) {
    const rows = isRecord(normalized.raw) && Array.isArray(normalized.raw.rows) ? normalized.raw.rows : []
    const rawRows = rows.map((row) => (isRecord(row) && Array.isArray(row.cells) ? row.cells.map((c) => rawText(c)) : []))
    const width = Math.max(1, ...rawRows.map((r) => r.length))
    return { ok: false, minWidth: width * TABLE_CELL_MIN_WIDTH, rawRows }
  }

  const markDefsFor = createPortableTextTableCellMarkResolver(table)
  // Place cells on a grid so rowspans push later cells right.
  const occupied = table.rows.map(() => new Set<number>())
  const placed = table.rows.map((row, r) => {
    let column = 0
    return row.cells.map((cell) => {
      while (occupied[r].has(column)) column++
      const start = column
      for (let dr = 0; dr < (cell.rowspan ?? 1); dr++) {
        for (let dc = 0; dc < (cell.colspan ?? 1); dc++) occupied[r + dr]?.add(start + dc)
      }
      column += cell.colspan ?? 1
      return { cell, column: start }
    })
  })
  const width = normalized.ok ? normalized.width : Math.max(1, ...placed.flat().map(({ cell, column }) => column + (cell.colspan ?? 1)))

  // Header row as EmDash decides it (normalization sets `hasHeaderRow` when
  // the first row is all header cells): every first-row cell a single-row
  // header cell.
  const first = table.rows[0]?.cells ?? []
  const hasHeaderRow = table.hasHeaderRow === true && first.length > 0 && first.every((c) => c.isHeader === true && (c.rowspan ?? 1) === 1)

  const toCell = ({ cell, column }: { cell: PortableTextTableCell; column: number }, inHeaderRow: boolean): LaidOutCell => ({
    key: cell._key,
    header: inHeaderRow || cell.isHeader === true,
    scope: inHeaderRow ? 'col' : cell.isHeader && column === 0 && (cell.rowspan ?? 1) === 1 ? 'row' : undefined,
    colspan: (cell.colspan ?? 1) > 1 ? cell.colspan : undefined,
    rowspan: (cell.rowspan ?? 1) > 1 ? cell.rowspan : undefined,
    textAlign: cell.textAlign,
    block: { _type: 'block', _key: cell._key, style: 'normal', children: cell.content, markDefs: markDefsFor(cell) },
  })

  const columnWidths = getPortableTextTableColumnWidths(table)
  return {
    ok: true,
    columnWidths,
    minWidth: columnWidths ? columnWidths.reduce((a, b) => a + b, 0) : width * TABLE_CELL_MIN_WIDTH,
    headerRow: hasHeaderRow ? placed[0].map((p) => toCell(p, true)) : undefined,
    bodyRows: (hasHeaderRow ? placed.slice(1) : placed).map((row) => row.map((p) => toCell(p, false))),
  }
}
