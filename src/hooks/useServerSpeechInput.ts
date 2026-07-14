import { useEffect, useRef, useState } from 'react'
import { transcribeVisitAudio } from '../api'

interface UseServerSpeechInputOptions {
  onResult: (text: string) => void
}

export function useServerSpeechInput({ onResult }: UseServerSpeechInputOptions) {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const onResultRef = useRef(onResult)

  useEffect(() => { onResultRef.current = onResult }, [onResult])
  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  async function toggle() {
    if (isProcessing) return
    setError('')
    if (isListening) {
      await stopAndTranscribe()
      return
    }
    try {
      if (!supported) throw new Error('unsupported')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorderRef.current = recorder
      recorder.start(1000)
      setIsListening(true)
    } catch {
      stopStream()
      setError('마이크를 사용할 수 없습니다. 브라우저 권한을 확인한 뒤 다시 시도해 주세요.')
    }
  }

  async function stopAndTranscribe() {
    const recorder = recorderRef.current
    setIsListening(false)
    if (!recorder || recorder.state !== 'recording') {
      stopStream()
      return
    }
    setIsProcessing(true)
    try {
      const audio = await new Promise<Blob | null>((resolve) => {
        recorder.addEventListener('stop', () => {
          const type = recorder.mimeType || chunksRef.current[0]?.type || 'audio/webm'
          const blob = new Blob(chunksRef.current, { type })
          resolve(blob.size > 0 ? blob : null)
        }, { once: true })
        recorder.stop()
      })
      stopStream()
      if (!audio) throw new Error('empty')
      const result = await transcribeVisitAudio(audio)
      onResultRef.current(result.transcript.trim())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '음성을 글로 바꾸지 못했습니다. 다시 시도해 주세요.')
    } finally {
      stopStream()
      chunksRef.current = []
      recorderRef.current = null
      setIsProcessing(false)
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const supported = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined'
  return { isListening, isProcessing, error, supported, toggle }
}

function getSupportedMimeType() {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type))
}
