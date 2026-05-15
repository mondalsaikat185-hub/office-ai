import * as XLSX from 'xlsx';

export interface EmployeeRecord {
  sl: number;
  name: string;
  designation: string;
  phone: string;
  dob: string;
  doj: string;
  dor: string;
  gpfNo: string;
  postingStation: string;
  status: 'active' | 'retired' | 'transferred';
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}

function setLandscape(wb: XLSX.WorkBook, sheetName: string) {
  const ws = wb.Sheets[sheetName];
  if (!ws['!pageSetup']) ws['!pageSetup'] = {};
  ws['!pageSetup'].orientation = 'landscape';
  ws['!pageSetup'].fitToPage = true;
  ws['!pageSetup'].fitToWidth = 1;
}

function mergeTitle(ws: XLSX.WorkSheet, colCount: number) {
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 1, c: colCount - 1 } }];
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
     return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric'
     });
  } catch (e) {
     return dateStr;
  }
}

export function generateEmployeeReport(
  employees: EmployeeRecord[],
  officeName: string,
  period: string,
  orientation: 'portrait' | 'landscape' = 'landscape'
): void {
  const wb = XLSX.utils.book_new();

  const titleText = `${officeName.toUpperCase()}\nSTATEMENT OF EMPLOYEES — ${period.toUpperCase()}`;

  const headers = [
    'SL NO.',
    'NAME OF OFFICIAL',
    'DESIGNATION',
    'MOBILE NUMBER',
    'DATE OF BIRTH',
    'DATE OF JOINING',
    'DATE OF RETIREMENT',
    'GPF A/C NO.',
    'STATION OF POSTING',
    'STATUS'
  ];

  const dataRows = employees.map((e, i) => [
    i + 1,
    e.name,
    e.designation,
    e.phone,
    formatDate(e.dob),
    formatDate(e.doj),
    formatDate(e.dor),
    e.gpfNo,
    e.postingStation,
    e.status.toUpperCase()
  ]);

  const summaryRow = [
    '', `Total: ${employees.length} Officials`, '', '', '', '', '', '', '', ''
  ];

  const allRows = [
      [titleText, '', '', '', '', '', '', '', '', ''],
      [],
      headers,
      ...dataRows,
      summaryRow
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  setColWidths(ws, [5, 28, 20, 14, 14, 14, 14, 16, 18, 12]);
  mergeTitle(ws, 10);
  
  // Basic merged cell styling placeholder
  if (orientation === 'landscape') setLandscape(wb, 'Employee Statement');

  XLSX.utils.book_append_sheet(wb, ws, 'Employee Statement');
  XLSX.writeFile(wb, `Employee_Statement_${period.replace(/\s+/g, '_')}.xlsx`);
}

export function parseUploadedExcel(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: 'array' });
          const firstSheet = wb.SheetNames[0];
          const ws = wb.Sheets[firstSheet];
          const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
          resolve(jsonData as any[][]);
      } catch (err) {
          reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function generateGenericExcel(data: any[], fileName: string, sheetName: string = 'Sheet1'): void {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function generatePendencyStatement(
  diary: any[],
  officeName: string,
  period: string
): void {
  const wb = XLSX.utils.book_new();
  const titleText = `${officeName.toUpperCase()}\nPENDENCY STATEMENT & DIARY REPORT — ${period.toUpperCase()}`;

  const headers = [
    'Sl. No.',
    'Type',
    'Date',
    'Title / Subject',
    'Description',
    'Status',
    'Remarks'
  ];

  const pendingItems = diary.filter(d => !d.isCompleted);
  
  const dataRows = pendingItems.map((d, i) => [
    i + 1,
    d.type.toUpperCase(),
    formatDate(d.date),
    d.title,
    d.description || '',
    d.isCompleted ? 'COMPLETED' : 'PENDING',
    d.limitationDays ? `Limitation: ${d.limitationDays} days` : ''
  ]);

  const allRows = [
      [titleText, '', '', '', '', '', ''],
      [],
      headers,
      ...dataRows
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  setColWidths(ws, [8, 15, 15, 35, 40, 15, 20]);
  mergeTitle(ws, 7);
  
  setLandscape(wb, 'Pendency Statement');

  XLSX.utils.book_append_sheet(wb, ws, 'Pendency Statement');
  XLSX.writeFile(wb, `Pendency_Statement_${period.replace(/\s+/g, '_')}.xlsx`);
}

export function generateDemandRegister(
  demands: any[],
  officeName: string,
  period: string
): void {
  const wb = XLSX.utils.book_new();
  const titleText = `${officeName.toUpperCase()}\nDEMAND & RECOVERY REGISTER — ${period.toUpperCase()}`;

  const headers = [
    'Sl. No.',
    'Party Name',
    'OIO No.',
    'OIO Date',
    'Tax',
    'Penalty',
    'Interest',
    'Total Demand',
    'Recovered',
    'Balance',
    'Status',
    'Remarks'
  ];

  const dataRows = demands.map((d, i) => [
    i + 1,
    d.partyName,
    d.oioNo,
    formatDate(d.oioDate),
    d.tax || 0,
    d.penalty || 0,
    d.interest || 0,
    d.amount,
    d.recoveredAmount || 0,
    (d.amount - (d.recoveredAmount || 0)),
    d.status.toUpperCase(),
    d.remarks || ''
  ]);

  const allRows = [
      [titleText, '', '', '', '', '', '', '', '', '', '', ''],
      [],
      headers,
      ...dataRows
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  setColWidths(ws, [8, 25, 20, 14, 12, 12, 12, 15, 15, 15, 15, 20]);
  mergeTitle(ws, 12);
  
  setLandscape(wb, 'Demand Register');

  XLSX.utils.book_append_sheet(wb, ws, 'Demand Register');
  XLSX.writeFile(wb, `Demand_Register_${period.replace(/\s+/g, '_')}.xlsx`);
}

