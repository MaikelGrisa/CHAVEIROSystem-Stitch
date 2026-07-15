
# Sistema KeyManager — Gestão de Produtos para Chaveiro

Transformar a planilha BASE.xlsx em um sistema web completo, com identidade visual baseada na logo (chave laranja sobre preto).

## Identidade Visual

- **Paleta**: Preto profundo (#0a0a0a), laranja vibrante da chave (#FF8A1F), branco off (#FAFAFA), cinza grafite
- **Tipografia**: "Space Grotesk" (display) + "Inter" (texto)
- **Logo animada**: a chave atua como mascote — gira, balança e exibe balões de dica/tutorial em pontos-chave da interface
- **Estilo**: dashboard moderno, escuro, com acentos laranja luminosos e cantos suaves

## Funcionalidades

### 1. Autenticação & Admin
- Login por email/senha (Lovable Cloud)
- Tabela `user_roles` + função `has_role` (admin / user)
- Painel admin gated por role

### 2. Catálogo de Produtos
- Importação inicial dos 30+ produtos da planilha (seed via migration)
- Campos: código (SKU), nome, fornecedor, preço de compra, preço de venda, estoque, categoria
- CRUD completo: adicionar, editar inline, excluir, busca, filtro por categoria/fornecedor

### 3. Movimentações Mensais
- Registro de entradas (compras) e saídas (vendas) com data, produto, quantidade, preço unitário
- Visualização agrupada por mês (seletor de mês/ano)
- Cálculo automático de receita, custo, lucro e margem por mês

### 4. Dashboard
- Cards: total de produtos, valor de estoque, lucro do mês, top produtos
- Gráfico de vendas mensais (Recharts)
- Lista de produtos com estoque baixo

### 5. Relatórios PDF
- Geração client-side com `jspdf` + `jspdf-autotable`
- Relatórios: catálogo completo, movimentações do mês, lucro mensal
- Cabeçalho com logo, rodapé com data

### 6. Tutorial guiado pela mascote (logo animada)
- Primeira visita: chave dá as boas-vindas e mostra 4–5 dicas (overlay com balões)
- Botão "?" flutuante para reabrir o tutorial
- Animações via Framer Motion

## Estrutura Técnica

```text
src/
  routes/
    index.tsx                 # landing / redirect para dashboard
    auth.tsx                  # login
    _authenticated/
      route.tsx               # gate
      dashboard.tsx
      produtos.tsx
      movimentacoes.tsx
      relatorios.tsx
  components/
    MascotKey.tsx             # logo animada + balão de dica
    TutorialOverlay.tsx
    ProductTable.tsx
    MonthPicker.tsx
    StatCard.tsx
  lib/
    products.functions.ts     # serverFn CRUD
    movements.functions.ts
    reports.ts                # geração PDF
```

### Banco (Lovable Cloud)
- `products` (id, sku, name, supplier, purchase_price, sale_price, stock, category)
- `movements` (id, product_id, type: in|out, quantity, unit_price, occurred_at, note)
- `user_roles` (user_id, role) + `has_role()` SECURITY DEFINER
- RLS: usuários autenticados leem; apenas admin escreve

## Entregáveis nesta primeira iteração

1. Ativar Lovable Cloud
2. Migration com tabelas + RLS + seed dos produtos da planilha
3. Auth + role admin (primeiro usuário criado vira admin)
4. Dashboard, Produtos (CRUD), Movimentações, Relatórios PDF
5. Mascote animada + tutorial inicial
6. Logo importada como asset (sem alterações)

Quer que eu siga com este plano?
