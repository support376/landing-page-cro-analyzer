export default function ScoreGauge({ score, label }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'
  const bgColor = score >= 70 ? 'from-green-500/10 to-green-600/5' : score >= 40 ? 'from-yellow-500/10 to-yellow-600/5' : 'from-red-500/10 to-red-600/5'
  const circumference = 2 * Math.PI * 70
  const dashOffset = circumference - (score / 100) * circumference

  return (
    <div className={`bg-gradient-to-br ${bgColor} rounded-2xl p-6 flex flex-col items-center border border-slate-700/50`}>
      <div className="relative w-44 h-44">
        <svg className="w-44 h-44 -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="70" fill="none" stroke="#1e293b" strokeWidth="10" />
          <circle
            cx="80" cy="80" r="70" fill="none"
            stroke={color} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold" style={{ color }}>{score}</span>
          <span className="text-slate-500 text-sm">/ 100</span>
        </div>
      </div>
      <div className="text-white font-semibold mt-3 text-lg">{label || '전환율 최적화 점수'}</div>
      <div className="text-xs mt-1" style={{ color }}>
        {score >= 70 ? '우수' : score >= 40 ? '개선 필요' : '긴급 개선 필요'}
      </div>
    </div>
  )
}
