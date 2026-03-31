// Puppeteer 기반 랜딩페이지 크롤러
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function crawlPage(url, reportDir) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const results = {
    url,
    timestamp: new Date().toISOString(),
    screenshots: {},
    firstView: {},
    sections: [],
    fullText: '',
    links: [],
    forms: [],
    meta: {},
    loadTime: 0,
    isMobileResponsive: false,
    externalLinks: 0,
    formFields: 0,
    hasPopup: false,
    heroMedia: null,
    allCTAs: []
  };

  try {
    // --- Desktop 분석 ---
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    results.loadTime = Date.now() - startTime;

    // 팝업/오버레이 닫기 시도
    await page.evaluate(() => {
      document.querySelectorAll('[class*="popup"], [class*="modal"], [class*="overlay"]').forEach(el => {
        if (el.style.display !== 'none') el.style.display = 'none';
      });
    });

    // 데스크탑 전체 스크린샷
    const desktopScreenshot = path.join(reportDir, 'desktop-full.png');
    await page.screenshot({ path: desktopScreenshot, fullPage: true });
    results.screenshots.desktopFull = 'desktop-full.png';

    // 퍼스트뷰 스크린샷
    const firstViewScreenshot = path.join(reportDir, 'first-view.png');
    await page.screenshot({ path: firstViewScreenshot, fullPage: false });
    results.screenshots.firstView = 'first-view.png';

    // 퍼스트뷰 분석
    results.firstView = await page.evaluate(() => {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // 헤드라인 찾기
      let headline = '';
      const headlineSelectors = ['h1', '[class*="hero"] h1', '[class*="hero"] h2', '[class*="headline"]', '[class*="title"]:first-of-type'];
      for (const sel of headlineSelectors) {
        const el = document.querySelector(sel);
        if (el && el.getBoundingClientRect().top < viewportHeight) {
          headline = el.innerText.trim();
          break;
        }
      }

      // 서브헤드라인
      let subheadline = '';
      const subSelectors = ['h1 + p', 'h1 + h2', '[class*="hero"] p', '[class*="subtitle"]', '[class*="subheadline"]'];
      for (const sel of subSelectors) {
        const el = document.querySelector(sel);
        if (el && el.getBoundingClientRect().top < viewportHeight) {
          subheadline = el.innerText.trim();
          break;
        }
      }

      // CTA 버튼
      let ctaButton = null;
      const ctaSelectors = [
        'a[class*="cta"]', 'button[class*="cta"]',
        'a[class*="btn"]', 'button[class*="btn"]',
        'a[class*="button"]', 'button[class*="button"]',
        '[class*="hero"] a', '[class*="hero"] button',
        'a[href*="signup"]', 'a[href*="register"]', 'a[href*="start"]',
        'button', 'a.btn'
      ];
      for (const sel of ctaSelectors) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const rect = el.getBoundingClientRect();
          if (rect.top < viewportHeight && rect.top > 0 && el.innerText.trim().length > 0) {
            const styles = window.getComputedStyle(el);
            ctaButton = {
              text: el.innerText.trim(),
              backgroundColor: styles.backgroundColor,
              color: styles.color,
              fontSize: styles.fontSize,
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              positionY: Math.round(rect.top),
              positionX: Math.round(rect.left)
            };
            break;
          }
        }
        if (ctaButton) break;
      }

      // 히어로 이미지/영상
      let heroMedia = null;
      const imgEl = document.querySelector('[class*="hero"] img, header img, main img:first-of-type');
      if (imgEl && imgEl.getBoundingClientRect().top < viewportHeight) {
        heroMedia = { type: 'image', src: imgEl.src };
      }
      const videoEl = document.querySelector('video, [class*="hero"] video, iframe[src*="youtube"], iframe[src*="vimeo"]');
      if (videoEl && videoEl.getBoundingClientRect().top < viewportHeight) {
        heroMedia = { type: 'video', src: videoEl.src };
      }

      return { headline, subheadline, ctaButton, heroMedia, viewportHeight, viewportWidth };
    });

    // 전체 섹션 구조 매핑
    results.sections = await page.evaluate(() => {
      const sections = [];
      const sectionEls = document.querySelectorAll('section, [class*="section"], main > div, article');
      const seen = new Set();

      sectionEls.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const key = `${Math.round(rect.top)}-${Math.round(rect.height)}`;
        if (seen.has(key) || rect.height < 50) return;
        seen.add(key);

        const heading = el.querySelector('h1, h2, h3');
        const buttons = el.querySelectorAll('a[class*="btn"], button[class*="btn"], a[class*="cta"], button[class*="cta"], a[class*="button"], button');
        const hasCTA = buttons.length > 0;

        sections.push({
          index: sections.length,
          heading: heading ? heading.innerText.trim() : '',
          text: el.innerText.trim().substring(0, 500),
          top: Math.round(rect.top + window.scrollY),
          height: Math.round(rect.height),
          hasCTA,
          ctaTexts: Array.from(buttons).map(b => b.innerText.trim()).filter(t => t.length > 0)
        });
      });
      return sections;
    });

    // 전체 텍스트 추출
    results.fullText = await page.evaluate(() => {
      return document.body.innerText || '';
    });

    // 모든 CTA 수집
    results.allCTAs = await page.evaluate(() => {
      const ctas = [];
      const selectors = 'a[class*="btn"], button[class*="btn"], a[class*="cta"], button[class*="cta"], a[class*="button"], button[type="submit"]';
      document.querySelectorAll(selectors).forEach(el => {
        const text = el.innerText.trim();
        if (text.length > 0 && text.length < 100) {
          const rect = el.getBoundingClientRect();
          const styles = window.getComputedStyle(el);
          ctas.push({
            text,
            top: Math.round(rect.top + window.scrollY),
            backgroundColor: styles.backgroundColor,
            color: styles.color
          });
        }
      });
      return ctas;
    });

    // 링크 분석
    const linkData = await page.evaluate((pageUrl) => {
      const links = [];
      let externalCount = 0;
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.href;
        try {
          const linkUrl = new URL(href);
          const pageUrlObj = new URL(pageUrl);
          const isExternal = linkUrl.hostname !== pageUrlObj.hostname;
          if (isExternal) externalCount++;
          links.push({ href, text: a.innerText.trim().substring(0, 50), isExternal });
        } catch {}
      });
      return { links, externalCount };
    }, url);
    results.links = linkData.links;
    results.externalLinks = linkData.externalCount;

    // 폼 분석
    const formData = await page.evaluate(() => {
      const forms = [];
      let totalFields = 0;
      document.querySelectorAll('form').forEach(form => {
        const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), select, textarea');
        totalFields += inputs.length;
        forms.push({
          action: form.action,
          fieldCount: inputs.length,
          fields: Array.from(inputs).map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder }))
        });
      });
      return { forms, totalFields };
    });
    results.forms = formData.forms;
    results.formFields = formData.totalFields;

    // 팝업 감지
    results.hasPopup = await page.evaluate(() => {
      const popupSelectors = '[class*="popup"], [class*="modal"], [class*="overlay"], [class*="lightbox"]';
      return document.querySelectorAll(popupSelectors).length > 0;
    });

    // 메타 정보
    results.meta = await page.evaluate(() => {
      return {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
        ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
        ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
        viewport: document.querySelector('meta[name="viewport"]')?.content || ''
      };
    });

    // --- 모바일 분석 ---
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 375, height: 812, isMobile: true });
    await mobilePage.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const mobileScreenshot = path.join(reportDir, 'mobile.png');
    await mobilePage.screenshot({ path: mobileScreenshot, fullPage: false });
    results.screenshots.mobile = 'mobile.png';

    // 모바일 반응형 체크
    results.isMobileResponsive = await mobilePage.evaluate(() => {
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      const hasViewport = viewportMeta && viewportMeta.content.includes('width=device-width');
      const bodyWidth = document.body.scrollWidth;
      const noHorizontalScroll = bodyWidth <= window.innerWidth + 10;
      return hasViewport && noHorizontalScroll;
    });

    // 태블릿 스크린샷
    const tabletPage = await browser.newPage();
    await tabletPage.setViewport({ width: 768, height: 1024 });
    await tabletPage.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const tabletScreenshot = path.join(reportDir, 'tablet.png');
    await tabletPage.screenshot({ path: tabletScreenshot, fullPage: false });
    results.screenshots.tablet = 'tablet.png';

    await mobilePage.close();
    await tabletPage.close();
    await page.close();

  } catch (err) {
    results.error = err.message;
    console.error('Crawl error:', err.message);
  } finally {
    await browser.close();
  }

  return results;
}

module.exports = { crawlPage };
