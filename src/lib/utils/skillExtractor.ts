export interface ExperienceResult {
  score: number;
  gap: string | null;
}

export function extractExperienceYears(text: string): number {
  const patterns = [
    /(\d+)\+?\s*(?:years?|yrs?)/i,
    /minimum\s*(\d+)\+?\s*(?:years?|yrs?)/i,
    /at least\s*(\d+)\+?\s*(?:years?|yrs?)/i,
    /(\d+)\s*-\s*\d+\s*(?:years?|yrs?)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return Number(m[1]);
  }
  return 0;
}

export function extractEducation(text: string): string | null {
  const v = text.toLowerCase();
  if (/phd|doctorate/.test(v)) return 'PhD';
  if (/master|mba|mca|m\.tech|mtech|m\.sc|msc/.test(v)) return 'Masters';
  if (/bachelor|bca|b\.tech|btech|be|b\.e|bsc|b\.sc/.test(v)) return 'Bachelors';
  if (/associate/.test(v)) return 'Associates';
  return null;
}

export function calculateExperienceScore(resumeYears: number, requiredYears: number): ExperienceResult {
  if (requiredYears === 0 || resumeYears >= requiredYears) return { score: 100, gap: null };
  return {
    score: Math.max(Math.round((resumeYears / requiredYears) * 100), 20),
    gap: `${resumeYears} year${resumeYears !== 1 ? 's' : ''} found, ${requiredYears}+ required`,
  };
}

export function calculateEducationScore(resumeEdu: string | null, requiredEdu: string | null): number {
  if (!requiredEdu) return 100;
  if (!resumeEdu) return 0;
  const levels: Record<string, number> = { Associates: 1, Bachelors: 2, Masters: 3, PhD: 4 };
  const diff = (levels[resumeEdu] ?? 0) - (levels[requiredEdu] ?? 0);
  if (diff >= 0) return 100;
  if (diff === -1) return 70;
  return 30;
}

export function calculateFinalScore({
  skillScore,
  experienceScore,
  educationScore,
  projectScore,
}: {
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  projectScore: number;
}): number {
  return Math.round(
    skillScore * 0.55 +
    experienceScore * 0.25 +
    educationScore * 0.10 +
    projectScore * 0.10
  );
}

export function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}