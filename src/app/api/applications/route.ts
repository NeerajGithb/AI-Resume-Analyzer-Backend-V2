import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/config/db';
import { requireAuth } from '@/lib/middleware/auth';
import { errorResponse } from '@/lib/utils/errors';
import { Application } from '@/lib/db/models/ApplicationModel';

const CreateApplicationSchema = z.object({
  jobId: z.string().optional(),
  company: z.string().min(1),
  position: z.string().min(1),
  status: z.enum(['applied', 'screening', 'interview', 'offer', 'rejected']).optional(),
  appliedDate: z.string().optional(),
  notes: z.string().optional(),
  jobUrl: z.string().url().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const applications = await Application.find({ userId })
      .populate('jobId')
      .sort({ appliedDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Application.countDocuments({ userId });

    return Response.json({
      success: true,
      data: {
        applications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const userId = await requireAuth(request);

    const body = await request.json();
    const validated = CreateApplicationSchema.parse(body);

    const application = await Application.create({
      ...validated,
      userId,
      appliedDate: validated.appliedDate || new Date(),
    });

    return Response.json({
      success: true,
      data: { application },
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
