import { STORAGE_KEY_SUBCATEGORIES, CATEGORIAS_FINANCEIRAS } from '../constants/financeiroConstants.js'
import { obterParametrosFinanceiros } from '../../configuracoes/services/configuracaoService.js'
import { listarLancamentos } from './financeiroService.js'
import { get as localGet, set as localSet } from '../../../utils/localRepository.js'

function normalizeSubcategoriaText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function toSlug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildSubcategoriaId(tipo, categoria, nome) {
  return `subcat_${toSlug(tipo)}_${toSlug(categoria)}_${toSlug(nome)}`
}

function carregarSubcategoriasPersonalizadas() {
  const parsed = localGet(STORAGE_KEY_SUBCATEGORIES, [])
  if (!Array.isArray(parsed)) return []
  return parsed
    .map((item) => {
      const tipo = item?.tipo || ''
      const categoria = item?.categoria || ''
      const nome = String(item?.nome || '').trim()
      if (!tipo || !categoria || !nome) return null
      return {
        id: item?.id || buildSubcategoriaId(tipo, categoria, nome),
        tipo,
        categoria,
        nome,
      }
    })
    .filter(Boolean)
}

function salvarSubcategoriasPersonalizadas(items) {
  localSet(STORAGE_KEY_SUBCATEGORIES, items)
}

export function listarSubcategoriasPersonalizadas() {
  return carregarSubcategoriasPersonalizadas()
}

export function subcategoriaJaExiste(tipo, categoria, nome) {
  if (!tipo || !categoria || !nome) return false
  const texto = normalizeSubcategoriaText(nome)
  return listarSubcategoriasPersonalizadas().some(
    (item) =>
      item.tipo === tipo &&
      item.categoria === categoria &&
      normalizeSubcategoriaText(item.nome) === texto,
  )
}

export function adicionarSubcategoriaPersonalizada(tipo, categoria, nome) {
  const valor = nome.trim()
  if (!tipo || !categoria || !valor) {
    return { error: 'Tipo, categoria e nome são obrigatórios.' }
  }

  if (subcategoriaJaExiste(tipo, categoria, valor)) {
    return { error: 'Subcategoria já existe nessa categoria.' }
  }

  const existentes = listarSubcategoriasPersonalizadas()
  const novoItem = {
    id: buildSubcategoriaId(tipo, categoria, valor),
    tipo,
    categoria,
    nome: valor,
  }
  existentes.push(novoItem)
  salvarSubcategoriasPersonalizadas(existentes)
  return { success: true, item: novoItem }
}

export function subcategoriaEstaEmUso(tipo, categoria, nome) {
  const valor = normalizeSubcategoriaText(nome)
  if (!tipo || !categoria || !valor) return false
  return listarLancamentos().some(
    (item) =>
      item.tipo === tipo &&
      item.categoria === categoria &&
      item.subcategoria &&
      normalizeSubcategoriaText(item.subcategoria) === valor,
  )
}

export function listarSubcategoriasDetalhadas(tipo, categoria) {
  const base = CATEGORIAS_FINANCEIRAS[tipo]?.find((item) => item.nome === categoria)
  const iniciais = (base?.subcategorias || []).map((nome) => ({
    id: buildSubcategoriaId(tipo, categoria, nome),
    nome,
    personalizada: false,
  }))

  const personalizadas = listarSubcategoriasPersonalizadas()
    .filter((item) => item.tipo === tipo && item.categoria === categoria)
    .map((item) => ({
      id: item.id || buildSubcategoriaId(tipo, categoria, item.nome),
      nome: item.nome,
      personalizada: true,
    }))

  const mapa = new Map()
  for (const item of [...iniciais, ...personalizadas]) {
    const key = normalizeSubcategoriaText(item.nome)
    if (!key) continue
    if (!mapa.has(key)) {
      mapa.set(key, item)
    }
  }

  return Array.from(mapa.values())
}

export function listarSubcategorias(tipo, categoria) {
  return listarSubcategoriasDetalhadas(tipo, categoria).map((item) => item.nome)
}

export function buscarSubcategoriaDetalhe(tipo, categoria, value) {
  if (!tipo || !categoria || !value) return null
  const normalized = normalizeSubcategoriaText(value)
  const items = listarSubcategoriasDetalhadas(tipo, categoria)
  return items.find((item) => item.id === value || normalizeSubcategoriaText(item.nome) === normalized) || null
}

export function listarCategorias(tipo) {
  const parametros = obterParametrosFinanceiros()
  if (tipo === 'receita' && Array.isArray(parametros?.categoriasReceitas) && parametros.categoriasReceitas.length > 0) {
    return parametros.categoriasReceitas
  }
  if (tipo === 'despesa' && Array.isArray(parametros?.categoriasDespesas) && parametros.categoriasDespesas.length > 0) {
    return parametros.categoriasDespesas
  }
  return CATEGORIAS_FINANCEIRAS[tipo] ? CATEGORIAS_FINANCEIRAS[tipo].map((item) => item.nome) : []
}

export function categoriaTemSubcategorias(tipo, categoria) {
  const categorias = CATEGORIAS_FINANCEIRAS[tipo]
  return categorias?.some((item) => item.nome === categoria && (item.subcategorias?.length || listarSubcategoriasPersonalizadas().some((sub) => sub.tipo === tipo && sub.categoria === categoria)))
}
