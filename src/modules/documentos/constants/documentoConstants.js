export const STORAGE_KEY_DOCUMENTOS = 'cvholding_documentos'

export const CATEGORIAS_DOCUMENTOS = [
  'Contratos',
  'Escrituras',
  'IPTU',
  'Seguro',
  'Condomínio',
  'Vistorias',
  'Comprovantes',
  'Outros',
]

export const TIPOS_PERMITIDOS_DOCUMENTO = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]

export const TAMANHO_MAXIMO_DOCUMENTO_BYTES = 5 * 1024 * 1024 // 5 MB
