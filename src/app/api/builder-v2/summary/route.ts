import { NextRequest } from 'next/server';
import { z } from 'zod';
import Groq from 'groq-sdk';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/utils/logger';
import { errorResponse } from '@/lib/utils/errors';

export const runtime = 'nodejs';
export const maxDuration = 30;

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

// ─── Input schema ──────────────────────────────────────────────────────────────
const SummaryInputSchema = z.object({
  targetRole: z.string().min(1),
  count:      z.number().min(1).max(5).default(3),
  skills: z.object({
    technical: z.array(z.string()).default([]),
    soft:      z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
  }).optional(),
  experience: z.array(z.object({
    jobTitle:    z.string(),
    employer:    z.string().optional(),
    startDate:   z.string().optional(),
    endDate:     z.string().optional(),
    description: z.string().optional(),
  })).optional().default([]),
  education: z.array(z.object({
    degree:         z.string(),
    institution:    z.string(),
    graduationDate: z.string().optional(),
  })).optional().default([]),
});

// ─── Prompt ────────────────────────────────────────────────────────────────────
function buildPrompt(input: z.infer<typeof SummaryInputSchema>): string {
  const expBlock = input.experience.length
    ? input.experience
        .map((e) =>
          `• ${e.jobTitle}${e.employer ? ` at ${e.employer}` : ''}` +
          `${e.startDate ? ` (${e.startDate}` : ''}${e.endDate ? ` – ${e.endDate})` : ''}` +
          `${e.description ? `\n  Details: ${e.description.slice(0, 300)}` : ''}`
        )
        .join('\n')
    : 'No prior work experience — focus on projects, education, and skills.';

  const techSkills  = input.skills?.technical?.join(', ')  || '';
  const softSkills  = input.skills?.soft?.join(', ')       || '';
  const languages   = input.skills?.languages?.join(', ')  || '';

  const eduBlock = input.education.length
    ? input.education
        .map((e) =>
          `${e.degree} from ${e.institution}${e.graduationDate ? ` (${e.graduationDate})` : ''}`
        )
        .join(', ')
    : 'No education provided.';

  // Pull specific technologies from experience descriptions for grounding
  const expDescriptions = input.experience
    .map((e) => e.description)
    .filter(Boolean)
    .join(' ');

  return `You are an elite resume writer who has placed candidates at Google, Stripe, and top startups.
Your summaries get candidates interviews. Weak, generic summaries get resumes binned.

TARGET ROLE: ${input.targetRole}

─── CANDIDATE DATA ───────────────────────────────────────────────
EXPERIENCE:
${expBlock}

TECHNICAL SKILLS: ${techSkills || 'Not specified'}
SOFT SKILLS: ${softSkills || 'Not specified'}
LANGUAGES/TOOLS: ${languages || 'Not specified'}
EDUCATION: ${eduBlock}

EXTRA CONTEXT FROM EXPERIENCE DESCRIPTIONS:
${expDescriptions || 'None'}
──────────────────────────────────────────────────────────────────

Write exactly ${input.count} professional resume summaries. Each must:

1. OPEN with a strong identity statement — name the role + 1-2 specific technologies or domains
   (e.g. "Full-Stack Developer with hands-on experience building production apps using Next.js, Node.js, and PostgreSQL.")
   NOT: "Recent graduate with a degree..." or "Skilled professional with..."

2. MIDDLE sentence — name 2–4 SPECIFIC things built, implemented, or done from the experience/skills data
   (e.g. "Built REST APIs, implemented JWT authentication, integrated Redis caching, and shipped AI-powered features.")
   If no work experience exists, reference specific academic projects or skills applied.

3. CLOSE with a forward-facing value statement — what they bring to the role
   (e.g. "Focused on writing clean, scalable code and delivering real user value.")

HARD RULES:
- Use ONLY facts from the candidate data above — do not invent employers, projects, or technologies not listed
- If a technology is listed in skills, you MAY say the candidate has worked with or is proficient in it
- 3 sentences max, 40–60 words total per summary
- NO filler: ban "passionate", "dynamic", "dedicated", "exceptional", "hardworking", "team player"
- NO weak openers: ban "Recent graduate with...", "Skilled professional...", "Experienced individual..."
- Each of the ${input.count} summaries must have a different opening angle and different highlighted skills
- If experience is thin, lead with the strongest technical skills and what was built/learned

GOOD EXAMPLE (for a junior dev with projects):
"Full-Stack Developer with hands-on experience building web applications using Next.js, Node.js, and MongoDB. Built and deployed projects featuring REST APIs, JWT authentication, Redis caching, and AI-powered features. Enjoy solving real problems and developing scalable, production-ready applications."

BAD EXAMPLE (do not produce anything like this):
"Recent graduate with a Bachelors degree, skilled in JavaScript and Node.js. Knowledgeable in SQL and PostgreSQL."

Return a JSON object with this exact shape — no markdown, no extra keys:
{
  "summaries": [
    "First summary text here.",
    "Second summary text here.",
    "Third summary text here."
  ]
}`;
}

// ─── POST /api/builder-v2/summary ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body  = await request.json();
    const input = SummaryInputSchema.parse(body);

    logger.info('Generating AI summaries', { targetRole: input.targetRole, count: input.count });

    const response = await groq.chat.completions.create({
      model:    'llama-3.3-70b-versatile',
      messages: [
        {
          role:    'system',
          content: 'You are an elite resume writer. Return only valid JSON — no markdown, no extra text, no explanation.',
        },
        { role: 'user', content: buildPrompt(input) },
      ],
      temperature:     0.65,  // slightly higher so the 3 summaries meaningfully differ
      max_tokens:      600,   // enough room for 3 solid summaries
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) throw new Error('Empty AI response');

    let parsed: { summaries?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('AI returned invalid JSON');
    }

    const summaries = parsed.summaries;

    if (!Array.isArray(summaries) || summaries.length === 0) {
      throw new Error('Invalid response shape — summaries array missing');
    }

    // Sanitise: ensure each entry is a non-empty string
    const clean: string[] = summaries
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .map((s) => s.trim());

    if (clean.length === 0) throw new Error('All summaries were empty after sanitisation');

    logger.info('Summaries generated', { count: clean.length });

    return Response.json({ success: true, data: { summaries: clean } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, message: error.issues[0].message },
        { status: 400 },
      );
    }
    logger.error('Summary generation failed', { error });
    return errorResponse(error);
  }
}