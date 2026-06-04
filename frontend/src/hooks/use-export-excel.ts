import { useCallback, useState } from 'react'
import * as XLSX from 'xlsx'
import type { Column } from '@/components/templates/datatable'

interface UseExportExcelOptions<T> {
  filename: string
  sheetName?: string
  columns: Array<Column<T>>
  fetchAll: () => Promise<Array<T>>
}

export function useExportExcel<T>({
  filename,
  sheetName = 'Sheet1',
  columns,
  fetchAll,
}: UseExportExcelOptions<T>) {
  const [isExporting, setIsExporting] = useState(false)

  const onExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const items = await fetchAll()
      const exportColumns = columns.filter((col) => col.uid !== 'actions' && col.uid !== 'preview')

      const worksheetData = items.map((item) => {
        const row: Record<string, string | number | null> = {}
        for (const col of exportColumns) {
          row[col.name] = col.exportValue
            ? col.exportValue(item)
            : ((item as Record<string, unknown>)[col.uid] as string | number | null) ?? null
        }
        return row
      })

      const worksheet = XLSX.utils.json_to_sheet(worksheetData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

      if (worksheetData.length > 0) {
        worksheet['!cols'] = Object.keys(worksheetData[0]).map((key) => ({
          wch: Math.max(key.length, 10) + 5,
        }))
      }

      const date = new Date().toISOString().split('T')[0]
      XLSX.writeFile(workbook, `${filename}_${date}.xlsx`)
    } finally {
      setIsExporting(false)
    }
  }, [columns, fetchAll, filename, sheetName])

  return { onExport, isExporting }
}
