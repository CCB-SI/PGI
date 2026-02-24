# Evolução do Sistema: PGRI Santa Isabel (Regional Integrada)

Este documento detalha as novas regras de negócio e expansão do sistema original de secretaria musical para uma plataforma de gestão regional completa.

## 1. Categorização e Identidade Visual (Baseado em Avisos Reais)
Para refletir a organização da lista regional, os eventos devem ser classificados e estilizados conforme as categorias abaixo:

| Categoria | Descrição | Estilo Sugerido |
| :--- | :--- | :--- |
| **BATISMO** | Batismos regionais com nome do Ancião. | Borda Azul |
| **SANTA CEIA** | Santas Ceias nas Comuns da regional. | Borda Vinho |
| **MOCIDADE** | Cultos e Reuniões da Mocidade. | Borda Verde |
| **MINISTERIAL** | RMA, RRM e Reuniões de Setor (Exclusivo). | Borda Cinza Escuro |
| **MUSICAL** | Ensaios Locais, Regionais e GEM. | Borda Dourada |
| **ADMINISTRATIVO**| Avisos de Coleta Única e Manutenção. | Borda Preta |

## 2. Regras de Privacidade (Mural Ministerial)
O sistema deve distinguir o conteúdo público do restrito através de perfis de acesso:

* **Público**: Visualiza eventos de Batismos, Santas Ceias, Mocidade e Ensaios.
* **Ministerial (Protegido)**: Acesso via login para Anciães, Diáconos, Cooperadores e Administração.
    * Visualiza agenda de RMAs e RRMs com horários específicos (Ex: 16:00 Anciães, 19:30 Plenária).
    * Acesso a documentos internos de procedimentos e circulares da RGE.

## 3. Lógica de Filtros e Geolocalização
* **Filtro Territorial**: O sistema deve permitir o filtro imediato pelas cidades de **Santa Isabel**, **Arujá** e **Igaratá**.
* **Mapas Dinâmicos**: Todo card de aviso deve extrair as coordenadas da entidade `Location` e oferecer um botão para Google Maps/Waze, eliminando a dependência de mapas estáticos em PDF.

## 4. Estrutura de Downloads
A seção de downloads deve ser dividida em dois repositórios:
1.  **Repositório Público**: Hinários, Métodos, Coros e Informativos Gerais.
2.  **Repositório Ministerial**: Manuais de procedimentos, circulares de reuniões regionais e guias de orientação ministerial.

## 5. Observações Especiais (Informativos)
O sistema deve permitir campos de texto rico para incluir orientações fixas extraídas dos avisos oficiais, tais como:
* Palavras para oração do Pão e Cálice na Santa Ceia.
* Instruções sobre Coletas Únicas (Piedade, Manutenção e Construção).

## 6. Automação de Documentos Administrativos
O sistema deve eliminar o preenchimento manual de formulários físicos, permitindo a geração de PDFs pré-preenchidos.

* **Documento Alvo**: Formulário M02 (Pedido de Avaliação para Culto Oficial).
* **Campos Automáticos**: 
    * Dados do Candidato (Nome, Instrumento, Comum).
    * Corpo Ministerial Responsável (Vinculado à Comum congregação).
* **Fluxo**: O Editor/Admin seleciona o músico -> Clica em "Gerar M02" -> O sistema retorna o PDF pronto para impressão e coleta de assinaturas físicas.

## 7. Motor de Geração de Documentos (Templates)
Para suportar múltiplos formulários (M02, Fichas de Cadastro, etc.), o sistema deve utilizar uma lógica de mapeamento dinâmico.

* **Lógica de Mapeamento**: Criar um dicionário de dados (Schema) que mapeia campos do banco para campos do PDF.
* **Repositório de Modelos**: Pasta no backend `/templates/pdfs` onde novos arquivos .pdf podem ser adicionados sem alterar o código principal.
* **Gestão de Versões**: Como o formulário enviado possui revisão de LGPD, o sistema deve registrar qual versão do formulário foi gerada para cada irmão.