# Sprint 1.2.0A - Validacao e seguranca da persistencia Supabase

## 1) Auditoria de seguranca (RLS)

Arquivo-base: `supabase/schema_cvholding.sql`.

### Politicas efetivas

- `cvh.cv_storage_blobs`:
  - Authenticated (`auth.uid() not null`): pode operar somente em linhas com `owner_id = auth.uid()`.
  - Anonymous (`auth.uid() is null`): pode operar somente quando:
    - `owner_id = 'anon-homolog'`
    - `environment_scope like 'homolog%'`
  - Objetivo: habilitar homologacao controlada sem liberar dados reais.
- Tabelas relacionais (`cvh.patrimonios`, `cvh.unidades`, `cvh.locatarios`, `cvh.contratos`, `cvh.financeiro_contas`, `cvh.financeiro_subcategorias`, `cvh.financeiro_lancamentos`, `cvh.configuracoes`):
  - somente autenticado (`auth.uid() not null` e `owner_id = auth.uid()`).
  - anon nao possui acesso.

### Operacoes permitidas ao papel anon

- Na pratica desta sprint, o anon consegue `select/insert/update/delete` **somente** na tabela `cvh.cv_storage_blobs` e apenas no escopo de homologacao (`environment_scope homolog*`, owner fixo `anon-homolog`).
- Nenhuma operacao anon nas tabelas relacionais.

### Limite de seguranca sem autenticacao

- Como `anon key` e publica por definicao, nao ha seguranca forte para dados reais sem autenticar usuario.
- Mitigacao adotada: modo de homologacao isolado por escopo + bloqueio de migracao real por padrao (`VITE_SUPABASE_HOMOLOGATION_ONLY=true`).

## 2) Auditoria da tabela de compatibilidade

### Tabela

- Nome: `cvh.cv_storage_blobs`
- Chave primaria: composta (`environment_scope`, `owner_id`, `storage_key`)

### Estrutura

- `storage_key text not null`
- `environment_scope text not null default 'homolog-default'`
- `owner_id text not null default 'anon-homolog'`
- `payload_json text not null`
- `payload_hash text not null`
- `row_version bigint not null default 1`
- `last_writer_instance text not null default 'inst-unknown'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### Separacao por usuario/instancia/ambiente

- Ambiente: `environment_scope` (ex.: `homolog-default`)
- Tenant/logical owner: `owner_id`
- Instancia escritora: `last_writer_instance`

### Atualizacoes simultaneas

- Estrategia otimista por `payload_hash` esperado + `row_version`.
- Se o hash remoto divergir do hash esperado, a API retorna `CONFLICT_DETECTED`.
- Evita sobrescrita silenciosa quando dois clientes alteram a mesma chave quase ao mesmo tempo.

## 3) Validacao funcional

### Desktop (estado atual desta execucao)

- Modo local/supabase exibido no cabecalho: ok.
- Troca de modo com confirmacao e recarga: ok.
- Resumo de migracao gerado em modo Supabase: ok.
- Migracao de envio bloqueada em homologacao: ok.
- Com variaveis Supabase ausentes, app bloqueia escrita e mostra erro de conexao: ok.

### Android

- Nao foi possivel executar validacao real neste ambiente de automacao (sem dispositivo Android conectado a este agente).
- Procedimento ficou pronto para execucao manual assim que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` forem configuradas em um ambiente compartilhado.

### Entrada Universal no Android

- Pendente de execucao em dispositivo Android real com Supabase configurado.

## 4) Integridade e concorrencia

- Risco identificado inicialmente: last-write-wins em `upsert` simples por `storage_key`.
- Correcao implementada:
  - PK composta por escopo/owner/chave;
  - validacao de hash remoto esperado;
  - `row_version` para update condicional;
  - retorno de conflito explicito (`CONFLICT_DETECTED`).

## 5) Modo de persistencia

- Modo exibido globalmente no cabecalho (`Modo Local` / `Modo Supabase`).
- Nao alterna automaticamente.
- Troca exige confirmacao e recarrega app para recarregar dados da origem selecionada.
- Sem mistura silenciosa de local e remoto.

## 6) Migracao

- Sprint 1.2.0A valida somente resumo.
- Execucao de migracao real bloqueada por padrao em homologacao (`VITE_SUPABASE_HOMOLOGATION_ONLY=true`).
- Reexecucao sem duplicar: garantida por comparacao de `payload_hash` e skip quando ja sincronizado.
- Backup local antes de qualquer envio: implementado no fluxo de migracao.

## 7) Pendencias antes da migracao real

- Configurar e validar autenticacao de usuario (evitar uso anon para producao).
- Executar validacao cruzada Desktop <-> Android com URL/anon key reais de homologacao.
- Validar Entrada Universal no Android com base compartilhada ativa.
- Definir valores finais de `VITE_SUPABASE_ENV_SCOPE` e `VITE_SUPABASE_OWNER_ID` para homologacao/producao.
