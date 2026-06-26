import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/config/db';
import { extractTextFromPDF } from '@/lib/utils/pdfParser';
import { analyzeResume } from '@/lib/utils/resumeAnalyzer';
import { AppError, errorResponse } from '@/lib/utils/errors';
import { Analysis } from '@/lib/db/models/AnalysisModel';
import { MAX_FILE_SIZE } from '@/lib/config/constants';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const formData = await request.formData();
    const file = formData.get('resume') as File | null;

    if (!file) throw new AppError(400, 'No file uploaded');
    if (file.type !== 'application/pdf') throw new AppError(400, 'Only PDF files are accepted');
    if (file.size > MAX_FILE_SIZE) throw new AppError(400, `File too large. Max size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);

    const yearsOfExperience = (formData.get('yearsOfExperience') as string | null) ?? undefined;
    const targetRole = (formData.get('targetRole') as string | null) ?? undefined;

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPDF(buffer);

    if (!text || text.trim().length < 50) throw new AppError(400, 'Could not extract readable text from PDF');

    const analysis = await analyzeResume(text, yearsOfExperience, targetRole);
    console.log('Analysis result:', analysis);

    const doc = await Analysis.create({
      fileName: file.name,
      fileSize: file.size,
      yearsOfExperience,
      targetRole,
      ...analysis,
    });

    return Response.json({ success: true, data: { id: doc._id.toString(), ...analysis } }, { status: 200 });

  } catch (error) {
    return errorResponse(error);
  }
}