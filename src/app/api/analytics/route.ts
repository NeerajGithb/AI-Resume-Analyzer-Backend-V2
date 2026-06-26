import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/config/db';
import { requireAuth } from '@/lib/middleware/auth';
import { errorResponse } from '@/lib/utils/errors';
import { Application } from '@/lib/db/models/ApplicationModel';
import { Analysis } from '@/lib/db/models/AnalysisModel';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = await requireAuth(request);

    // Get application statistics
    const totalApplications = await Application.countDocuments({ userId });
    const applicationsByStatus = await Application.aggregate([
      { $match: { userId: userId as any } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Get analysis statistics
    const totalAnalyses = await Analysis.countDocuments({ userId });
    const recentAnalyses = await Analysis.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fileName overall_score grade createdAt');

    const averageScore = await Analysis.aggregate([
      { $match: { userId: userId as any } },
      { $group: { _id: null, avgScore: { $avg: '$overall_score' } } },
    ]);

    return Response.json({
      success: true,
      data: {
        applications: {
          total: totalApplications,
          byStatus: applicationsByStatus.reduce((acc: Record<string, number>, item: any) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
        },
        analyses: {
          total: totalAnalyses,
          averageScore: averageScore[0]?.avgScore || 0,
          recent: recentAnalyses,
        },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
