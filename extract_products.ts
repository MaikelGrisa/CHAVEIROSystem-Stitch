import * as XLSX from 'xlsx';

const workbook = XLSX.readFile('/mnt/user-uploads/BASE.xlsx');
const worksheet = workbook.Sheets['Lista de Preço'];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Skip empty rows and header
const rows = data.slice(3).filter(row => row.length > 0 && row[0] !== undefined);

const products = rows.map(row => {
  return {
    name: `${row[0]} ${row[3] || ''}`.trim(),
    codigo: row[1] || null,
    codigo_fornecedor: row[2] || null,
    marca: row[3] || null,
    referencia: row[4] || null,
    purchase_price: Number(row[5]) || 0,
    sale_price: Number(row[6]) || 0,
    sku: `P${Math.random().toString(36).substr(2, 4).toUpperCase()}` // Temporary SKU
  };
});

console.log(JSON.stringify(products));
