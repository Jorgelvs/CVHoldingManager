export const PERSISTENCE_MODE_KEY = 'cvholding_persistence_mode'
export const PERSISTENCE_MIGRATION_REPORT_KEY = 'cvholding_supabase_migration_last_report'

export const PERSISTENCE_MODES = {
  LOCAL: 'local',
  SUPABASE: 'supabase',
}

export const PERSISTENCE_EVENT_MODE_CHANGED = 'cvholding_persistence_mode_changed'

export const PERSISTED_STORAGE_KEYS = [
  'cvholding_patrimonios',
  'cvholding_unidades',
  'cvholding_locatarios',
  'cvholding_contratos',
  'cvholding_contratos_sequence',
  'cvholding_financeiro_lancamentos',
  'cvholding_rateios',
  'cvholding_financeiro_subcategorias_personalizadas',
  'cvholding_financeiro_contas',
  'cvholding_livro_caixa',
  'cvholding_financeiro_baixas',
  'cvholding_financeiro_aportes',
  'cvholding_financeiro_caucoes',
  'cvholding_configuracoes',
  'cvholding_documentos',
  'cvholding_auditoria',
  'cvholding_notificacoes',
  'cvholding_tarefas_manuais',
]

export const TECHNICAL_STORAGE_KEYS = [
  'cvholding_configuracoes',
  'cvholding_financeiro_subcategorias_personalizadas',
  'cvholding_contratos_sequence',
]

export const BUSINESS_STORAGE_KEYS = PERSISTED_STORAGE_KEYS.filter(
  (key) => !TECHNICAL_STORAGE_KEYS.includes(key),
)

export const CORE_ENTITY_KEYS = [
  'cvholding_patrimonios',
  'cvholding_unidades',
  'cvholding_locatarios',
  'cvholding_contratos',
  'cvholding_financeiro_subcategorias_personalizadas',
  'cvholding_financeiro_contas',
  'cvholding_financeiro_lancamentos',
  'cvholding_configuracoes',
]

export const STORAGE_KEY_LABELS = {
  cvholding_patrimonios: 'Patrimonios',
  cvholding_unidades: 'Unidades',
  cvholding_locatarios: 'Locatarios',
  cvholding_contratos: 'Contratos',
  cvholding_contratos_sequence: 'Sequencia de contratos',
  cvholding_financeiro_lancamentos: 'Lancamentos financeiros',
  cvholding_rateios: 'Rateios',
  cvholding_financeiro_subcategorias_personalizadas: 'Subcategorias financeiras',
  cvholding_financeiro_contas: 'Contas financeiras',
  cvholding_livro_caixa: 'Livro caixa',
  cvholding_financeiro_baixas: 'Baixas',
  cvholding_financeiro_aportes: 'Aportes',
  cvholding_financeiro_caucoes: 'Caucoes',
  cvholding_configuracoes: 'Configuracoes',
  cvholding_documentos: 'Documentos',
  cvholding_auditoria: 'Auditoria',
  cvholding_notificacoes: 'Notificacoes',
  cvholding_tarefas_manuais: 'Tarefas manuais',
}
