# Sprint 1.2.0B - Homologacao E2E Supabase Desktop e Android

## Escopo implementado

- Acao `Testar conexao Supabase` na tela Backup.
- Validacao por etapa:
  - configuracao de variaveis;
  - escopo de homologacao;
  - leitura na `cvh.cv_storage_blobs`;
  - escrita de probe temporario;
  - leitura apos escrita;
  - remocao do probe temporario.
- Acao `Limpar dados descartaveis`:
  - remove apenas dados de homologacao de teste no escopo atual;
  - nao remove localStorage indiscriminadamente;
  - nao altera outros scopes.
- Acoes de homologacao:
  - criar dados descartaveis (patrimonio/unidade/conta/lancamento 10);
  - criar lancamento de 20;
  - coletar evidencias (ids, contagens, row_version, last_writer_instance, timestamps).
- Acao `Testar concorrencia`:
  - prova conflito por hash/versao desatualizada;
  - evita sobrescrita silenciosa.

## Evidencias coletadas automaticamente (quando Supabase configurado)

- `scope.environmentScope`
- `scope.ownerId`
- `scope.instanceId`
- IDs gerados por entidade de teste
- Contagens das entidades de teste
- Metadados por key no blob store:
  - `row_version`
  - `last_writer_instance`
  - `updated_at`

## Estado atual da execucao deste agente

- `VITE_SUPABASE_URL`: ausente
- `VITE_SUPABASE_ANON_KEY`: ausente
- `environment_scope`: homolog-default
- `owner_id`: anon-homolog

Com isso, o teste de conexao parou na etapa de configuracao e nao executou leitura/escrita remota.

## Passos para validar E2E real (desktop + android)

1. Configurar `.env` no ambiente de homologacao com URL e anon key.
2. Abrir Backup no desktop e executar `Testar conexao Supabase`.
3. Ativar modo Supabase.
4. Clicar `Limpar dados descartaveis` e depois `Criar dados descartaveis`.
5. Clicar `Coletar evidencias` e registrar IDs/contagens/row_version.
6. No Android, abrir o mesmo host, ativar modo Supabase e confirmar dados.
7. No Android, criar lancamento de 20 e validar no desktop apos atualizar.
8. Executar `Testar concorrencia` e confirmar etapa `atualizacao_desatualizada = OK`.
9. Executar validacao da Entrada Universal no Android com:
   `Paguei 20 manutencao casa teste`

## Observacoes

- Nao migrar dados reais nesta sprint.
- Nao apagar localStorage real.
- Nao liberar modo producao.
