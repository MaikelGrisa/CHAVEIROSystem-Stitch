# Clientes

## Objetivo

O módulo Clientes é responsável pelo gerenciamento completo de pessoas físicas e jurídicas atendidas pelo sistema.

Todos os demais módulos utilizam este cadastro.

Relacionamentos:

- Ordens de Serviço
- Veículos
- Financeiro
- Agenda
- Histórico
- Garantias

---

# Cadastro

Campos obrigatórios

Nome Completo

Telefone Principal

Cidade

Status

---

# Dados pessoais

Nome

CPF

RG

Data de nascimento

Sexo

Estado Civil

Profissão

Empresa

CNPJ

Inscrição Estadual

---

# Contatos

Telefone Principal

Telefone Secundário

WhatsApp

E-mail

Site

Instagram

Facebook

Observações

---

# Endereço

CEP

Rua

Número

Complemento

Bairro

Cidade

Estado

País

Coordenadas GPS

Ao informar o CEP preencher automaticamente o endereço.

---

# Classificação

Pessoa Física

Pessoa Jurídica

Cliente VIP

Cliente Inadimplente

Cliente Bloqueado

Cliente Ativo

Cliente Inativo

---

# Histórico

Mostrar:

Quantidade de Ordens de Serviço

Última visita

Primeira visita

Último orçamento

Total gasto

Quantidade de veículos

Quantidade de chaves cadastradas

---

# Veículos

Lista completa dos veículos do cliente.

Cada veículo deve possuir link para sua ficha.

---

# Chaves

Listar todas as chaves cadastradas.

Mostrar:

Marca

Modelo

Ano

Tipo

Quantidade

Observações

---

# Financeiro

Mostrar:

Contas em aberto

Contas pagas

Parcelamentos

Créditos

Débitos

Saldo

---

# Garantias

Listar todas as garantias.

Mostrar:

Serviço

Data

Validade

Situação

---

# Histórico de Atendimento

Registrar automaticamente:

Data

Hora

Usuário

Descrição

Tipo

OS relacionada

---

# Pesquisa

Pesquisar por:

Nome

CPF

CNPJ

Telefone

WhatsApp

E-mail

Cidade

Placa

Chassi

Renavam

Código interno

---

# Filtros

Cidade

Estado

Status

Pessoa Física

Pessoa Jurídica

Cliente VIP

Cliente Inadimplente

Data de cadastro

Último atendimento

---

# Ações

Novo Cliente

Editar

Excluir

Duplicar

Imprimir

Exportar PDF

Exportar Excel

Enviar WhatsApp

Enviar E-mail

Abrir Ordem de Serviço

Cadastrar Veículo

Cadastrar Chave

---

# Validações

Não permitir CPF duplicado.

Não permitir CNPJ duplicado.

Validar formato de telefone.

Validar CEP.

Validar e-mail.

---

# Auditoria

Registrar:

Usuário

Data

Hora

Campo alterado

Valor anterior

Valor novo

IP

---

# Integrações

Supabase

Realtime

Storage

React Query

ViaCEP

WhatsApp

Google Maps

---

# Permissões

Administrador

Visualiza tudo.

Funcionário

Visualiza apenas clientes autorizados.

Financeiro

Visualiza dados financeiros.

Atendimento

Visualiza dados cadastrais.

---

# Dashboard

Exibir indicadores:

Clientes ativos

Clientes inativos

Novos clientes no mês

Clientes VIP

Clientes inadimplentes

Clientes aniversariantes

Clientes por cidade

Clientes por estado

---

# Responsividade

Desktop

Tablet

Celular

---

# Interface

Tabela com paginação.

Pesquisa instantânea.

Filtros laterais.

Cadastro em abas.

Ícones Lucide.

Seguir UI_GUIDELINES.md.

---

# Objetivo Final

Centralizar todas as informações do cliente em uma única tela, permitindo acesso rápido ao histórico, veículos, ordens de serviço, finanças e garantias.
