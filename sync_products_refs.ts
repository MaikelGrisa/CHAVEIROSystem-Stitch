import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const data = JSON.parse(readFileSync('extracted_data.json', 'utf8'));
const refs = data.prodServ.filter((r: any) => r.name !== 'Produto | Fornecedor');

async function sync() {
  console.log(`Syncing ${refs.length} references...`);
  
  for (const ref of refs) {
    // We update products that have this name in their 'referencia' field 
    // or we might need to add them if they don't exist.
    // The user said: "Os preços de compra serão puxados automaticamente deste novo menu e a referência também"
    
    // First, let's find all products that have this reference
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, referencia')
      .eq('referencia', ref.name);

    if (fetchError) {
      console.error('Error fetching products for ref:', ref.name, fetchError);
      continue;
    }

    if (products && products.length > 0) {
      console.log(`Updating ${products.length} products with reference: ${ref.name}`);
      const { error: updateError } = await supabase
        .from('products')
        .update({ purchase_price: ref.purchasePrice })
        .eq('referencia', ref.name);
      
      if (updateError) {
        console.error('Error updating products for ref:', ref.name, updateError);
      }
    }
  }
  
  console.log('Sync complete.');
}

sync();
