export default function LoadingScreen({ progress, statusText }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* 애니메이션 원형 */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="50" fill="none"
              stroke="url(#gradient)" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${progress * 3.14} ${314 - progress * 3.14}`}
              className="transition-all duration-500"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">{progress}%</span>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-white mb-2">분석 진행 중</h2>
        <p className="text-slate-400">{statusText}</p>

        {/* 진행 단계 */}
        <div className="mt-8 space-y-3 text-left">
          {[
            { label: '페이지 크롤링', threshold: 20 },
            { label: '스크린샷 캡처', threshold: 40 },
            { label: '콘텐츠 분석', threshold: 60 },
            { label: 'PDF 리포트 생성', threshold: 80 },
            { label: '최종 정리', threshold: 100 },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                progress >= step.threshold
                  ? 'bg-green-500 text-white'
                  : progress >= step.threshold - 20
                    ? 'bg-blue-500 text-white animate-pulse'
                    : 'bg-slate-700 text-slate-500'
              }`}>
                {progress >= step.threshold ? '✓' : i + 1}
              </div>
              <span className={progress >= step.threshold - 20 ? 'text-white' : 'text-slate-600'}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
