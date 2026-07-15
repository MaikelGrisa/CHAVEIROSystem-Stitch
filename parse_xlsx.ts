import * as XLSX from 'xlsx';

const workbook = XLSX.readFile('/mnt/user-uploads/BASE.xlsx');
workbook.SheetNames.forEach(sheetName => {
  console.log(`--- Sheet: ${sheetName} ---`);
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  data.forEach((row, index) => {
    if (index < 50) { // First 50 rows per sheet
      console.log(JSON.stringify(row));
    }
  });
});
