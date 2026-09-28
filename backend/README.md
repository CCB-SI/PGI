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

3.  Configure as variáveis de ambiente: copie o `.env.example` para `.env` e preencha `JWT_SECRET_KEY` com a saída de `openssl rand -hex 32`. Ela é obrigatória: sem ela o backend não sobe.

4.  Execute o servidor de desenvolvimento:
    ```bash
    # Com uv
    uv run uvicorn src.gestaodecomunicados.main:app --reload

    # Com pip
    uvicorn src.gestaodecomunicados.main:app --reload
    ```

## Estrutura
- `src/gestaodecomunicados`: Código fonte da API

## Testes automatizados

Foram adicionados testes de integração para:
- CRUD de eventos com validação de regras (conflito de espaço, lotação, online)
- Exportação de PDF mensal e anual

Para executar:

```bash
cd backend

# Com uv
uv run pytest -q

# Com ambiente Python tradicional
python -m pytest -q
```

Arquivos de teste:
- `tests/test_events_api.py`
- `tests/test_reports_api.py`

## Novos endpoints de exportação

- `GET /api/v1/events.ics`
- `GET /api/v1/reports/monthly-notices.pdf?year=2026&month=3`
- `GET /api/v1/reports/annual-agenda.pdf?year=2026&agenda_scope=Administrativa`
