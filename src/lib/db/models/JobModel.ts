import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  userId?: mongoose.Types.ObjectId;
  title: string;
  company: string;
  location?: string;
  description: string;
  requirements?: string[];
  salary?: string;
  type?: 'full-time' | 'part-time' | 'contract' | 'internship';
  url?: string;
  status: 'active' | 'closed';
}

const JobSchema = new Schema<IJob>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    index: true
  },
  title: { 
    type: String, 
    required: true,
    trim: true,
    index: true
  },
  company: { 
    type: String, 
    required: true,
    trim: true
  },
  location: { 
    type: String, 
    trim: true
  },
  description: { 
    type: String, 
    required: true
  },
  requirements: [{ 
    type: String 
  }],
  salary: { 
    type: String 
  },
  type: { 
    type: String, 
    enum: ['full-time', 'part-time', 'contract', 'internship']
  },
  url: { 
    type: String 
  },
  status: { 
    type: String, 
    enum: ['active', 'closed'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
JobSchema.index({ userId: 1, createdAt: -1 });
JobSchema.index({ status: 1, createdAt: -1 });

export const Job = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);
