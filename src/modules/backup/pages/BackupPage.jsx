import React, { useMemo, useState } from 'react'
import {
  BACKUP_MODULOS,
  analisarCsvLancamentos,
  gerarEstruturaBackup,
  gerarNomeArquivoBackup,
  gerarResumoBackup,
  importarLancamentosCsv,
  restaurarBackup,
  validarEstruturaBackup,
} from '../services/backupService.js'

const MODULOS_IDS = BACKUP_MODULOS.map((item) => item.id)

function resumoTexto(resumo) {
  const entries = Object.entries(resumo || {})
  if (entries.length === 0) return '-'
  return entries.map(([key, value]) => `${key}: ${Number(value) || 0}`).join(' | ')
}

function ProgressBar({ value }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div style={{ width: '100%', background: 'var(--bg-muted)', borderRadius: 8, height: 8 }}>
      <div style={{ width: `${safe}%`, height: 8, borderRadius: 8, background: 'var(--accent)' }} />
    </div>
  )
}

export default function BackupPage() {
  const [modulosSelecionados, setModulosSelecionados] = useState(MODULOS_IDS)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  const [arquivoBackup, setArquivoBackup] = useState(null)
  const [backupLido, setBackupLido] = useState(null)
  const [modulosRestoreSelecionados, setModulosRestoreSelecionados] = useState([])
  const [modoRestore, setModoRestore] = useState('merge')
  const [progressoRestore, setProgressoRestore] = useState(0)

  const [csvAnalise, setCsvAnalise] = useState(null)
  const [progressoCsv, setProgressoCsv] = useState(0)

  const resumoBackupLido = useMemo(() => gerarResumoBackup(backupLido || {}), [backupLido])

  const toggleModulo = (id) => {
    setModulosSelecionados((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id)
      return [...current, id]
    })
  }

  const toggleModuloRestore = (id) => {
    setModulosRestoreSelecionados((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id)
      return [...current, id]
    })
  }

  const selecionarTodos = () => setModulosSelecionados(MODULOS_IDS)

  const exportarBackup = () => {
    setErro('')
    setMensagem('')

    if (modulosSelecionados.length === 0) {
      setErro('Selecione ao menos um modulo para exportar.')
      return
    }

    const payload = gerarEstruturaBackup(modulosSelecionados)
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = gerarNomeArquivoBackup(modulosSelecionados.length === MODULOS_IDS.length ? 'cvholding-backup-completo' : 'cvholding-backup-parcial')
    a.click()
    URL.revokeObjectURL(url)

    setMensagem('Backup gerado com sucesso.')
  }

  const handleArquivoBackup = async (event) => {
    setErro('')
    setMensagem('')
    setBackupLido(null)
    setArquivoBackup(null)

    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const validacao = validarEstruturaBackup(payload)
      if (!validacao.valido) {
        setErro(validacao.erro || 'Arquivo de backup invalido.')
        return
      }

      setArquivoBackup(file)
      setBackupLido(payload)
      setModulosRestoreSelecionados(payload.modules || [])
      setMensagem('Arquivo de backup validado com sucesso. Confira o resumo antes de restaurar.')
    } catch {
      setErro('Nao foi possivel ler o arquivo de backup.')
    }
  }

  const confirmarRestore = async () => {
    setErro('')
    setMensagem('')
    setProgressoRestore(0)

    if (!backupLido) {
      setErro('Selecione um arquivo de backup valido.')
      return
    }

    if (modulosRestoreSelecionados.length === 0) {
      setErro('Selecione ao menos um modulo para restaurar.')
      return
    }

    const ok = window.confirm(
      modoRestore === 'substituir'
        ? 'Confirma restauracao em modo SUBSTITUIR? Os dados dos modulos selecionados serao sobrescritos.'
        : 'Confirma restauracao em modo MESCLAR? Os dados atuais serao preservados quando nao houver conflito de ID.',
    )
    if (!ok) return

    const resultado = await restaurarBackup(backupLido, {
      modo: modoRestore,
      modulos: modulosRestoreSelecionados,
      onProgress: (pct) => setProgressoRestore(pct),
    })

    if (resultado?.error) {
      setErro(resultado.error)
      return
    }

    setMensagem(`Restauracao concluida (${modoRestore}). Modulos: ${modulosRestoreSelecionados.join(', ')}.`)
  }

  const handleCsv = async (event) => {
    setErro('')
    setMensagem('')
    setCsvAnalise(null)

    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const analise = analisarCsvLancamentos(text)
      if (analise?.error) {
        setErro(analise.error)
        return
      }
      setCsvAnalise(analise)
      if ((analise.invalidos || []).length > 0) {
        setMensagem('CSV analisado com inconsistencias. Corrija os erros ou importe apenas os registros validos.')
      } else {
        setMensagem('CSV analisado com sucesso.')
      }
    } catch {
      setErro('Falha ao processar CSV.')
    }
  }

  const importarCsv = async () => {
    setErro('')
    setMensagem('')
    setProgressoCsv(0)

    if (!csvAnalise) {
      setErro('Carregue um CSV antes de importar.')
      return
    }

    const totalValidos = csvAnalise.validos?.length || 0
    if (totalValidos === 0) {
      setErro('Nao ha registros validos para importar.')
      return
    }

    const ok = window.confirm(`Confirmar importacao de ${totalValidos} registro(s) valido(s)?`)
    if (!ok) return

    const result = await importarLancamentosCsv(csvAnalise.preview, {
      onProgress: (pct) => setProgressoCsv(pct),
    })

    if (result?.error) {
      setErro(result.error)
      return
    }

    const qtdSucesso = result?.criados?.length || 0
    const qtdErros = result?.erros?.length || 0
    setMensagem(`Importacao concluida. Sucesso: ${qtdSucesso}. Erros: ${qtdErros}.`)
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <p className="page-subtitle">Seguranca de dados: backup completo/parcial, restauracao e importacao financeira.</p>
          <h1>Backup</h1>
        </div>
      </div>

      {mensagem ? <div className="alert-box alert-success">{mensagem}</div> : null}
      {erro ? <div className="alert-box alert-error">{erro}</div> : null}

      <div className="summary-card">
        <h2>1) Backup completo ou parcial (JSON)</h2>
        <p>Selecione os modulos para exportacao. Para backup completo, mantenha todos selecionados.</p>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {BACKUP_MODULOS.map((modulo) => (
            <label key={modulo.id} className="form-field" style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={modulosSelecionados.includes(modulo.id)}
                onChange={() => toggleModulo(modulo.id)}
              />
              <span>{modulo.nome}</span>
            </label>
          ))}
        </div>
        <div className="details-actions" style={{ marginTop: 12 }}>
          <button type="button" className="button button-secondary" onClick={selecionarTodos}>Selecionar todos</button>
          <button type="button" className="button button-primary" onClick={exportarBackup}>Gerar backup JSON</button>
        </div>
      </div>

      <div className="summary-card">
        <h2>2) Restauracao de backup</h2>
        <p>Importe um arquivo JSON de backup, revise o resumo e confirme o modo de restauracao.</p>
        <div className="form-grid">
          <label className="form-field">
            <span>Arquivo de backup (.json)</span>
            <input type="file" accept="application/json" onChange={handleArquivoBackup} />
          </label>
          <label className="form-field">
            <span>Modo de restauracao</span>
            <select value={modoRestore} onChange={(e) => setModoRestore(e.target.value)}>
              <option value="merge">Mesclar dados</option>
              <option value="substituir">Substituir dados</option>
            </select>
          </label>
        </div>

        {backupLido ? (
          <>
            <div className="summary-card" style={{ marginTop: 12 }}>
              <p><strong>Arquivo:</strong> {arquivoBackup?.name || '-'}</p>
              <p><strong>Versao app:</strong> {backupLido?.metadata?.appVersion || '-'}</p>
              <p><strong>Versao:</strong> {backupLido?.metadata?.backupVersion || '-'}</p>
              <p><strong>Gerado em:</strong> {backupLido?.metadata?.generatedAt || '-'}</p>
              <p><strong>Resumo:</strong> {resumoTexto(resumoBackupLido)}</p>
            </div>

            <h3 style={{ marginTop: 12 }}>Modulos para restaurar</h3>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              {(backupLido.modules || []).map((moduloId) => {
                const modulo = BACKUP_MODULOS.find((item) => item.id === moduloId)
                return (
                  <label key={moduloId} className="form-field" style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={modulosRestoreSelecionados.includes(moduloId)}
                      onChange={() => toggleModuloRestore(moduloId)}
                    />
                    <span>{modulo?.nome || moduloId}</span>
                  </label>
                )
              })}
            </div>

            <div style={{ marginTop: 12 }}>
              <ProgressBar value={progressoRestore} />
            </div>

            <div className="details-actions" style={{ marginTop: 12 }}>
              <button type="button" className="button button-primary" onClick={confirmarRestore}>Restaurar backup</button>
            </div>
          </>
        ) : null}
      </div>

      <div className="summary-card">
        <h2>3) Importacao de lancamentos financeiros (CSV)</h2>
        <p>Formato esperado: tipo, categoria, descricao, valor, dataCompetencia, dataVencimento, status (opcional), patrimonioId, unidadeId, contaFinanceiraId, observacoes.</p>

        <div className="form-grid">
          <label className="form-field">
            <span>Arquivo CSV</span>
            <input type="file" accept=".csv,text/csv" onChange={handleCsv} />
          </label>
        </div>

        {csvAnalise ? (
          <>
            <p style={{ marginTop: 12 }}>
              Total: {csvAnalise.totalLinhas || 0} | Validos: {(csvAnalise.validos || []).length} | Invalidos: {(csvAnalise.invalidos || []).length}
            </p>

            <div style={{ marginTop: 12 }}>
              <ProgressBar value={progressoCsv} />
            </div>

            {csvAnalise.invalidos?.length > 0 ? (
              <div className="table-wrapper" style={{ marginTop: 12 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Linha</th>
                      <th>Erros</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvAnalise.invalidos.map((item) => (
                      <tr key={`erro-${item.linha}`}>
                        <td>{item.linha}</td>
                        <td>{(item.erros || []).join('; ') || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="table-wrapper" style={{ marginTop: 12 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Tipo</th>
                    <th>Categoria</th>
                    <th>Descricao</th>
                    <th>Valor</th>
                    <th>Competencia</th>
                    <th>Vencimento</th>
                    <th>Valido</th>
                  </tr>
                </thead>
                <tbody>
                  {csvAnalise.preview.slice(0, 15).map((row) => (
                    <tr key={`preview-${row.linha}`}>
                      <td>{row.linha}</td>
                      <td>{row.tipo || '-'}</td>
                      <td>{row.categoria || '-'}</td>
                      <td>{row.descricao || '-'}</td>
                      <td>{Number(row.valor || 0).toFixed(2)}</td>
                      <td>{row.dataCompetencia || '-'}</td>
                      <td>{row.dataVencimento || '-'}</td>
                      <td>{row.valido ? 'Sim' : 'Nao'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="details-actions" style={{ marginTop: 12 }}>
              <button type="button" className="button button-primary" onClick={importarCsv}>Importar registros validos</button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
