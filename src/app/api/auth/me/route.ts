import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/config/db';
import { requireAuth } from '@/lib/middleware/auth';
import { errorResponse } from '@/lib/utils/errors';
import { UserModel } from '@/lib/db/models/UserModel';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const userId = await requireAuth(request);
    const user = await UserModel.findById(userId).select('-password');

    return Response.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
