# Cadastro

## Objetivo

O módulo Cadastro é responsável por gerenciar todas as informações principais do sistema.

Todos os cadastros devem possuir:

- Pesquisa instantânea
- Ordenação por colunas
- Filtros avançados
- Paginação
- Exclusão lógica
- Histórico de alterações
- Registro do usuário que realizou cada alteração

---

# Funcionalidades

## Novo Cadastro

Permitir criar novos registros.

Botões:

- Salvar
- Salvar e Novo
- Cancelar

---

## Editar

Permitir alterar qualquer cadastro existente.

Registrar:

- usuário
- data
- hora

---

## Excluir

Nunca apagar definitivamente.

Utilizar exclusão lógica.

Campo:

ativo = false

---

## Restaurar

Permitir restaurar registros excluídos.

---

# Pesquisa

Pesquisar por:

- Nome
- Código
- Telefone
- CPF
- CNPJ
- Placa
- Cidade
- Documento

A pesquisa deve ocorrer em tempo real.

---

# Filtros

Status

Cidade

Estado

Categoria

Data

Usuário

Tipo

---

# Exportação

Exportar para:

PDF

Excel

CSV

---

# Importação

Importar planilhas Excel.

Mostrar:

Quantidade importada

Duplicados

Erros encontrados

---

# Auditoria

Registrar:

Usuário

Data

Hora

IP

Computador

Operação realizada

Valor antigo

Valor novo

---

# Campos padrões

Todos os cadastros possuem:

ID

Código interno

Data cadastro

Data alteração

Usuário criação

Usuário alteração

Status

Observações

---

# Pesquisa inteligente

Aceitar pesquisas por:

Nome parcial

Telefone

CPF

Placa

Chassi

Renavam

E-mail

Documento

---

# Responsividade

Desktop

Tablet

Celular

---

# Segurança

Somente usuários autorizados podem:

Criar

Editar

Excluir

Restaurar

Exportar

Importar

---

# Integrações

Supabase

Realtime

Storage

React Query

---

# Performance

Utilizar paginação.

Carregar 50 registros por vez.

Utilizar Lazy Loading.

---

# Objetivo final

Todos os demais módulos utilizam este cadastro como base para relacionamento de dados.
