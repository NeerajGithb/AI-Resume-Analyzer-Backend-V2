import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/config/db';
import { buildResume, getResumeById, BuilderInputSchema } from '@/lib/utils/resumeBuilder';
import { errorResponse } from '@/lib/utils/errors';
import { optionalAuth } from '@/lib/middleware/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const user = await optionalAuth(request);

    const body = await request.json();
    const validated = BuilderInputSchema.parse(body);

    const result = await buildResume(validated, user || undefined);

    return Response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, message: error.issues[0].message },
        { status: 400 }
      );
    }
    return errorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

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
