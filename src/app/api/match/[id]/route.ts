import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/config/db';
import { JobMatch } from '@/lib/db/models/JobMatchModel';
import { errorResponse, AppError } from '@/lib/utils/errors';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await context.params;

    if (!id || id.length !== 24) {
      throw new AppError(400, 'Invalid job match ID');
    }

    const match = await JobMatch.findById(id).lean();

    if (!match) {
      throw new AppError(404, 'Job match result not found');
    }

    return Response.json({
      success: true,
      data: {
        id: match._id.toString(),
        fileName: match.fileName,
        match_score: match.match_score,
        match_grade: match.match_grade,
        matched_keywords: match.matched_keywords,
        missing_keywords: match.missing_keywords,
        matched_requirements: match.matched_requirements,
        missing_requirements: match.missing_requirements,
        recommendations: match.recommendations,
        overall_verdict: match.overall_verdict,
        createdAt: match.createdAt,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
