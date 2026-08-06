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
import { CORE_ENTITY_KEYS, STORAGE_KEY_LABELS } from '../../../infrastructure/persistence/persistenceConstants.js'
import {
  confirmAndSetPersistenceMode,
  getPersistenceMode,
  isLocalModeSelectable,
} from '../../../infrastructure/persistence/modeService.js'
import {
  analisarMigracaoLocalParaSupabase,
  migrarLocalParaSupabase,
  obterUltimoRelatorioMigracao,
} from '../services/supabaseMigrationService.js'
import { isSupabaseHomologationOnly } from '../../../infrastructure/supabase/client.js'
import {
  criarDadosDescartaveisSupabase,
  criarLancamentoTeste20Supabase,
  limparDadosDescartaveisSupabase,
  coletarEvidenciasSupabaseHomologacao,
} from '../services/supabaseHomologationDataService.js'
import {
  testarConexaoSupabaseHomologacao,
  testarConcorrenciaSupabaseHomologacao,
  validarPrerequisitosSupabase,
} from '../services/supabaseConnectionDiagnosticService.js'

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
  const [modoPersistencia, setModoPersistencia] = useState(() => getPersistenceMode())
  const [migracaoResumo, setMigracaoResumo] = useState(() => obterUltimoRelatorioMigracao())
  const [migrando, setMigrando] = useState(false)
  const [permitirSobrescreverConflitos, setPermitirSobrescreverConflitos] = useState(false)
  const homologationOnly = isSupabaseHomologationOnly()
  const [resultadoHomologacao, setResultadoHomologacao] = useState(null)
  const [diagnosticoConexao, setDiagnosticoConexao] = useState(null)
  const [diagnosticoConcorrencia, setDiagnosticoConcorrencia] = useState(null)
  const [evidencias, setEvidencias] = useState(null)
  const prerequisitos = validarPrerequisitosSupabase()
  const localSelectable = isLocalModeSelectable()

  const resumoBackupLido = useMemo(() => gerarResumoBackup(backupLido || {}), [backupLido])

  const mudarModoPersistencia = (modo) => {
    const resultado = confirmAndSetPersistenceMode(modo)
    if (resultado.error) {
      setErro(resultado.error)
      return
    }
    if (!resultado.changed) {
      setModoPersistencia(resultado.mode)
      return
    }

    setModoPersistencia(resultado.mode)
    window.location.reload()
  }

  const analisarMigracao = async () => {
    setErro('')
    setMensagem('')

    const resultado = await analisarMigracaoLocalParaSupabase({ keys: CORE_ENTITY_KEYS })
    setMigracaoResumo(resultado)

    if (resultado.remoteError) {
      setErro(`Falha ao ler dados remotos: ${resultado.remoteError}`)
      return
    }

    setMensagem('Resumo de migracao gerado. Revise conflitos e total de registros antes de migrar.')
  }

  const executarMigracao = async () => {
    setErro('')
    setMensagem('')

    if (homologationOnly) {
      setErro('Migracao de envio bloqueada neste ambiente de homologacao. Use apenas o resumo de migracao.')
      return
    }

    const confirmar = window.confirm(
      permitirSobrescreverConflitos
        ? 'Confirmar migracao para Supabase com sobrescrita de conflitos?'
        : 'Confirmar migracao para Supabase sem sobrescrever conflitos?',
    )
    if (!confirmar) return

    setMigrando(true)
    const resultado = await migrarLocalParaSupabase({
      keys: CORE_ENTITY_KEYS,
      allowOverwrite: permitirSobrescreverConflitos,
      dryRun: false,
      withBackup: true,
    })
    setMigrando(false)
    setMigracaoResumo(resultado.summary)

    if (resultado.errors.length > 0) {
      setErro(`Migracao finalizada com erros (${resultado.errors.length}). Revise o resumo abaixo.`)
    } else {
      setMensagem(
        `Migracao concluida. Enviados: ${resultado.sent.length}. Ignorados: ${resultado.skipped.length}. Backup local: ${resultado.backup?.backupKey || '-'}.`,
      )
    }
  }

  const criarDadosHomologacao = () => {
    setErro('')
    setMensagem('')
    const resultado = criarDadosDescartaveisSupabase()
    if (resultado.error) {
      setErro(resultado.error)
      return
    }
    setResultadoHomologacao(resultado)
    setMensagem('Dados descartaveis de homologacao criados/confirmados no Supabase.')
  }

  const limparDadosHomologacao = () => {
    setErro('')
    setMensagem('')
    const resultado = limparDadosDescartaveisSupabase()
    if (resultado.error) {
      setErro(resultado.error)
      return
    }
    setResultadoHomologacao(null)
    setMensagem(
      `Dados descartaveis removidos: patrimonios ${resultado.removidos?.patrimonios || 0}, unidades ${resultado.removidos?.unidades || 0}, contas ${resultado.removidos?.contas || 0}, lancamentos ${resultado.removidos?.lancamentos || 0}.`,
    )
  }

  const criarLancamento20 = () => {
    setErro('')
    setMensagem('')
    const resultado = criarLancamentoTeste20Supabase()
    if (resultado.error) {
      setErro(resultado.error)
      return
    }
    setMensagem(resultado.jaExistia
      ? 'Lancamento de R$ 20,00 ja existia no Supabase de homologacao.'
      : 'Lancamento de R$ 20,00 criado no Supabase de homologacao.')
  }

  const testarConexaoSupabase = async () => {
    setErro('')
    setMensagem('')
    const resultado = await testarConexaoSupabaseHomologacao()
    setDiagnosticoConexao(resultado)
    if (!resultado.ok) {
      setErro(resultado.error || 'Falha no diagnostico de conexao Supabase.')
      return
    }
    setMensagem('Diagnostico de conexao Supabase concluido com sucesso.')
  }

  const testarConcorrenciaSupabase = async () => {
    setErro('')
    setMensagem('')
    const resultado = await testarConcorrenciaSupabaseHomologacao()
    setDiagnosticoConcorrencia(resultado)
    if (!resultado.ok) {
      setErro(resultado.error || 'Falha no teste de concorrencia.')
      return
    }
    setMensagem('Teste de concorrencia concluido com deteccao explicita de conflito.')
  }

  const coletarEvidencias = async () => {
    setErro('')
    setMensagem('')
    const resultado = await coletarEvidenciasSupabaseHomologacao()
    if (resultado.error) {
      setErro(resultado.error)
      return
    }
    setEvidencias(resultado)
    setMensagem('Evidencias de homologacao coletadas para o escopo atual.')
  }

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
        <h2>0) Fonte de persistencia e migracao para Supabase</h2>
        <p>Os dados nao sao misturados silenciosamente. Escolha explicitamente a fonte ativa.</p>
        <div className="summary-card" style={{ marginTop: 8 }}>
          <p><strong>Pre-requisitos:</strong></p>
          <p>Schema aplicado: validado no teste de conexao (leitura/escrita/remocao da tabela).</p>
          <p>VITE_SUPABASE_URL: {prerequisitos.hasUrl ? 'presente' : 'ausente'}</p>
          <p>VITE_SUPABASE_ANON_KEY: {prerequisitos.hasAnonKey ? 'presente' : 'ausente'}</p>
          <p>Projeto Supabase: {prerequisitos.projectHost || '-'}</p>
          <p>environment_scope: {prerequisitos.environmentScope}</p>
          <p>owner_id: {prerequisitos.ownerId}</p>
          <p>autenticacao obrigatoria: {prerequisitos.authRequired ? 'sim' : 'nao (homologacao)'}</p>
          <p>usuario autenticado: {prerequisitos.authenticatedUserId || '-'}</p>
          <p>acesso permitido ao Supabase: {prerequisitos.canAccessData ? 'sim' : `nao (${prerequisitos.accessReason || 'sem sessao'})`}</p>
          <p>instance_id (dispositivo atual): {prerequisitos.instanceId}</p>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <label className="form-field">
            <span>Modo de persistencia atual</span>
            <select value={modoPersistencia} onChange={(event) => mudarModoPersistencia(event.target.value)}>
              <option value="local" disabled={!localSelectable}>local</option>
              <option value="supabase">supabase</option>
            </select>
            {!localSelectable ? (
              <small style={{ marginTop: 6, color: 'var(--text)' }}>
                Em producao, o modo Local fica desabilitado para evitar mistura de dados.
              </small>
            ) : null}
          </label>
          <div className="form-field" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="button button-secondary" onClick={analisarMigracao}>Gerar resumo de migracao</button>
          </div>
        </div>

        <div className="details-actions" style={{ marginTop: 8 }}>
          <button type="button" className="button button-secondary" onClick={testarConexaoSupabase}>Testar conexao Supabase</button>
          <button type="button" className="button button-secondary" onClick={testarConcorrenciaSupabase}>Testar concorrencia</button>
          <button type="button" className="button button-secondary" onClick={coletarEvidencias}>Coletar evidencias</button>
        </div>

        {diagnosticoConexao?.stages?.length ? (
          <div className="table-wrapper" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Etapa conexao</th>
                  <th>Status</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {diagnosticoConexao.stages.map((item) => (
                  <tr key={`${item.name}-${item.timestamp}`}>
                    <td>{item.name}</td>
                    <td>{item.ok ? 'OK' : 'FALHA'}</td>
                    <td>{item.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {diagnosticoConcorrencia?.stages?.length ? (
          <div className="table-wrapper" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Etapa concorrencia</th>
                  <th>Status</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {diagnosticoConcorrencia.stages.map((item) => (
                  <tr key={`${item.name}-${item.timestamp}`}>
                    <td>{item.name}</td>
                    <td>{item.ok ? 'OK' : 'FALHA'}</td>
                    <td>{item.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {migracaoResumo ? (
          <div className="summary-card" style={{ marginTop: 12 }}>
            <p><strong>Gerado em:</strong> {migracaoResumo.generatedAt || '-'}</p>
            <p><strong>Modo atual:</strong> {migracaoResumo.modeAtual || '-'}</p>
            <p><strong>Escopo Supabase:</strong> {(migracaoResumo.scope?.environmentScope || '-')} / {(migracaoResumo.scope?.ownerId || '-')}</p>
            <p><strong>Homologacao isolada:</strong> {migracaoResumo.homologationOnly ? 'Sim' : 'Nao'}</p>
            <p>
              <strong>Resumo:</strong>{' '}
              encontrados {migracaoResumo.totals?.recordsFound || 0} | enviados {migracaoResumo.totals?.recordsToSend || 0} | conflitos {migracaoResumo.totals?.conflicts || 0} | erros {migracaoResumo.totals?.errors || 0}
            </p>

            <div className="table-wrapper" style={{ marginTop: 12 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Entidade</th>
                    <th>Registros encontrados</th>
                    <th>Registros para envio</th>
                    <th>Conflito</th>
                    <th>Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {(migracaoResumo.details || []).map((item) => (
                    <tr key={item.storageKey}>
                      <td>{STORAGE_KEY_LABELS[item.storageKey] || item.label || item.storageKey}</td>
                      <td>{item.recordsFound || 0}</td>
                      <td>{item.recordsToSend || 0}</td>
                      <td>{item.conflict ? 'Sim' : 'Nao'}</td>
                      <td>{item.error || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="details-actions" style={{ marginTop: 12 }}>
              <label className="form-field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={permitirSobrescreverConflitos}
                  onChange={(event) => setPermitirSobrescreverConflitos(event.target.checked)}
                />
                <span>Permitir sobrescrever conflitos existentes no Supabase</span>
              </label>
              <button type="button" className="button button-primary" disabled={migrando || homologationOnly} onClick={executarMigracao}>
                {homologationOnly ? 'Migracao bloqueada em homologacao' : (migrando ? 'Migrando...' : 'Executar migracao para Supabase')}
              </button>
            </div>

            {homologationOnly ? (
              <p style={{ marginTop: 12 }}>
                Ambiente em homologacao isolada: envio de migracao real bloqueado. Utilize apenas o resumo e os dados descartaveis.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="summary-card" style={{ marginTop: 12 }}>
          <h3>Dados descartaveis para validacao 1.2.0B</h3>
          <p>Criar apenas dados de teste no modo Supabase: patrimonio, unidade, conta e lancamento de R$ 10,00.</p>
          <div className="details-actions">
            <button type="button" className="button button-secondary" onClick={limparDadosHomologacao}>Limpar dados descartaveis</button>
            <button type="button" className="button button-secondary" onClick={criarDadosHomologacao}>Criar dados descartaveis</button>
            <button type="button" className="button button-secondary" onClick={criarLancamento20}>Criar lancamento teste R$ 20,00</button>
            <button type="button" className="button" onClick={() => window.location.reload()}>Recarregar pagina</button>
          </div>
          {resultadoHomologacao ? (
            <div style={{ marginTop: 8 }}>
              <p><strong>Patrimonio:</strong> {resultadoHomologacao.patrimonio?.nome || '-'}</p>
              <p><strong>Unidade:</strong> {resultadoHomologacao.unidade?.nome || '-'}</p>
              <p><strong>Conta:</strong> {resultadoHomologacao.conta?.nome || '-'}</p>
              <p><strong>Lancamento:</strong> {resultadoHomologacao.lancamento10?.descricao || '-'}</p>
            </div>
          ) : null}

          {evidencias ? (
            <div style={{ marginTop: 12 }}>
              <p><strong>Evidencias coletadas em:</strong> {evidencias.generatedAt}</p>
              <p><strong>IDs patrimonio:</strong> {(evidencias.ids?.patrimonios || []).join(', ') || '-'}</p>
              <p><strong>IDs unidade:</strong> {(evidencias.ids?.unidades || []).join(', ') || '-'}</p>
              <p><strong>IDs conta:</strong> {(evidencias.ids?.contas || []).join(', ') || '-'}</p>
              <p><strong>IDs lancamento:</strong> {(evidencias.ids?.lancamentos || []).join(', ') || '-'}</p>
              <p><strong>Contagem patrimonios:</strong> {evidencias.counts?.patrimonios || 0}</p>
              <p><strong>Contagem unidades:</strong> {evidencias.counts?.unidades || 0}</p>
              <p><strong>Contagem contas:</strong> {evidencias.counts?.contas || 0}</p>
              <p><strong>Contagem lancamentos:</strong> {evidencias.counts?.lancamentos || 0}</p>

              <div className="table-wrapper" style={{ marginTop: 8 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Storage key</th>
                      <th>row_version</th>
                      <th>last_writer_instance</th>
                      <th>updated_at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(evidencias.rows || []).map((row) => (
                      <tr key={row.storageKey}>
                        <td>{row.storageKey}</td>
                        <td>{row.rowVersion}</td>
                        <td>{row.lastWriterInstance || '-'}</td>
                        <td>{row.updatedAt || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>

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
