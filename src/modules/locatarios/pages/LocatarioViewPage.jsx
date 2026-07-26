import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { buscarLocatarioPorId } from '../services/locatarioService.js'
import { listarContratosPorLocatario } from '../../contratos/services/contratoService.js'
import { buscarContratoPorId } from '../../contratos/services/contratoService.js'
import { buscarUnidadePorId } from '../../unidades/services/unidadeService.js'
import { buscarPatrimonioPorId } from '../../patrimonios/services/patrimonioService.js'
import { formatarMoeda, formatarData } from '../../patrimonios/utils/patrimonioUtils.js'
import Tabs from '../../patrimonios/components/Tabs.jsx'

const tabItems = [
  { id: 'dados', label: 'Dados' },
  { id: 'contratos', label: 'Contratos' },
]

export default function LocatarioViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const locatario = buscarLocatarioPorId(id)
  const [activeTab, setActiveTab] = useState('dados')

  const contratos = useMemo(() => listarContratosPorLocatario(id), [id])

  if (!locatario) {
    return (
      <div className="page-content">
        <div className="page-header">
          <h1>Locatário não encontrado</h1>
        </div>
        <p>O locatário solicitado não foi localizado.</p>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Detalhes do locatário.</p>
          <h1>{locatario.nomeCompleto}</h1>
          <p>{locatario.cpf || '-'} • {locatario.telefone || '-'} • {locatario.whatsapp || '-'}</p>
        </div>
        <button className="button button-secondary" type="button" onClick={() => navigate(-1)}>
          Voltar
        </button>
      </div>

      <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === 'dados' && (
        <div className="summary-details">
          <div className="summary-card">
            <h2>Dados pessoais</h2>
            <dl>
              <dt>Nome completo</dt><dd>{locatario.nomeCompleto}</dd>
              <dt>CPF</dt><dd>{locatario.cpf || 'Não informado'}</dd>
              <dt>RG</dt><dd>{locatario.rg || 'Não informado'}</dd>
              <dt>Data de nascimento</dt><dd>{locatario.dataNascimento || 'Não informado'}</dd>
              <dt>Situação</dt><dd>{locatario.situacao}</dd>
            </dl>
          </div>

          <div className="summary-card">
            <h2>Contato</h2>
            <dl>
              <dt>Telefone</dt><dd>{locatario.telefone || 'Não informado'}</dd>
              <dt>WhatsApp</dt><dd>{locatario.whatsapp || 'Não informado'}</dd>
              <dt>E-mail</dt><dd>{locatario.email || 'Não informado'}</dd>
            </dl>
          </div>

          <div className="summary-card">
            <h2>Endereço</h2>
            <dl>
              <dt>Endereço</dt><dd>{locatario.endereco || 'Não informado'}</dd>
              <dt>Número</dt><dd>{locatario.numero || 'Não informado'}</dd>
              <dt>Complemento</dt><dd>{locatario.complemento || 'Não informado'}</dd>
              <dt>Bairro</dt><dd>{locatario.bairro || 'Não informado'}</dd>
              <dt>Cidade</dt><dd>{locatario.cidade || 'Não informado'}</dd>
              <dt>Estado</dt><dd>{locatario.estado || 'Não informado'}</dd>
              <dt>CEP</dt><dd>{locatario.cep || 'Não informado'}</dd>
            </dl>
          </div>

          <div className="summary-card">
            <h2>Dados do pagador</h2>
            <dl>
              <dt>Nome do pagador</dt><dd>{locatario.nomePagador || 'Não informado'}</dd>
              <dt>CPF do pagador</dt><dd>{locatario.cpfPagador || 'Não informado'}</dd>
              <dt>Telefone do pagador</dt><dd>{locatario.telefonePagador || 'Não informado'}</dd>
            </dl>
          </div>

          <div className="summary-card">
            <h2>Observações</h2>
            <p>{locatario.observacoes || 'Sem observações.'}</p>
          </div>
        </div>
      )}

      {activeTab === 'contratos' && (
        <div className="table-wrapper">
          {contratos.length === 0 ? (
            <p>Este locatário não possui contratos vinculados.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Patrimônio</th>
                  <th>Unidade</th>
                  <th>Situação</th>
                  <th>Vigência</th>
                </tr>
              </thead>
              <tbody>
                {contratos.map((contrato) => {
                  const unidade = buscarUnidadePorId(contrato.unidadeId)
                  const patrimonio = buscarPatrimonioPorId(contrato.patrimonioId)
                  return (
                    <tr key={contrato.id}>
                      <td>{contrato.codigoInterno}</td>
                      <td>{patrimonio?.nome || 'N/A'}</td>
                      <td>{unidade?.nome || 'N/A'}</td>
                      <td>{contrato.situacao}</td>
                      <td>{contrato.dataInicio || '-'} até {contrato.dataFim || 'sem fim'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
