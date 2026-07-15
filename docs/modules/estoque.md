# Estoque

## Objetivo

O módulo Estoque controla todos os produtos, peças, equipamentos e materiais utilizados pela empresa.

O sistema deve manter controle completo de entradas, saídas, movimentações, inventários e custos.

Todo produto pertence a uma empresa (tenant).

---

# Funcionalidades

- Cadastro de Produtos
- Cadastro de Categorias
- Cadastro de Marcas
- Cadastro de Fornecedores
- Controle de Estoque
- Entrada de Mercadorias
- Saída de Produtos
- Transferência entre filiais
- Inventário
- Ajuste Manual
- Histórico de Movimentações
- Alertas de Estoque

---

# Categorias

Exemplos:

- Chaves Automotivas
- Chaves Residenciais
- Controles Remotos
- Transponders
- Cilindros
- Fechaduras
- Cadeados
- Ferramentas
- Máquinas
- Equipamentos
- Pilhas
- Baterias
- Acessórios
- Consumíveis

---

# Cadastro de Produto

Campos obrigatórios

- Código Interno
- Código de Barras
- Nome
- Categoria
- Marca
- Fornecedor
- Unidade
- Custo
- Preço Venda
- Estoque Atual
- Estoque Mínimo

---

# Informações Técnicas

Permitir registrar:

Modelo

Compatibilidade

Fabricante

Tipo

Cor

Material

Peso

Dimensões

Garantia

Fotos

Observações

---

# Produtos Automotivos

Campos específicos

Marca do veículo

Modelo

Ano inicial

Ano final

Tipo da chave

Tipo do transponder

Frequência

Quantidade de botões

Smart Key

Keyless

Número FCC

Número IC

Número Original

Compatibilidade Xhorse

Compatibilidade VVDI

Compatibilidade Autel

Compatibilidade OBDStar

Compatibilidade Lonsdor

Compatibilidade Smart Pro

Compatibilidade Abrites

---

# Controle de Estoque

Registrar automaticamente:

Entradas

Saídas

Reservas

Perdas

Quebras

Transferências

Devoluções

Consumo em Ordem de Serviço

---

# Inventário

Permitir:

Contagem

Recontagem

Diferenças

Ajustes

Responsável

Data

---

# Custos

Registrar:

Último custo

Custo médio

Preço mínimo

Preço sugerido

Margem de lucro

Lucro bruto

Lucro líquido

---

# Alertas

Mostrar:

Estoque mínimo

Produto zerado

Produto parado

Produto sem movimentação

Produto vencido

Produto sem preço

---

# Histórico

Registrar:

Usuário

Data

Hora

Operação

Quantidade

Saldo anterior

Saldo atual

Empresa

Filial

Nunca apagar histórico.

---

# Pesquisa

Pesquisar por:

Nome

Código

Código de Barras

Marca

Fornecedor

Categoria

Veículo compatível

Transponder

Controle

FCC

---

# Filtros

Categoria

Fornecedor

Marca

Estoque Baixo

Sem Estoque

Mais Vendidos

Menos Vendidos

Sem Movimentação

---

# Integração com Ordem de Serviço

Ao adicionar um produto na O.S.:

- Reservar estoque.
- Atualizar disponibilidade.
- Baixar estoque automaticamente na conclusão da O.S.
- Registrar movimentação.

---

# Relatórios

Gerar:

- Inventário
- Produtos sem estoque
- Produtos abaixo do mínimo
- Produtos mais vendidos
- Curva ABC
- Giro de estoque
- Valor total do estoque
- Compras por fornecedor

---

# Dashboard

Indicadores:

- Total de produtos
- Valor total do estoque
- Produtos em falta
- Produtos abaixo do mínimo
- Produtos mais vendidos
- Produtos sem movimentação

---

# Permissões

Administrador

Acesso total.

Gerente

Entradas, saídas e ajustes.

Funcionário

Consulta e consumo via O.S.

Financeiro

Consulta de custos e valores.

---

# Integrações

Firebase Firestore

Firebase Storage

Firebase Authentication

Cloud Functions

Leitor de Código de Barras

QR Code

Importação Excel

Exportação Excel

---

# Segurança

Toda movimentação deverá gerar auditoria.

Registrar:

Usuário

Empresa

Filial

Produto

Quantidade

Tipo de movimentação

Data

Hora

IP

---

# Responsividade

Desktop

Tablet

Celular

---

# Melhorias Futuras

- Leitura por câmera de código de barras
- QR Code dos produtos
- Etiquetas automáticas
- Sugestão automática de compra por IA
- Previsão de ruptura de estoque
- Integração com fornecedores
- Curva ABC automática
- Controle de validade
- Controle por lote
- Controle por número de série
