export const STORAGE_KEY = 'cvholding_patrimonios'

export const gruposPatrimoniais = [
  'Residencial',
  'Comercial',
  'Misto',
  'Rural',
  'Industrial',
  'Outro',
]

export const tiposPatrimonio = [
  'Condomínio de Kitnets',
  'Condomínio de Casas',
  'Casas independentes',
  'Apartamento',
  'Casa individual',
  'Loja comercial',
  'Sala comercial',
  'Galpão',
  'Espaço de eventos',
  'Terreno',
  'Outro',
]

export const finalidadesPatrimonio = [
  'Gerador de Receita',
  'Uso Próprio',
  'Investimento',
  'Misto',
]

export const modelosReceita = {
  'Gerador de Receita': ['Locação Mensal', 'Locação por Evento', 'Múltiplas Fontes'],
  'Uso Próprio': ['Sem Receita'],
  Investimento: ['Sem Receita', 'Venda Futura'],
  Misto: ['Múltiplas Fontes'],
}

export const situacoesPatrimonio = [
  'Ativo',
  'Em implantação',
  'Inativo',
  'Vendido',
]

export const situacoesRegistralPatrimonio = [
  'Regularizado',
  'Em regularização',
  'Desmembramento pendente',
  'Incorporação pendente',
  'Não informado',
  'Outro',
]

export const opcoesAgua = ['Individual', 'Compartilhada']
export const opcoesEnergia = ['Individual', 'Compartilhada']
export const opcoesCondominio = ['Sim', 'Não']
export const opcoesIPTU = ['Individual', 'Compartilhado', 'Não se aplica']
export const opcoesLimpeza = ['Individual', 'Compartilhada', 'Não se aplica']
export const opcoesRegraRateio = ['Apenas unidades ocupadas', 'Todas as unidades', 'Não se aplica']
