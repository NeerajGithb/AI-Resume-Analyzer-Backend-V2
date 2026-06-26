import mongoose, { Schema, Document } from 'mongoose';

// ─── Sub-document interfaces ──────────────────────────────────────────────────

export interface IExperienceEntry {
  jobTitle: string;
  employer: string;
  location: string;
  startDate: string;
  endDate: string;        // "Present" or "Month Year"
  description: string;
}

export interface IEducationEntry {
  degree: string;
  institution: string;
  location: string;
  graduationDate: string;
  gpa?: string;
}

export interface IProject {
  name: string;
  year: string;
  technologies: string;
  url?: string;
  bullets: string[];
}

// ─── Main document interface ──────────────────────────────────────────────────

export interface IResumeBuilderV2 extends Document {
  userId?: mongoose.Types.ObjectId;

  // Contact / heading
  name: string;
  phone: string;
  email: string;
  linkedin?: string;
  github?: string;
  leetcode?: string;
  location?: string;

  // Target
  targetRole: string;

  // Rich arrays (the V2 difference vs V1)
  experience: IExperienceEntry[];
  education: IEducationEntry[];

  // Skills — stored as categorised strings
  technicalSkills: string;
  softSkills: string;
  languages: string;

  // AI-generated content
  summary: string;
  projects: IProject[];
  achievements: string[];

  // Meta
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const ExperienceEntrySchema = new Schema<IExperienceEntry>(
  {
    jobTitle:    { type: String, required: true },
    employer:    { type: String, default: '' },
    location:    { type: String, default: '' },
    startDate:   { type: String, default: '' },
    endDate:     { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { _id: false },
);

const EducationEntrySchema = new Schema<IEducationEntry>(
  {
    degree:         { type: String, required: true },
    institution:    { type: String, required: true },
    location:       { type: String, default: '' },
    graduationDate: { type: String, default: '' },
    gpa:            { type: String },
  },
  { _id: false },
);

const ProjectSchema = new Schema<IProject>(
  {
    name:         { type: String, required: true },
    year:         { type: String, default: '' },
    technologies: { type: String, default: '' },
    url:          { type: String },
    bullets:      { type: [String], default: [] },
  },
  { _id: false },
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const ResumeBuilderV2Schema = new Schema<IResumeBuilderV2>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // Contact
    name:     { type: String, required: true },
    phone:    { type: String, required: true },
    email:    { type: String, required: true },
    linkedin: String,
    github:   String,
    leetcode: String,
    location: String,

    // Target
    targetRole: { type: String, required: true },

    // Rich arrays
    experience: { type: [ExperienceEntrySchema], default: [] },
    education:  { type: [EducationEntrySchema], default: [] },

    // Skills
    technicalSkills: { type: String, default: '' },
    softSkills:      { type: String, default: '' },
    languages:       { type: String, default: '' },

    // AI-generated
    summary:      { type: String, required: true },
    projects:     { type: [ProjectSchema], default: [] },
    achievements: { type: [String], default: [] },
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.ResumeBuilderV2 ||
  mongoose.model<IResumeBuilderV2>('ResumeBuilderV2', ResumeBuilderV2Schema);
