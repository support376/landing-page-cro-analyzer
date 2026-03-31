const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const { analyzeHeadline, analyzeCopywriting, analyzePageStructure, generateOverallScore, generateSuggestions } = require('../backend/analyzer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, competitors } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL이 필요합니다' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    // --- Desktop 크롤링 ---
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    const loadTime = Date.now() - startTime;

    // 데스크탑 스크린샷
    const desktopScreenshot = await page.screenshot({ encoding: 'base64', fullPage: true });
    const firstViewScreenshot = await page.screenshot({ encoding: 'base64', fullPage: false });

    // 퍼스트뷰 분석
    const firstView = await page.evaluate(() => {
      const vh = window.innerHeight;
      let headline = '';
      for (const sel of ['h1', '[class*="hero"] h1', '[class*="hero"] h2', '[class*="headline"]']) {
        const el = document.querySelector(sel);
        if (el && el.getBoundingClientRect().top < vh) { headline = el.innerText.trim(); break; }
      }
      let subheadline = '';
      for (const sel of ['h1 + p', 'h1 + h2', '[class*="hero"] p', '[class*="subtitle"]']) {
        const el = document.querySelector(sel);
        if (el && el.getBoundingClientRect().top < vh) { subheadline = el.innerText.trim(); break; }
      }
      let ctaButton = null;
      for (const sel of ['a[class*="cta"]','button[class*="cta"]','a[class*="btn"]','button[class*="btn"]','[class*="hero"] a','[class*="hero"] button','button','a.btn']) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const r = el.getBoundingClientRect();
          if (r.top < vh && r.top > 0 && el.innerText.trim().length > 0) {
            const s = window.getComputedStyle(el);
            ctaButton = { text: el.innerText.trim(), backgroundColor: s.backgroundColor, color: s.color, fontSize: s.fontSize, width: Math.round(r.width), height: Math.round(r.height), positionY: Math.round(r.top) };
            break;
          }
        }
        if (ctaButton) break;
      }
      let heroMedia = null;
      const img = document.querySelector('[class*="hero"] img, header img, main img:first-of-type');
      if (img && img.getBoundingClientRect().top < vh) heroMedia = { type: 'image' };
      const vid = document.querySelector('video, iframe[src*="youtube"]');
      if (vid && vid.getBoundingClientRect().top < vh) heroMedia = { type: 'video' };
      return { headline, subheadline, ctaButton, heroMedia };
    });

    // 섹션 구조
    const sections = await page.evaluate(() => {
      const secs = []; const seen = new Set();
      document.querySelectorAll('section, [class*="section"], main > div, article').forEach(el => {
        const r = el.getBoundingClientRect();
        const k = `${Math.round(r.top)}-${Math.round(r.height)}`;
        if (seen.has(k) || r.height < 50) return; seen.add(k);
        const h = el.querySelector('h1, h2, h3');
        const btns = el.querySelectorAll('a[class*="btn"], button[class*="btn"], a[class*="cta"], button');
        secs.push({ heading: h ? h.innerText.trim() : '', text: el.innerText.trim().substring(0, 500), hasCTA: btns.length > 0 });
      });
      return secs;
    });

    const fullText = await page.evaluate(() => document.body.innerText || '');

    const allCTAs = await page.evaluate(() => {
      const ctas = [];
      document.querySelectorAll('a[class*="btn"], button[class*="btn"], a[class*="cta"], button[type="submit"]').forEach(el => {
        const t = el.innerText.trim();
        if (t.length > 0 && t.length < 100) {
          const r = el.getBoundingClientRect(); const s = window.getComputedStyle(el);
          ctas.push({ text: t, top: Math.round(r.top + window.scrollY), backgroundColor: s.backgroundColor, color: s.color });
        }
      });
      return ctas;
    });

    const externalLinks = await page.evaluate((pageUrl) => {
      let count = 0;
      document.querySelectorAll('a[href]').forEach(a => {
        try { if (new URL(a.href).hostname !== new URL(pageUrl).hostname) count++; } catch {}
      });
      return count;
    }, url);

    const formFields = await page.evaluate(() => {
      let total = 0;
      document.querySelectorAll('form').forEach(f => { total += f.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), select, textarea').length; });
      return total;
    });

    const hasPopup = await page.evaluate(() => document.querySelectorAll('[class*="popup"], [class*="modal"], [class*="overlay"]').length > 0);
    const meta = await page.evaluate(() => ({
      title: document.title,
      viewport: document.querySelector('meta[name="viewport"]')?.content || ''
    }));

    // 모바일
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 375, height: 812, isMobile: true });
    await mobilePage.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    const mobileScreenshot = await mobilePage.screenshot({ encoding: 'base64', fullPage: false });
    const isMobileResponsive = await mobilePage.evaluate(() => {
      const vp = document.querySelector('meta[name="viewport"]');
      return !!(vp && vp.content.includes('width=device-width') && document.body.scrollWidth <= window.innerWidth + 10);
    });
    await mobilePage.close();
    await page.close();

    // --- 분석 ---
    const headlineAnalysis = analyzeHeadline(firstView.headline);
    const copywriting = analyzeCopywriting(fullText);
    const structure = analyzePageStructure(sections);

    const analysisData = {
      url, loadTime, isMobileResponsive, externalLinks, formFields, hasPopup, meta,
      screenshots: {
        desktopFull: `data:image/png;base64,${desktopScreenshot}`,
        firstView: `data:image/png;base64,${firstViewScreenshot}`,
        mobile: `data:image/png;base64,${mobileScreenshot}`
      },
      firstView, firstViewCTA: firstView.ctaButton, sections, allCTAs,
      headline: headlineAnalysis, copywriting, structure
    };

    analysisData.scoring = generateOverallScore(analysisData);
    analysisData.suggestions = generateSuggestions(analysisData);

    // 경쟁사
    let competitorResults = [];
    if (competitors && competitors.length > 0) {
      for (const compUrl of competitors.slice(0, 3)) {
        try {
          const cp = await browser.newPage();
          await cp.setViewport({ width: 1440, height: 900 });
          const ct = Date.now();
          await cp.goto(compUrl, { waitUntil: 'networkidle2', timeout: 20000 });
          const clt = Date.now() - ct;
          const cfv = await cp.evaluate(() => {
            const h = document.querySelector('h1'); return { headline: h ? h.innerText.trim() : '' };
          });
          const cft = await cp.evaluate(() => document.body.innerText || '');
          const csec = await cp.evaluate(() => {
            const s = []; document.querySelectorAll('section, [class*="section"], main > div').forEach(el => {
              const btns = el.querySelectorAll('a[class*="btn"], button[class*="btn"], button'); s.push({ heading: '', text: '', hasCTA: btns.length > 0 });
            }); return s;
          });
          await cp.close();
          const chl = analyzeHeadline(cfv.headline);
          const cco = analyzeCopywriting(cft);
          const cst = analyzePageStructure(csec);
          const cdata = { url: compUrl, headline: chl, copywriting: cco, structure: cst, loadTime: clt, ctaCount: cst.ctaCount, sectionCount: cst.totalSections };
          cdata.scoring = generateOverallScore({ ...cdata, firstViewCTA: null, isMobileResponsive: true, externalLinks: 0, formFields: 0 });
          competitorResults.push(cdata);
        } catch (e) { competitorResults.push({ url: compUrl, error: e.message }); }
      }
    }
    analysisData.competitors = competitorResults;
    delete analysisData.fullText;

    res.status(200).json({ status: 'complete', data: analysisData });

  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
};
