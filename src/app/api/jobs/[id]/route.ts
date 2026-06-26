import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/config/db';
import { requireAuth } from '@/lib/middleware/auth';
import { errorResponse, AppError } from '@/lib/utils/errors';
import { Job } from '@/lib/db/models/JobModel';

const UpdateJobSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  salary: z.string().optional(),
  type: z.enum(['full-time', 'part-time', 'contract', 'internship']).optional(),
  url: z.string().url().optional(),
  status: z.enum(['active', 'closed']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const userId = await requireAuth(request);
    const { id } = await params;

    const job = await Job.findOne({ _id: id, userId });
    if (!job) {
      throw new AppError(404, 'Job not found');
    }

    return Response.json({
      success: true,
      data: { job },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const userId = await requireAuth(request);
    const { id } = await params;

    const body = await request.json();
    const validated = UpdateJobSchema.parse(body);

    const job = await Job.findOneAndUpdate(
      { _id: id, userId },
      validated,
      { new: true }
    );

    if (!job) {
      throw new AppError(404, 'Job not found');
    }

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const userId = await requireAuth(request);
    const { id } = await params;

    const job = await Job.findOneAndDelete({ _id: id, userId });
    if (!job) {
      throw new AppError(404, 'Job not found');
    }

    return Response.json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
