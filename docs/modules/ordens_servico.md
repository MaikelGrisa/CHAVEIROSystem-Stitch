# Ordens de Serviço

## Objetivo

O módulo de Ordens de Serviço (OS) é responsável por controlar todo o ciclo operacional do atendimento ao cliente.

Toda execução de serviço deverá gerar uma Ordem de Serviço.

---

# Fluxo da Ordem de Serviço

Cliente

↓

Veículo

↓

Diagnóstico

↓

Orçamento

↓

Aprovação

↓

Execução

↓

Finalização

↓

Pagamento

↓

Garantia

↓

Arquivamento

---

# Dados da Ordem

Cada Ordem de Serviço deverá possuir:

- Número sequencial automático
- Empresa
- Filial
- Data de abertura
- Hora
- Usuário responsável
- Técnico responsável
- Cliente
- Veículo
- Situação

---

# Status

- Aberta
- Em diagnóstico
- Aguardando aprovação
- Aguardando peça
- Em execução
- Aguardando pagamento
- Finalizada
- Entregue
- Cancelada

Toda alteração de status deve gerar histórico.

---

# Dados do Cliente

Exibir automaticamente:

- Nome
- CPF/CNPJ
- Telefones
- WhatsApp
- E-mail
- Endereço

---

# Dados do Veículo

Exibir automaticamente:

- Marca
- Modelo
- Ano
- Placa
- Chassi
- Cor
- Observações

---

# Diagnóstico

Registrar:

- Problema informado pelo cliente
- Diagnóstico técnico
- Procedimentos realizados
- Solução aplicada
- Observações

---

# Serviços

Adicionar serviços executados.

Cada serviço possui:

- Descrição
- Quantidade
- Valor unitário
- Desconto
- Total

---

# Produtos

Adicionar produtos utilizados.

Cada produto possui:

- Código
- Descrição
- Quantidade
- Valor
- Desconto
- Total

A baixa no estoque deve ocorrer automaticamente após a conclusão da OS.

---

# Programação de Chaves

Permitir registrar:

- Tipo da chave
- Transponder
- Controle remoto
- Equipamento utilizado
- Procedimento executado
- Resultado
- PIN utilizado (quando permitido)
- Tempo de execução

---

# Fotos

Permitir anexar:

- Veículo
- Chave
- Controle remoto
- Documento
- Painel
- Módulos
- Serviço executado

---

# Assinaturas

Permitir assinatura digital:

- Cliente
- Técnico

---

# Garantia

Registrar:

- Data inicial
- Data final
- Prazo
- Observações

---

# Financeiro

Calcular automaticamente:

- Serviços
- Produtos
- Descontos
- Acréscimos
- Total Geral

Formas de pagamento:

- Dinheiro
- PIX
- Cartão Débito
- Cartão Crédito
- Transferência
- Boleto
- Faturado

Permitir múltiplas formas de pagamento.

---

# Impressão

Gerar:

- Ordem de Serviço
- Orçamento
- Recibo
- Comprovante
- Garantia

Exportar:

- PDF

---

# Notificações

Permitir envio por:

- WhatsApp
- E-mail

Mensagens:

- OS criada
- Orçamento disponível
- Serviço concluído
- Veículo pronto
- Garantia

---

# Histórico

Registrar automaticamente:

- Quem criou
- Quem alterou
- Quando alterou
- Campo alterado
- Valor anterior
- Valor novo

Nunca apagar histórico.

---

# Permissões

Administrador

- Acesso total

Gerente

- Aprovação de descontos
- Cancelamento

Técnico

- Atualização da execução
- Inclusão de fotos

Atendente

- Abertura e consulta

Financeiro

- Pagamentos
- Fechamento

---

# Dashboard

Indicadores:

- OS abertas
- OS finalizadas
- OS canceladas
- Ticket médio
- Tempo médio de execução
- Faturamento por OS
- Técnico com mais atendimentos

---

# Integrações

- Firebase Firestore
- Firebase Storage
- Firebase Authentication
- Firebase Cloud Functions
- Firebase Cloud Messaging
- WhatsApp Business API
- Google Maps
- ViaCEP

---

# Segurança

Toda alteração deverá gerar auditoria.

Registrar:

- Usuário
- Data
- Hora
- Empresa
- Filial
- Campo alterado
- Valor anterior
- Valor novo

---

# Responsividade

Compatível com:

- Desktop
- Tablet
- Smartphone

---

# Melhorias Futuras

- Assinatura eletrônica avançada
- Leitura de QR Code da OS
- Checklists personalizados
- Upload de vídeos
- Integração com IA para diagnóstico técnico
- Sugestão automática de peças
- Sugestão automática de tempo de serviço
- Consulta automática ao histórico do veículo
- Geração automática de orçamento por IA
