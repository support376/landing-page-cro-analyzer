import { useState } from 'react'

export default function URLInput({ onSubmit, error }) {
  const [url, setUrl] = useState('')
  const [competitors, setCompetitors] = useState(['', '', ''])
  const [showCompetitors, setShowCompetitors] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!url.trim()) return
    const validUrl = url.startsWith('http') ? url : `https://${url}`
    const validComps = competitors.filter(c => c.trim()).map(c => c.startsWith('http') ? c : `https://${c}`)
    onSubmit(validUrl, validComps)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            랜딩페이지 전환율 분석기
          </h1>
          <p className="text-slate-400 text-lg">
            URL을 입력하면 크롤링, 스크린샷, AI 분석이 자동 실행됩니다
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="분석할 랜딩페이지 URL을 입력하세요"
              className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white text-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 경쟁사 토글 */}
          <button
            type="button"
            onClick={() => setShowCompetitors(!showCompetitors)}
            className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
          >
            {showCompetitors ? '▼' : '▶'} 경쟁사 벤치마킹 (선택사항)
          </button>

          {showCompetitors && (
            <div className="space-y-2 bg-slate-800/50 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-2">경쟁사 랜딩페이지 URL (최대 3개)</p>
              {competitors.map((comp, i) => (
                <input
                  key={i}
                  type="text"
                  value={comp}
                  onChange={(e) => {
                    const newComps = [...competitors]
                    newComps[i] = e.target.value
                    setCompetitors(newComps)
                  }}
                  placeholder={`경쟁사 ${i + 1} URL`}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!url.trim()}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold text-lg rounded-xl transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
          >
            분석 시작
          </button>
        </form>

        {/* 분석 항목 안내 */}
        <div className="mt-12 grid grid-cols-2 gap-4 text-sm">
          {[
            { icon: '🔍', title: '퍼스트뷰 분석', desc: '헤드라인, CTA, 히어로 영역' },
            { icon: '📝', title: '카피라이팅 분석', desc: '파워워드, 가독성, 고객중심성' },
            { icon: '🏗️', title: '설득 구조 분석', desc: '섹션 구조, 사회적 증거, FAQ' },
            { icon: '📱', title: '기술 & UX 분석', desc: '반응형, 속도, 폼, 이탈링크' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-white font-medium">{item.title}</div>
              <div className="text-slate-500 text-xs">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
