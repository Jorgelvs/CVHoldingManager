import { STORAGE_KEY_SUBCATEGORIES, CATEGORIAS_FINANCEIRAS } from '../constants/financeiroConstants.js'
import { obterParametrosFinanceiros } from '../../configuracoes/services/configuracaoService.js'
import { listarLancamentos } from './financeiroService.js'
import { get as localGet, set as localSet } from '../../../utils/localRepository.js'

function carregarSubcategoriasPersonalizadas() {
  const parsed = localGet(STORAGE_KEY_SUBCATEGORIES, [])
  return Array.isArray(parsed) ? parsed : []
}

function salvarSubcategoriasPersonalizadas(items) {
  localSet(STORAGE_KEY_SUBCATEGORIES, items)
}

export function listarSubcategoriasPersonalizadas() {
  return carregarSubcategoriasPersonalizadas()
}

export function subcategoriaJaExiste(tipo, categoria, nome) {
  if (!tipo || !categoria || !nome) return false
  const texto = nome.trim().toLowerCase().replace(/\s+/g, ' ')
  return listarSubcategoriasPersonalizadas().some(
    (item) =>
      item.tipo === tipo &&
      item.categoria === categoria &&
      item.nome.trim().toLowerCase().replace(/\s+/g, ' ') === texto,
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
  existentes.push({ tipo, categoria, nome: valor })
  salvarSubcategoriasPersonalizadas(existentes)
  return { success: true, item: { tipo, categoria, nome: valor } }
}

export function subcategoriaEstaEmUso(tipo, categoria, nome) {
  const valor = nome.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!tipo || !categoria || !valor) return false
  return listarLancamentos().some(
    (item) =>
      item.tipo === tipo &&
      item.categoria === categoria &&
      item.subcategoria &&
      item.subcategoria.trim().toLowerCase().replace(/\s+/g, ' ') === valor,
  )
}

export function listarSubcategorias(tipo, categoria) {
  const base = CATEGORIAS_FINANCEIRAS[tipo]?.find((item) => item.nome === categoria)
  const iniciais = base?.subcategorias || []
  const personalizadas = listarSubcategoriasPersonalizadas()
    .filter((item) => item.tipo === tipo && item.categoria === categoria)
    .map((item) => item.nome)

  const todas = [...iniciais, ...personalizadas]
  return [...new Set(todas)]
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
