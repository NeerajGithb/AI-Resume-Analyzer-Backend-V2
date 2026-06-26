import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/config/db';
import { requireAuth } from '@/lib/middleware/auth';
import { errorResponse } from '@/lib/utils/errors';
import { Job } from '@/lib/db/models/JobModel';

const CreateJobSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional(),
  description: z.string().min(1),
  requirements: z.array(z.string()).optional(),
  salary: z.string().optional(),
  type: z.enum(['full-time', 'part-time', 'contract', 'internship']).optional(),
  url: z.string().url().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = await requireAuth(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const jobs = await Job.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Job.countDocuments({ userId });

    return Response.json({
      success: true,
      data: {
        jobs,
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
    const validated = CreateJobSchema.parse(body);

    const job = await Job.create({
      ...validated,
      userId,
    });

    return Response.json({
      success: true,
      data: { job },
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
