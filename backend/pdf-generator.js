// PDF 리포트 생성기
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function generatePDFReport(analysis, reportDir) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  let currentY = pageHeight - margin;

  function addPage() {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    currentY = pageHeight - margin;
    return page;
  }

  function drawText(page, text, x, y, options = {}) {
    const size = options.size || 11;
    const f = options.bold ? boldFont : font;
    const color = options.color || rgb(0.1, 0.1, 0.1);
    // Sanitize: replace non-ASCII with ? for PDF compatibility
    const safeText = text.replace(/[^\x20-\x7E]/g, '?');
    page.drawText(safeText, { x, y, size, font: f, color });
  }

  function drawLine(page, y) {
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8)
    });
  }

  // === Page 1: Cover ===
  let page = addPage();

  drawText(page, 'Landing Page CRO Analysis Report', margin, currentY, { size: 22, bold: true });
  currentY -= 30;
  drawText(page, `URL: ${analysis.url || 'N/A'}`, margin, currentY, { size: 11, color: rgb(0.4, 0.4, 0.4) });
  currentY -= 20;
  drawText(page, `Date: ${new Date().toLocaleDateString()}`, margin, currentY, { size: 11, color: rgb(0.4, 0.4, 0.4) });
  currentY -= 50;

  // Overall Score
  const score = analysis.scoring?.overall || 0;
  const scoreColor = score >= 70 ? rgb(0.2, 0.7, 0.2) : score >= 40 ? rgb(0.9, 0.7, 0.1) : rgb(0.9, 0.2, 0.2);
  drawText(page, `Overall CRO Score: ${score}/100`, margin, currentY, { size: 28, bold: true, color: scoreColor });
  currentY -= 50;

  drawLine(page, currentY);
  currentY -= 30;

  // Score Breakdown
  drawText(page, 'Score Breakdown', margin, currentY, { size: 16, bold: true });
  currentY -= 25;

  const scores = analysis.scoring?.scores || {};
  const labels = {
    headline: 'Headline', cta: 'CTA', copywriting: 'Copywriting',
    structure: 'Structure', socialProof: 'Social Proof', mobile: 'Mobile',
    speed: 'Speed', ux: 'UX'
  };

  for (const [key, label] of Object.entries(labels)) {
    const val = scores[key] || 0;
    const barColor = val >= 70 ? rgb(0.2, 0.7, 0.2) : val >= 40 ? rgb(0.9, 0.7, 0.1) : rgb(0.9, 0.2, 0.2);

    drawText(page, `${label}:`, margin, currentY, { size: 11 });
    // Draw bar background
    page.drawRectangle({ x: 160, y: currentY - 2, width: 200, height: 14, color: rgb(0.9, 0.9, 0.9) });
    // Draw bar fill
    page.drawRectangle({ x: 160, y: currentY - 2, width: val * 2, height: 14, color: barColor });
    drawText(page, `${val}`, 370, currentY, { size: 11, bold: true });
    currentY -= 22;
  }

  currentY -= 20;
  drawLine(page, currentY);
  currentY -= 30;

  // First View Analysis
  drawText(page, 'First View Analysis', margin, currentY, { size: 16, bold: true });
  currentY -= 25;

  const fv = analysis.firstView || {};
  drawText(page, `Headline: ${(fv.headline || 'Not found').substring(0, 80)}`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `Sub-headline: ${fv.subheadline ? 'Yes' : 'No'}`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `CTA Button: ${fv.ctaButton?.text || 'Not found'}`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `Hero Media: ${fv.heroMedia?.type || 'None'}`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `Load Time: ${analysis.loadTime || 0}ms`, margin, currentY, { size: 10 });
  currentY -= 30;

  // === Page 2: Details ===
  page = addPage();

  drawText(page, 'Copywriting Analysis', margin, currentY, { size: 16, bold: true });
  currentY -= 25;

  const copy = analysis.copywriting || {};
  drawText(page, `Customer Focus (You/Your ratio): ${copy.customerFocus || 0}%`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `Power Words Used: ${copy.powerWordCount || 0}`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `Readability Score: ${copy.readabilityScore || 0}/100`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `Avg Sentence Length: ${copy.avgSentenceLength || 0} chars`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `Urgency Words: ${(copy.urgencyWords || []).join(', ') || 'None'}`, margin, currentY, { size: 10 });
  currentY -= 40;

  // Page Structure
  drawText(page, 'Page Structure', margin, currentY, { size: 16, bold: true });
  currentY -= 25;

  const struct = analysis.structure || {};
  drawText(page, `Total Sections: ${struct.totalSections || 0}`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `Social Proof: ${struct.hasSocialProof ? 'Yes' : 'No'}`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `FAQ Section: ${struct.hasFAQ ? 'Yes' : 'No'}`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `Benefits Section: ${struct.hasBenefits ? 'Yes' : 'No'}`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `CTA Count: ${struct.ctaCount || 0}`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `Benefit:Feature Ratio: ${struct.benefitToFeatureRatio || 'N/A'}`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `Urgency Elements: ${struct.hasUrgency ? 'Yes' : 'No'}`, margin, currentY, { size: 10 });
  currentY -= 40;

  // Tech & UX
  drawText(page, 'Technical & UX', margin, currentY, { size: 16, bold: true });
  currentY -= 25;
  drawText(page, `Mobile Responsive: ${analysis.isMobileResponsive ? 'Yes' : 'No'}`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `Form Fields: ${analysis.formFields || 0}`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `External Links: ${analysis.externalLinks || 0}`, margin, currentY, { size: 10 });
  currentY -= 18;
  drawText(page, `Popups/Overlays: ${analysis.hasPopup ? 'Yes' : 'No'}`, margin, currentY, { size: 10 });
  currentY -= 40;

  // === Page 3: Suggestions ===
  page = addPage();

  drawText(page, 'Quick Fixes (TOP 5)', margin, currentY, { size: 16, bold: true });
  currentY -= 25;

  const suggestions = analysis.suggestions || {};
  (suggestions.quickFixes || []).forEach((fix, i) => {
    drawText(page, `${i + 1}. [${fix.area}] ${fix.issue}`, margin, currentY, { size: 10, bold: true });
    currentY -= 16;
    drawText(page, `   -> ${fix.fix}`, margin, currentY, { size: 10, color: rgb(0.2, 0.5, 0.2) });
    currentY -= 22;
  });

  currentY -= 20;
  drawText(page, 'A/B Test Recommendations', margin, currentY, { size: 16, bold: true });
  currentY -= 25;

  (suggestions.abTests || []).forEach((test, i) => {
    drawText(page, `${i + 1}. ${test.element}: ${test.description}`, margin, currentY, { size: 10 });
    currentY -= 16;
    drawText(page, `   Expected: ${test.expectedImpact}`, margin, currentY, { size: 10, color: rgb(0.3, 0.3, 0.7) });
    currentY -= 22;
  });

  currentY -= 20;
  drawText(page, 'Suggested Headlines', margin, currentY, { size: 16, bold: true });
  currentY -= 25;

  (suggestions.headlines || []).forEach((hl, i) => {
    const safe = hl.substring(0, 90);
    drawText(page, `${i + 1}. ${safe}`, margin, currentY, { size: 10 });
    currentY -= 20;
  });

  currentY -= 20;
  drawText(page, 'Suggested CTA Copy', margin, currentY, { size: 16, bold: true });
  currentY -= 25;

  (suggestions.ctas || []).forEach((cta, i) => {
    drawText(page, `${i + 1}. ${cta}`, margin, currentY, { size: 10 });
    currentY -= 20;
  });

  // Save
  const pdfBytes = await pdfDoc.save();
  const pdfPath = path.join(reportDir, 'report.pdf');
  fs.writeFileSync(pdfPath, pdfBytes);

  return pdfPath;
}

module.exports = { generatePDFReport };
