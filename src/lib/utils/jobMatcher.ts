import { z } from 'zod';
import { callGroqJson } from './groqClient';
import {
  extractExperienceYears,
  extractEducation,
  calculateExperienceScore,
  calculateEducationScore,
  calculateFinalScore,
  scoreToGrade,
} from './skillExtractor';

const AIAnalysisSchema = z.object({
  skill_score: z.number().min(0).max(100),
  matched_keywords: z.array(z.string()),
  missing_keywords: z.array(z.string()),
  matched_requirements: z.array(z.string()),
  missing_requirements: z.array(z.string()),
  overall_verdict: z.string(),
  recommendations: z.array(z.object({
    priority: z.enum(['high', 'medium', 'low']),
    title: z.string(),
    description: z.string(),
  })).min(3),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  hiring_perspective: z.string().optional(),
});

export interface JobMatchResult {
  match_score: number;
  match_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  matched_keywords: string[];
  missing_keywords: string[];
  matched_requirements: string[];
  missing_requirements: string[];
  experience_gap: string | null;
  overall_verdict: string;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
  }>;
  strengths?: string[];
  weaknesses?: string[];
  hiring_perspective?: string;
}

const SYSTEM_PROMPT = `You are a senior technical recruiter analyzing resume-job fit.

Your job:
1. Extract ALL skills/technologies from the resume and job description (don't limit to any fixed list)
2. Determine which JD skills/requirements are matched or missing in the resume
3. Give an honest skill match score (0-100) based on how well the resume covers the JD
4. Provide a 2-3 sentence verdict, 5+ actionable recommendations, strengths, weaknesses, and hiring perspective

Be role-agnostic — this could be any tech role (frontend, backend, ML, DevOps, mobile, etc.).
Return valid JSON only.`;

function buildPrompt(
  resumeText: string,
  jdText: string,
  meta: { experience_gap: string | null; education_note: string }
): string {
  return `Analyze this resume against the job description.

${meta.experience_gap ? `EXPERIENCE GAP (pre-calculated): ${meta.experience_gap}` : 'Experience: meets or not specified'}
${meta.education_note}

Return a JSON object:
{
  "skill_score": <0-100, your honest assessment of skill coverage>,
  "matched_keywords": ["skills from JD that resume has"],
  "missing_keywords": ["skills from JD that resume lacks"],
  "matched_requirements": ["broader requirements met"],
  "missing_requirements": ["broader requirements not met"],
  "overall_verdict": "<2-3 honest sentences>",
  "recommendations": [
    { "priority": "high"|"medium"|"low", "title": "<action>", "description": "<why for THIS role>" }
    // min 5, sorted by priority
  ],
  "strengths": ["..."],
  "weaknesses": ["..."],
  "hiring_perspective": "<what a hiring manager would think>"
}

RESUME:
${resumeText.slice(0, 5000)}

JOB DESCRIPTION:
${jdText.slice(0, 3000)}`;
}

export async function matchResumeToJob(resumeText: string, jobDescriptionText: string): Promise<JobMatchResult> {
  const resumeYears = extractExperienceYears(resumeText);
  const requiredYears = extractExperienceYears(jobDescriptionText);
  const experienceMatch = calculateExperienceScore(resumeYears, requiredYears);

  const resumeEdu = extractEducation(resumeText);
  const requiredEdu = extractEducation(jobDescriptionText);
  const educationScore = calculateEducationScore(resumeEdu, requiredEdu);

  const projectScore = /project|github|portfolio/i.test(resumeText) ? 85 : 40;

  const educationNote = requiredEdu
    ? `Education: resume has ${resumeEdu ?? 'unknown'}, JD requires ${requiredEdu}`
    : 'Education: no specific requirement in JD';

  const aiResult = await callGroqJson(
    AIAnalysisSchema,
    SYSTEM_PROMPT,
    buildPrompt(resumeText, jobDescriptionText, {
      experience_gap: experienceMatch.gap,
      education_note: educationNote,
    }),
    { temperature: 0.3, maxTokens: 2000, maxAttempts: 3 }
  );

  const match_score = calculateFinalScore({
    skillScore: aiResult.skill_score,
    experienceScore: experienceMatch.score,
    educationScore,
    projectScore,
  });

  return {
    match_score,
    match_grade: scoreToGrade(match_score),
    matched_keywords: aiResult.matched_keywords,
    missing_keywords: aiResult.missing_keywords,
    matched_requirements: aiResult.matched_requirements,
    missing_requirements: aiResult.missing_requirements,
    experience_gap: experienceMatch.gap,
    overall_verdict: aiResult.overall_verdict,
    recommendations: aiResult.recommendations,
    strengths: aiResult.strengths,
    weaknesses: aiResult.weaknesses,
    hiring_perspective: aiResult.hiring_perspective,
  };
}