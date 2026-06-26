import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/config/db';
import { extractTextFromPDF } from '@/lib/utils/pdfParser';
import { generateCoverLetter } from '@/lib/utils/coverLetterWriter';
import { errorResponse, AppError } from '@/lib/utils/errors';
import { MAX_FILE_SIZE } from '@/lib/config/constants';
import { CoverLetter } from '@/lib/db/models/CoverLetterModel';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const formData = await request.formData();
    const file = formData.get('resume') as File | null;
    const jobDescription = formData.get('jobDescription') as string | null;
    const companyName = (formData.get('companyName') as string | null) || '';
    const tone = (formData.get('tone') as string | null) || 'professional';

    if (!file) throw new AppError(400, 'No resume file uploaded');
    if (!jobDescription || jobDescription.trim().length < 10)
      throw new AppError(400, 'Job description is required');
    if (file.type !== 'application/pdf')
      throw new AppError(400, 'Only PDF files are accepted');
    if (file.size > MAX_FILE_SIZE)
      throw new AppError(400, `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);

    const buffer = Buffer.from(await file.arrayBuffer());
    const resumeText = await extractTextFromPDF(buffer);

    if (!resumeText || resumeText.trim().length < 50)
      throw new AppError(400, 'Could not extract readable text from PDF');

    const result = await generateCoverLetter(resumeText, jobDescription, companyName, tone);

    // Persist to MongoDB
    const doc = await CoverLetter.create({
      fileName: file.name,
      fileSize: file.size,
      companyName,
      tone: result.tone,
      cover_letter: result.cover_letter,
      word_count: result.word_count,
      key_highlights: result.key_highlights,
      // Extended fields
      overall_score: result.overall_score,
      ats_compatibility: result.ats_compatibility,
      professional_tone_score: result.professional_tone_score,
      personalization_score: result.personalization_score,
      grammar_score: result.grammar_score,
      readability_score: result.readability_score,
      conciseness_score: result.conciseness_score,
      job_keywords_used: result.job_keywords_used,
      job_keywords_missing: result.job_keywords_missing,
      keywords_coverage_percentage: result.keywords_coverage_percentage,
      resume_claims_used: result.resume_claims_used,
      recruiter_review: result.recruiter_review,
      improvement_suggestions: result.improvement_suggestions,
      effectiveness_reasons: result.effectiveness_reasons,
      missing_opportunities: result.missing_opportunities,
      tone_analysis: result.tone_analysis,
      resume_to_cover_letter_mapping: result.resume_to_cover_letter_mapping,
      tips: result.tips,
    });

    return Response.json({
      success: true,
      data: {
        id: doc._id.toString(),
        fileName: file.name,
        companyName,
        ...result,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
