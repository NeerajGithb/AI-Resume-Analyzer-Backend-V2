import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/config/db';
import { errorResponse, AppError } from '@/lib/utils/errors';
import { Analysis } from '@/lib/db/models/AnalysisModel';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[Analyze GET] Fetching analysis by ID');
    await connectDB();
    const { id } = await params;

    console.log('[Analyze GET] Looking for ID:', id);
    const analysis = await Analysis.findById(id);
    
    if (!analysis) {
      console.log('[Analyze GET] Analysis not found');
      throw new AppError(404, 'Analysis not found');
    }

    console.log('[Analyze GET] Found analysis:', analysis._id);

    // Convert to plain object and structure response
    const result = analysis.toObject();
    
    return Response.json({
      success: true,
      data: {
        id: result._id.toString(),
        overall_score: result.overall_score,
        grade: result.grade,
        ats_compatibility: result.ats_compatibility,
        keyword_analysis: result.keyword_analysis,
        experience_impact: result.experience_impact,
        content_quality: result.content_quality,
        resume_structure: result.resume_structure,
        role_matching: result.role_matching,
        skills_analysis: result.skills_analysis,
        project_analysis: result.project_analysis,
        formatting_notes: result.formatting_notes,
        improvements: result.improvements,
        red_flags: result.red_flags,
        tone_feedback: result.tone_feedback,
        ats_tips: result.ats_tips,
        honest_summary: result.honest_summary,
      },
    });
  } catch (error) {
    console.error('[Analyze GET] Error:', error);
    return errorResponse(error);
  }
}
