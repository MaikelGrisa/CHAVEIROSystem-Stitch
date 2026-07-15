import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const updates = JSON.parse(readFileSync('brand_supplier_updates.json', 'utf8'));

async function run() {
  console.log(`Updating brands and supplier codes for ${updates.length} items...`);
  for (const item of updates) {
    if (!item.codigo || item.codigo === 'null') continue;
    
    const { error } = await supabase
      .from('products')
      .update({ 
        codigo_fornecedor: item.codigo_fornecedor === 'undefined' || item.codigo_fornecedor === 'null' ? null : item.codigo_fornecedor,
        marca: item.marca === 'undefined' || item.marca === 'null' ? null : item.marca
      })
      .eq('codigo', item.codigo);
    
    if (error) console.error(`Error updating code ${item.codigo}:`, error.message);
  }
  console.log('Update complete.');
}

run();
