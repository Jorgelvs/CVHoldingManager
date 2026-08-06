function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function isTruthyFlag(value) {
  return String(value || '').trim().toLowerCase() === 'true'
}

export function isProductionScope(scope) {
  return normalize(scope) === 'production'
}

export function isTestIdentity({ ownerId = '', ownerEmail = '' } = {}) {
  const joined = `${ownerId} ${ownerEmail}`.toLowerCase()
  return /(test|qa|hml|homolog|automated|sandbox|mock)/i.test(joined)
}

export function assertTestWriteAllowed({
  scriptName,
  environmentScope,
  ownerId = '',
  ownerEmail = '',
  allowFlag = 'ALLOW_TEST_WRITES',
}) {
  if (isProductionScope(environmentScope)) {
    throw new Error(`[${scriptName}] Escrita de teste bloqueada: environment_scope=production.`)
  }

  if (!isTestIdentity({ ownerId, ownerEmail })) {
    throw new Error(`[${scriptName}] Escrita de teste bloqueada: owner/usuario sem marcador explicito de teste.`)
  }

  if (!isTruthyFlag(process.env[allowFlag])) {
    throw new Error(`[${scriptName}] Escrita de teste bloqueada: defina ${allowFlag}=true para continuar.`)
  }
}

export function assertProductionMaintenanceAllowed({
  scriptName,
  environmentScope,
  allowFlag = 'ALLOW_PRODUCTION_MAINTENANCE',
  confirmationFlag = 'CONFIRM_PRODUCTION_MAINTENANCE',
  confirmationValue = 'RESET_PRODUCTION_OWNER_DATA',
}) {
  if (!isProductionScope(environmentScope)) {
    throw new Error(`[${scriptName}] Operacao permitida apenas em environment_scope=production.`)
  }

  if (!isTruthyFlag(process.env[allowFlag])) {
    throw new Error(`[${scriptName}] Producao bloqueada por padrao. Defina ${allowFlag}=true para continuar.`)
  }

  if (String(process.env[confirmationFlag] || '') !== confirmationValue) {
    throw new Error(`[${scriptName}] Confirmacao ausente. Defina ${confirmationFlag}=${confirmationValue}.`)
  }
}
