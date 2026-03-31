import { useState } from 'react'
import './index.css'
import URLInput from './components/URLInput'
import Dashboard from './components/Dashboard'
import LoadingScreen from './components/LoadingScreen'

function App() {
  const [analysisData, setAnalysisData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState(null)

  const startAnalysis = async (url, competitors) => {
    setLoading(true)
    setError(null)
    setProgress(10)
    setStatusText('페이지를 크롤링하고 있습니다...')

    // 프로그레스 시뮬레이션
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 85) { clearInterval(progressTimer); return 85 }
        const step = prev < 30 ? 8 : prev < 60 ? 5 : 2
        const texts = { 20: '스크린샷을 캡처하고 있습니다...', 40: '콘텐츠를 분석하고 있습니다...', 60: '점수를 계산하고 있습니다...', 75: '개선안을 생성하고 있습니다...' }
        if (texts[prev]) setStatusText(texts[prev])
        return prev + step
      })
    }, 1500)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, competitors })
      })
      clearInterval(progressTimer)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '분석 중 오류가 발생했습니다')
      }

      const result = await res.json()
      setProgress(100)
      setStatusText('분석이 완료되었습니다!')
      setTimeout(() => {
        setAnalysisData(result.data)
        setLoading(false)
      }, 500)
    } catch (err) {
      clearInterval(progressTimer)
      setError(err.message || '서버에 연결할 수 없습니다')
      setLoading(false)
    }
  }

  const reset = () => {
    setAnalysisData(null)
    setLoading(false)
    setProgress(0)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {!analysisData && !loading && (
        <URLInput onSubmit={startAnalysis} error={error} />
      )}
      {loading && (
        <LoadingScreen progress={progress} statusText={statusText} />
      )}
      {analysisData && (
        <Dashboard data={analysisData} onReset={reset} />
      )}
    </div>
  )
}

export default App
