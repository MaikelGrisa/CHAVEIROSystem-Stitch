# CODE STANDARDS

## Objetivo

Este documento define os padrões obrigatórios de desenvolvimento do projeto CHAVEIRO System.

Toda IA ou desenvolvedor deve seguir estas regras antes de modificar qualquer arquivo.

---

# Regra Principal

NUNCA simplificar código existente.

NUNCA remover funcionalidades.

NUNCA alterar o comportamento do sistema sem solicitação explícita.

Toda alteração deve preservar 100% da funcionalidade existente.

---

# Arquitetura

Frontend:

- React
- TypeScript
- Vite
- TailwindCSS
- shadcn/ui

Backend:

- Supabase
- PostgreSQL
- Edge Functions

---

# Organização

Cada funcionalidade deve possuir responsabilidade única.

Evitar arquivos extremamente grandes.

Criar componentes reutilizáveis.

Nunca duplicar código.

---

# Componentes

Todo componente React deve:

- possuir tipagem TypeScript
- utilizar Props tipadas
- ser reutilizável
- manter baixo acoplamento

---

# Hooks

Criar hooks para lógica reutilizável.

Evitar lógica complexa diretamente nos componentes.

---

# Banco de Dados

Nunca alterar tabelas existentes sem documentação.

Nunca remover colunas.

Nunca excluir tabelas.

Sempre criar migrations.

---

# Supabase

Utilizar Row Level Security.

Utilizar Policies.

Nunca desabilitar segurança.

---

# Performance

Evitar renderizações desnecessárias.

Utilizar lazy loading quando possível.

Evitar consultas repetidas.

---

# Interface

Preservar identidade visual.

Preservar cores.

Preservar tipografia.

Preservar espaçamentos.

Não alterar layout existente sem solicitação.

---

# Responsividade

Desktop obrigatório.

Tablet obrigatório.

Mobile obrigatório.

---

# Código

Sempre utilizar:

TypeScript

Interfaces

Enums quando necessário

Tipos fortes

Evitar uso de "any"

---

# Nomeação

Variáveis:

camelCase

Componentes:

PascalCase

Arquivos:

kebab-case quando aplicável.

---

# Comentários

Comentar apenas regras importantes.

Não comentar código óbvio.

---

# Segurança

Nunca expor:

API Keys

Tokens

Secrets

Credenciais

---

# Logs

Registrar erros importantes.

Evitar logs em produção.

---

# Testes

Sempre preservar compatibilidade.

Nunca quebrar funcionalidades existentes.

---

# Alterações

Antes de modificar qualquer arquivo, verificar:

- impacto
- dependências
- componentes afetados
- banco de dados
- APIs
- rotas

---

# Regra Obrigatória

Antes de gerar qualquer código:

1. Ler AI_CONTEXT.md

2. Ler SYSTEM_ARCHITECTURE.md

3. Ler DATABASE_STRUCTURE.md

4. Ler FEATURES.md

5. Ler BUSINESS_RULES.md

6. Ler PROJECT_RULES.md

7. Ler UI_GUIDELINES.md

Somente após compreender toda a documentação iniciar qualquer alteração.
