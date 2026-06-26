import mongoose, { Schema, Document } from 'mongoose';

export interface IApplication extends Document {
  userId?: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId;
  company: string;
  position: string;
  status: 'applied' | 'screening' | 'interview' | 'offer' | 'rejected';
  appliedDate: Date;
  notes?: string;
  jobUrl?: string;
}

const ApplicationSchema = new Schema<IApplication>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    index: true
  },
  jobId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Job',
    index: true
  },
  company: { 
    type: String, 
    required: true,
    trim: true
  },
  position: { 
    type: String, 
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['applied', 'screening', 'interview', 'offer', 'rejected'],
    default: 'applied',
    index: true
  },
  appliedDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  notes: {
    type: String
  },
  jobUrl: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ApplicationSchema.index({ userId: 1, appliedDate: -1 });
ApplicationSchema.index({ status: 1, appliedDate: -1 });

export const Application = mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);
