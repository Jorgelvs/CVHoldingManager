export const STORAGE_KEY = 'cvholding_financeiro_lancamentos'
export const STORAGE_KEY_SUBCATEGORIES = 'cvholding_financeiro_subcategorias_personalizadas'

export const TIPOS_FINANCEIROS = ['receita', 'despesa']
export const STATUS_FINANCEIRO = ['pendente', 'pago', 'atrasado', 'cancelado']

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
