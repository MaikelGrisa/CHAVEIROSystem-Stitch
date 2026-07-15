# Veículos

## Objetivo

O módulo Veículos é responsável pelo gerenciamento completo dos veículos atendidos pela empresa.

Este módulo é utilizado por:

- Clientes
- Ordens de Serviço
- Chaves
- Controles Remotos
- Transponders
- Programações
- Histórico
- Orçamentos
- Garantias

Cada veículo pertence a um cliente.

---

# Cadastro

Cada veículo deverá possuir um identificador único.

Campos obrigatórios:

- Cliente
- Marca
- Modelo
- Ano
- Placa

---

# Identificação

Marca

Modelo

Versão

Ano Fabricação

Ano Modelo

Placa

Chassi

Renavam

Cor

Combustível

Câmbio

Motor

Categoria

Observações

---

# Sistema Eletrônico

ECU

BCM

Imobilizador

Tipo de Rede

CAN

LIN

K-Line

FlexRay

Gateway

---

# Chaves

Cada veículo pode possuir várias chaves.

Registrar:

Quantidade

Tipo

Original

Reserva

Perdida

Codificada

Virgem

Programada

Número Mecânico

Número Eletrônico

---

# Controle Remoto

Registrar:

Frequência

433 MHz

315 MHz

868 MHz

Número de Botões

Rolling Code

Keyless

Smart Key

Presencial

---

# Transponder

Registrar:

Tipo

ID46

ID48

ID4A

ID4D

ID60

ID70

ID80

ID83

ID88

AES

Megamos

Texas

Philips

Hitag

Crypto

---

# Programação

Registrar:

Equipamento utilizado

Autel

Xhorse

VVDI

OBDStar

Launch

Smart Pro

ZedFull

Abrites

Procedimento

Data

Técnico

Resultado

---

# Corte da Chave

Registrar:

Código Mecânico

Tipo de Lâmina

Número de Cortes

Perfil

Lado

Duplicação

---

# Lishi

Registrar:

Modelo Lishi

Sentido de abertura

Sentido de fechamento

Número de posições

Tipo de cilindro

Observações

---

# OBD

Registrar:

Localização da porta

Procedimento

Necessita PIN?

Necessita senha?

Necessita gateway?

Necessita internet?

---

# Histórico

Registrar automaticamente:

Todas as programações

Todas as cópias

Todas as O.S.

Todas as garantias

Todas as visitas

---

# Fotos

Permitir:

Frente

Traseira

Interior

Painel

Módulos

Chave

Controle

Documento

---

# Pesquisa

Pesquisar por:

Placa

Chassi

Renavam

Cliente

Marca

Modelo

Ano

Tipo de chave

Transponder

Controle

---

# Filtros

Marca

Modelo

Ano

Categoria

Combustível

Tipo de chave

Tipo de transponder

Tipo de controle

---

# Dashboard

Indicadores:

Veículos cadastrados

Marcas mais atendidas

Modelos mais atendidos

Programações realizadas

Cópias realizadas

Transponders utilizados

---

# Integrações

Supabase

Realtime

Storage

Google Maps

ViaCEP

Catálogo Técnico

---

# Segurança

Toda alteração deve gerar auditoria.

Registrar:

Usuário

Data

Hora

Campo alterado

Valor anterior

Valor novo

Empresa

Filial

---

# Responsividade

Desktop

Tablet

Celular

---

# Interface

Cadastro dividido por abas:

• Dados Gerais

• Eletrônica

• Chaves

• Controles

• Transponder

• Programação

• Histórico

• Fotos

---

# Melhorias Futuras

Integração com catálogos técnicos.

Leitura automática por placa.

Consulta FIPE.

Consulta Recall.

Integração com fabricantes.

Integração com IA para sugerir procedimentos técnicos.

Integração com banco de dados de transponders.

Integração com banco de dados de controles remotos.

Reconhecimento automático de chave através de fotografia.

Reconhecimento automático do veículo por IA.

Sugestão automática do equipamento correto para programação.

