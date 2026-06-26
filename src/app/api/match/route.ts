import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/config/db';
import { extractTextFromPDF } from '@/lib/utils/pdfParser';
import { matchResumeToJob } from '@/lib/utils/jobMatcher';
import { errorResponse, AppError } from '@/lib/utils/errors';
import { JobMatch } from '@/lib/db/models/JobMatchModel';
import { MAX_FILE_SIZE } from '@/lib/config/constants';
import { optionalAuth } from '@/lib/middleware/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await optionalAuth(request);

    const formData = await request.formData();
    const file = formData.get('resume') as File | null;
    const jobDescription = formData.get('jobDescription') as string | null;

    if (!file) {
      throw new AppError(400, 'No resume file uploaded');
    }

    if (!jobDescription) {
      throw new AppError(400, 'Job description is required');
    }

    if (file.type !== 'application/pdf') {
      throw new AppError(400, 'Only PDF files are accepted');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(400, `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const resumeText = await extractTextFromPDF(buffer);
    
    if (!resumeText || resumeText.trim().length < 50) {
      throw new AppError(400, 'Could not extract readable text from PDF');
    }

    const matchResult = await matchResumeToJob(resumeText, jobDescription);
    console.log('[JobMatch] Match result:', matchResult);

    // Save to database
    const doc = await JobMatch.create({
      userId: authResult,
      fileName: file.name,
      fileSize: file.size,
      ...matchResult,
    });

    return Response.json({
      success: true,
      data: { 
        id: doc._id.toString(), 
        ...matchResult 
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
