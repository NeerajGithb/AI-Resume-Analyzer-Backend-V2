import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/config/db';
import { hashPassword, generateToken, setAuthCookie } from '@/lib/utils/auth';
import { errorResponse, AppError } from '@/lib/utils/errors';
import { UserModel } from '@/lib/db/models/UserModel';

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const validated = RegisterSchema.parse(body);

    const existingUser = await UserModel.findOne({ email: validated.email });
    if (existingUser) {
      throw new AppError(400, 'Email already registered');
    }

    const hashedPassword = await hashPassword(validated.password);
    const user = await UserModel.create({
      name: validated.name,
      email: validated.email,
      password: hashedPassword,
    });

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
