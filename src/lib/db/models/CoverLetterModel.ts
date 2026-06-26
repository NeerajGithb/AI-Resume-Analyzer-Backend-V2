import mongoose, { Schema, Document } from 'mongoose';

export interface ICoverLetter extends Document {
  userId?: string;
  fileName: string;
  fileSize: number;
  companyName: string;
  tone: string;
  cover_letter: string;
  word_count: number;
  key_highlights: string[];
  tips: string[];

  // Quality Scores
  overall_score: number;
  ats_compatibility: number;
  professional_tone_score: number;
  personalization_score: number;
  grammar_score: number;
  readability_score: number;
  conciseness_score: number;

  // Job Match
  job_keywords_used: string[];
  job_keywords_missing: string[];
  keywords_coverage_percentage: number;

  // Evidence
  resume_claims_used: string[];

  // Recruiter
  recruiter_review: { feedback: string; overall_impression: string };

  // Improvements
  improvement_suggestions: Array<{ priority: string; suggestion: string; estimated_impact: string }>;

  // Explanation
  effectiveness_reasons: string[];
  missing_opportunities: string[];

  // Tone
  tone_analysis: {
    professional: number;
    confidence: number;
    enthusiasm: number;
    personalization: number;
    clarity: number;
  };

  // Mapping
  resume_to_cover_letter_mapping: Array<{ resume_section: string; cover_letter_paragraph: number }>;

  createdAt: Date;
}

const CoverLetterSchema = new Schema<ICoverLetter>({
  userId:       { type: String, index: true },
  fileName:     { type: String, required: true },
  fileSize:     { type: Number, required: true },
  companyName:  { type: String, required: true },
  tone:         { type: String, required: true },
  cover_letter: { type: String, required: true },
  word_count:   { type: Number, required: true },
  key_highlights: [{ type: String }],
  tips:           [{ type: String }],

  overall_score:          { type: Number, default: 0 },
  ats_compatibility:      { type: Number, default: 0 },
  professional_tone_score:{ type: Number, default: 0 },
  personalization_score:  { type: Number, default: 0 },
  grammar_score:          { type: Number, default: 0 },
  readability_score:      { type: Number, default: 0 },
  conciseness_score:      { type: Number, default: 0 },

  job_keywords_used:              [{ type: String }],
  job_keywords_missing:           [{ type: String }],
  keywords_coverage_percentage:   { type: Number, default: 0 },

  resume_claims_used: [{ type: String }],

  recruiter_review: {
    feedback: { type: String },
    overall_impression: { type: String },
  },

  improvement_suggestions: [{
    priority:         { type: String },
    suggestion:       { type: String },
    estimated_impact: { type: String },
  }],

  effectiveness_reasons:  [{ type: String }],
  missing_opportunities:  [{ type: String }],

  tone_analysis: {
    professional:   { type: Number },
    confidence:     { type: Number },
    enthusiasm:     { type: Number },
    personalization:{ type: Number },
    clarity:        { type: Number },
  },

  resume_to_cover_letter_mapping: [{
    resume_section:          { type: String },
    cover_letter_paragraph:  { type: Number },
  }],

  createdAt: { type: Date, default: Date.now, index: true },
});

export const CoverLetter =
  mongoose.models.CoverLetter ||
  mongoose.model<ICoverLetter>('CoverLetter', CoverLetterSchema);
