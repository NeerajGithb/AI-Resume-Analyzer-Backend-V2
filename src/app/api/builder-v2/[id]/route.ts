import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/config/db';
import { getResumeV2ById } from '@/lib/utils/resumeBuilderV2';
import { errorResponse } from '@/lib/utils/errors';

export const runtime = 'nodejs';

// GET /api/builder-v2/:id  — fetch a saved V2 resume
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

    const result = await getResumeV2ById(id);

    if (!result) {
      return Response.json(
        { success: false, message: 'Resume not found' },
        { status: 404 },
      );
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    return errorResponse(error);
  }
}
