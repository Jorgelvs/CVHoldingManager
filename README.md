# CVHolding Manager

Versao: 1.0.0

Sistema de gestao patrimonial, contratos e financeiro com persistencia local (LocalStorage), modo Supabase, backup/restauracao e modulos operacionais para uso administrativo.

## Requisitos

- Node.js 20+
- npm 10+
- Navegador moderno (Chrome, Edge, Firefox, Safari)

## Instalacao

```bash
npm install
```

## Execucao (desenvolvimento)

```bash
npm run dev
```

A aplicacao abre em `http://localhost:5173` (ou porta exibida pelo Vite).

Importante: use `localhost` como origem canonica no desenvolvimento local.
Evite alternar entre `localhost` e `127.0.0.1`, pois cada origem possui `localStorage` independente.

## Build de producao

```bash
npm run build
```

Artefatos gerados em `dist/`.

## Variaveis de ambiente (Supabase)

Crie um arquivo `.env` a partir de `.env.example`:

```bash
cp .env.example .env
```

Variaveis obrigatorias para modo Supabase:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_ENV_SCOPE` — unica variavel que decide se o ambiente e producao (`production`) ou homologacao (qualquer outro valor). Ao ser `production`, o app automaticamente exige login real, obriga modo Supabase e esconde os recursos de dados de teste.
- `VITE_SUPABASE_OWNER_ID` — usado apenas em homologacao (owner anonimo); em producao o owner vem do login real.

Importante:

- Nunca usar service role key no frontend.
- Apenas chave publica anon no cliente.
- Sem autenticacao de usuario, usar apenas homologacao isolada.

## Persistencia de dados

A aplicacao possui dois modos de persistencia, comutados explicitamente na tela `Backup`:

- `local`
- `supabase`

Nao ha mistura silenciosa entre as fontes.

Chaves persistidas por modulo:

- `configuracoes`
- `patrimonios`
- `unidades`
- `locatarios`
- `contratos`
- `financeiro` (lancamentos, contas, baixas, aportes, caucoes, rateios, livro-caixa, subcategorias)
- `documentos`
- `auditoria`
- `notificacoes`

No modo Supabase, os contratos publicos dos services foram preservados e a camada intermediaria continua centralizada em `src/utils/localRepository.js`.

Compatibilidade: a camada de schema/timestamp preserva leitura de campos legados e grava campos canonicos atuais.

## SQL do banco (Supabase)

Arquivo de estrutura: `supabase/schema_cvholding.sql`.

Inclui:

- tabela de compatibilidade por chave (`cvh.cv_storage_blobs`)
- tabelas relacionais para patrimonios, unidades, locatarios, contratos, contas, subcategorias e lancamentos
- chaves estrangeiras e indices
- RLS inicial para uso single-user (`owner_id`)

## Migracao local -> Supabase

Tela: `Backup`, secao `0) Fonte de persistencia e migracao para Supabase`.

Fluxo seguro:

1. Gerar resumo de migracao.
2. Revisar registros encontrados, registros para envio, conflitos e erros.
3. Executar migracao somente apos confirmacao explicita.

Garantias da rotina:

- Nao apaga localStorage automaticamente.
- Gera backup local antes de enviar.
- Impede duplicacao em reexecucoes quando payload ja estiver sincronizado.
- Permite controlar sobrescrita de conflitos.

Sprint 1.2.0A:

- Em homologacao (`VITE_SUPABASE_ENV_SCOPE` diferente de `production`), envio real de migracao fica bloqueado por padrao.
- O fluxo da sprint valida apenas geracao de resumo, conflitos e riscos.
- Troca de modo (`local`/`supabase`) exige confirmacao e recarrega a aplicacao.

Relatorio detalhado: `docs/sprint-1.2.0A-validacao-seguranca.md`.

Sprint 1.2.0B:

- A tela `Backup` inclui a acao `Testar conexao Supabase` com validacao em etapas.
- Inclui limpeza/criacao de dados descartaveis e coleta de evidencias de homologacao.
- Inclui teste de concorrencia com deteccao de conflito sem sobrescrita silenciosa.

Guia operacional: `docs/sprint-1.2.0B-homologacao-e2e.md`.

Levantamento funcional da sprint: `docs/sprint-1.2.0-levantamento.md`.

## Backup

Tela: `Backup`.

Recursos:
- Backup completo/parcial em JSON
- Exportacao por modulo
- Metadados do arquivo (`app`, `appVersion`, `backupVersion`, `generatedAt`)

Fluxo resumido:
1. Selecionar modulos.
2. Gerar backup JSON.
3. Armazenar o arquivo em local seguro.

## Restore

Tela: `Backup`.

Modos:
- `merge` (mesclar)
- `substituir` (sobrescrever dados dos modulos selecionados)

Fluxo resumido:
1. Selecionar arquivo JSON.
2. Validar estrutura e resumo.
3. Selecionar modulos e modo.
4. Confirmar restauracao.

## Estrutura dos dados de backup

Formato:

```json
{
  "metadata": {
    "app": "CVHolding Manager",
    "appVersion": "1.0.0",
    "backupVersion": "20.0.0",
    "generatedAt": "ISO-8601",
    "storageStrategy": "local-storage-v1",
    "sync": {
      "cloudReady": true,
      "provider": "none"
    }
  },
  "modules": ["configuracoes", "patrimonios", "..."],
  "data": {
    "configuracoes": {},
    "patrimonios": [],
    "...": "..."
  }
}
```

## Fluxo de atualizacao

1. Gerar backup completo antes da atualizacao.
2. Atualizar codigo e dependencias.
3. Executar `npm run build`.
4. Subir nova versao.
5. Validar navegacao e integracao dos modulos.
6. Em caso de necessidade, restaurar backup pela tela `Backup`.

## Checklist tecnico da Release 1.0.0

- Build de producao validado
- Compatibilidade com dados existentes preservada
- Persistencia local preservada
- Backup/restauracao preservados
- Sem alteracao de regras financeiras
- Sem alteracao de APIs publicas de services

## Observacoes

- Warnings de futuro do React Router v7 em ambiente de desenvolvimento sao informativos e nao bloqueiam producao.
- Esta release nao adiciona novas funcionalidades; foco em consolidacao para uso produtivo.
