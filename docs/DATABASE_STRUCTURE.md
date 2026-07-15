# CHAVEIRO System

# DATABASE STRUCTURE

Versão 1.0

---

## Objetivo

Este documento define a estrutura oficial do banco de dados do CHAVEIRO System.

Toda IA deverá utilizar esta estrutura como referência.

---

# Tecnologia

Firebase Firestore

Firebase Authentication

Firebase Storage

Cloud Functions

---

# Coleções Principais

companies

users

roles

permissions

customers

vehicles

serviceOrders

products

inventory

suppliers

categories

financialTransactions

payments

attachments

logs

notifications

settings

audit

reports

---

# Usuários

Cada usuário possui:

Nome

Email

Telefone

Empresa

Filial

Cargo

Permissões

Foto

Status

Último acesso

---

# Empresas

Cada empresa possui:

Nome

Logo

CNPJ

Endereço

Plano

Configurações

Cor primária

Cor secundária

---

# Clientes

Nome

CPF/CNPJ

Telefone

WhatsApp

Email

Endereço

Observações

Histórico

---

# Ordens de Serviço

Número

Cliente

Veículo

Problema

Diagnóstico

Serviços

Peças

Valor

Status

Responsável

Data

Anexos

Assinatura

Fotos

---

# Estoque

Produto

Categoria

Fornecedor

Quantidade

Preço de compra

Preço de venda

Localização

Código de barras

Fotos

Histórico

---

# Financeiro

Entradas

Saídas

Caixa

Recebimentos

Pagamentos

Comissões

Relatórios

---

# Auditoria

Toda alteração deverá gerar logs.

Criar:

Usuário

Data

Hora

Ação

Tela

Registro

Empresa

IP

---

# Multiempresa

Todos os documentos deverão possuir:

companyId

branchId

createdBy

updatedBy

createdAt

updatedAt

---

# Segurança

Utilizar Firebase Auth.

Utilizar regras do Firestore.

Cada empresa visualizará apenas seus próprios dados.

---

Fim do documento.
