import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/config/db';
import { errorResponse, AppError } from '@/lib/utils/errors';
import { Analysis } from '@/lib/db/models/AnalysisModel';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const analysis = await Analysis.findById(id);
    if (!analysis) {
      throw new AppError(404, 'Analysis not found');
    }

    return Response.json({
      success: true,
      data: { analysis },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
