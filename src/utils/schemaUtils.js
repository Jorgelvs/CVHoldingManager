const NOW_FALLBACK = () => new Date().toISOString()

const DOMAIN_SCHEMAS = {
  patrimonio: {
    required: ['id', 'nome'],
    defaults: { situacao: 'Ativo' },
  },
  unidade: {
    required: ['id', 'patrimonioId'],
    defaults: { situacao: 'Disponível' },
  },
  locatario: {
    required: ['id', 'nomeCompleto'],
    defaults: { situacao: 'Ativo' },
  },
  contrato: {
    required: ['id', 'patrimonioId', 'unidadeId', 'locatarioId'],
    defaults: { situacao: 'Rascunho' },
  },
  financeiro: {
    required: ['id', 'tipo', 'descricao'],
    defaults: { status: 'pendente', origem: 'manual' },
  },
  documento: {
    required: ['id', 'nome'],
    defaults: { categoria: 'Outros', excluido: false },
  },
  notificacao: {
    required: ['id', 'titulo', 'tipo'],
    defaults: { origem: 'automatica' },
  },
  contaFinanceira: {
    required: ['id', 'nome'],
    defaults: { tipo: 'banco', ativa: true },
  },
  imobiliaria: {
    required: ['id', 'nome'],
    defaults: { situacao: 'Ativa', percentualComissao: 0 },
  },
}

function isValidDateValue(value) {
  if (typeof value !== 'string') return false
  const text = value.trim()
  if (!text) return false
  const parsed = new Date(text)
  return !Number.isNaN(parsed.getTime())
}

function toSafeIso(value, fallback = NOW_FALLBACK()) {
  if (!isValidDateValue(value)) return fallback
  return new Date(String(value)).toISOString()
}

function firstValidValue(record, keys) {
  if (!record || typeof record !== 'object') return null
  for (const key of keys) {
    if (isValidDateValue(record[key])) {
      return record[key]
    }
  }
  return null
}

export function getCreatedAt(record, fallback = NOW_FALLBACK()) {
  const found = firstValidValue(record, ['createdAt', 'criadoEm', 'dataCriacao'])
  return toSafeIso(found, fallback)
}

export function getUpdatedAt(record, fallback = NOW_FALLBACK()) {
  const found = firstValidValue(record, ['updatedAt', 'atualizadoEm', 'dataAtualizacao', 'createdAt', 'criadoEm', 'dataCriacao'])
  return toSafeIso(found, fallback)
}

export function applyCreationTimestamps(record = {}, options = {}) {
  const {
    legacyCreatedFields = [],
    legacyUpdatedFields = [],
  } = options

  const createdAt = getCreatedAt(record)
  const updatedAt = getUpdatedAt(record, createdAt)
  const output = {
    ...record,
    createdAt,
    updatedAt,
  }

  legacyCreatedFields.forEach((field) => {
    if (field) output[field] = toSafeIso(record[field], createdAt)
  })

  legacyUpdatedFields.forEach((field) => {
    if (field) output[field] = toSafeIso(record[field], updatedAt)
  })

  return output
}

export function touchUpdatedAt(record = {}, options = {}) {
  const {
    legacyUpdatedFields = [],
  } = options

  const createdAt = getCreatedAt(record)
  const updatedAt = NOW_FALLBACK()
  const output = {
    ...record,
    createdAt,
    updatedAt,
  }

  legacyUpdatedFields.forEach((field) => {
    if (field) output[field] = updatedAt
  })

  return output
}

export function applyDomainSchema(domain, item = {}) {
  const schema = DOMAIN_SCHEMAS[domain]
  if (!schema) return { ...item }

  const output = {
    ...schema.defaults,
    ...item,
  }

  schema.required.forEach((field) => {
    if (output[field] === undefined || output[field] === null) {
      output[field] = ''
    }
  })

  return output
}

export function listarSchemasDominios() {
  return Object.keys(DOMAIN_SCHEMAS)
}
