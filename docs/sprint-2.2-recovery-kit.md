# Sprint 2.2 - Recovery Kit

## Escopo executado
- Ambiente alvo de limpeza remota: `cvh.cv_storage_blobs`
- Filtro aplicado: `environment_scope = homolog-default` e `owner_id = anon-homolog`
- Limpeza local: apenas chaves oficiais do produto + extras obrigatorias de historico/migracao

## Arquivos gerados
- [backups/sprint-2.2/local-backup-pre-clean.json](../backups/sprint-2.2/local-backup-pre-clean.json)
- [backups/sprint-2.2/supabase-backup-pre-clean-20260801-154628.json](../backups/sprint-2.2/supabase-backup-pre-clean-20260801-154628.json)
- [backups/sprint-2.2/schema_cvholding_pre_clean.sql](../backups/sprint-2.2/schema_cvholding_pre_clean.sql)
- [backups/sprint-2.2/inventory-local-pre-clean-20260801-154628.json](../backups/sprint-2.2/inventory-local-pre-clean-20260801-154628.json)
- [backups/sprint-2.2/inventory-local-post-clean-20260801-154628.json](../backups/sprint-2.2/inventory-local-post-clean-20260801-154628.json)
- [backups/sprint-2.2/inventory-supabase-pre-clean-20260801-154628.json](../backups/sprint-2.2/inventory-supabase-pre-clean-20260801-154628.json)
- [backups/sprint-2.2/inventory-supabase-post-clean-20260801-154628.json](../backups/sprint-2.2/inventory-supabase-post-clean-20260801-154628.json)
- [backups/sprint-2.2/sprint-2.2-report-20260801-154628.json](../backups/sprint-2.2/sprint-2.2-report-20260801-154628.json)

## Inventario antes da exclusao
### Local
- patrimonios: 4
- unidades: 0
- contas: 3
- demais modulos oficiais: 0

### Supabase (homolog-default / anon-homolog)
- linhas no blob: 7
- auditoria: 4
- contas: 3
- lancamentos: 0
- movimentos: 2
- notificacoes: 2
- patrimonios: 4
- unidades: 0

## Resultado da limpeza
### Supabase
- linhas removidas: 7
- residuo apos limpeza: 0

### Local
- chaves removidas presentes no navegador antes da limpeza: 3
- residuo nas chaves-alvo apos limpeza: 0
- chave mantida (controle de instancia): `cvholding_supabase_instance_id`

## Diagnostico de conexao pos-limpeza
- teste temporario write/read/delete: OK
- validacao de remocao do probe: OK

## Estado de autenticacao e RLS
- Politicas RLS existem no schema SQL e usam `auth.uid()` para tabelas de dominio.
- Fluxo real de autenticacao no frontend: ausente.
- Fallback de homologacao anonima (`anon-homolog`) ainda ativo para blob.
- Status para producao: **bloqueado** ate implementar autenticacao real com sessao e owner por usuario.

## Build
- Resultado: `npm run build` executado com sucesso.

## Passos para ativacao de producao
1. Implementar login/sessao no frontend com Supabase Auth.
2. Remover dependencia operacional de `anon-homolog` no fluxo de producao.
3. Garantir owner binding por usuario autenticado em todas operacoes de persistencia.
4. Rodar homologacao final em tenant/projeto separado de producao.
5. Liberar chave/variaveis de ambiente de producao somente apos checklist de seguranca.

## Bloqueadores restantes
- Ausencia de autenticacao real no app para uso multiusuario seguro.
- Necessidade de validacao final de politicas RLS com usuarios autenticados reais.
