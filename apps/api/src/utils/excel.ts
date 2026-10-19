import ExcelJS from 'exceljs';

export interface SheetSpec {
  name: string;
  columns: Array<{ header: string; key: string }>;
  rows: Array<Record<string, unknown>>;
}

export async function buildWorkbook(sheets: SheetSpec[]): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SIPUS';
  wb.created = new Date();

  for (const spec of sheets) {
    const ws = wb.addWorksheet(spec.name);
    ws.columns = spec.columns.map((c) => ({ header: c.header, key: c.key, width: Math.max(16, c.header.length + 4) }));
    for (const row of spec.rows) {
      ws.addRow(row);
    }
    // Styling header
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    header.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  }

  return wb.xlsx.writeBuffer() as Promise<ExcelJS.Buffer>;
}
