# Sprint 1.2.0 - Levantamento de Persistencia

## Entidades e chaves atuais (localStorage)

- Patrimonios: `cvholding_patrimonios`
  - Service: `src/modules/patrimonios/services/patrimonioService.js`
  - PK: `id`
  - Relacoes: 1:N com unidades (`unidade.patrimonioId`), contratos (`contrato.patrimonioId`), lancamentos (`lancamento.patrimonioId`).
- Unidades: `cvholding_unidades`
  - Service: `src/modules/unidades/services/unidadeService.js`
  - PK: `id`
  - FK: `patrimonioId -> patrimonio.id`
  - Relacoes: 1:N com contratos e lancamentos.
- Locatarios: `cvholding_locatarios`
  - Service: `src/modules/locatarios/services/locatarioService.js`
  - PK: `id`
  - Relacoes: 1:N com contratos (`contrato.locatarioId`).
- Contratos: `cvholding_contratos`
  - Service: `src/modules/contratos/services/contratoService.js`
  - PK: `id`
  - Chave auxiliar: `cvholding_contratos_sequence`
  - FKs: `patrimonioId`, `unidadeId`, `locatarioId`.
- Categorias/Subcategorias financeiras customizadas: `cvholding_financeiro_subcategorias_personalizadas`
  - Service: `src/modules/financeiro/services/categoriaFinanceiraService.js`
  - PK logica: `id` (slug).
  - Relacao de referencia: `lancamento.subcategoriaId`.
- Contas financeiras: `cvholding_financeiro_contas`
  - Service: `src/modules/financeiro/services/contaService.js`
  - PK: `id`
  - Relacao: 1:N com lancamentos (`contaFinanceiraId`) e movimentos de caixa.
- Lancamentos financeiros: `cvholding_financeiro_lancamentos`
  - Service: `src/modules/financeiro/services/financeiroService.js`
  - PK: `id`
  - FKs: `patrimonioId`, `unidadeId`, `contratoId`, `locatarioId`, `contaFinanceiraId`, `subcategoriaId`.
  - Regra critica preservada: `getDataConsiderada(item)` em `src/modules/financeiro/utils/financeiroUtils.js`.
- Configuracoes: `cvholding_configuracoes`
  - Service: `src/modules/configuracoes/services/configuracaoService.js`
  - Estrutura JSON por secao (`holding`, `financeiro`, `contratos`, `documentos`, `notificacoes`, `interface`).

## Outras estruturas persistidas (fora do escopo core, mas mapeadas)

- Rateios: `cvholding_rateios`
- Livro caixa: `cvholding_livro_caixa`
- Baixas: `cvholding_financeiro_baixas`
- Aportes: `cvholding_financeiro_aportes`
- Caucoes: `cvholding_financeiro_caucoes`
- Documentos: `cvholding_documentos`
- Auditoria: `cvholding_auditoria`
- Notificacoes: `cvholding_notificacoes`
- Tarefas manuais: `cvholding_tarefas_manuais`

## Dependencias entre modulos

- Patrimonio -> Unidade: obrigatoria (`unidade.patrimonioId`).
- Unidade -> Contrato: obrigatoria (`contrato.unidadeId`).
- Locatario -> Contrato: obrigatoria (`contrato.locatarioId`).
- Patrimonio -> Contrato: obrigatoria (`contrato.patrimonioId`).
- Contrato/Patrimonio/Unidade/Locatario -> Lancamento: opcionais por regra do formulario.
- Conta financeira -> Lancamento: opcional, mas quando presente gera movimento no livro caixa.
- Categoria/Subcategoria -> Lancamento: categoria obrigatoria por regra de negocio; subcategoria depende da categoria.

## Campos obrigatorios por validacao de servico

- Contratos (`validarContrato`): `patrimonioId`, `unidadeId`, `locatarioId`, `dataInicio`.
- Lancamentos (`buildMissingFields` + formularios): `tipo`, `categoria`, `valor`, `dataCompetencia`; vinculo patrimonial/unidade conforme fluxo.
- Unidade: `patrimonioId`, `codigoInterno`, `nome` usados como base operacional.
- Locatario: `nomeCompleto`.
- Patrimonio: `nome`, `codigo`.

## Estrategia da Sprint 1.2.0

- Contratos publicos dos services mantidos.
- Componente nao acessa Supabase direto.
- Camada de repositorio central (`localRepository`) passa a suportar `local` e `supabase`.
- Migracao explicita pela tela de Backup com resumo previo, backup local e controle de conflitos.
