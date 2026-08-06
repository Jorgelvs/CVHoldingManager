import React, { useEffect, useMemo, useRef, useState } from 'react'

export default function VoiceInput({ value, onChange }) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)
  const hasResultRef = useRef(false)
  const errorRef = useRef('')

  const SpeechRecognition = useMemo(() => {
    if (typeof window === 'undefined') return null
    return window.SpeechRecognition || window.webkitSpeechRecognition || null
  }, [])

  const isSecureContext = useMemo(() => {
    if (typeof window === 'undefined') return true
    return Boolean(window.isSecureContext)
  }, [])

  const voiceUnavailableMessage = useMemo(() => {
    if (!isSecureContext) {
      return 'Gravação de voz indisponível: esta página não está em contexto seguro (HTTPS ou localhost). Utilize a digitação.'
    }
    if (!SpeechRecognition) {
      return 'Reconhecimento de voz não disponível neste navegador. Utilize a digitação.'
    }
    return ''
  }, [isSecureContext, SpeechRecognition])

  useEffect(() => {
    if (!SpeechRecognition) return undefined
    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onstart = () => {
      hasResultRef.current = false
      errorRef.current = ''
      setError('')
    }
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript || ''
      hasResultRef.current = true
      onChange(transcript)
      setListening(false)
    }
    recognition.onerror = (event) => {
      const reason = event?.error || ''
      let message = 'Não foi possível reconhecer a fala no momento. Tente novamente.'

      if (reason === 'not-allowed' || reason === 'service-not-allowed') {
        message = 'Permissão de microfone negada. Ative o acesso e tente novamente.'
      } else if (reason === 'no-speech') {
        message = 'Não identifiquei nenhuma fala. Tente novamente com mais clareza.'
      } else if (reason === 'audio-capture') {
        message = 'Não foi possível acessar o microfone. Verifique o dispositivo de áudio.'
      }

      errorRef.current = message
      setError(message)
      setListening(false)
    }
    recognition.onend = () => {
      setListening(false)
      if (!hasResultRef.current && !errorRef.current) {
        const message = 'Não identifiquei nenhuma fala. Tente novamente.'
        errorRef.current = message
        setError(message)
      }
    }
    recognitionRef.current = recognition
    return () => {
      try {
        recognition.stop()
      } catch {}
      recognitionRef.current = null
    }
  }, [SpeechRecognition, onChange])

  const startListening = () => {
    setError('')
    errorRef.current = ''
    if (voiceUnavailableMessage) {
      setError(voiceUnavailableMessage)
      return
    }
    if (!recognitionRef.current) {
      setError('Não foi possível preparar o reconhecimento de voz. Recarregue a página e tente novamente.')
      return
    }
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch (err) {
      setError('Não foi possível iniciar o reconhecimento de voz. Tente novamente em alguns segundos.')
    }
  }

  return (
    <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
      <button
        type="button"
        className="button button-secondary voice-input-button"
        onClick={startListening}
        disabled={listening || Boolean(voiceUnavailableMessage)}
      >
        {listening ? 'Ouvindo...' : 'Iniciar gravação'}
      </button>
      {value ? <div style={{ fontSize: 14, color: '#444' }}>Texto reconhecido: {value}</div> : null}
      {error ? <div className="field-error">{error}</div> : null}
      {voiceUnavailableMessage ? (
        <div className="field-error">{voiceUnavailableMessage}</div>
      ) : null}
    </div>
  )
}
