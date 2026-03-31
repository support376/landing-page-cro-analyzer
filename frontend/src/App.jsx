import { useState } from 'react'
import './index.css'
import URLInput from './components/URLInput'
import Dashboard from './components/Dashboard'
import LoadingScreen from './components/LoadingScreen'

function App() {
  const [analysisId, setAnalysisId] = useState(null)
  const [analysisData, setAnalysisData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState(null)

  const startAnalysis = async (url, competitors) => {
    setLoading(true)
    setError(null)
    setProgress(0)
    setStatusText('분석을 시작합니다...')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, competitors })
      })
      const { id } = await res.json()
      setAnalysisId(id)
      const poll = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/analyze/${id}`)
          const statusData = await statusRes.json()
          setProgress(statusData.progress || 0)
          const statusMap = {
            crawling: '페이지를 크롤링하고 있습니다...',
            analyzing: '콘텐츠를 분석하고 있습니다...',
            'generating-report': 'PDF 리포트를 생성하고 있습니다...',
            complete: '분석이 완료되었습니다!',
            error: '오류가 발생했습니다'
          }
          setStatusText(statusMap[statusData.status] || statusData.status)
          if (statusData.status === 'complete') {
            clearInterval(poll)
            setAnalysisData(statusData.data)
            setLoading(false)
          } else if (statusData.status === 'error') {
            clearInterval(poll)
            setError(statusData.error || '분석 중 오류가 발생했습니다')
            setLoading(false)
          }
        } catch {
          clearInterval(poll)
          setError('서버와의 연결이 끊어졌습니다')
          setLoading(false)
        }
      }, 2000)
    } catch {
      setError('서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인하세요.')
      setLoading(false)
    }
  }

  const reset = () => {
    setAnalysisId(null)
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
        <Dashboard data={analysisData} analysisId={analysisId} onReset={reset} />
      )}
    </div>
  )
}

export default App
