import * as XLSX from 'xlsx';

const workbook = XLSX.readFile('/mnt/user-uploads/BASE.xlsx');
const sheet = workbook.Sheets['Lista de Preço'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const products = [];
// Skip headers (rows 0-2 are empty or header)
for (let i = 3; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length < 7) continue;
  
  const name = row[0];
  const codigo = String(row[1]).trim();
  const purchasePrice = parseFloat(row[5]) || 0;
  const salePrice = parseFloat(row[6]) || 0;
  const category = row[4] || 'Geral';
  
  if (name && codigo && codigo !== 'undefined' && codigo !== 'null') {
    products.push({ name, codigo, purchasePrice, salePrice, category });
  }
}

console.log(JSON.stringify(products));