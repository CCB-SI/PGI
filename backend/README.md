# Backend Gestão de Comunicados

Este é o backend do sistema Gestão de Comunicados, construído com **FastAPI**.

## Pré-requisitos
- Python 3.11+
- [uv](https://github.com/astral-sh/uv) (Recomendado) ou pip

## Configuração

1.  Navegue para a pasta `backend`:
    ```bash
    cd backend
    ```

2.  Crie o ambiente virtual e instale as dependências:
    ```bash
    # Com uv
    uv sync

    # Com pip
    python -m venv .venv
    source .venv/bin/activate  # Windows: .venv\Scripts\activate
    pip install -r requirements.txt # (Se disponível) e dependências
    pip install fastapi uvicorn[standard] pydantic pydantic-settings sqlalchemy
    ```

3.  Configure as variáveis de ambiente:
    ```bash
    cp .env.example .env
    ```

4.  Execute o servidor de desenvolvimento:
    ```bash
    # Com uv
    uv run uvicorn src.gestaodecomunicados.main:app --reload

    # Com pip
    uvicorn src.gestaodecomunicados.main:app --reload
    ```

## Estrutura
- `src/gestaodecomunicados`: Código fonte da API
