import Groq from 'groq-sdk';
import { z } from 'zod';
import { GROQ_MODEL } from '@/lib/config/constants';
import { AppError } from '@/lib/utils/errors';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const SCORE_WEIGHTS = {
  ats_compatibility: 25,
  keyword_analysis: 20,
  role_matching: 10,
  experience_impact: 20,
  content_quality: 15,
  resume_structure: 10,
} as const;

type ScoreKey = keyof typeof SCORE_WEIGHTS;

// ─── Schema ───────────────────────────────────────────────────────────────────

const nullableArray = <T extends z.ZodTypeAny>(inner: T) =>
  z.preprocess((v) => (v === null ? [] : v), z.array(inner).default([]));

const scored = z.object({ score: z.number().int().min(0).max(100) });

const AnalysisResultSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  grade: z.enum(['A', 'B', 'C', 'D', 'F']),

  ats_compatibility: scored.extend({
    has_standard_headings: z.boolean(),
    has_tables: z.boolean(),
    has_images_or_icons: z.boolean(),
    has_multi_column_layout: z.boolean(),
    contact_info_complete: z.boolean(),
    parseable: z.boolean(),
    issues: nullableArray(z.string()),
  }),

  keyword_analysis: scored.extend({
    found: z.object({
      technical: nullableArray(z.string()),
      soft_skills: nullableArray(z.string()),
      industry: nullableArray(z.string()),
    }),
    missing: z.object({
      technical: nullableArray(z.string()),
      soft_skills: nullableArray(z.string()),
      industry: nullableArray(z.string()),
    }),
  }),

  role_matching: scored.extend({
    target_role: z.string().nullable().optional().transform((v) => v ?? null),
    inferred_role: z.string().nullable().optional().transform((v) => v ?? null),
    match_explanation: z.string(),
  }),

  experience_impact: scored.extend({
    quantified_bullets_count: z.number().int().min(0),
    total_bullets_count: z.number().int().min(0),
    weak_bullets: nullableArray(z.object({
      original: z.string(),
      why_weak: z.string(),
      better_version: z.string(),
    })),
    feedback: z.string(),
  }),

  content_quality: scored.extend({
    uses_action_verbs: z.boolean(),
    has_fluff_phrases: z.boolean(),
    fluff_phrases_found: nullableArray(z.string()),
    feedback: z.string(),
    improvements: nullableArray(z.object({
      problem: z.string(),
      better_version: z.string(),
    })),
  }),

  resume_structure: scored.extend({
    sections_present: nullableArray(z.string()),
    sections_missing: nullableArray(z.string()),
    feedback: z.string(),
  }),

  project_analysis: z.object({
    has_projects: z.boolean(),
    notes: z.string(),
    missing_impact: nullableArray(z.string()),
  }),

  skills_analysis: z.object({
    frontend: nullableArray(z.string()),
    backend: nullableArray(z.string()),
    database: nullableArray(z.string()),
    cloud: nullableArray(z.string()),
    devops: nullableArray(z.string()),
    tools: nullableArray(z.string()),
    missing_categories: nullableArray(z.string()),
  }),

  formatting_notes: z.object({
    length_feedback: z.string(),
    consistency_issues: nullableArray(z.string()),
  }),

  summary_analysis: z.object({
    has_summary: z.boolean(),
    is_generic: z.boolean(),
    feedback: z.string(),
    rewrite: z.string().optional(),
  }),

  grammar_analysis: z.object({
    issues_count: z.number().int().min(0),
    examples: nullableArray(z.string()),
    feedback: z.string(),
  }),

  strengths: z.array(z.string()).min(2),

  improvements: z.preprocess(
    (val) => {
      if (!Array.isArray(val)) return val;
      // Filter out improvements with empty/missing required fields
      return val.filter((item: any) => 
        item && 
        typeof item === 'object' &&
        item.section?.trim() &&
        item.original?.trim() &&
        item.rewrite?.trim() &&
        item.impact
      );
    },
    z.array(z.object({
      section: z.string().min(1),
      original: z.string().min(1),
      rewrite: z.string().min(1),
      impact: z.enum(['high', 'medium', 'low']),
    })).min(1)
  ),

  top_3_actions: z.tuple([z.string(), z.string(), z.string()]),

  red_flags: nullableArray(z.string()),
  honest_summary: z.string(),
});

const LlmOutputSchema = AnalysisResultSchema.omit({ overall_score: true, grade: true });

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// ─── Score computation ────────────────────────────────────────────────────────

function computeOverallScore(data: z.infer<typeof LlmOutputSchema>): number {
  const subScores: Record<ScoreKey, number> = {
    ats_compatibility: data.ats_compatibility.score,
    keyword_analysis: data.keyword_analysis.score,
    role_matching: data.role_matching.score,
    experience_impact: data.experience_impact.score,
    content_quality: data.content_quality.score,
    resume_structure: data.resume_structure.score,
  };

  const hasTargetRole = !!data.role_matching.target_role;
  const activeKeys = (Object.keys(SCORE_WEIGHTS) as ScoreKey[]).filter(
    (k) => hasTargetRole || k !== 'role_matching'
  );
  const weightSum = activeKeys.reduce((s, k) => s + SCORE_WEIGHTS[k], 0);
  return Math.round(
    activeKeys.reduce((s, k) => s + subScores[k] * (SCORE_WEIGHTS[k] / weightSum), 0)
  );
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 86) return 'A';
  if (score >= 76) return 'B';
  if (score >= 61) return 'C';
  if (score >= 41) return 'D';
  return 'F';
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert resume coach giving honest, direct, ACTIONABLE feedback to the person who owns this resume.

VOICE: Always use "you" and "your". Never refer to the person as "the candidate", "they", or "the applicant".

SCORING:
- 0-40: major problems
- 41-60: mediocre, significant gaps  
- 61-75: average, needs work
- 76-85: good, minor issues
- 86-100: exceptional, rare

CLARITY RULES (CRITICAL):
1. NEVER give vague feedback like "consider adding more details" or "could be improved"
2. ALWAYS be specific: quote the exact text that's wrong, explain why it's weak, show how to fix it
3. If structure/content is good, say "Your [section] is well-structured" - DON'T suggest improvements
4. For missing_impact: quote the exact project line that lacks metrics, then show specific improvement
5. For consistency_issues: quote the exact inconsistent formatting with line numbers/examples
6. For feedback fields: be direct - either praise what's good OR point out specific problems with examples

RESTRICTIONS:
- Only use facts that are literally present in the resume. If something cannot be determined, return null or [].
- Never invent metrics, dates, outcomes, or job titles not in the text.
- All scores must be integers.
- Return valid UTF-8 JSON only. No markdown, no explanation outside the JSON.`;

function buildUserPrompt(text: string, yearsOfExperience?: string, targetRole?: string): string {
  const ctx = [
    yearsOfExperience && `Experience level: ${yearsOfExperience}`,
    targetRole && `Target role: ${targetRole}`,
  ].filter(Boolean).join(' | ');

  const keywordInstruction = targetRole
    ? `Compare keywords against industry expectations for a ${targetRole} role.`
    : `Infer the most likely target role from the resume content and use that as the keyword baseline. Set inferred_role to that role name.`;

  return `Analyze the resume below${ctx ? ` [${ctx}]` : ''}.

${keywordInstruction}

CRITICAL INSTRUCTIONS:
1. For ALL feedback/notes fields: Be specific or say nothing. Quote exact text when critiquing.
2. For missing_impact array: Each entry MUST quote the exact project bullet that lacks metrics, like: 
   "Built a web app" → needs specific metrics (users? performance? impact?)
3. For consistency_issues: Quote the exact formatting inconsistency with examples from the resume
4. For feedback in resume_structure: If sections are good, say "Your resume has all key sections". If missing critical sections, name them specifically.
5. For project_analysis.notes: Either praise good project descriptions OR point out specific missing elements with examples
6. If something is already done well, acknowledge it clearly - don't suggest vague improvements

For weak_bullets: Quote the original bullet, explain why it's weak, rewrite using strong action verbs. Do NOT invent metrics.
For improvements: Minimum 5 entries covering different sections, ranked by impact. Each must have exact original text.
For strengths: Identify at least 2 specific things done well (formatting, skills breadth, project relevance, etc).
For top_3_actions: The 3 highest-priority changes with clear action items.

Return this exact JSON structure (all arrays must be present, use [] if empty):
{
  "ats_compatibility": {
    "score": int,
    "has_standard_headings": bool,
    "has_tables": bool,
    "has_images_or_icons": bool,
    "has_multi_column_layout": bool,
    "contact_info_complete": bool,
    "parseable": bool,
    "issues": []
  },
  "keyword_analysis": {
    "score": int,
    "found": { "technical": [], "soft_skills": [], "industry": [] },
    "missing": { "technical": [], "soft_skills": [], "industry": [] }
  },
  "role_matching": {
    "score": int,
    "target_role": ${targetRole ? `"${targetRole}"` : 'null'},
    "inferred_role": string | null,
    "match_explanation": string
  },
  "experience_impact": {
    "score": int,
    "quantified_bullets_count": int,
    "total_bullets_count": int,
    "weak_bullets": [{ "original": string, "why_weak": string, "better_version": string }],
    "feedback": string
  },
  "content_quality": {
    "score": int,
    "uses_action_verbs": bool,
    "has_fluff_phrases": bool,
    "fluff_phrases_found": [],
    "feedback": string,
    "improvements": [{ "problem": string, "better_version": string }]
  },
  "resume_structure": {
    "score": int,
    "sections_present": [],
    "sections_missing": [],
    "feedback": string
  },
  "project_analysis": { "has_projects": bool, "notes": string, "missing_impact": [] },
  "skills_analysis": {
    "frontend": [], "backend": [], "database": [],
    "cloud": [], "devops": [], "tools": [], "missing_categories": []
  },
  "formatting_notes": { "length_feedback": string, "consistency_issues": [] },
  "summary_analysis": { "has_summary": bool, "is_generic": bool, "feedback": string, "rewrite": string },
  "grammar_analysis": { "issues_count": int, "examples": [], "feedback": string },
  "strengths": [],
  "improvements": [{ "section": string, "original": string, "rewrite": string, "impact": "high"|"medium"|"low" }],
  "top_3_actions": [string, string, string],
  "red_flags": [],
  "honest_summary": string
}

Resume:
${text}`;
}

// ─── Analyzer ─────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 3;

export async function analyzeResume(
  resumeText: string,
  yearsOfExperience?: string,
  targetRole?: string
): Promise<AnalysisResult> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const completion = await Promise.race([
        groq.chat.completions.create({
          model: GROQ_MODEL,
          temperature: 0,
          seed: 42,
          max_tokens: 8192,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(resumeText, yearsOfExperience, targetRole) },
          ],
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Groq timeout after ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS)
        ),
      ]);

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from AI');

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        if (attempt === MAX_ATTEMPTS) throw new AppError(502, 'AI returned invalid JSON. Please try again.');
        continue;
      }

      const validated = LlmOutputSchema.safeParse(parsed);
      if (!validated.success) {
        console.warn('[Groq] Schema mismatch', {
          attempt,
          issues: validated.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        });
        if (attempt === MAX_ATTEMPTS) throw new AppError(502, 'AI returned unexpected format. Please try again.');
        continue;
      }

      const overall_score = computeOverallScore(validated.data);
      const grade = scoreToGrade(overall_score);
      return { ...validated.data, overall_score, grade };

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === MAX_ATTEMPTS) break;
    }
  }

  if (lastError instanceof AppError) throw lastError;
  throw new AppError(502, `AI service failed: ${lastError?.message ?? 'Unknown error'}`);
}