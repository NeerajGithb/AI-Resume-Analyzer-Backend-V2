import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/config/db';
import { analyzeLinkedInProfile } from '@/lib/utils/linkedinAnalyzer';
import { errorResponse } from '@/lib/utils/errors';
import { optionalAuth } from '@/lib/middleware/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const LinkedInSchema = z.object({
  profileText: z.string().min(50, 'Profile text is too short'),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    await optionalAuth(request);

    const body = await request.json();
    const validated = LinkedInSchema.parse(body);

    const analysis = await analyzeLinkedInProfile(validated.profileText);

    return Response.json({
      success: true,
      data: analysis,
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
