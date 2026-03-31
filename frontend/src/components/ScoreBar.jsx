export default function ScoreBar({ label, score, weight }) {
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  const textColor = score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-sm text-slate-400 shrink-0">{label}</div>
      <div className="flex-1 bg-slate-700/50 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className={`w-10 text-right text-sm font-semibold ${textColor}`}>{score}</div>
      {weight && <div className="w-8 text-xs text-slate-600">x{weight}%</div>}
    </div>
  )
}
