import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/config/db';
import { errorResponse } from '@/lib/utils/errors';
import { Analysis } from '@/lib/db/models/AnalysisModel';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const skip = (page - 1) * limit;

    const analyses = await Analysis.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('fileName fileSize overall_score grade createdAt ats_compatibility keyword_analysis role_matching experience_impact content_quality resume_structure project_analysis skills_analysis formatting_notes summary_analysis grammar_analysis improvements red_flags honest_summary');

    const total = await Analysis.countDocuments();

    return Response.json({
      success: true,
      data: analyses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
