import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/config/db';
import { errorResponse, AppError } from '@/lib/utils/errors';
import { CoverLetter } from '@/lib/db/models/CoverLetterModel';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!id || id.length < 10) throw new AppError(400, 'Invalid cover letter ID');

    // Check if it's a temp/processing ID
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      // Return 404 for temp IDs - frontend will keep retrying until real ID
      throw new AppError(404, 'Cover letter not yet available');
    }

    const doc = await CoverLetter.findById(id).lean();
    if (!doc) throw new AppError(404, 'Cover letter not found');

    return Response.json({
      success: true,
      data: {
        id: (doc._id as any).toString(),
        ...doc,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
