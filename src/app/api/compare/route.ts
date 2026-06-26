import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/config/db';
import { extractTextFromPDF } from '@/lib/utils/pdfParser';
import { compareResumes } from '@/lib/utils/resumeComparer';
import { errorResponse, AppError } from '@/lib/utils/errors';
import { MAX_FILE_SIZE } from '@/lib/config/constants';
import { optionalAuth } from '@/lib/middleware/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    await optionalAuth(request);

    const formData = await request.formData();
    const resume1 = formData.get('resume1') as File | null;
    const resume2 = formData.get('resume2') as File | null;

    if (!resume1 || !resume2) {
      throw new AppError(400, 'Both resume files are required');
    }

    if (resume1.type !== 'application/pdf' || resume2.type !== 'application/pdf') {
      throw new AppError(400, 'Only PDF files are accepted');
    }

    if (resume1.size > MAX_FILE_SIZE || resume2.size > MAX_FILE_SIZE) {
      throw new AppError(400, `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    const buffer1 = Buffer.from(await resume1.arrayBuffer());
    const buffer2 = Buffer.from(await resume2.arrayBuffer());

    const text1 = await extractTextFromPDF(buffer1);
    const text2 = await extractTextFromPDF(buffer2);

    const comparison = await compareResumes(text1, text2);

    return Response.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
