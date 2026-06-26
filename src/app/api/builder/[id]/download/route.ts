import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/config/db';
import { errorResponse } from '@/lib/utils/errors';
import ResumeBuilderModel from '@/lib/db/models/ResumeBuilderModel';
import { generateResumePDF } from '@/lib/utils/pdfGenerator';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;

    if (!id) {
      return Response.json(
        { success: false, message: 'Resume ID is required' },
        { status: 400 }
      );
    }

    // Fetch resume from database
    const resume = await ResumeBuilderModel.findById(id);

    if (!resume) {
      return Response.json(
        { success: false, message: 'Resume not found' },
        { status: 404 }
      );
    }

    logger.info('Generating PDF for resume', { id, name: resume.name });

    // Prepare data for PDF generation
    const resumeData = {
      name: resume.name,
      phone: resume.phone,
      email: resume.email,
      linkedin: resume.linkedin,
      github: resume.github,
      leetcode: resume.leetcode,
      location: resume.location,
      summary: resume.summary,
      degree: resume.degree,
      institution: resume.institution,
      graduationYear: resume.graduationYear,
      projects: resume.projects,
      skills: resume.skills,
      achievements: resume.achievements,
    };

    // Generate PDF
    const pdfBuffer = await generateResumePDF(resumeData);

    // Create filename
    const filename = `${resume.name.replace(/\s+/g, '_')}_Resume.pdf`;

    // Convert Buffer to Uint8Array for Response
    const uint8Array = new Uint8Array(pdfBuffer);

    // Return PDF
    return new Response(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    const { id } = await params;
    logger.error('PDF download failed', { id, error: error.message });
    return errorResponse(error);
  }
}
