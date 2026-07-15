# Usuários e Permissões

## Objetivo

O módulo Usuários é responsável pelo gerenciamento de acesso ao CHAVEIRO System.

Todo acesso ao sistema deve estar vinculado a:

- Empresa
- Filial
- Perfil
- Permissões

Toda ação executada deve ser auditada.

---

# Funcionalidades

- Cadastro de Usuários
- Alteração de Usuários
- Bloqueio
- Desbloqueio
- Exclusão Lógica
- Alteração de Senha
- Recuperação de Senha
- Controle de Sessões
- Controle de Permissões

---

# Cadastro

Campos obrigatórios

Nome

E-mail

Telefone

CPF

Cargo

Empresa

Filial

Perfil

Status

Senha

Confirmar Senha

---

# Dados do Usuário

Nome Completo

Nome de Exibição

Foto

CPF

RG

Telefone

WhatsApp

E-mail

Cargo

Departamento

Observações

---

# Status

Ativo

Inativo

Bloqueado

Afastado

Desligado

---

# Perfis

Administrador Geral

Administrador

Gerente

Financeiro

Atendente

Técnico

Estoquista

Vendedor

Suporte

Visualização

---

# Empresas

Cada usuário pertence a uma empresa.

Nunca visualizar dados de outra empresa.

---

# Filiais

Cada usuário pode acessar:

Uma filial

Várias filiais

Todas as filiais

Conforme permissão.

---

# Permissões

Cada módulo deve possuir permissões independentes.

Exemplo:

Dashboard

Clientes

Veículos

Ordens de Serviço

Financeiro

Agenda

Estoque

Relatórios

Configurações

Usuários

Super Admin

---

# Permissões por ação

Visualizar

Criar

Editar

Excluir

Exportar

Importar

Imprimir

Aprovar

Cancelar

---

# Permissões Especiais

Aplicar desconto

Cancelar Ordem

Alterar Financeiro

Excluir Cliente

Alterar Estoque

Fechar Caixa

Visualizar Custos

Visualizar Lucro

---

# Login

Permitir:

E-mail + Senha

Google

Microsoft

GitHub

(Conforme configuração do sistema)

---

# Recuperação de Senha

Enviar e-mail.

Gerar token temporário.

Expiração:

30 minutos.

---

# Sessões

Registrar:

Data

Hora

IP

Dispositivo

Navegador

Sistema Operacional

Cidade (quando disponível)

---

# Auditoria

Registrar:

Login

Logout

Tentativas inválidas

Alterações

Exclusões

Criações

Exportações

Importações

Nunca apagar histórico.

---

# Segurança

Senha mínima:

8 caracteres

Obrigatório:

Maiúscula

Minúscula

Número

Caractere especial

---

# Autenticação

Firebase Authentication

Controle de Token

Refresh Token

Logout automático

Sessão expirada

---

# Dashboard

Mostrar:

Usuários ativos

Usuários online

Últimos acessos

Tentativas inválidas

Usuários bloqueados

---

# Pesquisa

Pesquisar por:

Nome

E-mail

CPF

Cargo

Empresa

Filial

Perfil

Telefone

---

# Filtros

Empresa

Filial

Perfil

Status

Cargo

Data de cadastro

Último acesso

---

# Relatórios

Usuários

Permissões

Logins

Auditoria

Sessões

Tentativas de acesso

---

# Responsividade

Desktop

Tablet

Celular

---

# Melhorias Futuras

Autenticação em dois fatores (2FA)

Login por biometria

Login por reconhecimento facial

Controle de dispositivos autorizados

Controle de localização

Sessão simultânea configurável

Permissões personalizadas por botão

Permissões por campo

Permissões temporárias

Delegação de acesso
