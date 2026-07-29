import React, { useEffect, useMemo, useRef, useState } from 'react'

export default function VoiceInput({ value, onChange }) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef(null)

  const SpeechRecognition = useMemo(() => {
    if (typeof window === 'undefined') return null
    return window.SpeechRecognition || window.webkitSpeechRecognition || null
  }, [])

  useEffect(() => {
    if (!SpeechRecognition) return undefined
    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript || ''
      onChange(transcript)
      setListening(false)
    }
    recognition.onerror = () => {
      setError('Falha no reconhecimento de voz. Tente novamente.')
      setListening(false)
    }
    recognition.onend = () => {
      setListening(false)
    }
    recognitionRef.current = recognition
    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [SpeechRecognition, onChange])

  const startListening = () => {
    setError('')
    if (!SpeechRecognition) {
      setError('Reconhecimento de voz não disponível neste navegador. Utilize a digitação.')
      return
    }
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch (err) {
      setError('Não foi possível iniciar o reconhecimento de voz.')
    }
  }

  return (
    <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
      <button type="button" className="button button-secondary" onClick={startListening} disabled={listening}>
        {listening ? 'Ouvindo...' : 'Iniciar gravação'}
      </button>
      {value ? <div style={{ fontSize: 14, color: '#444' }}>Texto reconhecido: {value}</div> : null}
      {error ? <div className="field-error">{error}</div> : null}
      {!SpeechRecognition ? (
        <div className="field-error">Reconhecimento de voz não disponível neste navegador. Utilize a digitação.</div>
      ) : null}
    </div>
  )
}
