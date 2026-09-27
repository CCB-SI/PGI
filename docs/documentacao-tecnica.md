# Documentação Técnica – PGRI Santa Isabel
## Plataforma de Gestão Regional Integrada

Este documento fornece uma visão detalhada da arquitetura, tecnologias e funcionalidades da PGRI Santa Isabel (Plataforma de Gestão Regional Integrada).

---

## 1. Visão Geral do Sistema

O sistema é uma plataforma web centralizada para gerenciar informações de congregações (Comuns), escalas de serviço ministerial, agendas de ensaios e distribuição de materiais técnicos (Downloads). Ele foi construído com foco em usabilidade, segurança e portabilidade através de containers.

### Objetivos Principais
- **Centralização**: Acabar com a dispersão de PDFs e links de mapas em grupos de mensagens.
- **Agilidade**: Permitir que músicos e ministros encontrem horários e locais rapidamente.
- **Controle**: Oferecer uma área administrativa restrita para atualização em tempo real.

---

## 2. Arquitetura Técnica

O sistema utiliza uma arquitetura de desacoplamento entre frontend e backend, orquestrada por Docker.

### 2.1 Stack Tecnológica
- **Backend**: Python 3.11+ / FastAPI
- **Frontend**: React / Next.js 14 (App Router)
- **Banco de Dados**: SQLite (via SQLAlchemy ORM)
- **Segurança**: JWT (JSON Web Tokens) e Bcrypt
- **Infraestrutura**: Docker & Docker Compose

### 2.2 Estrutura de Diretórios
```text
gestaodesecretaria/
├── backend/             # API REST (FastAPI)
├── frontend/            # Interface Web (Next.js)
├── nginx/               # (Opcional) Proxy reverso
└── docker-compose.yml   # Orquestrador de serviços
```

---

## 3. Backend (API)

O backend é responsável pela lógica de negócios, persistência de dados e autenticação.

### 3.1 Modelos de Dados (Entidades)
- **Location (Comum)**: Nome, cidade, endereço, coordenadas GPS, link maps/waze e foto.
- **Schedule (Horário)**: Vinculado a uma Comum. Define tipo de evento (Culto, Ensaio, etc.), dia da semana, hora e recorrência.
- **MinistryMember (Irmão)**: Cadastro de irmãos e seus respectivos cargos.
- **News (Informativo)**: Avisos gerais com data, título e tags coloridas.
- **Resource (Download)**: Arquivos ou links externos categorizados para download.
- **User**: Credenciais e permissões (Admin/Editor).

### 3.2 Autenticação
Baseada em **JWT (JSON Web Tokens)**. 
- O login gera um token de acesso.
- Rotas de leitura (`GET`) são públicas.
- Rotas de escrita/edição (`POST`, `PUT`, `DELETE`) exigem o header `Authorization: Bearer <token>`.

---

## 4. Frontend (Interface)

A interface foi projetada para ser rápida e responsiva (Mobile First).

### 4.1 Principais Páginas
- **Início**: Dashboard com atalhos e busca rápida.
- **Comuns**: Mapa e detalhes de todas as congregações.
- **Agenda**: Visão consolidada de todos os ensaios e eventos da Regional.
- **Informativos**: Quadro de avisos digitais.
- **Downloads**: Repositório de métodos, circulares e hinários.

### 4.2 Lógica de Agenda (Inteligência)
A agenda utiliza uma lógica de **Cálculo de Próxima Data**:
1. O sistema lê as recorrências (ex: `1º domingo do mês`).
2. Calcula automaticamente em qual dia do calendário real aquele evento cairá.
3. Ordena cronologicamente e filtra eventos irrelevantes para a agenda musical (ex: tags 'Culto').

---

## 5. Implementação e Deployment

O sistema é totalmente dockerizado para facilitar a instalação.

### 5.1 Docker Compose
O arquivo `docker-compose.yml` define dois serviços:
- `secretaria-backend`: Roda na porta 8000. Persiste o banco em `./backend/data`.
- `secretaria-frontend`: Roda na porta 3000.

### 5.2 Variáveis de Ambiente
- `DATABASE_URL`: Caminho do banco SQLite.
- `NEXT_PUBLIC_API_URL`: Endereço da API consumida pelo navegador.

---

## 6. Segurança e Perfis

| Perfil | Permissões |
| :--- | :--- |
| **Público** | Visualizar Comuns, Agenda, Informativos e baixar arquivos. |
| **Editor** | Criar e editar Comuns, Horários, Notícias e Recursos. |
| **Admin** | Tudo que o Editor faz + Gerenciar Usuários e Excluir registros críticos. |

---

## 7. Manutenção e Evolução
- **Logs**: O backend emite logs via console do container.
- **Backups**: Basta copiar o arquivo `.db` na pasta de dados para backup completo.
- **Uploads**: Fotos e arquivos ficam na pasta `/uploads` dentro do volume do backend.
