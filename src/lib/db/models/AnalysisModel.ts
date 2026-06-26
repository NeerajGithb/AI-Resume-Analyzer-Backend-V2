import mongoose, { Schema, Document } from 'mongoose';

interface IKeywordGroup {
  technical: string[];
  soft_skills: string[];
  industry: string[];
}

export interface IAnalysis extends Document {
  userId?: mongoose.Types.ObjectId;
  fileName: string;
  fileSize: number;
  yearsOfExperience?: string;
  targetRole?: string;

  overall_score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';

  ats_compatibility: {
    score: number;
    has_standard_headings: boolean;
    has_tables: boolean;
    has_images_or_icons: boolean;
    has_multi_column_layout: boolean;
    contact_info_complete: boolean;
    parseable: boolean;
    issues: string[];
  };

  keyword_analysis: {
    score: number;
    found: IKeywordGroup;
    missing: IKeywordGroup;
  };

  role_matching: {
    score: number;
    target_role: string | null;
    inferred_role: string | null;
    match_explanation: string;
  };

  experience_impact: {
    score: number;
    quantified_bullets_count: number;
    total_bullets_count: number;
    weak_bullets: { original: string; why_weak: string; better_version: string }[];
    feedback: string;
  };

  content_quality: {
    score: number;
    uses_action_verbs: boolean;
    has_fluff_phrases: boolean;
    fluff_phrases_found: string[];
    feedback: string;
    improvements: { problem: string; better_version: string }[];
  };

  resume_structure: {
    score: number;
    sections_present: string[];
    sections_missing: string[];
    feedback: string;
  };

  project_analysis: {
    has_projects: boolean;
    notes: string;
    missing_impact: string[];
  };

  skills_analysis: {
    frontend: string[];
    backend: string[];
    database: string[];
    cloud: string[];
    devops: string[];
    tools: string[];
    missing_categories: string[];
  };

  formatting_notes: {
    length_feedback: string;
    consistency_issues: string[];
  };

  summary_analysis: {
    has_summary: boolean;
    is_generic: boolean;
    feedback: string;
    rewrite?: string;
  };

  grammar_analysis: {
    issues_count: number;
    examples: string[];
    feedback: string;
  };

  strengths: string[];

  improvements: {
    section: string;
    original: string;
    rewrite: string;
    impact: 'high' | 'medium' | 'low';
  }[];

  top_3_actions: [string, string, string];

  red_flags: string[];
  honest_summary: string;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const KeywordGroupSchema = {
  technical: [String],
  soft_skills: [String],
  industry: [String],
};

const AnalysisSchema = new Schema<IAnalysis>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    fileName: { type: String, required: true, trim: true, maxlength: 255 },
    fileSize: { type: Number, required: true, min: 0 },
    yearsOfExperience: { type: String, trim: true },
    targetRole: { type: String, trim: true },

    overall_score: { type: Number, required: true, min: 0, max: 100 },
    grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'], required: true },

    ats_compatibility: {
      score: { type: Number, required: true, min: 0, max: 100 },
      has_standard_headings: { type: Boolean, required: true },
      has_tables: { type: Boolean, required: true },
      has_images_or_icons: { type: Boolean, required: true },
      has_multi_column_layout: { type: Boolean, required: true },
      contact_info_complete: { type: Boolean, required: true },
      parseable: { type: Boolean, required: true },
      issues: [String],
    },

    keyword_analysis: {
      score: { type: Number, required: true, min: 0, max: 100 },
      found: KeywordGroupSchema,
      missing: KeywordGroupSchema,
    },

    role_matching: {
      score: { type: Number, required: true, min: 0, max: 100 },
      target_role: { type: String, default: null },
      inferred_role: { type: String, default: null },
      match_explanation: { type: String, required: true },
    },

    experience_impact: {
      score: { type: Number, required: true, min: 0, max: 100 },
      quantified_bullets_count: { type: Number, required: true, min: 0 },
      total_bullets_count: { type: Number, required: true, min: 0 },
      weak_bullets: [{
        original: { type: String, required: true },
        why_weak: { type: String, required: true },
        better_version: { type: String, required: true },
      }],
      feedback: { type: String, required: true },
    },

    content_quality: {
      score: { type: Number, required: true, min: 0, max: 100 },
      uses_action_verbs: { type: Boolean, required: true },
      has_fluff_phrases: { type: Boolean, required: true },
      fluff_phrases_found: [String],
      feedback: { type: String, required: true },
      improvements: [{
        problem: { type: String, required: true },
        better_version: { type: String, required: true },
      }],
    },

    resume_structure: {
      score: { type: Number, required: true, min: 0, max: 100 },
      sections_present: [String],
      sections_missing: [String],
      feedback: { type: String, required: true },
    },

    project_analysis: {
      has_projects: { type: Boolean, required: true },
      notes: { type: String, required: true },
      missing_impact: [String],
    },

    skills_analysis: {
      frontend: [String],
      backend: [String],
      database: [String],
      cloud: [String],
      devops: [String],
      tools: [String],
      missing_categories: [String],
    },

    formatting_notes: {
      length_feedback: { type: String, required: true },
      consistency_issues: [String],
    },

    summary_analysis: {
      has_summary: { type: Boolean, required: true },
      is_generic: { type: Boolean, required: true },
      feedback: { type: String, required: true },
      rewrite: { type: String },
    },

    grammar_analysis: {
      issues_count: { type: Number, required: true, min: 0 },
      examples: [String],
      feedback: { type: String, required: true },
    },

    strengths: [{ type: String }],

    improvements: [{
      section: { type: String, required: true },
      original: { type: String, required: true },
      rewrite: { type: String, required: true },
      impact: { type: String, enum: ['high', 'medium', 'low'], required: true },
    }],

    top_3_actions: { type: [String], validate: [(v: string[]) => v.length === 3, 'top_3_actions must have exactly 3 items'] },

    red_flags: [String],
    honest_summary: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

AnalysisSchema.index({ createdAt: -1 });
AnalysisSchema.index({ userId: 1, createdAt: -1 });

export const Analysis =
  (mongoose.models.Analysis as mongoose.Model<IAnalysis>) ||
  mongoose.model<IAnalysis>('Analysis', AnalysisSchema);