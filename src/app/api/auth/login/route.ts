import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/config/db';
import { comparePassword, generateToken, setAuthCookie } from '@/lib/utils/auth';
import { errorResponse, AppError } from '@/lib/utils/errors';
import { UserModel } from '@/lib/db/models/UserModel';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const validated = LoginSchema.parse(body);

    const user = await UserModel.findOne({ email: validated.email }).select('+password');
    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    const isValid = await comparePassword(validated.password, user.password);
    if (!isValid) {
      throw new AppError(401, 'Invalid email or password');
    }

    const token = generateToken(user._id.toString());

    const response = Response.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    });

    setAuthCookie(response, token);

    return response;
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
