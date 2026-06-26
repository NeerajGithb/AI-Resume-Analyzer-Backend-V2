import { chromium } from 'playwright';
import { logger } from './logger';
import type { BuilderV2Result } from './resumeBuilderV2';

// ─── HTML generator ───────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateResumeV2HTML(data: BuilderV2Result): string {
  // ── Experience section ──
  const experienceHTML =
    data.experience.length > 0
      ? data.experience
          .map((exp) => {
            const dates = [exp.startDate, exp.endDate].filter(Boolean).join(' – ');
            return `
        <div class="exp-item">
          <div class="exp-header">
            <div>
              <span class="exp-title">${escapeHtml(exp.jobTitle)}</span>
              ${exp.employer ? `<span class="exp-employer"> — ${escapeHtml(exp.employer)}</span>` : ''}
            </div>
            <span class="exp-dates">${escapeHtml(dates)}</span>
          </div>
          ${exp.location ? `<div class="exp-location">${escapeHtml(exp.location)}</div>` : ''}
          ${
            exp.description
              ? `<ul class="exp-bullets">
              ${exp.description
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => `<li>${escapeHtml(line.replace(/^[•\-]\s*/, ''))}</li>`)
                .join('')}
            </ul>`
              : ''
          }
        </div>`;
          })
          .join('')
      : '<p class="empty-note">No work experience listed.</p>';

  // ── Education section ──
  const educationHTML =
    data.education.length > 0
      ? data.education
          .map(
            (edu) => `
        <div class="edu-item">
          <div class="edu-header">
            <span class="edu-degree">${escapeHtml(edu.degree)}</span>
            ${edu.graduationDate ? `<span class="edu-date">${escapeHtml(edu.graduationDate)}</span>` : ''}
          </div>
          <div class="edu-institution">${escapeHtml(edu.institution)}${edu.location ? `, ${escapeHtml(edu.location)}` : ''}</div>
          ${edu.gpa ? `<div class="edu-gpa">GPA: ${escapeHtml(edu.gpa)}</div>` : ''}
        </div>`,
          )
          .join('')
      : '<p class="empty-note">No education listed.</p>';

  // ── Skills section ──
  const skillsRows: string[] = [];
  if (data.technicalSkills)
    skillsRows.push(`<div><strong>Technical:</strong> ${escapeHtml(data.technicalSkills)}</div>`);
  if (data.softSkills)
    skillsRows.push(`<div><strong>Soft Skills:</strong> ${escapeHtml(data.softSkills)}</div>`);
  if (data.languages)
    skillsRows.push(`<div><strong>Languages:</strong> ${escapeHtml(data.languages)}</div>`);
  const skillsHTML = skillsRows.length
    ? skillsRows.join('')
    : '<p class="empty-note">No skills listed.</p>';

  // ── Projects section ──
  const projectsHTML = data.projects
    .map(
      (p) => `
      <div class="project">
        <div class="project-header">
          <span class="project-name">${escapeHtml(p.name)}</span>
          <span class="project-year">${escapeHtml(p.year)}</span>
        </div>
        <div class="project-tech">${escapeHtml(p.technologies)}</div>
        ${p.url ? `<div class="project-url">${escapeHtml(p.url)}</div>` : ''}
        <ul class="project-bullets">
          ${p.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}
        </ul>
      </div>`,
    )
    .join('');

  // ── Achievements ──
  const achievementsHTML =
    data.achievements.length > 0
      ? `<ul class="achievements-list">
          ${data.achievements.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}
        </ul>`
      : '';

  // ── Links ──
  const links = [
    data.linkedin ? `<a href="${escapeHtml(data.linkedin)}">LinkedIn</a>` : '',
    data.github ? `<a href="${escapeHtml(data.github)}">GitHub</a>` : '',
    data.leetcode ? `<a href="${escapeHtml(data.leetcode)}">LeetCode</a>` : '',
  ]
    .filter(Boolean)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(data.name)} – Resume</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10.5pt;
      line-height: 1.45;
      color: #222;
      background: #fff;
      padding: 36px 52px;
    }

    /* ── Header ── */
    .header {
      text-align: center;
      border-bottom: 2px solid #1d4ed8;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .name { font-size: 26pt; font-weight: 700; color: #1e3a8a; margin-bottom: 6px; }
    .contact { font-size: 9.5pt; color: #555; margin-bottom: 4px; }
    .links { font-size: 9pt; }
    .links a { color: #2563eb; text-decoration: none; margin: 0 6px; }

    /* ── Section ── */
    .section { margin-bottom: 16px; }
    .section-title {
      font-size: 11.5pt;
      font-weight: 700;
      color: #1d4ed8;
      text-transform: uppercase;
      letter-spacing: .4px;
      border-bottom: 1.5px solid #93c5fd;
      padding-bottom: 2px;
      margin-bottom: 8px;
    }

    /* ── Summary ── */
    .summary-text { text-align: justify; }

    /* ── Experience ── */
    .exp-item { margin-bottom: 12px; page-break-inside: avoid; }
    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .exp-title  { font-weight: 700; font-size: 10.5pt; }
    .exp-employer { font-size: 10pt; color: #444; }
    .exp-dates  { font-size: 9pt; color: #666; white-space: nowrap; }
    .exp-location { font-size: 9pt; color: #666; font-style: italic; margin-top: 1px; }
    .exp-bullets { margin: 4px 0 0 18px; }
    .exp-bullets li { margin-bottom: 2px; }

    /* ── Education ── */
    .edu-item { margin-bottom: 10px; page-break-inside: avoid; }
    .edu-header { display: flex; justify-content: space-between; align-items: baseline; }
    .edu-degree { font-weight: 700; font-size: 10.5pt; }
    .edu-date   { font-size: 9pt; color: #666; }
    .edu-institution { font-size: 9.5pt; color: #555; }
    .edu-gpa    { font-size: 9pt; color: #666; font-style: italic; }

    /* ── Skills ── */
    .skills-block { line-height: 1.7; }
    .skills-block div { margin-bottom: 2px; }

    /* ── Projects ── */
    .project { margin-bottom: 14px; page-break-inside: avoid; }
    .project-header { display: flex; justify-content: space-between; align-items: baseline; }
    .project-name { font-weight: 700; }
    .project-year { font-size: 9pt; color: #666; }
    .project-tech { font-size: 9pt; color: #555; font-style: italic; margin: 2px 0; }
    .project-url  { font-size: 8.5pt; color: #2563eb; margin-bottom: 3px; }
    .project-bullets { margin: 4px 0 0 18px; }
    .project-bullets li { margin-bottom: 2px; }

    /* ── Achievements ── */
    .achievements-list { margin-left: 18px; }
    .achievements-list li { margin-bottom: 4px; }

    .empty-note { color: #aaa; font-style: italic; font-size: 9pt; }

    @page { size: A4; margin: 14mm; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="name">${escapeHtml(data.name)}</div>
    <div class="contact">
      ${escapeHtml(data.email)} | ${escapeHtml(data.phone)}${data.location ? ` | ${escapeHtml(data.location)}` : ''}
    </div>
    ${links ? `<div class="links">${links}</div>` : ''}
  </div>

  <!-- Summary -->
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p class="summary-text">${escapeHtml(data.summary)}</p>
  </div>

  <!-- Experience -->
  <div class="section">
    <div class="section-title">Work Experience</div>
    ${experienceHTML}
  </div>

  <!-- Education -->
  <div class="section">
    <div class="section-title">Education</div>
    ${educationHTML}
  </div>

  <!-- Projects -->
  ${data.projects.length > 0 ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${projectsHTML}
  </div>` : ''}

  <!-- Skills -->
  <div class="section">
    <div class="section-title">Skills</div>
    <div class="skills-block">${skillsHTML}</div>
  </div>

  <!-- Achievements -->
  ${data.achievements.length > 0 ? `
  <div class="section">
    <div class="section-title">Achievements</div>
    ${achievementsHTML}
  </div>` : ''}
</body>
</html>`;
}

// ─── Public function ──────────────────────────────────────────────────────────

export async function generateResumeV2PDF(data: BuilderV2Result): Promise<Buffer> {
  let browser;
  try {
    logger.info('BuilderV2: starting PDF generation', { name: data.name });

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await (await browser.newContext()).newPage();
    await page.setContent(generateResumeV2HTML(data), { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', right: '14mm', bottom: '14mm', left: '14mm' },
    });

    logger.info('BuilderV2: PDF generated', { size: pdfBuffer.length });
    return pdfBuffer;
  } catch (err: any) {
    logger.error('BuilderV2: PDF generation failed', { error: err.message });
    throw new Error('Failed to generate PDF. Please try again.');
  } finally {
    await browser?.close();
  }
}
