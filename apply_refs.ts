import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const updates = JSON.parse(readFileSync('product_ref_updates.json', 'utf8'));

async function run() {
  console.log(`Updating references for ${updates.length} items...`);
  for (const item of updates) {
    const { error } = await supabase
      .from('products')
      .update({ referencia: item.referencia })
      .eq('codigo', item.codigo);
    
    if (error) console.error(`Error updating code ${item.codigo}:`, error.message);
  }
  console.log('Update complete.');
}

run();
