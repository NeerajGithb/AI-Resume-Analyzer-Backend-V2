import { clearAuthCookie } from '@/lib/utils/auth';

export async function POST() {
  const response = Response.json({
    success: true,
    message: 'Logged out successfully',
  });

  clearAuthCookie(response);

  return response;
}
