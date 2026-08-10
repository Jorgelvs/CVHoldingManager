import React from 'react'

// Sem isto, qualquer erro não tratado durante a renderização de QUALQUER
// tela (ex.: um campo inesperado em um registro antigo, uma referência nula)
// derrubava a árvore React inteira e deixava a tela em branco/preta, sem
// nenhuma pista pro usuário do que aconteceu nem como voltar a usar o app —
// só um F5 "às cegas" resolvia. Este boundary limita o estrago à tela atual
// e oferece uma saída clara.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Erro não tratado na interface.', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleVoltarInicio = () => {
    this.setState({ error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page-content">
          <div className="alert-box alert-error" style={{ marginBottom: 16 }}>
            Ocorreu um erro inesperado nesta tela e ela não pôde ser exibida corretamente.
          </div>
          <div className="summary-card" style={{ padding: 20 }}>
            <p style={{ marginBottom: 12 }}>
              Seus dados já salvos não foram afetados por este erro — ele é apenas de exibição. Tente recarregar a
              página; se o problema continuar, volte para o início e acesse a tela novamente.
            </p>
            <details style={{ marginBottom: 16, color: '#6b6375', fontSize: 13 }}>
              <summary>Detalhes técnicos</summary>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{String(this.state.error?.message || this.state.error)}</pre>
            </details>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="button button-primary" onClick={this.handleReload}>
                Recarregar página
              </button>
              <button type="button" className="button button-secondary" onClick={this.handleVoltarInicio}>
                Voltar ao início
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
