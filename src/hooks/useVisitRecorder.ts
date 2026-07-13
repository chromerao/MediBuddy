import { useEffect, useRef, useState } from 'react'

export function useVisitRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [error, setError] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isRecording) return
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1)
    }, 1000)
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    }
  }, [isRecording])

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  async function start() {
    setError('')
    setElapsedSeconds(0)
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('Recording is not supported')
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.start(1000)
      recorderRef.current = recorder
      setIsRecording(true)
    } catch {
      setError('마이크를 사용할 수 없습니다. 브라우저 권한을 확인한 뒤 다시 시도해 주세요.')
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setIsRecording(false)
    }
  }

  function stop(): Promise<Blob | null> {
    const recorder = recorderRef.current
    setIsRecording(false)
    if (!recorder || recorder.state !== 'recording') {
      stopStream()
      return Promise.resolve(null)
    }

    return new Promise((resolve) => {
      recorder.addEventListener('stop', () => {
        const type = recorder.mimeType || chunksRef.current[0]?.type || 'audio/webm'
        const audio = new Blob(chunksRef.current, { type })
        stopStream()
        resolve(audio.size > 0 ? audio : null)
      }, { once: true })
      recorder.stop()
    })
  }

  function destroyRecording() {
    chunksRef.current = []
    recorderRef.current = null
    stopStream()
  }

  return { isRecording, elapsedSeconds, error, start, stop, destroyRecording }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }
}

function getSupportedMimeType() {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
    .find((mimeType) => MediaRecorder.isTypeSupported(mimeType))
}
