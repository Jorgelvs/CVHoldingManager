-- Sprint 1.2.0 - CVHolding Manager
-- Estrutura SQL para Supabase (PostgreSQL)
-- Objetivo: base compartilhada entre dispositivos sem alterar regras de negocio

create extension if not exists pgcrypto;

create schema if not exists cvh;

-- Tabela de blobs por chave para compatibilidade com contratos atuais dos servicos
create table if not exists cvh.cv_storage_blobs (
  storage_key text not null,
  environment_scope text not null default 'homolog-default',
  owner_id text not null default 'anon-homolog',
  payload_json text not null,
  payload_hash text not null,
  row_version bigint not null default 1,
  last_writer_instance text not null default 'inst-unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (environment_scope, owner_id, storage_key)
);

create index if not exists idx_cv_storage_blobs_owner on cvh.cv_storage_blobs(owner_id);
create index if not exists idx_cv_storage_blobs_scope on cvh.cv_storage_blobs(environment_scope);

-- Modelo relacional para consolidacao progressiva
create table if not exists cvh.patrimonios (
  id text primary key,
  nome text not null,
  codigo text not null,
  grupo_patrimonial text,
  tipo text,
  finalidade text,
  modelo_receita text,
  situacao text,
  quantidade_unidades integer,
  data_aquisicao date,
  valor_aquisicao numeric(14,2),
  valor_patrimonial numeric(14,2),
  matricula text,
  endereco jsonb not null default '{}'::jsonb,
  configuracoes jsonb not null default '{}'::jsonb,
  indicadores jsonb not null default '{}'::jsonb,
  observacoes text,
  created_at timestamptz,
  updated_at timestamptz,
  owner_id text not null default 'anonymous-single-user'
);

create unique index if not exists uq_patrimonios_codigo_owner on cvh.patrimonios(owner_id, codigo);

create table if not exists cvh.unidades (
  id text primary key,
  patrimonio_id text not null references cvh.patrimonios(id) on update cascade on delete restrict,
  codigo_interno text not null,
  nome text not null,
  tipo text,
  finalidade text,
  situacao text,
  area_util numeric(12,2),
  area_total numeric(12,2),
  observacoes text,
  created_at timestamptz,
  updated_at timestamptz,
  owner_id text not null default 'anonymous-single-user'
);

create index if not exists idx_unidades_patrimonio on cvh.unidades(patrimonio_id);
create unique index if not exists uq_unidades_codigo_owner on cvh.unidades(owner_id, codigo_interno);

create table if not exists cvh.locatarios (
  id text primary key,
  nome_completo text not null,
  cpf text,
  rg text,
  data_nascimento date,
  telefone text,
  whatsapp text,
  email text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  nome_pagador text,
  cpf_pagador text,
  telefone_pagador text,
  observacoes text,
  situacao text,
  created_at timestamptz,
  updated_at timestamptz,
  owner_id text not null default 'anonymous-single-user'
);

create unique index if not exists uq_locatarios_cpf_owner on cvh.locatarios(owner_id, cpf) where cpf is not null and cpf <> '';

create table if not exists cvh.contratos (
  id text primary key,
  codigo_interno text not null,
  patrimonio_id text not null references cvh.patrimonios(id) on update cascade on delete restrict,
  unidade_id text not null references cvh.unidades(id) on update cascade on delete restrict,
  locatario_id text not null references cvh.locatarios(id) on update cascade on delete restrict,
  data_inicio date,
  data_fim date,
  dia_vencimento integer,
  valor_aluguel numeric(14,2),
  valor_condominio numeric(14,2),
  valor_caucao numeric(14,2),
  percentual_multa numeric(8,4),
  percentual_juros numeric(8,4),
  reajuste_tipo text,
  indice_reajuste text,
  percentual_reajuste numeric(8,4),
  periodicidade_reajuste text,
  prazo_alerta_reajuste_dias integer,
  data_base_reajuste date,
  proxima_data_reajuste date,
  historico_reajustes jsonb not null default '[]'::jsonb,
  prazo_meses integer,
  situacao text,
  observacoes text,
  created_at timestamptz,
  updated_at timestamptz,
  owner_id text not null default 'anonymous-single-user'
);

create unique index if not exists uq_contratos_codigo_owner on cvh.contratos(owner_id, codigo_interno);
create index if not exists idx_contratos_unidade on cvh.contratos(unidade_id);
create index if not exists idx_contratos_locatario on cvh.contratos(locatario_id);

create table if not exists cvh.financeiro_contas (
  id text primary key,
  nome text not null,
  tipo text,
  banco text,
  agencia text,
  numero_conta text,
  saldo_inicial numeric(14,2),
  data_saldo_inicial date,
  ativa boolean not null default true,
  observacoes text,
  data_criacao timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  owner_id text not null default 'anonymous-single-user'
);

create table if not exists cvh.financeiro_subcategorias (
  id text primary key,
  tipo text not null,
  categoria text not null,
  nome text not null,
  owner_id text not null default 'anonymous-single-user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_subcategorias_tipo_categoria_nome_owner
  on cvh.financeiro_subcategorias(owner_id, tipo, categoria, nome);

create table if not exists cvh.financeiro_lancamentos (
  id text primary key,
  tipo text not null,
  categoria text,
  subcategoria text,
  subcategoria_id text references cvh.financeiro_subcategorias(id) on update cascade on delete set null,
  subcategoria_label text,
  descricao text,
  valor numeric(14,2) not null,
  data_competencia date,
  data_vencimento date,
  data_pagamento date,
  status text,
  patrimonio_id text references cvh.patrimonios(id) on update cascade on delete set null,
  unidade_id text references cvh.unidades(id) on update cascade on delete set null,
  patrimonio_label text,
  unidade_label text,
  contrato_id text references cvh.contratos(id) on update cascade on delete set null,
  locatario_id text references cvh.locatarios(id) on update cascade on delete set null,
  origem text,
  rateio_id text,
  tipo_movimento_condominio text,
  coberta_pelo_condominio boolean not null default false,
  conta_financeira_id text references cvh.financeiro_contas(id) on update cascade on delete set null,
  observacoes text,
  created_at timestamptz,
  updated_at timestamptz,
  owner_id text not null default 'anonymous-single-user'
);

create index if not exists idx_lancamentos_competencia on cvh.financeiro_lancamentos(data_competencia);
create index if not exists idx_lancamentos_patrimonio on cvh.financeiro_lancamentos(patrimonio_id);
create index if not exists idx_lancamentos_unidade on cvh.financeiro_lancamentos(unidade_id);
create index if not exists idx_lancamentos_conta on cvh.financeiro_lancamentos(conta_financeira_id);

create table if not exists cvh.configuracoes (
  owner_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Trigger de updated_at
create or replace function cvh.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_cv_storage_blobs on cvh.cv_storage_blobs;
create trigger trg_touch_cv_storage_blobs
before update on cvh.cv_storage_blobs
for each row execute procedure cvh.touch_updated_at();

drop trigger if exists trg_touch_subcategorias on cvh.financeiro_subcategorias;
create trigger trg_touch_subcategorias
before update on cvh.financeiro_subcategorias
for each row execute procedure cvh.touch_updated_at();

-- RLS inicial para usuario unico sem service role no frontend
alter table cvh.cv_storage_blobs enable row level security;
alter table cvh.patrimonios enable row level security;
alter table cvh.unidades enable row level security;
alter table cvh.locatarios enable row level security;
alter table cvh.contratos enable row level security;
alter table cvh.financeiro_contas enable row level security;
alter table cvh.financeiro_subcategorias enable row level security;
alter table cvh.financeiro_lancamentos enable row level security;
alter table cvh.configuracoes enable row level security;

drop policy if exists p_cv_storage_blobs_owner on cvh.cv_storage_blobs;
create policy p_cv_storage_blobs_owner on cvh.cv_storage_blobs
for all
using (
  (auth.uid() is not null and owner_id = auth.uid()::text)
  or
  (auth.uid() is null and owner_id = 'anon-homolog' and environment_scope like 'homolog%')
)
with check (
  (auth.uid() is not null and owner_id = auth.uid()::text)
  or
  (auth.uid() is null and owner_id = 'anon-homolog' and environment_scope like 'homolog%')
);

drop policy if exists p_patrimonios_owner on cvh.patrimonios;
create policy p_patrimonios_owner on cvh.patrimonios
for all
using (auth.uid() is not null and owner_id = auth.uid()::text)
with check (auth.uid() is not null and owner_id = auth.uid()::text);

drop policy if exists p_unidades_owner on cvh.unidades;
create policy p_unidades_owner on cvh.unidades
for all
using (auth.uid() is not null and owner_id = auth.uid()::text)
with check (auth.uid() is not null and owner_id = auth.uid()::text);

drop policy if exists p_locatarios_owner on cvh.locatarios;
create policy p_locatarios_owner on cvh.locatarios
for all
using (auth.uid() is not null and owner_id = auth.uid()::text)
with check (auth.uid() is not null and owner_id = auth.uid()::text);

drop policy if exists p_contratos_owner on cvh.contratos;
create policy p_contratos_owner on cvh.contratos
for all
using (auth.uid() is not null and owner_id = auth.uid()::text)
with check (auth.uid() is not null and owner_id = auth.uid()::text);

drop policy if exists p_contas_owner on cvh.financeiro_contas;
create policy p_contas_owner on cvh.financeiro_contas
for all
using (auth.uid() is not null and owner_id = auth.uid()::text)
with check (auth.uid() is not null and owner_id = auth.uid()::text);

drop policy if exists p_subcategorias_owner on cvh.financeiro_subcategorias;
create policy p_subcategorias_owner on cvh.financeiro_subcategorias
for all
using (auth.uid() is not null and owner_id = auth.uid()::text)
with check (auth.uid() is not null and owner_id = auth.uid()::text);

drop policy if exists p_lancamentos_owner on cvh.financeiro_lancamentos;
create policy p_lancamentos_owner on cvh.financeiro_lancamentos
for all
using (auth.uid() is not null and owner_id = auth.uid()::text)
with check (auth.uid() is not null and owner_id = auth.uid()::text);

drop policy if exists p_configuracoes_owner on cvh.configuracoes;
create policy p_configuracoes_owner on cvh.configuracoes
for all
using (auth.uid() is not null and owner_id = auth.uid()::text)
with check (auth.uid() is not null and owner_id = auth.uid()::text);
