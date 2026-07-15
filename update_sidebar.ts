import { readFileSync, writeFileSync } from 'fs';

const path = 'src/components/AppShell.tsx';
let content = readFileSync(path, 'utf8');

if (!content.includes('/referencias')) {
  content = content.replace(
    '{ to: \"/relatorios\", label: \"Relatórios\", icon: FileText, tip: \"Gere PDFs do mês.\" },',
    '{ to: \"/relatorios\", label: \"Relatórios\", icon: FileText, tip: \"Gere PDFs do mês.\" },\n  { to: \"/referencias\", label: \"Prod. e Serviços\", icon: Wrench, tip: \"Referências de preços de compra.\" },'
  );
  writeFileSync(path, content);
  console.log('Sidebar updated.');
} else {
  console.log('Sidebar already has /referencias.');
}
