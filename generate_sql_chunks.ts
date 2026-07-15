import * as XLSX from 'xlsx';

const workbook = XLSX.readFile('/mnt/user-uploads/BASE.xlsx');
const worksheet = workbook.Sheets['Lista de Preço'];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
const rows = data.slice(3).filter(row => row.length > 0 && row[0] !== undefined);

const seenCodigos = new Set();
const chunks = [];
let currentChunk = [];

for (const row of rows) {
    const rawCodigo = row[1];
    const codigoKey = rawCodigo ? String(rawCodigo).trim() : null;
    if (codigoKey && seenCodigos.has(codigoKey)) continue;
    if (codigoKey) seenCodigos.add(codigoKey);

    const name = `${row[0]} ${row[3] || ''}`.trim().replace(/'/g, "''");
    const codigo = row[1] ? `'${String(row[1]).replace(/'/g, "''")}'` : 'NULL';
    const codigo_forn = row[2] ? `'${String(row[2]).replace(/'/g, "''")}'` : 'NULL';
    const marca = row[3] ? `'${String(row[3]).replace(/'/g, "''")}'` : 'NULL';
    const ref = row[4] ? `'${String(row[4]).replace(/'/g, "''")}'` : 'NULL';
    const purchase = Number(row[5]) || 0;
    const sale = Number(row[6]) || 0;
    const sku = `P${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const category = 'Chaves';

    currentChunk.push(`('${name}', ${codigo}, ${codigo_forn}, ${marca}, ${ref}, ${purchase}, ${sale}, '${sku}', '${category}')`);
    
    if (currentChunk.length === 50) {
        chunks.push(`INSERT INTO products (name, codigo, codigo_fornecedor, marca, referencia, purchase_price, sale_price, sku, category) VALUES ${currentChunk.join(", ")};`);
        currentChunk = [];
    }
}
if (currentChunk.length > 0) {
    chunks.push(`INSERT INTO products (name, codigo, codigo_fornecedor, marca, referencia, purchase_price, sale_price, sku, category) VALUES ${currentChunk.join(", ")};`);
}

chunks.forEach((c, i) => console.log(`--- CHUNK ${i} ---\n${c}`));
