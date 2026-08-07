Sistema de Controle de Estoque

Sistema web para gerenciamento de estoque desenvolvido com React, Node.js, Express, Prisma ORM e PostgreSQL.

O objetivo do projeto é permitir o controle completo de produtos, movimentações de estoque, categorias, fornecedores e geração de relatórios, simulando um sistema utilizado em pequenas e médias empresas.

Tecnologias utilizadas
Front-end
React
React Router DOM
Axios
CSS
Vite
Back-end
Node.js
Express
Prisma ORM
PostgreSQL
Multer
xml2js
PDFKit
Funcionalidades implementadas
Login
Cadastro de usuários
Login
Autenticação utilizando JWT
Rotas protegidas
Dashboard

Exibe informações gerais do estoque.

Indicadores:

Total de produtos
Quantidade total em estoque
Total de entradas
Total de saídas
Produtos abaixo do estoque mínimo
Produtos

Cadastro completo contendo:

Nome
Código de barras
Descrição
Preço de custo
Preço de venda
Quantidade
Estoque mínimo
Categoria
Fornecedor

Também possui:

Pesquisa
Paginação
Edição
Inativação de produtos
Exportação CSV
Exportação PDF

Ao invés de excluir definitivamente um produto, o sistema realiza sua inativação, preservando todo o histórico de movimentações.

Categorias

Cadastro de categorias.

Relacionadas aos produtos.

Fornecedores

Cadastro de fornecedores.

Relacionados aos produtos.

Movimentações

Registro de movimentações do estoque.

Tipos:

Entrada
Saída

Cada movimentação registra:

Produto
Quantidade
Usuário
Observação
Data

O estoque é atualizado automaticamente.

Importação XML

Importação de XML da Nota Fiscal Eletrônica (NF-e).

Durante a importação são lidos:

Produtos
Quantidade
Valor
Código de barras

Os produtos podem ser cadastrados automaticamente.

Relatórios

Módulo em desenvolvimento.

Estrutura criada para geração de:

Estoque completo
Estoque mínimo
Produtos sem estoque
Entradas
Saídas
Histórico de movimentações
Produtos por categoria
Produtos por fornecedor
Inventário

Filtros:

Categoria
Fornecedor
Período
Banco de Dados

Modelos criados:

Usuario
Produto
Categoria
Fornecedor
Movimentacao

Relacionamentos:

Categoria
      |
      |
   Produto -------- Movimentacao
      |
Fornecedor

Usuario -------- Movimentacao
Estrutura do projeto
backend/

controllers/
routes/
services/
middlewares/
prisma/
server.js

frontend/

components/
pages/
services/
App.jsx
main.jsx
Rotas da API
Autenticação
POST /auth/login

POST /auth/registro
Produtos
GET /produtos

POST /produtos

PUT /produtos/:id

PATCH /produtos/:id/inativar
Categorias
GET /categorias

POST /categorias
Fornecedores
GET /fornecedores

POST /fornecedores
Movimentações
GET /movimentacoes

POST /movimentacoes
Dashboard
GET /dashboard
Relatórios
GET /relatorios
Importação
POST /importacoes/xml
Funcionalidades de Interface
Sidebar
Dashboard
Cards de resumo
Tabelas responsivas
Busca
Paginação
Badges de estoque
Formulários reutilizáveis
Melhorias implementadas

✔ Login com autenticação

✔ Dashboard

✔ CRUD de produtos

✔ CRUD de categorias

✔ CRUD de fornecedores

✔ Movimentação de estoque

✔ Controle automático do saldo

✔ Importação XML

✔ Exportação CSV

✔ Exportação PDF

✔ Paginação

✔ Busca

✔ Produtos inativos

✔ Estoque mínimo

✔ Filtros

Funcionalidades planejadas
Relatórios em PDF
Relatórios em Excel
Relatórios em XML
Dashboard com gráficos
Código de barras
Leitor de código de barras
Etiquetas de produtos
Impressão de etiquetas
Cadastro de clientes
Cadastro de vendas
Cadastro de compras
Backup do banco
Logs do sistema
Auditoria
Histórico de alterações
Controle de permissões por usuário
Alertas automáticos de estoque baixo
Envio de e-mail
Importação de NF-e completa
Exportação para Excel
Inventário por conferência
Controle de lote
Controle de validade
Múltiplos depósitos
Integração com APIs de emissão de NF-e
Objetivo

Desenvolver um sistema completo de controle de estoque utilizando tecnologias modernas do ecossistema JavaScript, aplicando conceitos de desenvolvimento Full Stack, banco de dados relacional, autenticação, ORM, geração de relatórios e integração com arquivos XML da Nota Fiscal Eletrônica.

Status do projeto

🚧 Em desenvolvimento

Módulos concluídos
✅ Autenticação
✅ Dashboard
✅ Produtos
✅ Categorias
✅ Fornecedores
✅ Movimentações
✅ Importação de XML
✅ Exportação CSV/PDF
✅ Paginação e filtros
✅ Inativação de produtos
Módulos em andamento
🔄 Central de Relatórios
🔄 Exportação Excel/XML
🔄 Gráficos estatísticos
Próximos módulos
📋 Inventário
📦 Compras
💰 Vendas
👥 Clientes
🏢 Múltiplos depósitos
📊 Dashboard avançado
🔔 Notificações automáticas
🏷️ Etiquetas e código de barras
📝 Auditoria e logs
☁️ Backup automático

Este projeto foi desenvolvido como um sistema de gestão de estoque completo, com foco em boas práticas de desenvolvimento, organização em camadas (Front-end, Back-end e Banco de Dados) e escalabilidade para futuras funcionalidades.
