import { useState } from 'react'
import ScoreGauge from './ScoreGauge'
import ScoreBar from './ScoreBar'
import SectionCard from './SectionCard'

const TABS = ['개요', '퍼스트뷰', '설득구조', '카피라이팅', '기술&UX', '개선안', '경쟁사']

export default function Dashboard({ data, onReset }) {
  const [activeTab, setActiveTab] = useState('개요')
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const scoring = data.scoring || {}
  const scores = scoring.scores || {}
  const weights = scoring.weights || {}
  const ss = data.screenshots || {}
  const getScreenshot = (device) => device === 'desktop' ? ss.desktopFull : device === 'tablet' ? (ss.tablet || ss.mobile) : ss.mobile
  const scoreLabels = {headline:'헤드라인',cta:'CTA',copywriting:'카피라이팅',structure:'설득 구조',socialProof:'사회적 증거',mobile:'모바일',speed:'로딩 속도',ux:'UX'}

  return (
    <div className="flex h-screen">
      <div className="w-[45%] border-r border-slate-700 flex flex-col">
        <div className="flex items-center gap-2 p-3 bg-slate-800 border-b border-slate-700">
          <button onClick={onReset} className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-slate-700">← 새 분석</button>
          <div className="flex-1 text-center text-xs text-slate-500 truncate px-2">{data.url}</div>
          <div className="flex gap-1">
            {['desktop','tablet','mobile'].map(d=>(<button key={d} onClick={()=>setPreviewDevice(d)} className={`px-2 py-1 text-xs rounded ${previewDevice===d?'bg-blue-600 text-white':'bg-slate-700 text-slate-400'}`}>{d==='desktop'?'🖥️':d==='tablet'?'📱':'📲'}</button>))}
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-900 p-4 flex justify-center">
          <div style={{maxWidth:previewDevice==='desktop'?'100%':previewDevice==='tablet'?'768px':'375px'}}>
            {data.screenshots&&(<img src={getScreenshot(previewDevice)} alt="미리보기" className="w-full rounded-lg shadow-2xl"/>)}
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex gap-1 p-2 bg-slate-800 border-b border-slate-700 overflow-x-auto">
          {TABS.map(tab=>(<button key={tab} onClick={()=>setActiveTab(tab)} className={`px-3 py-2 text-sm rounded-lg whitespace-nowrap ${activeTab===tab?'bg-blue-600 text-white':'text-slate-400 hover:text-white hover:bg-slate-700'}`}>{tab}</button>))}
          <button onClick={()=>window.print()} className="ml-auto px-3 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-500">인쇄/PDF</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab==='개요'&&(<>
            <div className="grid grid-cols-3 gap-4"><ScoreGauge score={scoring.overall||0}/><div className="col-span-2 space-y-2">{Object.entries(scoreLabels).map(([key,label])=>(<ScoreBar key={key} label={label} score={scores[key]||0} weight={weights[key]}/>))}</div></div>
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="로딩 시간" value={`${((data.loadTime||0)/1000).toFixed(1)}s`} status={(data.loadTime||5000)<3000?'good':'bad'}/>
              <StatCard label="CTA 버튼 수" value={data.structure?.ctaCount||0} status={(data.structure?.ctaCount||0)>=2?'good':'warn'}/>
              <StatCard label="외부 이탈 링크" value={data.externalLinks||0} status={(data.externalLinks||0)<=2?'good':'bad'}/>
              <StatCard label="폼 필드 수" value={data.formFields||0} status={(data.formFields||0)<=3?'good':'warn'}/>
            </div>
            <SectionCard title="빠른 진단" icon="⚡" color="yellow"><div className="space-y-2 text-sm">
              <DiagItem ok={data.firstView?.headline} label="퍼스트뷰 헤드라인"/>
              <DiagItem ok={data.firstView?.subheadline} label="서브헤드라인"/>
              <DiagItem ok={data.firstView?.ctaButton} label="퍼스트뷰 CTA 버튼"/>
              <DiagItem ok={data.firstView?.heroMedia} label="히어로 이미지/영상"/>
              <DiagItem ok={data.structure?.hasSocialProof} label="사회적 증거"/>
              <DiagItem ok={data.structure?.hasFAQ} label="FAQ 섹션"/>
              <DiagItem ok={data.structure?.hasUrgency} label="긴급성/희소성 요소"/>
              <DiagItem ok={data.isMobileResponsive} label="모바일 반응형"/>
            </div></SectionCard>
          </>)}
          {activeTab==='퍼스트뷰'&&(<>
            <SectionCard title="헤드라인 분석" icon="📰" color="blue">
              <div className="bg-slate-900 rounded-lg p-4 mb-3"><div className="text-white text-lg font-semibold mb-1">&quot;{data.firstView?.headline||'헤드라인을 찾을 수 없습니다'}&quot;</div>{data.firstView?.subheadline&&<div className="text-slate-500 text-sm">서브: &quot;{data.firstView.subheadline}&quot;</div>}</div>
              <div className="flex items-center gap-4 mb-3"><div className="text-3xl font-bold" style={{color:(data.headline?.score||0)>=70?'#22c55e':(data.headline?.score||0)>=40?'#eab308':'#ef4444'}}>{data.headline?.score||0}점</div><div className="text-sm text-slate-400">헤드라인 강도 점수</div></div>
              <div className="space-y-1">{(data.headline?.feedback||[]).map((f,i)=>(<div key={i} className="text-sm text-slate-300">{f}</div>))}</div>
            </SectionCard>
            <SectionCard title="CTA 버튼" icon="👆" color="green">
              {data.firstView?.ctaButton?(<div className="space-y-3"><div className="px-6 py-3 rounded-lg font-semibold inline-block" style={{backgroundColor:data.firstView.ctaButton.backgroundColor,color:data.firstView.ctaButton.color}}>{data.firstView.ctaButton.text}</div><div className="grid grid-cols-2 gap-2 text-sm text-slate-400"><div>배경색: <span className="text-white">{data.firstView.ctaButton.backgroundColor}</span></div><div>텍스트색: <span className="text-white">{data.firstView.ctaButton.color}</span></div><div>크기: <span className="text-white">{data.firstView.ctaButton.width}x{data.firstView.ctaButton.height}px</span></div><div>위치: <span className="text-white">Y {data.firstView.ctaButton.positionY}px</span></div></div></div>):<div className="text-red-400 text-sm">퍼스트뷰에서 CTA 버튼을 찾을 수 없습니다</div>}
            </SectionCard>
            {ss.firstView&&<SectionCard title="퍼스트뷰 스크린샷" icon="👁️" color="purple"><img src={ss.firstView} alt="퍼스트뷰" className="w-full rounded-lg"/><div className="mt-2 text-sm text-slate-400">로딩: {((data.loadTime||0)/1000).toFixed(2)}초</div></SectionCard>}
          </>)}
          {activeTab==='설득구조'&&(<>
            <SectionCard title="섹션 구조" icon="🏗️" color="blue"><div className="space-y-2">{(data.structure?.sectionMap||[]).map((sec,i)=>{const tc={'social-proof':'bg-green-500/20 text-green-400 border-green-500/30','faq':'bg-blue-500/20 text-blue-400 border-blue-500/30','benefits':'bg-purple-500/20 text-purple-400 border-purple-500/30','features':'bg-yellow-500/20 text-yellow-400 border-yellow-500/30','urgency':'bg-red-500/20 text-red-400 border-red-500/30','general':'bg-slate-700/30 text-slate-400 border-slate-600/30'};return(<div key={i} className={`${tc[sec.type]||tc.general} border rounded-lg px-4 py-2 flex items-center gap-3`}><span className="text-xs text-slate-500 w-6">#{i+1}</span><span className="flex-1 text-sm font-medium">{sec.heading||'(제목 없음)'}</span><span className="text-xs px-2 py-0.5 rounded-full bg-slate-800">{sec.type}</span></div>)})}</div></SectionCard>
            <div className="grid grid-cols-2 gap-4">
              <SectionCard title="설득 요소" icon="✅" color="green"><div className="space-y-2 text-sm"><DiagItem ok={data.structure?.hasSocialProof} label="사회적 증거"/><DiagItem ok={data.structure?.hasBenefits} label="혜택"/><DiagItem ok={data.structure?.hasFeatures} label="기능"/><DiagItem ok={data.structure?.hasFAQ} label="FAQ"/><DiagItem ok={data.structure?.hasUrgency} label="긴급성"/></div></SectionCard>
              <SectionCard title="CTA 배치" icon="🎯" color="purple"><div className="text-3xl font-bold text-white mb-2">{data.structure?.ctaCount||0}개</div><div className="space-y-1">{(data.allCTAs||[]).map((cta,i)=>(<div key={i} className="text-xs bg-slate-900 rounded px-3 py-1.5 flex justify-between"><span className="text-white">{cta.text}</span><span className="text-slate-500">Y:{cta.top}px</span></div>))}</div></SectionCard>
            </div>
          </>)}
          {activeTab==='카피라이팅'&&(<>
            <div className="grid grid-cols-3 gap-4">
              <SectionCard title="고객 중심성" icon="🎯" color="blue"><div className="text-center"><div className="text-4xl font-bold" style={{color:(data.copywriting?.customerFocus||0)>=60?'#22c55e':'#eab308'}}>{data.copywriting?.customerFocus||0}%</div><div className="text-xs text-slate-500 mt-1">당신/여러분 비율</div><div className="mt-3 text-xs text-slate-400"><div>당신: {data.copywriting?.youCount||0}회</div><div>우리: {data.copywriting?.weCount||0}회</div></div></div></SectionCard>
              <SectionCard title="파워워드" icon="💪" color="purple"><div className="text-center"><div className="text-4xl font-bold text-purple-400">{data.copywriting?.powerWordCount||0}개</div></div><div className="mt-3 flex flex-wrap gap-1">{Object.entries(data.copywriting?.powerWordsFound||{}).slice(0,10).map(([w,c])=>(<span key={w} className="text-xs bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded-full">{w}({c})</span>))}</div></SectionCard>
              <SectionCard title="가독성" icon="📖" color="green"><div className="text-center"><div className="text-4xl font-bold" style={{color:(data.copywriting?.readabilityScore||0)>=70?'#22c55e':'#eab308'}}>{data.copywriting?.readabilityScore||0}</div><div className="text-xs text-slate-500 mt-1">가독성 점수</div><div className="mt-3 text-xs text-slate-400">평균 {data.copywriting?.avgSentenceLength||0}자/문장</div></div></SectionCard>
            </div>
          </>)}
          {activeTab==='기술&UX'&&(<>
            <div className="grid grid-cols-2 gap-4">
              <SectionCard title="모바일" icon="📱" color={data.isMobileResponsive?'green':'red'}><div className="text-2xl font-bold" style={{color:data.isMobileResponsive?'#22c55e':'#ef4444'}}>{data.isMobileResponsive?'반응형':'비반응형'}</div></SectionCard>
              <SectionCard title="속도" icon="⚡" color={(data.loadTime||5000)<3000?'green':'red'}><div className="text-2xl font-bold" style={{color:(data.loadTime||5000)<3000?'#22c55e':'#ef4444'}}>{((data.loadTime||0)/1000).toFixed(2)}초</div></SectionCard>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <SectionCard title="폼 필드" icon="📝" color="green"><div className="text-3xl font-bold text-white">{data.formFields||0}개</div></SectionCard>
              <SectionCard title="외부 링크" icon="🔗" color={(data.externalLinks||0)<=2?'green':'red'}><div className="text-3xl font-bold text-white">{data.externalLinks||0}개</div></SectionCard>
              <SectionCard title="팝업" icon="🪟" color="blue"><div className="text-2xl font-bold text-white">{data.hasPopup?'있음':'없음'}</div></SectionCard>
            </div>
          </>)}
          {activeTab==='개선안'&&(<>
            <SectionCard title="Quick Fix TOP 5" icon="🔥" color="red"><div className="space-y-3">{(data.suggestions?.quickFixes||[]).map((fix,i)=>(<div key={i} className="bg-slate-900 rounded-lg p-4"><div className="flex items-center gap-2 mb-1"><span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded">#{i+1}</span><span className="text-xs text-slate-500">{fix.area}</span></div><div className="text-white text-sm font-medium mb-1">{fix.issue}</div><div className="text-green-400 text-sm">→ {fix.fix}</div></div>))}</div></SectionCard>
            <SectionCard title="A/B 테스트 추천" icon="🧪" color="purple"><div className="space-y-3">{(data.suggestions?.abTests||[]).map((t,i)=>(<div key={i} className="bg-slate-900 rounded-lg p-4"><div className="text-white font-medium text-sm">{t.element}</div><div className="text-slate-400 text-sm mt-1">{t.description}</div><div className="text-blue-400 text-xs mt-2">{t.expectedImpact}</div></div>))}</div></SectionCard>
            <div className="grid grid-cols-2 gap-4">
              <SectionCard title="헤드라인 제안" icon="📝" color="blue"><div className="space-y-2">{(data.suggestions?.headlines||[]).map((h,i)=>(<div key={i} className="bg-slate-900 rounded-lg p-3 text-sm text-white"><span className="text-blue-400 mr-2">#{i+1}</span>{h}</div>))}</div></SectionCard>
              <SectionCard title="CTA 제안" icon="👆" color="green"><div className="space-y-2">{(data.suggestions?.ctas||[]).map((c,i)=>(<div key={i} className="bg-slate-900 rounded-lg p-3 text-sm text-white"><span className="text-green-400 mr-2">#{i+1}</span>{c}</div>))}</div></SectionCard>
            </div>
          </>)}
          {activeTab==='경쟁사'&&(<>
            {(data.competitors||[]).length===0?(<div className="text-center py-20"><div className="text-4xl mb-4">🏢</div><div className="text-slate-400">경쟁사 URL이 입력되지 않았습니다</div></div>):(
              <SectionCard title="경쟁사 벤치마킹" icon="📊" color="blue"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-slate-400 border-b border-slate-700"><th className="text-left py-2 px-2">항목</th><th className="text-center py-2 px-2">내 사이트</th>{data.competitors.map((_,i)=>(<th key={i} className="text-center py-2 px-2">경쟁사 {i+1}</th>))}</tr></thead><tbody className="text-white">
                <CompRow label="전체 점수" mine={scoring.overall} competitors={data.competitors.map(c=>c.scoring?.overall)}/>
                <CompRow label="헤드라인" mine={scores.headline} competitors={data.competitors.map(c=>c.headline?.score)}/>
                <CompRow label="CTA 수" mine={data.structure?.ctaCount} competitors={data.competitors.map(c=>c.ctaCount)}/>
                <CompRow label="로딩(ms)" mine={data.loadTime} competitors={data.competitors.map(c=>c.loadTime)} reverse/>
              </tbody></table></div></SectionCard>
            )}
          </>)}
        </div>
      </div>
    </div>
  )
}

function StatCard({label,value,status}){const c={good:'text-green-400',warn:'text-yellow-400',bad:'text-red-400'};return(<div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50"><div className="text-xs text-slate-500 mb-1">{label}</div><div className={`text-2xl font-bold ${c[status]||'text-white'}`}>{value}</div></div>)}
function DiagItem({ok,label}){return(<div className="flex items-center gap-2"><span className={ok?'text-green-400':'text-red-400'}>{ok?'✓':'✗'}</span><span className={ok?'text-slate-300':'text-slate-500'}>{label}</span></div>)}
function CompRow({label,mine,competitors,reverse=false}){const all=[mine,...competitors].filter(v=>v!=null);const best=reverse?Math.min(...all):Math.max(...all);return(<tr className="border-b border-slate-800"><td className="py-2 px-2 text-slate-400">{label}</td><td className={`text-center py-2 px-2 font-semibold ${mine===best?'text-green-400':'text-white'}`}>{mine??'-'}</td>{competitors.map((v,i)=>(<td key={i} className={`text-center py-2 px-2 ${v===best?'text-green-400 font-semibold':'text-slate-400'}`}>{v??'-'}</td>))}</tr>)}
