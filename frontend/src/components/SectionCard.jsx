export default function SectionCard({ title, icon, children, color = 'blue' }) {
  const borderColors = {
    blue: 'border-blue-500/30',
    green: 'border-green-500/30',
    purple: 'border-purple-500/30',
    yellow: 'border-yellow-500/30',
    red: 'border-red-500/30'
  }
  const iconBgColors = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    purple: 'bg-purple-500/10 text-purple-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    red: 'bg-red-500/10 text-red-400'
  }

  return (
    <div className={`bg-slate-800/60 rounded-xl border ${borderColors[color]} p-5`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-lg ${iconBgColors[color]} flex items-center justify-center text-sm`}>
          {icon}
        </div>
        <h3 className="text-white font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}
