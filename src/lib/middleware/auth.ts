import { NextRequest } from 'next/server';
import { verifyToken } from '../utils/auth';
import { AppError } from '../utils/errors';

export async function requireAuth(request: NextRequest): Promise<string> {
  const token = request.cookies.get('token')?.value;

  if (!token) {
    throw new AppError(401, 'Authentication required');
  }

  try {
    const decoded = verifyToken(token);
    return decoded.userId;
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }
}

export async function optionalAuth(request: NextRequest): Promise<string | undefined> {
  try {
    return await requireAuth(request);
  } catch {
    return undefined;
  }
}
