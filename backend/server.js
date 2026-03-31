const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { crawlPage } = require('./crawler');
const { analyzeHeadline, analyzeCopywriting, analyzePageStructure, generateOverallScore, generateSuggestions } = require('./analyzer');
const { generatePDFReport } = require('./pdf-generator');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// 분석 상태 저장
const analyses = {};

// URL 분석 시작
app.post('/api/analyze', async (req, res) => {
  const { url, competitors } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL이 필요합니다' });
  }

  const id = uuidv4();
  const reportDir = path.join(__dirname, 'reports', id);
  fs.mkdirSync(reportDir, { recursive: true });

  analyses[id] = { status: 'crawling', progress: 10, url };
  res.json({ id, status: 'started' });

  // 비동기 분석 실행
  (async () => {
    try {
      // 1. 크롤링
      analyses[id] = { ...analyses[id], status: 'crawling', progress: 20 };
      const crawlData = await crawlPage(url, reportDir);

      if (crawlData.error) {
        analyses[id] = { ...analyses[id], status: 'error', error: crawlData.error };
        return;
      }

      analyses[id] = { ...analyses[id], status: 'analyzing', progress: 60 };

      // 2. 분석
      const headline = analyzeHeadline(crawlData.firstView?.headline);
      const copywriting = analyzeCopywriting(crawlData.fullText);
      const structure = analyzePageStructure(crawlData.sections);

      const analysisData = {
        url,
        timestamp: crawlData.timestamp,
        loadTime: crawlData.loadTime,
        isMobileResponsive: crawlData.isMobileResponsive,
        externalLinks: crawlData.externalLinks,
        formFields: crawlData.formFields,
        hasPopup: crawlData.hasPopup,
        screenshots: crawlData.screenshots,
        firstView: crawlData.firstView,
        firstViewCTA: crawlData.firstView?.ctaButton,
        sections: crawlData.sections,
        allCTAs: crawlData.allCTAs,
        forms: crawlData.forms,
        meta: crawlData.meta,
        headline,
        copywriting,
        structure
      };

      // 3. 점수 계산
      const scoring = generateOverallScore(analysisData);
      analysisData.scoring = scoring;

      // 4. 개선 제안
      const suggestions = generateSuggestions(analysisData);
      analysisData.suggestions = suggestions;

      analyses[id] = { ...analyses[id], status: 'generating-report', progress: 80 };

      // 5. JSON 저장
      const jsonPath = path.join(reportDir, 'analysis.json');
      fs.writeFileSync(jsonPath, JSON.stringify(analysisData, null, 2));

      // 6. PDF 생성
      await generatePDFReport(analysisData, reportDir);

      // 7. 경쟁사 분석 (있으면)
      let competitorResults = [];
      if (competitors && competitors.length > 0) {
        for (const compUrl of competitors.slice(0, 3)) {
          try {
            const compDir = path.join(reportDir, 'comp-' + Buffer.from(compUrl).toString('base64').substring(0, 10));
            fs.mkdirSync(compDir, { recursive: true });
            const compCrawl = await crawlPage(compUrl, compDir);
            const compHL = analyzeHeadline(compCrawl.firstView?.headline);
            const compCopy = analyzeCopywriting(compCrawl.fullText);
            const compStruct = analyzePageStructure(compCrawl.sections);
            const compData = {
              url: compUrl,
              headline: compHL,
              copywriting: compCopy,
              structure: compStruct,
              loadTime: compCrawl.loadTime,
              ctaCount: compStruct.ctaCount,
              sectionCount: compStruct.totalSections
            };
            const compScoring = generateOverallScore({
              ...compData,
              firstViewCTA: compCrawl.firstView?.ctaButton,
              isMobileResponsive: compCrawl.isMobileResponsive,
              externalLinks: compCrawl.externalLinks,
              formFields: compCrawl.formFields
            });
            compData.scoring = compScoring;
            competitorResults.push(compData);
          } catch (e) {
            competitorResults.push({ url: compUrl, error: e.message });
          }
        }
      }
      analysisData.competitors = competitorResults;

      // 최종 JSON 저장
      fs.writeFileSync(jsonPath, JSON.stringify(analysisData, null, 2));

      analyses[id] = {
        ...analyses[id],
        status: 'complete',
        progress: 100,
        data: analysisData
      };

    } catch (err) {
      console.error('Analysis error:', err);
      analyses[id] = { ...analyses[id], status: 'error', error: err.message };
    }
  })();
});

// 분석 상태 조회
app.get('/api/analyze/:id', (req, res) => {
  const analysis = analyses[req.params.id];
  if (!analysis) {
    return res.status(404).json({ error: '분석을 찾을 수 없습니다' });
  }

  // fullText 제외 (너무 큼)
  const response = { ...analysis };
  if (response.data) {
    response.data = { ...response.data };
    delete response.data.fullText;
  }

  res.json(response);
});

// 리포트 파일 목록
app.get('/api/reports/:id/files', (req, res) => {
  const reportDir = path.join(__dirname, 'reports', req.params.id);
  if (!fs.existsSync(reportDir)) {
    return res.status(404).json({ error: '리포트를 찾을 수 없습니다' });
  }
  const files = fs.readdirSync(reportDir).filter(f => !f.startsWith('comp-'));
  res.json({ files });
});

// 프로덕션: 프론트엔드 정적 파일 서빙
const clientBuild = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/reports')) {
      res.sendFile(path.join(clientBuild, 'index.html'));
    }
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
