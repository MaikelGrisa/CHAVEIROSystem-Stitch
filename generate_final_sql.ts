import fs from 'fs';

const products = JSON.parse(fs.readFileSync('extracted_products.json', 'utf8'));

console.log('-- Start import');
console.log('BEGIN;');

// First, delete all existing products to ensure we match the sheet exactly
console.log('DELETE FROM products;');

const chunks = [];
const CHUNK_SIZE = 100;
for (let i = 0; i < products.length; i += CHUNK_SIZE) {
  chunks.push(products.slice(i, i + CHUNK_SIZE));
}

chunks.forEach(chunk => {
  let query = 'INSERT INTO products (name, purchase_price, sale_price, codigo, category) VALUES ';
  const values = chunk.map(p => {
    const name = p.name.replace(/'/g, "''");
    const codigo = p.codigo.replace(/'/g, "''");
    const category = p.category.replace(/'/g, "''");
    return `('${name}', ${p.purchasePrice}, ${p.salePrice}, '${codigo}', '${category}')`;
  });
  query += values.join(', ') + ';';
  console.log(query);
});

console.log('COMMIT;');
console.log('-- End import');