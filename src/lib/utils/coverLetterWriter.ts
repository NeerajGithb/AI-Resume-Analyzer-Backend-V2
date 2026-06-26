import { z } from 'zod';
import { callGroqJson } from './groqClient';

// ─── Schema ───────────────────────────────────────────────────────────────────
const CoverLetterResultSchema = z.object({
  cover_letter: z.string().min(200),
  word_count: z.number(),
  tone: z.enum(['professional', 'enthusiastic', 'formal', 'conversational']),

  // Quality Scores
  overall_score: z.number().min(0).max(100),
  ats_compatibility: z.number().min(0).max(100),
  professional_tone_score: z.number().min(0).max(100),
  personalization_score: z.number().min(0).max(100),
  grammar_score: z.number().min(0).max(100),
  readability_score: z.number().min(0).max(100),
  conciseness_score: z.number().min(0).max(100),

  // Job Match Coverage
  job_keywords_used: z.array(z.string()),
  job_keywords_missing: z.array(z.string()),
  keywords_coverage_percentage: z.number().min(0).max(100),

  // Resume Evidence
  resume_claims_used: z.array(z.string()).min(1),

  // Recruiter Perspective
  recruiter_review: z.object({
    feedback: z.string(),
    overall_impression: z.enum(['Strong', 'Good', 'Average', 'Weak']),
  }),

  // Improvements - more lenient (min 1 instead of 2)
  improvement_suggestions: z.array(z.object({
    priority: z.enum(['high', 'medium', 'low']),
    suggestion: z.string(),
    estimated_impact: z.string(),
  })).min(1).max(5),

  // AI Explanation - more lenient (min 1 instead of 2)
  effectiveness_reasons: z.array(z.string()).min(1).max(5),

  // Missing Opportunities
  missing_opportunities: z.array(z.string()).default([]),

  // Tone Analysis
  tone_analysis: z.object({
    professional: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
    enthusiasm: z.number().min(0).max(100),
    personalization: z.number().min(0).max(100),
    clarity: z.number().min(0).max(100),
  }),

  // Resume Mapping
  resume_to_cover_letter_mapping: z.array(z.object({
    resume_section: z.string(),
    cover_letter_paragraph: z.number(),
  })).min(1),

  // Legacy fields - more lenient (min 1 instead of 2)
  key_highlights: z.array(z.string()).min(1).max(5),
  tips: z.array(z.string()).min(1).max(5),
});

export type CoverLetterResult = z.infer<typeof CoverLetterResultSchema>;

// ─── Prompts ──────────────────────────────────────────────────────────────────
const SYSTEM = `You are a senior hiring manager, professional cover letter specialist, and ATS expert who has reviewed 10,000+ applications.

STRICT RULES:
- Never fabricate achievements, titles, or experiences not present in the resume.
- Never use these phrases: "I am writing to apply", "passionate", "hardworking", "team player", "dynamic", "leverage", "synergy".
- If the resume doesn't match the JD well, say so honestly — don't inflate scores.
- resume_claims_used must reference EXACT experiences from the resume, not invented ones.
- Return ONLY valid JSON. No markdown, no explanation.`;

function buildPrompt(
  resumeText: string,
  jobDescriptionText: string,
  companyName: string,
  tone: string,
): string {
  return `Write a personalized cover letter and provide a comprehensive quality analysis. Be honest about fit.

COVER LETTER REQUIREMENTS:
1. Opens with a specific, confident statement — not "I am writing to apply"
2. 2-3 paragraphs tying exact resume achievements to JD requirements
3. One sentence showing knowledge of the company (infer from JD)
4. Closes with a direct, confident call to action
5. 250-350 words — concise and impactful
6. Tone is ${tone} — if formal, no contractions; if conversational, write like a smart human

RETURN THIS EXACT JSON STRUCTURE:
{
  "cover_letter": "<full cover letter text, 250-350 words>",
  "word_count": <actual word count integer>,
  "tone": "${tone}",

  "overall_score": <0-100 honest overall quality score>,
  "ats_compatibility": <0-100 how well it passes ATS>,
  "professional_tone_score": <0-100 professionalism level>,
  "personalization_score": <0-100 how tailored to the specific job>,
  "grammar_score": <0-100 grammar and writing quality>,
  "readability_score": <0-100 how easy to read>,
  "conciseness_score": <0-100 how concise and to-the-point>,

  "job_keywords_used": ["<keyword from JD used in cover letter>", ...],
  "job_keywords_missing": ["<important JD keyword not in cover letter>", ...],
  "keywords_coverage_percentage": <0-100 percentage of key JD keywords covered>,

  "resume_claims_used": ["<exact achievement/fact from resume used in the letter>", ...],

  "recruiter_review": {
    "feedback": "<2-3 sentence honest recruiter perspective on this cover letter>",
    "overall_impression": "<one of: Strong, Good, Average, Weak>"
  },

  "improvement_suggestions": [
    {
      "priority": "<high|medium|low>",
      "suggestion": "<specific actionable improvement for THIS letter>",
      "estimated_impact": "<e.g. +8 pts, High, Moderate>"
    }
  ],

  "effectiveness_reasons": [
    "<specific reason why this cover letter is effective>",
    "<another reason>"
  ],

  "missing_opportunities": [
    "<thing the candidate could mention but didn't>"
  ],

  "tone_analysis": {
    "professional": <0-100>,
    "confidence": <0-100>,
    "enthusiasm": <0-100>,
    "personalization": <0-100>,
    "clarity": <0-100>
  },

  "resume_to_cover_letter_mapping": [
    {
      "resume_section": "<e.g. Work Experience, Skills, Education>",
      "cover_letter_paragraph": <paragraph number 1-4>
    }
  ],

  "key_highlights": ["<key achievement highlighted in the letter>", ...],
  "tips": ["<specific improvement tip>", ...]
}

RESUME:
${resumeText.slice(0, 5000)}

JOB DESCRIPTION:
${jobDescriptionText.slice(0, 3000)}

COMPANY: ${companyName || 'the company'}
TONE: ${tone}`;
}

// ─── Export ───────────────────────────────────────────────────────────────────
export async function generateCoverLetter(
  resumeText: string,
  jobDescriptionText: string,
  companyName: string,
  tone: string = 'professional',
): Promise<CoverLetterResult> {
  return callGroqJson(
    CoverLetterResultSchema,
    SYSTEM,
    buildPrompt(resumeText, jobDescriptionText, companyName, tone),
    { temperature: 0.3, maxTokens: 3000 },
  );
}