// APOSENTADO em 06/08/2026 (análise de código completa).
//
// Este script comparava `SCOPE === 'production'` sem normalizar
// (trim/lowercase) antes de decidir se aplicava a proteção de produção —
// diferente do helper padrão do projeto (isProductionScope, em
// scripts/lib/writeSafetyGuards.mjs), que normaliza corretamente. Se a
// variável de ambiente viesse como "Production" ou " production", o guard
// era pulado e o script seguia direto para apagar linhas do owner/scope
// sem confirmação.
//
// Substituto: use `npm run sprint:production:reset`
// (scripts/sprint-production-reset.mjs), que usa o guard normalizado
// corretamente (assertProductionMaintenanceAllowed) e faz um reset completo
// e seguro — backup total antes de apagar, login real do owner, confirmação
// textual exata.

throw new Error(
  '[sprint-2.2-cleanup-and-prod-prep] Script aposentado. Use: npm run sprint:production:reset',
)
