import { z } from 'zod';
import Groq from 'groq-sdk';
import { env } from '../config/env';
import { logger } from './logger';
import ResumeBuilderModel, { IResumeBuilder } from '../db/models/ResumeBuilderModel';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

// ─── Input schema ─────────────────────────────────────────────────────────────
export const BuilderInputSchema = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string().email(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  leetcode: z.string().optional(),
  degree: z.string(),
  institution: z.string(),
  location: z.string().optional(),
  graduationYear: z.string().optional(),
  targetRole: z.string(),
  projectsExperience: z.string().optional(),
  skills: z.string(),
});

export type BuilderInput = z.infer<typeof BuilderInputSchema>;

// ─── Response schema ──────────────────────────────────────────────────────────
const BuilderAIResponseSchema = z.object({
  summary: z.string(),
  projects: z.array(z.object({
    name: z.string(),
    year: z.string(),
    technologies: z.string(),
    url: z.string().optional(),
    bullets: z.array(z.string()).min(2),
  })).min(2),
  achievements: z.array(z.string()).min(2),
});

export type BuilderAIResponse = z.infer<typeof BuilderAIResponseSchema>;

export interface BuilderResult {
  id: string;
  name: string;
  phone: string;
  email: string;
  linkedin?: string;
  github?: string;
  leetcode?: string;
  degree: string;
  institution: string;
  location?: string;
  graduationYear?: string;
  skills: string;
  targetRole: string;
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

// ─── Prompts ──────────────────────────────────────────────────────────────────
const SYSTEM = `You are a professional resume writer. Generate REALISTIC resume content based on user's actual information.

CRITICAL RULES - NO FAKE CONTENT:
- Use ONLY information provided by the user
- If user mentioned projects, base content on those REAL projects
- If no projects mentioned, create simple, believable project examples
- NO exaggerated claims like "increased performance by 500%"
- NO fake metrics or numbers
- NO overconfident language like "expert", "master", "proficient"
- Use modest, factual language: "Built", "Developed", "Implemented", "Created"
- Keep it honest and realistic for their experience level
- Return ONLY valid JSON`;

function buildPrompt(input: BuilderInput): string {
  const projectsContext = input.projectsExperience 
    ? `\n\nREAL PROJECTS USER MENTIONED:\n${input.projectsExperience}\n\nUse these as basis for project section. Keep descriptions factual.`
    : '\n\nUser has not mentioned specific projects. Create 2 simple, realistic project examples using their skills.';

  return `Generate professional resume content for this person:

Name: ${input.name}
Target Role: ${input.targetRole}
Education: ${input.degree} from ${input.institution}
Skills: ${input.skills}${projectsContext}

Generate CONCISE, REALISTIC content that fits on ONE page:
1. Professional summary (2 sentences max, 25-30 words) - Focus on their skills and education, NO exaggeration
2. 2 projects with 3-4 bullet points each - Base on their real projects if provided, otherwise create simple examples
3. 2 achievements - Keep realistic and modest

RETURN THIS EXACT JSON FORMAT:
{
  "summary": "<Factual 2 sentence summary as ${input.targetRole}, no exaggeration>",
  "projects": [
    {
      "name": "<realistic project name>",
      "year": "2024",
      "technologies": "<3-5 tech from their actual skills>",
      "url": "https://example.com",
      "bullets": [
        "<15-20 words, factual, no fake metrics>",
        "<15-20 words, focus on what was built>",
        "<15-20 words, technical details only>"
      ]
    }
  ],
  "achievements": [
    "<Simple, believable achievement 10-15 words>",
    "<Another modest achievement 10-15 words>"
  ]
}

CRITICAL: Be HONEST. NO fake numbers. NO overconfidence. Use their actual skills and real project info if provided.`;
}

// ─── Main Function ────────────────────────────────────────────────────────────
export async function buildResume(input: BuilderInput, userId?: string): Promise<BuilderResult> {
  const MAX_RETRIES = 3;
  let aiResponse: BuilderAIResponse | null = null;
  
  // Step 1: Generate AI content
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info('Calling Groq API for resume generation', {
        model: 'llama-3.3-70b-versatile',
        attempt,
      });

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: buildPrompt(input) },
        ],
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content?.trim();

      if (!content) {
        throw new Error('Empty response from AI');
      }

      // Parse and validate JSON
      const parsed = JSON.parse(content);
      aiResponse = BuilderAIResponseSchema.parse(parsed);

      logger.info('Resume content generated successfully', { attempt });
      break;
    } catch (error: any) {
      logger.warn('Resume generation attempt failed', { attempt, error: error.message });
      
      if (attempt === MAX_RETRIES) {
        logger.error('Resume generation failed after all retries');
        throw new Error('Failed to generate resume content. Please try again.');
      }
    }
  }

  if (!aiResponse) {
    throw new Error('Failed to generate resume content');
  }

  // Step 2: Save to database
  try {
    const resumeData = {
      userId: userId ? userId : undefined,
      name: input.name,
      phone: input.phone,
      email: input.email,
      linkedin: input.linkedin,
      github: input.github,
      leetcode: input.leetcode,
      degree: input.degree,
      institution: input.institution,
      location: input.location,
      graduationYear: input.graduationYear,
      skills: input.skills,
      summary: aiResponse.summary,
      projects: aiResponse.projects,
      achievements: aiResponse.achievements,
    };

    const savedResume = await ResumeBuilderModel.create(resumeData);

    logger.info('Resume saved to database', { id: savedResume._id });

    // Step 3: Return complete result
    return {
      id: savedResume._id.toString(),
      name: savedResume.name,
      phone: savedResume.phone,
      email: savedResume.email,
      linkedin: savedResume.linkedin,
      github: savedResume.github,
      leetcode: savedResume.leetcode,
      degree: savedResume.degree,
      institution: savedResume.institution,
      location: savedResume.location,
      graduationYear: savedResume.graduationYear,
      skills: savedResume.skills,
      targetRole: input.targetRole,
      summary: savedResume.summary,
      projects: savedResume.projects,
      achievements: savedResume.achievements,
      createdAt: savedResume.createdAt,
    };
  } catch (error: any) {
    logger.error('Failed to save resume to database', { error: error.message });
    throw new Error('Failed to save resume. Please try again.');
  }
}

// ─── Get Resume by ID ─────────────────────────────────────────────────────────
export async function getResumeById(id: string): Promise<BuilderResult | null> {
  try {
    const resume = await ResumeBuilderModel.findById(id);
    
    if (!resume) {
      return null;
    }

    return {
      id: resume._id.toString(),
      name: resume.name,
      phone: resume.phone,
      email: resume.email,
      linkedin: resume.linkedin,
      github: resume.github,
      leetcode: resume.leetcode,
      degree: resume.degree,
      institution: resume.institution,
      location: resume.location,
      graduationYear: resume.graduationYear,
      skills: resume.skills,
      targetRole: '', // Not stored, but needed for type
      summary: resume.summary,
      projects: resume.projects,
      achievements: resume.achievements,
      createdAt: resume.createdAt,
    };
  } catch (error: any) {
    logger.error('Failed to fetch resume from database', { id, error: error.message });
    return null;
  }
}