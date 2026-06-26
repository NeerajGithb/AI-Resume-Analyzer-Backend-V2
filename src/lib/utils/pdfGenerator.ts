import { chromium } from 'playwright';
import { logger } from './logger';

export interface ResumeData {
  name: string;
  phone: string;
  email: string;
  linkedin?: string;
  github?: string;
  leetcode?: string;
  location?: string;
  summary: string;
  degree: string;
  institution: string;
  graduationYear?: string;
  projects: Array<{
    name: string;
    year: string;
    technologies: string;
    url?: string;
    bullets: string[];
  }>;
  skills: string;
  achievements: string[];
}

function generateResumeHTML(data: ResumeData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.name} - Resume</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #333;
      background: white;
      padding: 40px 60px;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    
    /* Header */
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 15px;
    }
    
    .name {
      font-size: 28pt;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 8px;
    }
    
    .contact-info {
      font-size: 10pt;
      color: #555;
      margin-bottom: 5px;
    }
    
    .links {
      font-size: 9pt;
      margin-top: 5px;
    }
    
    .links a {
      color: #2563eb;
      text-decoration: none;
      margin: 0 8px;
    }
    
    /* Sections */
    .section {
      margin-bottom: 18px;
    }
    
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      color: #1e40af;
      text-transform: uppercase;
      border-bottom: 1.5px solid #2563eb;
      padding-bottom: 3px;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }
    
    .section-content {
      margin-left: 0;
    }
    
    /* Summary */
    .summary-text {
      text-align: justify;
      line-height: 1.5;
    }
    
    /* Education */
    .education-item {
      margin-bottom: 8px;
    }
    
    .degree {
      font-weight: bold;
      font-size: 11pt;
    }
    
    .institution {
      color: #555;
      font-size: 10pt;
    }
    
    .graduation-year {
      color: #666;
      font-size: 9pt;
      font-style: italic;
    }
    
    /* Projects */
    .project {
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    
    .project-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 3px;
    }
    
    .project-name {
      font-weight: bold;
      font-size: 11pt;
    }
    
    .project-year {
      font-size: 9pt;
      color: #666;
    }
    
    .project-tech {
      font-size: 9pt;
      color: #555;
      font-style: italic;
      margin-bottom: 5px;
    }
    
    .project-url {
      font-size: 8pt;
      color: #2563eb;
      margin-bottom: 5px;
    }
    
    .project-bullets {
      margin-left: 20px;
      margin-top: 5px;
    }
    
    .project-bullets li {
      margin-bottom: 3px;
      line-height: 1.4;
    }
    
    /* Skills */
    .skills-text {
      line-height: 1.6;
    }
    
    /* Achievements */
    .achievements-list {
      margin-left: 20px;
    }
    
    .achievements-list li {
      margin-bottom: 5px;
      line-height: 1.4;
    }
    
    /* Print optimization */
    @media print {
      body {
        padding: 0;
      }
      
      .section {
        page-break-inside: avoid;
      }
    }
    
    @page {
      size: A4;
      margin: 15mm;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="name">${data.name}</div>
      <div class="contact-info">
        ${data.email} | ${data.phone}${data.location ? ` | ${data.location}` : ''}
      </div>
      ${(data.linkedin || data.github || data.leetcode) ? `
      <div class="links">
        ${data.linkedin ? `<a href="${data.linkedin}">LinkedIn</a>` : ''}
        ${data.github ? `<a href="${data.github}">GitHub</a>` : ''}
        ${data.leetcode ? `<a href="${data.leetcode}">LeetCode</a>` : ''}
      </div>
      ` : ''}
    </div>

    <!-- Professional Summary -->
    <div class="section">
      <div class="section-title">Professional Summary</div>
      <div class="section-content">
        <p class="summary-text">${data.summary}</p>
      </div>
    </div>

    <!-- Education -->
    <div class="section">
      <div class="section-title">Education</div>
      <div class="section-content">
        <div class="education-item">
          <div class="degree">${data.degree}</div>
          <div class="institution">${data.institution}</div>
          ${data.graduationYear ? `<div class="graduation-year">${data.graduationYear}</div>` : ''}
        </div>
      </div>
    </div>

    <!-- Projects -->
    <div class="section">
      <div class="section-title">Projects</div>
      <div class="section-content">
        ${data.projects.map(project => `
          <div class="project">
            <div class="project-header">
              <span class="project-name">${project.name}</span>
              <span class="project-year">${project.year}</span>
            </div>
            <div class="project-tech">${project.technologies}</div>
            ${project.url ? `<div class="project-url">${project.url}</div>` : ''}
            <ul class="project-bullets">
              ${project.bullets.map(bullet => `<li>${bullet}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Technical Skills -->
    <div class="section">
      <div class="section-title">Technical Skills</div>
      <div class="section-content">
        <p class="skills-text">${data.skills}</p>
      </div>
    </div>

    <!-- Achievements -->
    ${data.achievements.length > 0 ? `
    <div class="section">
      <div class="section-title">Achievements</div>
      <div class="section-content">
        <ul class="achievements-list">
          ${data.achievements.map(achievement => `<li>${achievement}</li>`).join('')}
        </ul>
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>
  `;
}

export async function generateResumePDF(data: ResumeData): Promise<Buffer> {
  let browser;
  
  try {
    logger.info('Starting PDF generation', { name: data.name });
    
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Generate HTML
    const html = generateResumeHTML(data);
    
    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle',
    });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm',
      },
    });
    
    logger.info('PDF generated successfully', { size: pdfBuffer.length });
    
    return pdfBuffer;
  } catch (error: any) {
    logger.error('Failed to generate PDF', { error: error.message });
    throw new Error('Failed to generate PDF. Please try again.');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
