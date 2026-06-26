import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/config/db';
import { getResumeById } from '@/lib/utils/resumeBuilder';
import { errorResponse } from '@/lib/utils/errors';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;

    if (!id) {
      return Response.json(
        { success: false, message: 'Resume ID is required' },
        { status: 400 }
      );
    }

    const result = await getResumeById(id);

    if (!result) {
      return Response.json(
        { success: false, message: 'Resume not found' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
