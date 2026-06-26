import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/config/db';
import { buildResumeV2, BuilderV2InputSchema } from '@/lib/utils/resumeBuilderV2';
import { errorResponse } from '@/lib/utils/errors';
import { optionalAuth } from '@/lib/middleware/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

// POST /api/builder-v2  — generate a new V2 resume
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[builder-v2] ====== NEW REQUEST ======');

  try {
    await connectDB();
    console.log('[builder-v2] DB connected');

    const user = await optionalAuth(request);
    console.log('[builder-v2] user:', JSON.stringify(user, null, 2));

    const body = await request.json();
    console.log('[builder-v2] incoming body:', JSON.stringify(body, null, 2));

    const validated = BuilderV2InputSchema.parse(body);
    console.log('[builder-v2] validated input:', JSON.stringify(validated, null, 2));

    const result = await buildResumeV2(validated, user || undefined);
    console.log('[builder-v2] generated result:', JSON.stringify(result, null, 2));
    console.log('[builder-v2] done in', Date.now() - startTime, 'ms');

    return Response.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn('[builder-v2] ZOD VALIDATION ERROR:', JSON.stringify(error.issues, null, 2));
      return Response.json(
        { success: false, message: error.issues[0].message },
        { status: 400 },
      );
    }

    console.error('[builder-v2] UNHANDLED ERROR:', error);
    return errorResponse(error);
  }
}