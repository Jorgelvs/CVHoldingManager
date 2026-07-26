import { STORAGE_KEY } from '../constants/patrimonioConstants.js'
import { gerarId } from '../utils/patrimonioUtils.js'

const defaultPatrimonios = [
  {
    id: 'patrimonio_rki',
    nome: 'Residence Kitnet I',
    codigo: 'RKI',
    grupoPatrimonial: 'Residencial',
    tipo: 'Condomínio de Kitnets',
    finalidade: 'Gerador de Receita',
    modeloReceita: 'Locação Mensal',
    situacao: 'Ativo',
    quantidadeUnidades: 14,
    dataAquisicao: '',
    valorAquisicao: '',
    valorPatrimonial: '',
    matricula: '',
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
    },
    configuracoes: {
      agua: 'Compartilhada',
      energia: 'Compartilhada',
      condominio: 'Sim',
      iptu: 'Compartilhado',
      limpeza: 'Compartilhada',
      manutencao: 'Compartilhada',
      regraRateio: '',
      valorPadraoCondominio: '',
      diaPadraoVencimento: '',
      observacoesOperacionais: '',
    },
    indicadores: {
      unidadesCadastradas: 0,
      unidadesOcupadas: 0,
      unidadesVagas: 0,
      unidadesEmManutencao: 0,
    },
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  },
  {
    id: 'patrimonio_rkii',
    nome: 'Residence Kitnet II',
    codigo: 'RKII',
    grupoPatrimonial: 'Residencial',
    tipo: 'Condomínio de Kitnets',
    finalidade: 'Gerador de Receita',
    modeloReceita: 'Locação Mensal',
    situacao: 'Em implantação',
    quantidadeUnidades: 16,
    dataAquisicao: '',
    valorAquisicao: '',
    valorPatrimonial: '',
    matricula: '',
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
    },
    configuracoes: {
      agua: 'Individual',
      energia: 'Individual',
      condominio: 'Sim',
      iptu: 'Compartilhado',
      limpeza: 'Compartilhada',
      manutencao: 'Compartilhada',
      regraRateio: '',
      valorPadraoCondominio: '',
      diaPadraoVencimento: '',
      observacoesOperacionais: '',
    },
    indicadores: {
      unidadesCadastradas: 0,
      unidadesOcupadas: 0,
      unidadesVagas: 0,
      unidadesEmManutencao: 0,
    },
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  },
  {
    id: 'patrimonio_vdo',
    nome: 'Residencial Villa D’Oeste',
    codigo: 'VDO',
    grupoPatrimonial: 'Residencial',
    tipo: 'Condomínio de Casas',
    finalidade: 'Gerador de Receita',
    modeloReceita: 'Locação Mensal',
    situacao: 'Ativo',
    quantidadeUnidades: 7,
    dataAquisicao: '',
    valorAquisicao: '',
    valorPatrimonial: '',
    matricula: '',
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
    },
    configuracoes: {
      agua: 'Individual',
      energia: 'Individual',
      condominio: 'Não',
      iptu: 'Individual',
      limpeza: 'Não se aplica',
      manutencao: 'Individual',
      regraRateio: '',
      valorPadraoCondominio: '',
      diaPadraoVencimento: '',
      observacoesOperacionais: '',
    },
    indicadores: {
      unidadesCadastradas: 0,
      unidadesOcupadas: 0,
      unidadesVagas: 0,
      unidadesEmManutencao: 0,
    },
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  },
  {
    id: 'patrimonio_rb',
    nome: 'Recanto da Brasa',
    codigo: 'RDB',
    grupoPatrimonial: 'Comercial',
    tipo: 'Espaço para Eventos',
    finalidade: 'Gerador de Receita',
    modeloReceita: 'Locação por Evento',
    situacao: 'Ativo',
    quantidadeUnidades: 1,
    dataAquisicao: '',
    valorAquisicao: '',
    valorPatrimonial: '',
    matricula: '',
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
    },
    configuracoes: {
      agua: 'Individual',
      energia: 'Individual',
      condominio: 'Não',
      iptu: 'Individual',
      limpeza: 'Individual',
      manutencao: 'Individual',
      regraRateio: '',
      valorPadraoCondominio: '',
      diaPadraoVencimento: '',
      observacoesOperacionais: '',
    },
    indicadores: {
      unidadesCadastradas: 0,
      unidadesOcupadas: 0,
      unidadesVagas: 0,
      unidadesEmManutencao: 0,
    },
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  },
]

function garantirEstrutura(item) {
  const endereco = {
    cep: item.endereco?.cep || '',
    logradouro: item.endereco?.logradouro || '',
    numero: item.endereco?.numero || '',
    complemento: item.endereco?.complemento || '',
    bairro: item.endereco?.bairro || '',
    cidade: item.endereco?.cidade || '',
    estado: item.endereco?.estado || '',
  }

  const configuracoes = {
    agua: item.configuracoes?.agua || '',
    energia: item.configuracoes?.energia || '',
    condominio: item.configuracoes?.condominio || '',
    iptu: item.configuracoes?.iptu || '',
    limpeza: item.configuracoes?.limpeza || '',
    manutencao: item.configuracoes?.manutencao || '',
    regraRateio: item.configuracoes?.regraRateio || '',
    valorPadraoCondominio: item.configuracoes?.valorPadraoCondominio || '',
    diaPadraoVencimento: item.configuracoes?.diaPadraoVencimento || '',
    observacoesOperacionais: item.configuracoes?.observacoesOperacionais || '',
  }

  return {
    id: item.id || gerarId(),
    nome: item.nome || '',
    codigo: item.codigo || '',
    grupoPatrimonial: item.grupoPatrimonial || item.grupo || '',
    tipo: item.tipo || '',
    finalidade: item.finalidade || '',
    modeloReceita: item.modeloReceita || '',
    situacao: item.situacao || '',
    situacaoRegistral: item.situacaoRegistral || item.situacaoRegistralPatrimonial || '',
    descricaoRegistral: item.descricaoRegistral || '',
    quantidadeUnidades: Number(item.quantidadeUnidades ?? item.quantidadePlanejadaUnidades) || 0,
    dataAquisicao: item.dataAquisicao || '',
    valorAquisicao: item.valorAquisicao || '',
    valorPatrimonial: item.valorPatrimonial || '',
    matricula: item.matricula || '',
    observacoes: item.observacoes || '',
    endereco,
    configuracoes,
    indicadores: {
      unidadesCadastradas: Number(item.indicadores?.unidadesCadastradas) || 0,
      unidadesOcupadas: Number(item.indicadores?.unidadesOcupadas) || 0,
      unidadesVagas: Number(item.indicadores?.unidadesVagas) || 0,
      unidadesEmManutencao: Number(item.indicadores?.unidadesEmManutencao) || 0,
    },
    criadoEm: item.criadoEm || new Date().toISOString(),
    atualizadoEm: item.atualizadoEm || new Date().toISOString(),
  }
}

function carregarPatrimonios() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const initial = defaultPatrimonios.map(garantirEstrutura)
    salvarPatrimonios(initial)
    return initial
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('Dados inválidos')
    return parsed.map(garantirEstrutura)
  } catch {
    const initial = defaultPatrimonios.map(garantirEstrutura)
    salvarPatrimonios(initial)
    return initial
  }
}

function salvarPatrimonios(patrimonios) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(patrimonios))
}

export function inicializarPatrimonios() {
  carregarPatrimonios()
}

export function listarPatrimonios() {
  return carregarPatrimonios()
}

export function buscarPatrimonioPorId(id) {
  return listarPatrimonios().find((item) => item.id === id) || null
}

export function criarPatrimonio(dados) {
  const patrimonio = garantirEstrutura({
    ...dados,
    id: gerarId(),
    quantidadeUnidades: Number(dados.quantidadeUnidades) || 0,
    valorAquisicao: dados.valorAquisicao || '',
    valorPatrimonial: dados.valorPatrimonial || '',
    matricula: dados.matricula || '',
    endereco: {
      ...dados.endereco,
    },
    configuracoes: {
      ...dados.configuracoes,
    },
    indicadores: {
      unidadesCadastradas: 0,
      unidadesOcupadas: 0,
      unidadesVagas: 0,
      unidadesEmManutencao: 0,
    },
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  })
  const patrimonios = listarPatrimonios()
  patrimonios.push(patrimonio)
  salvarPatrimonios(patrimonios)
  return patrimonio
}

export function atualizarPatrimonio(id, dados) {
  const patrimonios = listarPatrimonios()
  const index = patrimonios.findIndex((item) => item.id === id)
  if (index === -1) return null
  patrimonios[index] = garantirEstrutura({
    ...patrimonios[index],
    ...dados,
    quantidadeUnidades: Number(dados.quantidadeUnidades) || 0,
    valorAquisicao: dados.valorAquisicao || '',
    valorPatrimonial: dados.valorPatrimonial || '',
    matricula: dados.matricula || '',
    endereco: {
      ...patrimonios[index].endereco,
      ...dados.endereco,
    },
    configuracoes: {
      ...patrimonios[index].configuracoes,
      ...dados.configuracoes,
    },
    atualizadoEm: new Date().toISOString(),
  })
  salvarPatrimonios(patrimonios)
  return patrimonios[index]
}

export function excluirPatrimonio(id) {
  const patrimonios = listarPatrimonios()
  const index = patrimonios.findIndex((item) => item.id === id)
  if (index === -1) return false
  if (!podeExcluirPatrimonio(patrimonios[index])) return false
  patrimonios.splice(index, 1)
  salvarPatrimonios(patrimonios)
  return true
}

export function alterarSituacaoPatrimonio(id, situacao) {
  const patrimonios = listarPatrimonios()
  const index = patrimonios.findIndex((item) => item.id === id)
  if (index === -1) return null
  patrimonios[index] = {
    ...patrimonios[index],
    situacao,
    atualizadoEm: new Date().toISOString(),
  }
  salvarPatrimonios(patrimonios)
  return patrimonios[index]
}

export function podeExcluirPatrimonio(patrimonio) {
  if (!patrimonio || !patrimonio.indicadores) return false
  const { unidadesCadastradas, unidadesOcupadas, unidadesVagas, unidadesEmManutencao } = patrimonio.indicadores
  return [unidadesCadastradas, unidadesOcupadas, unidadesVagas, unidadesEmManutencao].every((valor) => Number(valor) === 0)
}

export function codigoUnicoDisponivel(codigo, id = null) {
  const valor = (codigo || '').trim().toLowerCase()
  if (!valor) return false
  return !listarPatrimonios().some((item) => item.codigo.trim().toLowerCase() === valor && item.id !== id)
}

export function gerarCodigoUnico(nome) {
  const base = (nome || '').trim()
    .normalize('NFD')
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .join('')
    .slice(0, 3)
    .padEnd(3, 'X')
  let codigo = base
  let contador = 1
  while (!codigoUnicoDisponivel(codigo)) {
    codigo = `${base}${contador}`.slice(0, 6)
    contador += 1
  }
  return codigo
}
