export const STORAGE_KEY = 'cvholding_financeiro_lancamentos'
export const STORAGE_KEY_RATEIOS = 'cvholding_rateios'
export const STORAGE_KEY_SUBCATEGORIES = 'cvholding_financeiro_subcategorias_personalizadas'
export const STORAGE_KEY_CONTAS = 'cvholding_financeiro_contas'
export const STORAGE_KEY_LIVRO_CAIXA = 'cvholding_livro_caixa'
export const STORAGE_KEY_BAIXAS = 'cvholding_financeiro_baixas'
export const STORAGE_KEY_APORTES = 'cvholding_financeiro_aportes'
export const STORAGE_KEY_CAUCOES = 'cvholding_financeiro_caucoes'

export const TIPOS_FINANCEIROS = ['receita', 'despesa']
// 'parcial' adicionado em 06/08/2026: baixaService já gravava esse status
// ao registrar uma baixa parcial, mas ele não constava aqui nem era tratado
// por getStatusEfetivo/calcularAtrasados/calcularPendencias — um lançamento
// pago pela metade e vencido ficava invisível nos relatórios de
// inadimplência.
export const STATUS_FINANCEIRO = ['pendente', 'parcial', 'pago', 'atrasado', 'cancelado']
export const METODOS_RATEIO = ['igualitario']
export const CRITERIOS_ELEGIBILIDADE_RATEIO = ['ocupadas_mes_inteiro']
export const STATUS_RATEIO = ['rascunho', 'processado', 'cancelado']
export const ORIGEM_FINANCEIRO = ['manual', 'rateio', 'contrato', 'aporte_holding']

export const CATEGORIAS_FINANCEIRAS = {
  receita: [
    { nome: 'Aluguel', subcategorias: [] },
    { nome: 'Condomínio', subcategorias: [] },
    { nome: 'Multa', subcategorias: [] },
    { nome: 'Juros', subcategorias: [] },
    { nome: 'Outras receitas', subcategorias: [] },
  ],
  despesa: [
    { nome: 'Água', subcategorias: [] },
    { nome: 'Energia', subcategorias: [] },
    { nome: 'Faxina', subcategorias: [] },
    {
      nome: 'Manutenção',
      subcategorias: [
        'Pintura',
        'Elétrica',
        'Hidráulica',
        'Jardinagem',
        'Dedetização',
        'Reparos gerais',
        'Outros',
      ],
    },
    { nome: 'IPTU', subcategorias: [] },
    { nome: 'Comissão imobiliária', subcategorias: [] },
    { nome: 'Seguro', subcategorias: [] },
    { nome: 'Outras despesas', subcategorias: [] },
  ],
}
