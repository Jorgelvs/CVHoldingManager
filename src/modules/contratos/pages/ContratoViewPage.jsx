import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { buscarContratoPorId, alterarSituacaoContrato } from '../services/contratoService.js'
import { buscarLocatarioPorId } from '../../locatarios/services/locatarioService.js'
import { buscarUnidadePorId } from '../../unidades/services/unidadeService.js'
import { buscarPatrimonioPorId } from '../../patrimonios/services/patrimonioService.js'
import { buscarImobiliariaPorId } from '../../imobiliarias/services/imobiliariaService.js'
import { buscarDocumentosFiltrados } from '../../documentos/services/documentoService.js'
import { aplicarReajuste, adiarReajuste, marcarReajusteResolvido, renovarContrato, obterReajusteEstimado } from '../services/reajusteService.js'
import ConfirmDialog from '../../patrimonios/components/ConfirmDialog.jsx'
import { formatarData, formatarMoeda } from '../../patrimonios/utils/patrimonioUtils.js'

export default function ContratoViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const veioDeCadastroNovo = Boolean(location.state?.justCreated)
  const [contrato, setContrato] = useState(null)
  const [mensagem, setMensagem] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [manualPercentual, setManualPercentual] = useState('')
  const [observacao, setObservacao] = useState('')

  useEffect(() => {
    if (!id) return
    const found = buscarContratoPorId(id)
    setContrato(found)
  }, [id])

  useEffect(() => {
    if (!contrato) return
    setManualPercentual(contrato.percentualReajuste || '')
  }, [contrato])

  const recarregarContrato = () => {
    const found = buscarContratoPorId(id)
    setContrato(found)
  }

  const handleAction = (acao) => {
    setConfirm({ acao })
  }

  const handleConfirm = () => {
    if (!confirm || !contrato) return
    let resultado = null
    let mensagemAcao = ''

    switch (confirm.acao) {
      case 'aplicar':
        resultado = aplicarReajuste(
          contrato,
          manualPercentual !== '' ? Number(manualPercentual) : null,
          observacao,
        )
        mensagemAcao = 'Reajuste aplicado com sucesso.'
        break
      case 'adiar':
        resultado = adiarReajuste(contrato)
        mensagemAcao = 'Próxima data de reajuste adiada em 30 dias.'
        break
      case 'resolver':
        resultado = marcarReajusteResolvido(contrato)
        mensagemAcao = 'Reajuste marcado como resolvido.'
        break
      case 'renovar':
        // Pedido do usuário: renovar sempre por 12 meses a partir de hoje,
        // em vez de reaproveitar o prazoMeses original do contrato (que
        // pode ser qualquer valor, ex.: 11 meses num contrato anterior).
        resultado = renovarContrato(contrato, 12)
        mensagemAcao = 'Contrato renovado por mais 12 meses.'
        break
      case 'encerrar':
        resultado = alterarSituacaoContrato(contrato.id, 'Encerrado')
        mensagemAcao = 'Contrato encerrado com sucesso.'
        break
      default:
        break
    }

    if (resultado?.error) {
      setMensagem({ type: 'error', text: resultado.error })
    } else if (resultado) {
      setMensagem({ type: 'success', text: mensagemAcao })
      if (confirm.acao === 'aplicar') {
        setObservacao('')
      }
      recarregarContrato()
    } else {
      setMensagem({ type: 'error', text: 'Não foi possível executar a ação.' })
    }

    setConfirm(null)
  }

  if (!contrato) {
    return (
      <div className="page-content">
        <div className="page-header">
          <h1>Contrato não encontrado</h1>
        </div>
        <p>O contrato solicitado não foi localizado.</p>
      </div>
    )
  }

  const locatario = buscarLocatarioPorId(contrato.locatarioId)
  const unidade = buscarUnidadePorId(contrato.unidadeId)
  const patrimonio = buscarPatrimonioPorId(contrato.patrimonioId)
  const imobiliaria = contrato.imobiliariaId ? buscarImobiliariaPorId(contrato.imobiliariaId) : null
  const documentoContrato = buscarDocumentosFiltrados({ contratoId: contrato.id, categoria: 'Contratos' })[0] || null
  const reajusteEstimado = obterReajusteEstimado(contrato)
  const exibeAcoesReajuste = contrato.situacao === 'Ativo' && contrato.reajusteTipo && contrato.reajusteTipo !== 'Sem reajuste'
  // Não existe uma situação "Vencido" separada — um contrato permanece
  // "Ativo" indefinidamente mesmo depois que a data de fim passa (situação
  // é um campo manual, não recalculado automaticamente). Este cálculo só
  // detecta o vencimento para destacar visualmente o botão "Renovar" nesses
  // casos, sem mudar o dado em si.
  const hojeIso = new Date().toISOString().slice(0, 10)
  const contratoVencido = contrato.situacao === 'Ativo' && Boolean(contrato.dataFim) && contrato.dataFim < hojeIso

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Detalhes do contrato.</p>
          <h1>{contrato.codigoInterno}</h1>
          <p>{contrato.situacao}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="button button-secondary" to={`/auditoria?modulo=Contratos&registroId=${contrato.id}`}>
            Ver histórico
          </Link>
          {veioDeCadastroNovo ? (
            <>
              <button className="button button-secondary" type="button" onClick={() => navigate('/contratos')}>
                Ver lista de contratos
              </button>
              <button className="button button-primary" type="button" onClick={() => navigate('/contratos/novo')}>
                Cadastrar novo contrato
              </button>
            </>
          ) : (
            <button className="button button-secondary" type="button" onClick={() => navigate(-1)}>
              Voltar
            </button>
          )}
        </div>
      </div>

      {mensagem ? (
        <div className={`alert-box ${mensagem.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {mensagem.text}
        </div>
      ) : null}

      {contratoVencido ? (
        <div className="alert-box alert-error">
          Este contrato venceu em {formatarData(contrato.dataFim)}. Use o botão "Renovar contrato" abaixo para atualizar o prazo por mais 12 meses.
        </div>
      ) : null}

      <div className="summary-details">
        <div className="summary-card">
          <h2>Identificação</h2>
          <dl>
            <dt>Código interno</dt><dd>{contrato.codigoInterno}</dd>
            <dt>Situação</dt><dd>{contrato.situacao}</dd>
            <dt>Criado em</dt><dd>{formatarData(contrato.createdAt)}</dd>
            <dt>Atualizado em</dt><dd>{formatarData(contrato.updatedAt)}</dd>
          </dl>
        </div>

        <div className="summary-card">
          <h2>Partes</h2>
          <dl>
            <dt>Locatário</dt><dd>{locatario?.nomeCompleto || 'Não informado'}</dd>
            <dt>Unidade</dt><dd>{unidade?.nome || 'Não informado'}</dd>
            <dt>Patrimônio</dt><dd>{patrimonio?.nome || 'Não informado'}</dd>
            <dt>Imobiliária</dt><dd>{imobiliaria ? `${imobiliaria.nome} (${Number(imobiliaria.percentualComissao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%)` : 'Sem imobiliária'}</dd>
          </dl>
        </div>

        <div className="summary-card">
          <h2>Documento do contrato</h2>
          {documentoContrato?.arquivo?.url ? (
            <p>
              <a href={documentoContrato.arquivo.url} target="_blank" rel="noopener noreferrer" download={documentoContrato.arquivo.filename}>
                {documentoContrato.arquivo.filename || 'Baixar arquivo'}
              </a>
            </p>
          ) : (
            <p>
              Nenhum arquivo anexado.{' '}
              <Link to={`/contratos/${contrato.id}/editar`}>Anexar agora</Link>
            </p>
          )}
        </div>

        <div className="summary-card">
          <h2>Vigência</h2>
          <dl>
            <dt>Data de início</dt><dd>{formatarData(contrato.dataInicio) || 'Não informado'}</dd>
            <dt>Data de fim</dt><dd>{formatarData(contrato.dataFim) || 'Não informado'}</dd>
            <dt>Dia de vencimento</dt><dd>{contrato.diaVencimento || 'Não informado'}</dd>
            <dt>Prazo (meses)</dt><dd>{contrato.prazoMeses || 'Não informado'}</dd>
          </dl>
        </div>

        <div className="summary-card">
          <h2>Valores</h2>
          <dl>
            <dt>Aluguel</dt><dd>{formatarMoeda(contrato.valorAluguel || 0)}</dd>
            <dt>Condomínio</dt><dd>{formatarMoeda(contrato.valorCondominio || 0)}</dd>
            <dt>Caução</dt><dd>{formatarMoeda(contrato.valorCaucao || 0)}</dd>
          </dl>
        </div>

        <div className="summary-card">
          <h2>Reajuste</h2>
          <dl>
            <dt>Tipo</dt><dd>{contrato.reajusteTipo}</dd>
            <dt>Índice</dt><dd>{contrato.indiceReajuste}</dd>
            <dt>Periodicidade</dt><dd>{contrato.periodicidadeReajuste || 'Não informado'}</dd>
            <dt>Percentual</dt><dd>{contrato.percentualReajuste ? `${contrato.percentualReajuste}%` : 'Não informado'}</dd>
            <dt>Data base</dt><dd>{formatarData(contrato.dataBaseReajuste) || 'Não informado'}</dd>
            <dt>Próxima data</dt><dd>{formatarData(contrato.proximaDataReajuste) || formatarData(contrato.dataBaseReajuste) || 'Não informado'}</dd>
          </dl>
        </div>

        <div className="summary-card">
          <h2>Observações</h2>
          <p>{contrato.observacoes || 'Sem observações.'}</p>
        </div>
      </div>

      <div className="summary-card">
        <div className="section-header">
          <strong>Estimativa de reajuste</strong>
          <span style={{ color: 'var(--text)' }}>Percentual e valores</span>
        </div>
        {exibeAcoesReajuste && reajusteEstimado ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <div><strong>Percentual automático</strong></div>
              <div>{`${reajusteEstimado.percentualReajuste}%`}</div>
            </div>
            <div>
              <div><strong>Valor anterior</strong></div>
              <div>{formatarMoeda(reajusteEstimado.valorAnterior)}</div>
            </div>
            <div>
              <div><strong>Novo valor</strong></div>
              <div>{formatarMoeda(reajusteEstimado.novoValor)}</div>
            </div>
            <div>
              <div><strong>Próxima data de reajuste</strong></div>
              <div>{formatarData(reajusteEstimado.proximaDataReajuste) || 'Não informado'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="form-field">
                <span>Ajuste manual (%)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualPercentual}
                  onChange={(event) => setManualPercentual(event.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Observação do reajuste</span>
                <input
                  type="text"
                  value={observacao}
                  onChange={(event) => setObservacao(event.target.value)}
                  placeholder="Ex: valor alinhado com contrato"
                />
              </label>
            </div>
          </div>
        ) : (
          <p>Este contrato não possui reajuste configurado ou está encerrado.</p>
        )}
      </div>

      <div className="summary-card">
        <div className="section-header">
          <strong>Ações de reajuste</strong>
          <span style={{ color: 'var(--text)' }}>Confirme antes de aplicar</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {exibeAcoesReajuste ? (
            <>
              <button className="button button-primary" type="button" onClick={() => handleAction('aplicar')}>
                Aplicar reajuste
              </button>
              <button className="button button-secondary" type="button" onClick={() => handleAction('adiar')}>
                Adiar reajuste 30 dias
              </button>
              <button className="button button-secondary" type="button" onClick={() => handleAction('resolver')}>
                Marcar como resolvido
              </button>
            </>
          ) : null}
          {contrato.situacao === 'Ativo' ? (
            <>
              <button
                className={contratoVencido ? 'button button-primary' : 'button button-secondary'}
                type="button"
                onClick={() => handleAction('renovar')}
              >
                Renovar contrato{contratoVencido ? ' (vencido)' : ''}
              </button>
              <button className="button button-danger" type="button" onClick={() => handleAction('encerrar')}>
                Encerrar contrato
              </button>
            </>
          ) : null}
          {contrato.situacao !== 'Ativo' ? <div>Contrato não está ativo para ações de reajuste.</div> : null}
        </div>
      </div>

      <div className="summary-card">
        <div className="section-header">
          <strong>Histórico de reajustes</strong>
          <span style={{ color: 'var(--text)' }}>Registros persistidos</span>
        </div>
        {Array.isArray(contrato.historicoReajustes) && contrato.historicoReajustes.length > 0 ? (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Percentual</th>
                  <th>Valor anterior</th>
                  <th>Novo valor</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {contrato.historicoReajustes.map((item) => (
                  <tr key={item.id || `${item.data}-${item.percentual}` }>
                    <td>{formatarData(item.data)}</td>
                    <td>{`${item.percentual}%`}</td>
                    <td>{formatarMoeda(item.valorAnterior)}</td>
                    <td>{formatarMoeda(item.novoValor)}</td>
                    <td>{item.observacao || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Nenhum reajuste registrado para este contrato.</p>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.acao === 'encerrar'
            ? 'Encerrar contrato'
            : confirm?.acao === 'aplicar'
            ? 'Aplicar reajuste'
            : confirm?.acao === 'adiar'
            ? 'Adiar reajuste'
            : confirm?.acao === 'resolver'
            ? 'Marcar reajuste'
            : 'Renovar contrato'
        }
        message={
          confirm?.acao === 'encerrar'
            ? 'Tem certeza de que deseja encerrar este contrato?'
            : confirm?.acao === 'aplicar'
            ? 'Confirma aplicar o reajuste com os dados informados?'
            : confirm?.acao === 'adiar'
            ? 'Confirma adiar o próximo reajuste em 30 dias?'
            : confirm?.acao === 'resolver'
            ? 'Confirma marcar o reajuste como resolvido?'
            : 'Confirma renovar o contrato por mais 12 meses a partir de hoje? A data de início e a data de fim serão atualizadas automaticamente.'
        }
        confirmLabel={confirm?.acao === 'encerrar' ? 'Encerrar' : confirm?.acao === 'aplicar' ? 'Aplicar' : 'Confirmar'}
        cancelLabel="Cancelar"
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
