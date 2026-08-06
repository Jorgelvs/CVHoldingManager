# Sprint 2.3 - Recovery Kit

## Objetivo
Implementar autenticacao real com Supabase Auth, sessao persistente, logout, bloqueio sem sessao em producao e isolamento por usuario (`owner_id = auth.uid()`).

## Implementacao realizada
- Login por e-mail/senha com Supabase Auth.
- Recuperacao de sessao ao iniciar o app.
- Logout com bloqueio de acoes durante operacao.
- Guard de acesso para bloquear rotas quando o modo Supabase estiver em producao sem sessao autenticada.
- `owner_id` dinamico por sessao em producao.
- Fallback de owner fixo apenas em homologacao explicitamente habilitada (`VITE_SUPABASE_HOMOLOGATION_ONLY=true`).
- Persistencia Supabase bloqueada sem sessao no modo de autenticacao obrigatoria.
- Indicador visual do usuario autenticado e botao `Sair` no header.

## Arquivos criados
- [src/modules/auth/context/AuthContext.jsx](../src/modules/auth/context/AuthContext.jsx)
- [src/modules/auth/services/supabaseAuthService.js](../src/modules/auth/services/supabaseAuthService.js)
- [src/modules/auth/components/AuthGuard.jsx](../src/modules/auth/components/AuthGuard.jsx)
- [src/modules/auth/pages/LoginPage.jsx](../src/modules/auth/pages/LoginPage.jsx)
- [scripts/sprint-2.3-validate-rls-schema.mjs](../scripts/sprint-2.3-validate-rls-schema.mjs)
- [scripts/sprint-2.3-auth-rls-runtime-tests.mjs](../scripts/sprint-2.3-auth-rls-runtime-tests.mjs)

## Arquivos alterados
- [src/main.jsx](../src/main.jsx)
- [src/App.jsx](../src/App.jsx)
- [src/components/Header.jsx](../src/components/Header.jsx)
- [src/style.css](../src/style.css)
- [src/infrastructure/supabase/client.js](../src/infrastructure/supabase/client.js)
- [src/infrastructure/persistence/persistenceGateway.js](../src/infrastructure/persistence/persistenceGateway.js)
- [src/infrastructure/persistence/supabaseStorageRepository.js](../src/infrastructure/persistence/supabaseStorageRepository.js)
- [src/modules/backup/services/supabaseConnectionDiagnosticService.js](../src/modules/backup/services/supabaseConnectionDiagnosticService.js)
- [src/modules/backup/pages/BackupPage.jsx](../src/modules/backup/pages/BackupPage.jsx)
- [.env.example](../.env.example)

## Fluxo de autenticacao
1. App inicia e recupera sessao com `supabase.auth.getSession()`.
2. Em modo `supabase` com `VITE_SUPABASE_HOMOLOGATION_ONLY=false`, a sessao passa a ser obrigatoria.
3. Sem sessao, qualquer rota de negocio redireciona para `/login`.
4. Login valido define o usuario autenticado e libera operacoes.
5. Logout encerra sessao e retorna ao bloqueio de acesso.

## Regras de owner_id por ambiente
- Homologacao isolada:
  - `VITE_SUPABASE_ENV_SCOPE=homolog-default`
  - `VITE_SUPABASE_OWNER_ID=anon-homolog`
  - `VITE_SUPABASE_HOMOLOGATION_ONLY=true`
  - `owner_id` fixo permitido para dados descartaveis.
- Producao:
  - `VITE_SUPABASE_ENV_SCOPE=production`
  - `VITE_SUPABASE_HOMOLOGATION_ONLY=false`
  - `owner_id` vem exclusivamente de `auth.uid()` (usuario da sessao).
  - Escrita/leitura bloqueadas sem sessao.

## Evidencias de RLS
- Arquivo: [backups/sprint-2.3/rls-schema-validation-20260801-155404.json](../backups/sprint-2.3/rls-schema-validation-20260801-155404.json)
- Resultado:
  - totalTables: 9
  - tablesWithRlsEnabled: 9
  - tablesWithFullCrudCoverage: 9
  - tablesWithOwnerBinding: 9

## Evidencias de testes runtime (Auth + RLS)
- Arquivo: [backups/sprint-2.3/auth-rls-runtime-tests.json](../backups/sprint-2.3/auth-rls-runtime-tests.json)
- Executado:
  - login invalido: OK (falhou como esperado)
  - acesso anonimo em producao: NEGADO (OK)
  - fluxo anonimo em homologacao: OK (write/read/delete)
- Nao executado por falta de credenciais reais de teste:
  - login valido com CRUD completo autenticado
  - isolamento cruzado entre usuario A e B

## Testes de interface executados
- Em ambiente homologacao atual (`VITE_SUPABASE_HOMOLOGATION_ONLY=true`):
  - app abre normalmente sem exigir login.
  - rota `/login` redireciona para `/`.
- Em instancia dev temporaria com producao (`VITE_SUPABASE_ENV_SCOPE=production` e `VITE_SUPABASE_HOMOLOGATION_ONLY=false`):
  - acesso sem sessao redireciona para `/login`.
  - tentativa de login invalido mostra erro claro: `E-mail ou senha invalidos.`

## Build
- `npm run build`: sucesso.

## Como criar usuario proprietario (Supabase Auth)
1. No painel Supabase: Authentication > Users > Invite user (ou Create user).
2. Definir e-mail/senha do proprietario.
3. Confirmar e-mail quando aplicavel.
4. Entrar no app com esse usuario.
5. Validar no Backup que `owner_id` exibido coincide com `authenticatedUserId`.

## Checklist para ativacao segura de producao
1. Ajustar variaveis:
   - `VITE_SUPABASE_ENV_SCOPE=production`
   - `VITE_SUPABASE_HOMOLOGATION_ONLY=false`
   - manter `VITE_SUPABASE_OWNER_ID` apenas para homologacao (nao usado como identidade em producao).
2. Validar login real no ambiente de producao com usuario proprietario.
3. Executar script de runtime com credenciais reais de teste:
   - `SPRINT23_TEST_USER_EMAIL`
   - `SPRINT23_TEST_USER_PASSWORD`
   - opcional para isolamento cruzado:
     - `SPRINT23_TEST_USER_B_EMAIL`
     - `SPRINT23_TEST_USER_B_PASSWORD`
4. Confirmar que producao permanece sem dados reais ate aprovacao final.
5. Nao rodar migracao automatica.

## Plano de recuperacao
1. Se houver regressao de auth, voltar temporariamente para modo local no app (`local`) para continuidade operacional.
2. Restaurar ambiente de homologacao com:
   - `VITE_SUPABASE_ENV_SCOPE=homolog-default`
   - `VITE_SUPABASE_OWNER_ID=anon-homolog`
   - `VITE_SUPABASE_HOMOLOGATION_ONLY=true`
3. Validar conexao no Backup antes de novos testes.
4. Usar backups de Sprint 2.2 e 2.3 para auditoria e rastreabilidade.

## Bloqueadores restantes
- Falta executar testes autenticados com credenciais reais controladas para concluir matriz obrigatoria:
  - CRUD completo autenticado com validacao explicita de `owner_id = auth.uid()`.
  - isolamento entre dois usuarios reais (A/B).
