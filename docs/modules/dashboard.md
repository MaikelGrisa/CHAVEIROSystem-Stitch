# Dashboard

## Objetivo

O Dashboard é a tela inicial do CHAVEIROSystem.

Seu objetivo é fornecer uma visão rápida da situação da empresa, permitindo que o usuário visualize indicadores importantes, atalhos para funções principais, alertas e informações em tempo real.

---

# Objetivos do módulo

- Exibir informações importantes logo após o login.
- Facilitar o acesso aos módulos mais utilizados.
- Exibir indicadores financeiros.
- Mostrar atividades recentes.
- Mostrar compromissos do dia.
- Exibir ordens de serviço pendentes.
- Exibir alertas importantes.

---

# Usuários que possuem acesso

- Administrador
- Gerente
- Funcionário (conforme permissões)

---

# Cards principais

## Financeiro

Exibir:

- Caixa atual
- Receita do dia
- Receita do mês
- Despesas do mês
- Lucro líquido

---

## Ordens de Serviço

Exibir:

- Abertas
- Em andamento
- Finalizadas
- Entregues
- Aguardando peças

---

## Agenda

Mostrar:

- Serviços agendados para hoje
- Próximos agendamentos
- Serviços atrasados

---

## Estoque

Mostrar:

- Produtos abaixo do estoque mínimo
- Produtos mais vendidos
- Produtos sem movimentação

---

## Clientes

Mostrar:

- Clientes cadastrados
- Novos clientes do mês
- Clientes aniversariantes

---

## Indicadores

Mostrar gráficos de:

- Faturamento diário
- Faturamento mensal
- Ordens por mês
- Produtos vendidos
- Serviços realizados

---

# Ações rápidas

Botões rápidos para:

- Nova Ordem de Serviço
- Novo Cliente
- Novo Veículo
- Novo Produto
- Nova Venda
- Abrir Agenda
- Abrir Caixa

---

# Alertas

O Dashboard deverá mostrar automaticamente:

- Ordens atrasadas
- Contas vencidas
- Estoque baixo
- Produtos sem preço
- Clientes inadimplentes
- Backup pendente

---

# Atualização

Os dados deverão atualizar automaticamente.

Intervalo recomendado:

30 segundos.

---

# Responsividade

Compatível com:

- Desktop
- Notebook
- Tablet
- Smartphone

---

# Banco de Dados

Tabelas utilizadas:

- clientes
- ordens_servico
- financeiro
- produtos
- estoque
- agenda
- usuarios

---

# Componentes React

Sugestão:

DashboardPage

DashboardCards

DashboardFinanceiro

DashboardAgenda

DashboardOrdens

DashboardEstoque

DashboardGraficos

DashboardAlertas

QuickActions

---

# Permissões

Administrador

Visualiza todos os indicadores.

Gerente

Visualiza indicadores financeiros e operacionais.

Funcionário

Visualiza apenas informações permitidas.

---

# Melhorias futuras

- Dashboard personalizável.
- Widgets arrastáveis.
- Indicadores por filial.
- Indicadores por funcionário.
- IA sugerindo ações.
- Previsão de faturamento.
- Dashboard em tempo real via Supabase Realtime.
