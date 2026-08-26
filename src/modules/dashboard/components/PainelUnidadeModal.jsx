import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../../../components/Modal.jsx'
import CurrencyInput from '../../../components/CurrencyInput.jsx'
import { atualizarLocatario } from '../../locatarios/services/locatarioService.js'
import { atualizarContrato } from '../../contratos/services/contratoService.js'
import { situacoesContrato } from '../../contratos/constants/contratoConstants.js'
import { criarLancamento } from '../../financeiro/services/financeiroService.js'
import { registrarBaixa, calcularSaldoPendente } from '../../financeiro/services/baixaService.js'
import { listarComissoesDetalhadas } from '../../financeiro/services/comissaoService.js'
import { getStatusEfetivo, formatarMoeda, avaliarDivergenciaDeposito } from '../../financeiro/utils/financeiroUtils.js'
import { obterParametrosFinanceiros } from '../../configuracoes/services/configuracaoService.js'

const LABEL_STATUS_LANCAMENTO = {
  pendente: 'Pendente',
  pago: 'Pago',
  atrasado: 'Atrasado',
  parcial: 'Parcial',
  cancelado: 'Cancelado',
}

function montarDataVencimentoPorDia(mesIso, diaVencimento) {
  if (!mesIso || diaVencimento === '' || diaVencimento === null || diaVencimento === undefined) return ''
  const [anoTxt, mesTxt] = String(mesIso).split('-')
  const ano = Number(anoTxt)
  const mes = Number(mesTxt)
  const dia = Number(diaVencimento)
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) return ''
  const ultimoDiaMes = new Date(ano, mes, 0).getDate()
  return `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(dia, ultimoDiaMes)).padStart(2, '0')}`
}

// Modal de ações rápidas aberto ao clicar num card de unidade no Painel —
// consolida as ações do dia a dia (lançar/marcar pagamento, editar
// inquilino, ajustar valor/datas do contrato) sem precisar navegar para
// outra tela. Pedido do usuário: como a administração formal do contrato é
// da imobiliária, o app só precisa do essencial operacional aqui — o resto
// (multa, juros, reajuste, cláusulas) continua disponível na tela completa
// do contrato, não duplicado neste modal.
export default function PainelUnidadeModal({ selecionado, mesRef, formatarMesReferencia, onClose, onChanged }) {
  const unidade = selecionado?.unidade || null
  const contrato = selecionado?.contrato || null
  const inquilino = selecionado?.inquilino || null
  const lancamentos = selecionado?.lancamentos || []

  const [editandoInquilino, setEditandoInquilino] = useState(false)
  const [inquilinoForm, setInquilinoForm] = useState({ nomeCompleto: '', telefone: '', whatsapp: '' })
  const [editandoContrato, setEditandoContrato] = useState(false)
  const [contratoForm, setContratoForm] = useState({ valorAluguel: '', diaVencimento: '', dataInicio: '', dataFim: '', situacao: '' })
  const [novoPagamentoAberto, setNovoPagamentoAberto] = useState(false)
  const [novoPagamentoValor, setNovoPagamentoValor] = useState('')
  const [novoPagamentoJaRecebido, setNovoPagamentoJaRecebido] = useState(true)
  const [divergenciaPendente, setDivergenciaPendente] = useState(null)
  const [mensagem, setMensagem] = useState(null)

  // Valor esperado do depósito: quando a unidade tem condomínio, o
  // inquilino costuma depositar aluguel + condomínio juntos, num valor só.
  const valorEsperadoDeposito = (Number(contrato?.valorAluguel || 0) + Number(contrato?.valorCondominio || 0)) || null

  useEffect(() => {
    setEditandoInquilino(false)
    setEditandoContrato(false)
    setNovoPagamentoAberto(false)
    setDivergenciaPendente(null)
    setMensagem(null)
    setInquilinoForm({
      nomeCompleto: inquilino?.nomeCompleto || '',
      telefone: inquilino?.telefone || '',
      whatsapp: inquilino?.whatsapp || '',
    })
    setContratoForm({
      valorAluguel: contrato?.valorAluguel ?? '',
      diaVencimento: contrato?.diaVencimento ?? '',
      dataInicio: contrato?.dataInicio || '',
      dataFim: contrato?.dataFim || '',
      situacao: contrato?.situacao || '',
    })
    const esperado = (Number(contrato?.valorAluguel || 0) + Number(contrato?.valorCondominio || 0)) || contrato?.valorAluguel
    setNovoPagamentoValor(esperado ? String(esperado) : '')
  }, [unidade?.id, contrato?.id, inquilino?.id])

  const comissaoDoMes = useMemo(() => {
    if (!contrato?.id) return null
    const detalhes = listarComissoesDetalhadas().filter(
      (item) => item.contratoId === contrato.id && item.dataReferencia?.slice(0, 7) === mesRef,
    )
    if (detalhes.length === 0) return null
    const total = detalhes.reduce((soma, item) => soma + item.valorComissao, 0)
    return { total, percentual: detalhes[0].percentualComissao, imobiliariaNome: detalhes[0].imobiliariaNome }
  }, [contrato?.id, mesRef])

  if (!selecionado) {
    return <Modal open={false} onClose={onClose} />
  }

  const handleSalvarInquilino = () => {
    if (!inquilino) return
    if (!inquilinoForm.nomeCompleto.trim()) {
      setMensagem({ type: 'error', text: 'Nome do inquilino é obrigatório.' })
      return
    }
    atualizarLocatario(inquilino.id, {
      nomeCompleto: inquilinoForm.nomeCompleto.trim(),
      telefone: inquilinoForm.telefone.trim(),
      whatsapp: inquilinoForm.whatsapp.trim(),
    })
    setMensagem({ type: 'success', text: 'Dados do inquilino atualizados.' })
    setEditandoInquilino(false)
    onChanged()
  }

  const handleSalvarContrato = () => {
    if (!contrato) return
    const resultado = atualizarContrato(contrato.id, {
      valorAluguel: contratoForm.valorAluguel === '' ? '' : Number(contratoForm.valorAluguel),
      diaVencimento: contratoForm.diaVencimento === '' ? '' : Number(contratoForm.diaVencimento),
      dataInicio: contratoForm.dataInicio,
      dataFim: contratoForm.dataFim,
      situacao: contratoForm.situacao,
    })
    if (resultado?.error) {
      setMensagem({ type: 'error', text: resultado.error })
      return
    }
    setMensagem({ type: 'success', text: 'Contrato atualizado.' })
    setEditandoContrato(false)
    onChanged()
  }

  const handleMarcarComoPago = (lancamento) => {
    const pendente = calcularSaldoPendente(lancamento.id)
    const valorPrincipal = pendente > 0 ? pendente : Number(lancamento.valor || 0)
    const resultado = registrarBaixa({
      lancamentoId: lancamento.id,
      data: new Date().toISOString().slice(0, 10),
      valorPrincipal,
      contaFinanceiraId: lancamento.contaFinanceiraId || null,
      observacao: 'Marcado como pago via Painel.',
    })
    if (resultado?.error) {
      setMensagem({ type: 'error', text: resultado.error })
      return
    }
    setMensagem({ type: 'success', text: 'Pagamento marcado como pago.' })
    onChanged()
  }

  const handleLancarPagamento = ({ ignorarDivergencia = false } = {}) => {
    if (!unidade) return
    const valorNumero = Number(novoPagamentoValor)
    if (!novoPagamentoValor || Number.isNaN(valorNumero) || valorNumero <= 0) {
      setMensagem({ type: 'error', text: 'Informe um valor válido para o pagamento.' })
      return
    }

    // Muitos inquilinos depositam aluguel + condomínio juntos. Antes de
    // gravar, avisa (sem bloquear) se o valor digitado não bate com o
    // esperado do contrato — pede confirmação explícita em vez de assumir
    // desconto ou multa sozinho.
    if (!ignorarDivergencia) {
      const divergencia = avaliarDivergenciaDeposito(valorNumero, contrato)
      if (divergencia) {
        setDivergenciaPendente(divergencia)
        return
      }
    }
    setDivergenciaPendente(null)

    const parametrosFinanceiros = obterParametrosFinanceiros()
    const hoje = new Date().toISOString().slice(0, 10)
    criarLancamento({
      tipo: 'receita',
      categoria: 'Aluguel',
      descricao: `Aluguel ${formatarMesReferencia ? formatarMesReferencia(mesRef) : mesRef} - ${unidade.nome}`,
      valor: valorNumero,
      dataCompetencia: mesRef,
      dataVencimento: contrato?.diaVencimento ? montarDataVencimentoPorDia(mesRef, contrato.diaVencimento) : null,
      dataPagamento: novoPagamentoJaRecebido ? hoje : null,
      status: novoPagamentoJaRecebido ? 'pago' : 'pendente',
      patrimonioId: unidade.patrimonioId,
      unidadeId: unidade.id,
      contratoId: contrato?.id || null,
      locatarioId: contrato?.locatarioId || inquilino?.id || null,
      contaFinanceiraId: parametrosFinanceiros?.contaFinanceiraPadraoId || '',
    })
    setMensagem({ type: 'success', text: 'Pagamento lançado.' })
    setNovoPagamentoAberto(false)
    onChanged()
  }

  return (
    <Modal open={Boolean(selecionado)} title={unidade?.nome} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {mensagem ? (
          <div className={`alert-box ${mensagem.type === 'success' ? 'alert-success' : 'alert-error'}`}>{mensagem.text}</div>
        ) : null}

        <div>
          <h3 style={{ margin: '0 0 8px' }}>Pagamento — {formatarMesReferencia ? formatarMesReferencia(mesRef) : mesRef}</h3>
          {lancamentos.length === 0 ? (
            <p className="hint" style={{ margin: '0 0 8px' }}>Nenhum lançamento este mês ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
              {lancamentos.map((lancamento) => {
                const statusEfetivo = getStatusEfetivo(lancamento)
                return (
                  <div key={lancamento.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span>{formatarMoeda(lancamento.valor)} — {LABEL_STATUS_LANCAMENTO[statusEfetivo] || statusEfetivo}</span>
                    {['pendente', 'atrasado', 'parcial'].includes(statusEfetivo) ? (
                      <button type="button" className="button button-primary" onClick={() => handleMarcarComoPago(lancamento)}>
                        Marcar como pago
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}

          {novoPagamentoAberto ? (
            <div className="form-grid" style={{ marginTop: 8 }}>
              {valorEsperadoDeposito ? (
                <p className="hint form-field-full" style={{ margin: 0 }}>
                  Valor esperado do depósito (aluguel + condomínio): {formatarMoeda(valorEsperadoDeposito)}
                </p>
              ) : null}
              <div className="form-field">
                <label>Valor recebido</label>
                <CurrencyInput
                  value={novoPagamentoValor}
                  onChange={(valor) => { setNovoPagamentoValor(valor); setDivergenciaPendente(null) }}
                />
              </div>
              <div className="form-field">
                <label>
                  <input
                    type="checkbox"
                    checked={novoPagamentoJaRecebido}
                    onChange={(event) => setNovoPagamentoJaRecebido(event.target.checked)}
                    style={{ marginRight: 6 }}
                  />
                  Já foi recebido
                </label>
              </div>

              {divergenciaPendente ? (
                <div className="alert-box alert-error form-field-full">
                  <p style={{ margin: '0 0 8px' }}>
                    {divergenciaPendente.tipo === 'menor'
                      ? `O valor informado é ${formatarMoeda(divergenciaPendente.diferenca)} menor que o esperado (${formatarMoeda(divergenciaPendente.esperado)}). Houve algum desconto combinado com o inquilino?`
                      : `O valor informado é ${formatarMoeda(divergenciaPendente.diferenca)} maior que o esperado (${formatarMoeda(divergenciaPendente.esperado)}). Pode ser multa por atraso ou outro acréscimo?`}
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="button button-secondary" onClick={() => setDivergenciaPendente(null)}>Vou ajustar o valor</button>
                    <button type="button" className="button button-primary" onClick={() => handleLancarPagamento({ ignorarDivergencia: true })}>Confirmar mesmo assim</button>
                  </div>
                </div>
              ) : (
                <div className="form-field form-field-full" style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="button button-primary" onClick={() => handleLancarPagamento()}>Salvar</button>
                  <button type="button" className="button button-secondary" onClick={() => { setNovoPagamentoAberto(false); setDivergenciaPendente(null) }}>Cancelar</button>
                </div>
              )}
            </div>
          ) : (
            <button type="button" className="button button-secondary" onClick={() => setNovoPagamentoAberto(true)}>
              Lançar pagamento
            </button>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: '0 0 8px' }}>Inquilino</h3>
            {inquilino && !editandoInquilino ? (
              <button type="button" className="small-link-button" onClick={() => setEditandoInquilino(true)}>Editar</button>
            ) : null}
          </div>
          {!inquilino ? (
            <p className="hint">Nenhum inquilino vinculado a esta unidade.</p>
          ) : editandoInquilino ? (
            <div className="form-grid">
              <div className="form-field">
                <label className="required-label">Nome completo</label>
                <input
                  type="text"
                  value={inquilinoForm.nomeCompleto}
                  onChange={(event) => setInquilinoForm((current) => ({ ...current, nomeCompleto: event.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>Telefone</label>
                <input
                  type="text"
                  value={inquilinoForm.telefone}
                  onChange={(event) => setInquilinoForm((current) => ({ ...current, telefone: event.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>WhatsApp</label>
                <input
                  type="text"
                  value={inquilinoForm.whatsapp}
                  onChange={(event) => setInquilinoForm((current) => ({ ...current, whatsapp: event.target.value }))}
                />
              </div>
              <div className="form-field form-field-full" style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="button button-primary" onClick={handleSalvarInquilino}>Salvar</button>
                <button type="button" className="button button-secondary" onClick={() => setEditandoInquilino(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <p>{inquilino.nomeCompleto} {inquilino.telefone ? `• ${inquilino.telefone}` : ''} {inquilino.whatsapp ? `• WhatsApp ${inquilino.whatsapp}` : ''}</p>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: '0 0 8px' }}>Contrato</h3>
            {contrato && !editandoContrato ? (
              <button type="button" className="small-link-button" onClick={() => setEditandoContrato(true)}>Editar</button>
            ) : null}
          </div>
          {!contrato ? (
            <p className="hint">
              Esta unidade não tem contrato ativo. <Link to={`/contratos/novo?unidadeId=${unidade.id}`}>Cadastrar contrato</Link>
            </p>
          ) : editandoContrato ? (
            <div className="form-grid">
              <div className="form-field">
                <label>Valor do aluguel</label>
                <CurrencyInput
                  value={contratoForm.valorAluguel}
                  onChange={(valor) => setContratoForm((current) => ({ ...current, valorAluguel: valor }))}
                />
              </div>
              <div className="form-field">
                <label>Dia de vencimento</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={contratoForm.diaVencimento}
                  onChange={(event) => setContratoForm((current) => ({ ...current, diaVencimento: event.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>Início do contrato</label>
                <input
                  type="date"
                  value={contratoForm.dataInicio}
                  onChange={(event) => setContratoForm((current) => ({ ...current, dataInicio: event.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>Fim do contrato</label>
                <input
                  type="date"
                  value={contratoForm.dataFim}
                  onChange={(event) => setContratoForm((current) => ({ ...current, dataFim: event.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>Situação</label>
                <select
                  value={contratoForm.situacao}
                  onChange={(event) => setContratoForm((current) => ({ ...current, situacao: event.target.value }))}
                >
                  {situacoesContrato.map((situacao) => (
                    <option key={situacao} value={situacao}>{situacao}</option>
                  ))}
                </select>
              </div>
              <div className="form-field form-field-full" style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="button button-primary" onClick={handleSalvarContrato}>Salvar</button>
                <button type="button" className="button button-secondary" onClick={() => setEditandoContrato(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <p>
              Aluguel {formatarMoeda(contrato.valorAluguel)}
              {Number(contrato.valorCondominio || 0) > 0 ? ` + condomínio ${formatarMoeda(contrato.valorCondominio)} = ${formatarMoeda(Number(contrato.valorAluguel || 0) + Number(contrato.valorCondominio || 0))}` : ''}
              {' '}· dia {contrato.diaVencimento || '-'} · {contrato.dataInicio || '-'} até {contrato.dataFim || 'sem fim'} · {contrato.situacao}
            </p>
          )}

          {comissaoDoMes ? (
            <p className="hint" style={{ marginTop: 8 }}>
              Comissão da imobiliária ({comissaoDoMes.imobiliariaNome}, {comissaoDoMes.percentual}%) este mês: {formatarMoeda(comissaoDoMes.total)}
            </p>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <Link className="button button-secondary" to={`/unidades/${unidade.id}`}>Ver unidade completa</Link>
          {contrato ? (
            <Link className="button button-secondary" to={`/contratos/${contrato.id}`}>Ver contrato completo</Link>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
