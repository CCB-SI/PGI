# Gestão de Secretaria Musical

Um sistema web completo para a centralização de informações técnicas, calendários de ensaios e suporte aos músicos da Regional SAI (Santa Isabel, Arujá e Igaratá).

## 🚀 Funcionalidades Principais

- **Gestão de Comuns (Localidades):** Cadastro completo das congregações, incluindo endereço, coordenadas GPS (link para mapa) e foto.
- **Sistema Estruturado de Horários:** Definição clara dos horários de cultos, ensaios (locais, regionais, parciais) com recorrências flexíveis (ex: `Semanal`, `Último domingo do mês` ou `Data Específica`).
- **Irmãos do Ministério:** Cadastro prévio de irmãos e cargos (Regionais e Locais) e gestão de escalas, vinculando quais irmãos atendem em quais Comuns.
- **Agenda Consolidada Inteligente:** 
  - Consolidação automática de todos os horários de todas as Comuns em um único fluxo.
  - Filtro inteligente (ignora automaticamente eventos com a tag 'Culto' ou 'GEM').
  - **Cálculo automático da próxima data** em que o evento ocorrerá no mundo real, baseado na regra de recorrência configurada.
  - Agrupamento lógico por Cidades.
  - Botão de exportação da programação para **PDF** (com layout minimalista e otimizado para impressão).
  - Botão de compartilhamento formatado rápido para **WhatsApp**.
- **Quadro de Informativos (News):** Publicação hierárquica de comunicados e avisos gerais para a irmandade, com categorização por tags.
- **Controle de Acesso e Perfis (RBAC):**
  - **Público Geral:** Visualização das localidades, mapa, agenda de ensaios e informativos, sem capacidade de edição.
  - **Autenticado (Admin / Editor):** Acesso a botões e menus de uma "Área Restrita" para criar, editar e excluir informações dinamicamente pela interface. (Ex: O painel de membros em `/ministerio` é invisível para usuários não-logados).

---

## 🛠️ Tecnologias Utilizadas

### Frontend (Interface Interativa)
- **Framework:** Next.js 14+ usando a arquitetura moderna do *App Router* e Server/Client Components do React.
- **Estilização:** CSS Vanilla com uso intenso de variáveis (Design Tokens) e interface mobile-first responsiva.
- **Estado e Comunicação:** `Fetch API` estendida, Context API (`AuthContext`) para manter persistência do JWT no localStorage de forma transparente.

### Backend (API RESTful)
- **Framework:** FastAPI / Python 3.11+, focado no altíssimo desempenho com suporte asnycio no futuro.
- **Banco de Dados Genérico:** SQLite via SQLAlchemy (Engine ORM em Python).
- **Validação:** Pydantic Models (Schemas).
- **Autenticação & Segurança:** Encriptação das senhas com implementação robusta nativa `bcrypt` (C-optimized), geração e quebra-de-token com tecnologia `python-jose` (JSON Web Tokens).

### Infraestrutura, Servidor e Persistência
- **Containerização:** Docker & Docker Compose unificando os microsserviços do ecosistema em uma única rede local virtual (`secretaria-net`). Imagens otimizadas enxutas mult-stage build.
- **Isolamento de Dados:** Banco estruturado sobre `Named Volumes` injetado pelo Docker mapeando caminhos host, isso garante sobrevida dos arquivos lógicos entre reboots ou manutenções sem que o DB "desapareça".

---

## 📋 Como Executar o Projeto Localmente

### Pré-requisitos Básicos
- [Docker e Docker Compose](https://www.docker.com/products/docker-desktop) instalados na máquina (preferencialmente utilizando WSL2 caso seja no Windows).
- (Opcional) Ambiente Node.js e Python puramente para rodar scripts de teste direto do Vscode.

### Passos de Execução Limpa

1. **Clone o repositório e acesse a raiz:**
   ```bash
   git clone <SEU_REPOSITORIO>
   cd gestaodesecretaria
   ```

2. **Dê boot unificado nos containers pelo Terminal:**
   ```bash
   docker compose up -d --build
   ```
   > 💡 Dica: O switch `--build` vai forçar as "receitas" (`Dockerfile`s) a atualizarem nativamente os binários do Python (passlib, bcrypt headers) e do Node (NPM modules). O `-d` soltará o terminal rodando no fundo.

3. **Explore e navegue:**
   - **Frontend (Onde o Usuário Interage):** [http://localhost:3000](http://localhost:3000)
   - **Backend Documentação Aberta (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔐 Credenciais Padrão do Sistema (Seed)

Sempre que a aplicação backend identificar e construir um banco de dados novo a partir do zero nas rotas ORM, as seguintes credenciais do **super-administrador** ganham vida:

- **E-mail Auth:** `admin@secretaria.com`
- **Senha Auth:** `admin`

Basta logar na **Área Restrita** através do botão contido no menu do cabeçalho ou pelo link de acesso de colaboradores disposto no "rodapé" virtual.

---

## 📂 Visão Geral da Arquitetura (Árvore do Projeto)
```text
gestaodesecretaria/
├── backend/                  # Lógica do Core System em Python API
│   ├── src/                  # Arquivos de código
│   │   ├── api/v1/...        # Mapeamento estrito das rotas e endpoints JSON
│   │   ├── core/...          # Configs de ambiente, Auth Token e Database Engine
│   │   ├── models/...        # A representação das Tabelas (SQLAlchemy Maps)
│   │   └── schemas/...       # Validador dos objetos (Pydantic Models)
│   ├── Dockerfile            # Módulo de setup contêiner de Server 
│   ├── pyproject.toml        # Repositório de libs dependentes (Fastapi, Bcrypt, Uvicorn)
│   └── uploads/              # Mídia isolada gerenciável enviada pelos Admin
│
├── frontend/                 # Client consumido pela Audiência (Next/React)
│   ├── public/               # Logos, SVG, e estáticos raw
│   ├── src/                 
│   │   ├── app/...           # Motor do App Router e Páginas da Arquitetura
│   │   ├── components/...    # Cartões, Cabeçalhos e Dropdowns reutilizáveis
│   │   ├── context/...       # Geranciamento de Token Provider Global da Seção
│   │   └── lib/api.js        # Ponte unificada de chamadas a URL da API (Headers JWT)
│   └── Dockerfile            # Módulo Node setup contêiner de Frontend
│
├── docker-compose.yml        # Orquestrador oficial multi-contêiner e proxy network
├── .gitignore                # Restrições limpas da Árvore Raiz e IDE files ignore
└── README.md                 # 📍 Você está aqui
```
