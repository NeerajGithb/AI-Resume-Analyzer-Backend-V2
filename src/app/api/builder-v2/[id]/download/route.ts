import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/config/db';
import { getResumeV2ById } from '@/lib/utils/resumeBuilderV2';
import { generateResumeV2PDF } from '@/lib/utils/pdfGeneratorV2';
import { errorResponse } from '@/lib/utils/errors';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const maxDuration = 60;

// GET /api/builder-v2/:id/download  — stream a PDF of the V2 resume
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    const { id } = await params;

    if (!id) {
      return Response.json(
        { success: false, message: 'Resume ID is required' },
        { status: 400 },
      );
    }

    const resume = await getResumeV2ById(id);
    if (!resume) {
      return Response.json(
        { success: false, message: 'Resume not found' },
        { status: 404 },
      );
    }

    logger.info('BuilderV2: generating PDF for download', { id, name: resume.name });

    const pdfBuffer = await generateResumeV2PDF(resume);
    const filename = `${resume.name.replace(/\s+/g, '_')}_Resume.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    const { id } = await params;
    logger.error('BuilderV2: PDF download failed', { id, error: error.message });
    return errorResponse(error);
  }
}
