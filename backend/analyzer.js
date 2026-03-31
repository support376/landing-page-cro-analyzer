// 랜딩페이지 전환율 분석 엔진

const POWER_WORDS_KO = [
  '무료', '즉시', '보장', '한정', '지금', '특별', '독점', '검증된',
  '쉬운', '빠른', '간편', '혁신', '놀라운', '강력한', '완벽한', '프리미엄',
  '할인', '이벤트', '선착순', '마감', '오늘만', '단독', '베스트', '인기',
  '증가', '절약', '수익', '성장', '효과', '결과', '성공', '비밀'
];

const POWER_WORDS_EN = [
  'free', 'instant', 'guaranteed', 'limited', 'now', 'exclusive', 'proven',
  'easy', 'fast', 'simple', 'new', 'amazing', 'powerful', 'perfect', 'premium',
  'discount', 'save', 'bonus', 'secret', 'best', 'top', 'ultimate', 'results'
];

const URGENCY_WORDS = [
  '한정', '마감', '오늘만', '선착순', '지금', '즉시', 'D-', '남은',
  'limited', 'deadline', 'hurry', 'now', 'today', 'last chance', 'ending'
];

function analyzeHeadline(text) {
  if (!text) return { score: 0, text: '', feedback: [] };
  const feedback = [];
  let score = 40; // base

  // 구체성 - 숫자 포함
  if (/\d/.test(text)) {
    score += 15;
    feedback.push('✅ 숫자가 포함되어 구체성이 높습니다');
  } else {
    feedback.push('⚠️ 숫자를 포함하면 구체성이 높아집니다');
  }

  // 혜택 포함 여부
  const benefitWords = ['절약', '수익', '성장', '효과', '결과', '무료', '할인', 'save', 'free', 'grow', 'boost', '쉽', '간편', '빠르'];
  const hasBenefit = benefitWords.some(w => text.includes(w));
  if (hasBenefit) {
    score += 15;
    feedback.push('✅ 혜택/가치가 명시되어 있습니다');
  } else {
    feedback.push('⚠️ 고객이 얻는 혜택을 명시하면 좋습니다');
  }

  // 길이
  if (text.length >= 10 && text.length <= 60) {
    score += 10;
    feedback.push('✅ 헤드라인 길이가 적절합니다');
  } else if (text.length < 10) {
    feedback.push('⚠️ 헤드라인이 너무 짧습니다');
  } else {
    score += 5;
    feedback.push('⚠️ 헤드라인이 다소 깁니다 (60자 이내 권장)');
  }

  // 파워워드
  const allPower = [...POWER_WORDS_KO, ...POWER_WORDS_EN];
  const usedPower = allPower.filter(w => text.toLowerCase().includes(w.toLowerCase()));
  if (usedPower.length > 0) {
    score += Math.min(usedPower.length * 5, 20);
    feedback.push(`✅ 파워워드 사용: ${usedPower.join(', ')}`);
  } else {
    feedback.push('⚠️ 파워워드를 사용하면 설득력이 높아집니다');
  }

  return { score: Math.min(score, 100), text, feedback };
}

function analyzeCopywriting(fullText) {
  if (!fullText) return { customerFocus: 0, powerWordCount: 0, readabilityScore: 0, details: {} };

  const youWords = (fullText.match(/당신|여러분|고객님|귀하|you|your/gi) || []).length;
  const weWords = (fullText.match(/우리|저희|we|our|us(?:\s)/gi) || []).length;
  const total = youWords + weWords;
  const customerFocus = total > 0 ? Math.round((youWords / total) * 100) : 50;

  const allPower = [...POWER_WORDS_KO, ...POWER_WORDS_EN];
  const powerWordsFound = {};
  allPower.forEach(w => {
    const regex = new RegExp(w, 'gi');
    const matches = fullText.match(regex);
    if (matches) powerWordsFound[w] = matches.length;
  });
  const powerWordCount = Object.values(powerWordsFound).reduce((a, b) => a + b, 0);

  // 읽기 난이도 (문장 길이 기반 간이 점수)
  const sentences = fullText.split(/[.!?。！？\n]+/).filter(s => s.trim().length > 0);
  const avgSentenceLen = sentences.length > 0
    ? sentences.reduce((sum, s) => sum + s.trim().length, 0) / sentences.length
    : 0;
  // 짧을수록 읽기 쉬움: 40자 이하 = 100, 80자 = 50, 120자+ = 20
  const readabilityScore = Math.max(20, Math.min(100, Math.round(120 - avgSentenceLen)));

  const urgencyFound = URGENCY_WORDS.filter(w => fullText.toLowerCase().includes(w.toLowerCase()));

  return {
    customerFocus,
    youCount: youWords,
    weCount: weWords,
    powerWordCount,
    powerWordsFound,
    readabilityScore,
    avgSentenceLength: Math.round(avgSentenceLen),
    sentenceCount: sentences.length,
    totalCharacters: fullText.length,
    urgencyWords: urgencyFound
  };
}

function analyzePageStructure(sections) {
  const analysis = {
    totalSections: sections.length,
    hasSocialProof: false,
    socialProofPosition: null,
    hasFAQ: false,
    hasTestimonials: false,
    hasBenefits: false,
    hasFeatures: false,
    benefitToFeatureRatio: 'N/A',
    hasUrgency: false,
    ctaCount: 0,
    ctaPositions: [],
    sectionMap: []
  };

  const socialProofKeywords = ['후기', '리뷰', '고객', '사용자', '기업', '파트너', '로고', 'testimonial', 'review', 'client', 'partner', '명이', '개사'];
  const faqKeywords = ['FAQ', '자주 묻는', '질문', '궁금'];
  const benefitKeywords = ['혜택', '장점', '이점', '왜', 'benefit', 'why', '좋은 이유', '효과'];
  const featureKeywords = ['기능', '특징', 'feature', '스펙', '사양'];
  const urgencyKeywords = ['한정', '마감', '오늘만', '선착순', 'limited', 'deadline'];

  let benefitCount = 0;
  let featureCount = 0;

  sections.forEach((section, idx) => {
    const text = (section.text || '').toLowerCase();
    const heading = (section.heading || '').toLowerCase();
    const combined = heading + ' ' + text;

    const sectionInfo = { index: idx, heading: section.heading || `섹션 ${idx + 1}`, type: 'general' };

    if (socialProofKeywords.some(k => combined.includes(k.toLowerCase()))) {
      analysis.hasSocialProof = true;
      if (!analysis.socialProofPosition) analysis.socialProofPosition = idx;
      sectionInfo.type = 'social-proof';
    }
    if (faqKeywords.some(k => combined.includes(k.toLowerCase()))) {
      analysis.hasFAQ = true;
      sectionInfo.type = 'faq';
    }
    if (benefitKeywords.some(k => combined.includes(k.toLowerCase()))) {
      analysis.hasBenefits = true;
      benefitCount++;
      sectionInfo.type = 'benefits';
    }
    if (featureKeywords.some(k => combined.includes(k.toLowerCase()))) {
      analysis.hasFeatures = true;
      featureCount++;
      sectionInfo.type = 'features';
    }
    if (urgencyKeywords.some(k => combined.includes(k.toLowerCase()))) {
      analysis.hasUrgency = true;
      sectionInfo.type = 'urgency';
    }
    if (section.hasCTA) {
      analysis.ctaCount++;
      analysis.ctaPositions.push(idx);
    }

    analysis.sectionMap.push(sectionInfo);
  });

  if (featureCount > 0) {
    analysis.benefitToFeatureRatio = `${benefitCount}:${featureCount}`;
  }

  return analysis;
}

function generateOverallScore(data) {
  const weights = {
    headline: 20,
    cta: 15,
    copywriting: 15,
    structure: 15,
    socialProof: 10,
    mobile: 10,
    speed: 10,
    ux: 5
  };

  const scores = {};

  // 헤드라인
  scores.headline = data.headline?.score || 0;

  // CTA
  let ctaScore = 0;
  if (data.firstViewCTA) {
    ctaScore += 40; // CTA 존재
    if (data.firstViewCTA.text && data.firstViewCTA.text.length > 0) ctaScore += 20;
    const ctaPower = [...POWER_WORDS_KO, ...POWER_WORDS_EN].some(w =>
      (data.firstViewCTA.text || '').toLowerCase().includes(w.toLowerCase()));
    if (ctaPower) ctaScore += 20;
    if (data.structure?.ctaCount >= 2) ctaScore += 20;
  }
  scores.cta = Math.min(ctaScore, 100);

  // 카피라이팅
  const copy = data.copywriting || {};
  let copyScore = 40;
  if (copy.customerFocus >= 60) copyScore += 20;
  if (copy.powerWordCount >= 5) copyScore += 20;
  if (copy.readabilityScore >= 70) copyScore += 20;
  scores.copywriting = Math.min(copyScore, 100);

  // 구조
  const struct = data.structure || {};
  let structScore = 30;
  if (struct.totalSections >= 4) structScore += 15;
  if (struct.hasSocialProof) structScore += 15;
  if (struct.hasFAQ) structScore += 10;
  if (struct.hasBenefits) structScore += 15;
  if (struct.ctaCount >= 2) structScore += 15;
  scores.structure = Math.min(structScore, 100);

  // 사회적 증거
  scores.socialProof = struct.hasSocialProof ? 80 : 20;
  if (struct.hasTestimonials) scores.socialProof = 100;

  // 모바일
  scores.mobile = data.isMobileResponsive ? 100 : 30;

  // 속도
  const loadTime = data.loadTime || 5000;
  if (loadTime < 2000) scores.speed = 100;
  else if (loadTime < 3000) scores.speed = 80;
  else if (loadTime < 5000) scores.speed = 60;
  else scores.speed = 30;

  // UX
  let uxScore = 60;
  if ((data.formFields || 0) <= 3) uxScore += 20;
  if ((data.externalLinks || 0) <= 2) uxScore += 20;
  scores.ux = Math.min(uxScore, 100);

  // 가중 평균
  let totalWeighted = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    totalWeighted += (scores[key] || 0) * weight;
    totalWeight += weight;
  }

  const overall = Math.round(totalWeighted / totalWeight);

  return { overall, scores, weights };
}

function generateSuggestions(data) {
  const suggestions = {
    quickFixes: [],
    abTests: [],
    headlines: [],
    ctas: []
  };

  const headline = data.headline || {};
  const copy = data.copywriting || {};
  const struct = data.structure || {};

  // Quick Fixes
  if (headline.score < 60) {
    suggestions.quickFixes.push({
      priority: 1,
      area: '헤드라인',
      issue: '헤드라인 설득력이 낮습니다',
      fix: '구체적 숫자와 혜택을 포함하는 헤드라인으로 교체하세요'
    });
  }
  if (!struct.hasSocialProof) {
    suggestions.quickFixes.push({
      priority: 2,
      area: '사회적 증거',
      issue: '사회적 증거가 없습니다',
      fix: '고객 후기, 사용 기업 로고, 또는 사용자 수를 추가하세요'
    });
  }
  if (struct.ctaCount < 2) {
    suggestions.quickFixes.push({
      priority: 3,
      area: 'CTA',
      issue: 'CTA 버튼이 부족합니다',
      fix: '페이지 중간과 하단에 CTA를 반복 배치하세요'
    });
  }
  if (copy.customerFocus < 50) {
    suggestions.quickFixes.push({
      priority: 4,
      area: '카피라이팅',
      issue: '"우리/저희" 중심의 카피입니다',
      fix: '"당신/고객님" 중심으로 카피를 재작성하세요'
    });
  }
  if (!struct.hasFAQ) {
    suggestions.quickFixes.push({
      priority: 5,
      area: 'FAQ',
      issue: 'FAQ 섹션이 없습니다',
      fix: '고객이 자주 묻는 질문 5-7개를 추가하세요'
    });
  }
  if (copy.readabilityScore < 60) {
    suggestions.quickFixes.push({
      priority: 6,
      area: '가독성',
      issue: '문장이 너무 깁니다',
      fix: '문장을 짧게 나누고, 불릿 포인트를 활용하세요'
    });
  }
  if (!struct.hasUrgency) {
    suggestions.quickFixes.push({
      priority: 7,
      area: '긴급성',
      issue: '긴급성/희소성 요소가 없습니다',
      fix: '한정 혜택, 마감일, 또는 남은 수량을 표시하세요'
    });
  }

  // 상위 5개만
  suggestions.quickFixes = suggestions.quickFixes.slice(0, 5);

  // A/B 테스트 추천
  suggestions.abTests = [
    {
      element: '헤드라인',
      description: '현재 헤드라인 vs 숫자+혜택 포함 헤드라인',
      expectedImpact: '전환율 10-30% 개선 가능'
    },
    {
      element: 'CTA 버튼',
      description: 'CTA 버튼 색상/텍스트 변경 테스트',
      expectedImpact: '클릭률 5-15% 개선 가능'
    },
    {
      element: '사회적 증거 위치',
      description: '후기/로고 섹션을 퍼스트뷰 바로 아래로 이동',
      expectedImpact: '스크롤 이탈률 감소 기대'
    }
  ];

  // 개선 헤드라인 제안 (현재 헤드라인 기반)
  const currentHL = headline.text || '서비스 소개';
  suggestions.headlines = [
    `${currentHL} — 지금 시작하면 30일 무료`,
    `10,000명이 선택한 ${currentHL.replace(/[.!?]/g, '')}의 비밀`,
    `3분 만에 시작하는 ${currentHL.replace(/[.!?]/g, '')} (무료 체험)`
  ];

  // 개선 CTA 제안
  const currentCTA = data.firstViewCTA?.text || '시작하기';
  suggestions.ctas = [
    `${currentCTA} — 무료로 시작하기`,
    '지금 바로 무료 체험 →',
    '30초 만에 시작하기 (카드 불필요)'
  ];

  return suggestions;
}

module.exports = {
  analyzeHeadline,
  analyzeCopywriting,
  analyzePageStructure,
  generateOverallScore,
  generateSuggestions,
  POWER_WORDS_KO,
  POWER_WORDS_EN
};
