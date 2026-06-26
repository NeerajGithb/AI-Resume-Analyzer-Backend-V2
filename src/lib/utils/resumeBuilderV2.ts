import { z } from 'zod';
import Groq from 'groq-sdk';
import { env } from '../config/env';
import { logger } from './logger';
import ResumeBuilderV2Model, { IResumeBuilderV2 } from '../db/models/ResumeBuilderV2Model';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

// ─── Input Zod schemas ────────────────────────────────────────────────────────

const ExperienceEntrySchema = z.object({
  jobTitle:    z.string().min(1, 'Job title is required'),
  employer:    z.string().optional().default(''),
  location:    z.string().optional().default(''),
  startDate:   z.string().optional().default(''),
  endDate:     z.string().optional().default(''),
  description: z.string().optional().default(''),
});

const EducationEntrySchema = z.object({
  degree:         z.string().min(1, 'Degree is required'),
  institution:    z.string().min(1, 'Institution is required'),
  location:       z.string().optional().default(''),
  graduationDate: z.string().optional().default(''),
  gpa:            z.string().optional(),
});

const SummaryInputSchema = z.object({
  objective:  z.string().optional().default(''),
  highlights: z.array(z.string()).optional().default([]),
});

export const BuilderV2InputSchema = z.object({
  // Contact
  name:     z.string().min(1, 'Name is required'),
  phone:    z.string().min(1, 'Phone is required'),
  email:    z.string().min(1, 'Email is required'),
  linkedin: z.string().optional(),
  github:   z.string().optional(),
  leetcode: z.string().optional(),
  location: z.string().optional(),

  // Target role
  targetRole: z.string().min(1, 'Target role is required'),

  // Rich arrays — the whole point of V2
  experience: z.array(ExperienceEntrySchema).optional().default([]),
  education:  z.array(EducationEntrySchema).optional().default([]),

  // Skills — three separate lists
  technicalSkills: z.string().optional().default(''),
  softSkills:      z.string().optional().default(''),
  languages:       z.string().optional().default(''),

  // Optional user-written summary
  summary: SummaryInputSchema.optional(),
});

export type BuilderV2Input = z.infer<typeof BuilderV2InputSchema>;

// ─── AI response schema ───────────────────────────────────────────────────────

const BuilderV2AIResponseSchema = z.object({
  summary: z.string(),
  projects: z
    .array(
      z.object({
        name:         z.string(),
        year:         z.string(),
        technologies: z.string(),
        url:          z.string().optional(),
        bullets:      z.array(z.string()).min(2),
      }),
    )
    .min(1),
  achievements: z.array(z.string()).min(1),
});

type BuilderV2AIResponse = z.infer<typeof BuilderV2AIResponseSchema>;

// ─── Public result type (returned to frontend) ────────────────────────────────

export interface BuilderV2Result {
  id: string;

  // Contact
  name: string;
  phone: string;
  email: string;
  linkedin?: string;
  github?: string;
  leetcode?: string;
  location?: string;

  // Target
  targetRole: string;

  // Rich arrays
  experience: Array<{
    jobTitle: string;
    employer: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    location: string;
    graduationDate: string;
    gpa?: string;
  }>;

  // Skills
  technicalSkills: string;
  softSkills: string;
  languages: string;

  // AI-generated
  summary: string;
  projects: Array<{
    name: string;
    year: string;
    technologies: string;
    url?: string;
    bullets: string[];
  }>;
  achievements: string[];

  createdAt: Date;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional resume writer. Your job is to ENHANCE the user's real content, not replace it.

STRICT RULES:
- Use ONLY the information the user provided — never invent employers, schools, or job titles
- If the user has work experience, extract project-like achievements FROM that experience instead of making up separate projects
- If the user has NO experience at all, create 1–2 simple, believable portfolio/personal projects based on their skills
- Summary must be 2 sentences max, 25–35 words — factual, no buzzwords, no exaggeration
- Achievements must be modest and real-sounding — no fake percentages or metrics
- Return ONLY valid JSON, no markdown fences`;

function buildV2Prompt(input: BuilderV2Input): string {
  // ── Experience block ──
  const hasExperience = input.experience.length > 0;
  let experienceBlock = '';
  if (hasExperience) {
    experienceBlock = input.experience
      .map((exp, i) => {
        const dates = `${exp.startDate || ''}${exp.endDate ? ` – ${exp.endDate}` : ''}`.trim();
        const employer = exp.employer ? ` at ${exp.employer}` : '';
        const location = exp.location ? ` (${exp.location})` : '';
        return [
          `Experience ${i + 1}: ${exp.jobTitle}${employer}${location}${dates ? ` | ${dates}` : ''}`,
          exp.description ? `  Description: ${exp.description}` : '',
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n\n');
  }

  // ── Education block ──
  const hasEducation = input.education.length > 0;
  let educationBlock = '';
  if (hasEducation) {
    educationBlock = input.education
      .map((edu, i) => {
        const parts = [
          `Education ${i + 1}: ${edu.degree} – ${edu.institution}`,
          edu.location ? `  Location: ${edu.location}` : '',
          edu.graduationDate ? `  Graduation: ${edu.graduationDate}` : '',
          edu.gpa ? `  GPA: ${edu.gpa}` : '',
        ].filter(Boolean);
        return parts.join('\n');
      })
      .join('\n\n');
  }

  // ── Skills block ──
  const skillsParts: string[] = [];
  if (input.technicalSkills) skillsParts.push(`Technical: ${input.technicalSkills}`);
  if (input.softSkills) skillsParts.push(`Soft: ${input.softSkills}`);
  if (input.languages) skillsParts.push(`Languages: ${input.languages}`);
  const skillsBlock = skillsParts.join('\n') || 'Not specified';

  // ── User summary ──
  const userSummary = input.summary?.objective?.trim();
  const summaryBlock = userSummary
    ? `\nUser-written summary (polish this, do not discard):\n"${userSummary}"`
    : '';

  // ── Projects instruction ──
  const projectsInstruction = hasExperience
    ? `The user has work experience. Extract 2 project-like highlights FROM the experience entries above. Each "project" should represent a piece of work or initiative they led/contributed to. Use the job title + employer as context — don't invent new employers or roles.`
    : `The user has NO work experience. Create 1–2 simple, realistic personal/portfolio projects that match their skills (${input.technicalSkills || 'listed below'}). Keep them believable for a student or beginner.`;

  return `Generate professional resume content for this person:

Name: ${input.name}
Target Role: ${input.targetRole}

=== WORK EXPERIENCE ===
${hasExperience ? experienceBlock : 'No work experience provided.'}

=== EDUCATION ===
${hasEducation ? educationBlock : 'No education provided.'}

=== SKILLS ===
${skillsBlock}
${summaryBlock}

=== INSTRUCTIONS ===
${projectsInstruction}

Achievements must come from the experience or education above — no invented awards.

RETURN THIS EXACT JSON FORMAT (no markdown fences):
{
  "summary": "<2 sentences, ${input.targetRole}, factual, 25-35 words>",
  "projects": [
    {
      "name": "<project or initiative name>",
      "year": "<year or range>",
      "technologies": "<comma-separated tech from their actual skills>",
      "url": "",
      "bullets": [
        "<what was built/done, 15-20 words>",
        "<technical detail or outcome, 15-20 words>",
        "<another detail, 10-15 words>"
      ]
    }
  ],
  "achievements": [
    "<Realistic achievement drawn from their experience, 10-15 words>",
    "<Another achievement, 10-15 words>"
  ]
}`;
}

// ─── Main generate function ───────────────────────────────────────────────────

export async function buildResumeV2(
  input: BuilderV2Input,
  userId?: string,
): Promise<BuilderV2Result> {
  const MAX_RETRIES = 3;
  let aiResponse: BuilderV2AIResponse | null = null;

  // Step 1: Call AI with retries
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info('BuilderV2: calling Groq', { model: 'llama-3.3-70b-versatile', attempt });

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildV2Prompt(input) },
        ],
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) throw new Error('Empty response from AI');

      const parsed = JSON.parse(content);
      aiResponse = BuilderV2AIResponseSchema.parse(parsed);

      logger.info('BuilderV2: AI content generated', { attempt });
      break;
    } catch (err: any) {
      logger.warn('BuilderV2: attempt failed', { attempt, error: err.message });
      if (attempt === MAX_RETRIES) {
        throw new Error('Failed to generate resume content after retries. Please try again.');
      }
    }
  }

  if (!aiResponse) throw new Error('Failed to generate resume content');

  // Step 2: Save to DB
  try {
    const doc = await ResumeBuilderV2Model.create({
      userId:         userId ?? undefined,
      name:           input.name,
      phone:          input.phone,
      email:          input.email,
      linkedin:       input.linkedin,
      github:         input.github,
      leetcode:       input.leetcode,
      location:       input.location,
      targetRole:     input.targetRole,
      experience:     input.experience,
      education:      input.education,
      technicalSkills: input.technicalSkills,
      softSkills:     input.softSkills,
      languages:      input.languages,
      summary:        aiResponse.summary,
      projects:       aiResponse.projects,
      achievements:   aiResponse.achievements,
    });

    logger.info('BuilderV2: saved to DB', { id: doc._id });
    return toResult(doc, input.targetRole);
  } catch (err: any) {
    logger.error('BuilderV2: DB save failed', { error: err.message });
    throw new Error('Failed to save resume. Please try again.');
  }
}

// ─── Get by ID ────────────────────────────────────────────────────────────────

export async function getResumeV2ById(id: string): Promise<BuilderV2Result | null> {
  try {
    const doc = await ResumeBuilderV2Model.findById(id);
    if (!doc) return null;
    return toResult(doc, doc.targetRole);
  } catch (err: any) {
    logger.error('BuilderV2: fetch failed', { id, error: err.message });
    return null;
  }
}

// ─── Helper: document → result ────────────────────────────────────────────────

function toResult(doc: IResumeBuilderV2, targetRole: string): BuilderV2Result {
  return {
    id:             doc._id.toString(),
    name:           doc.name,
    phone:          doc.phone,
    email:          doc.email,
    linkedin:       doc.linkedin,
    github:         doc.github,
    leetcode:       doc.leetcode,
    location:       doc.location,
    targetRole:     targetRole,
    experience:     doc.experience.map((e) => ({
      jobTitle:    e.jobTitle,
      employer:    e.employer,
      location:    e.location,
      startDate:   e.startDate,
      endDate:     e.endDate,
      description: e.description,
    })),
    education:      doc.education.map((e) => ({
      degree:         e.degree,
      institution:    e.institution,
      location:       e.location,
      graduationDate: e.graduationDate,
      gpa:            e.gpa,
    })),
    technicalSkills: doc.technicalSkills,
    softSkills:      doc.softSkills,
    languages:       doc.languages,
    summary:         doc.summary,
    projects:        doc.projects,
    achievements:    doc.achievements,
    createdAt:       doc.createdAt,
  };
}
