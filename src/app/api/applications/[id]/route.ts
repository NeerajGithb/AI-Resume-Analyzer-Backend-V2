import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/config/db';
import { requireAuth } from '@/lib/middleware/auth';
import { errorResponse, AppError } from '@/lib/utils/errors';
import { Application } from '@/lib/db/models/ApplicationModel';

const UpdateApplicationSchema = z.object({
  status: z.enum(['applied', 'screening', 'interview', 'offer', 'rejected']).optional(),
  notes: z.string().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
  jobUrl: z.string().url().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const userId = await requireAuth(request);
    const { id } = await params;

    const application = await Application.findOne({ _id: id, userId })
      .populate('jobId');

    if (!application) {
      throw new AppError(404, 'Application not found');
    }

    return Response.json({
      success: true,
      data: { application },
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
    const validated = UpdateApplicationSchema.parse(body);

    const application = await Application.findOneAndUpdate(
      { _id: id, userId },
      validated,
      { new: true }
    );

    if (!application) {
      throw new AppError(404, 'Application not found');
    }

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const userId = await requireAuth(request);
    const { id } = await params;

    const application = await Application.findOneAndDelete({ _id: id, userId });
    if (!application) {
      throw new AppError(404, 'Application not found');
    }

    return Response.json({
      success: true,
      message: 'Application deleted successfully',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
