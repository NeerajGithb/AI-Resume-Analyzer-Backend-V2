# ResuPulse - Next.js Backend

Professional AI Resume Analyzer built with Next.js App Router, MongoDB, and Groq AI.

## 🏗️ Architecture

```
nodebackend/
├── src/
│   ├── app/
│   │   └── api/              # API Routes (Next.js App Router)
│   │       ├── analyze/      # Resume analysis
│   │       ├── auth/         # Authentication (register, login, logout, me)
│   │       ├── applications/ # Job application tracking
│   │       ├── analytics/    # Analytics dashboard
│   │       ├── builder/      # Resume builder
│   │       ├── compare/      # Resume comparison
│   │       ├── cover-letter/ # Cover letter generation
│   │       ├── history/      # Analysis history
│   │       ├── jobs/         # Job management
│   │       ├── linkedin/     # LinkedIn profile analysis
│   │       └── match/        # Job matching
│   └── lib/
│       ├── config/           # Configuration (env, db, constants)
│       ├── db/models/        # MongoDB models (9 models)
│       ├── middleware/       # Auth & rate limiting
│       ├── services/         # Business logic
│       └── utils/            # Utilities (PDF parser, AI, auth)
```

## 🚀 Features

### Core Features
- ✅ **Resume Analysis** - AI-powered resume feedback with scoring
- ✅ **Job Matching** - Match resume with job descriptions
- ✅ **Resume Comparison** - Compare two resumes side-by-side
- ✅ **Resume Builder** - AI-assisted resume building
- ✅ **Cover Letter Generator** - Generate tailored cover letters
- ✅ **LinkedIn Analyzer** - Analyze LinkedIn profiles

### User Management
- ✅ **Authentication** - JWT-based auth with cookies
- ✅ **Job Tracking** - Track job applications
- ✅ **Analytics Dashboard** - View statistics and insights
- ✅ **History** - Access past analysis results

## 📋 API Endpoints

### Authentication
```
POST   /api/auth/register     - Register new user
POST   /api/auth/login        - Login user
POST   /api/auth/logout       - Logout user
GET    /api/auth/me           - Get current user
```

### Resume Analysis
```
POST   /api/analyze           - Analyze resume (FormData: resume, yearsOfExperience?, targetRole?)
GET    /api/history           - Get analysis history
GET    /api/history/:id       - Get specific analysis
```

### Job Features
```
POST   /api/match             - Match resume with job (FormData: resume, jobDescription)
POST   /api/compare           - Compare two resumes (FormData: resume1, resume2)
POST   /api/cover-letter      - Generate cover letter (FormData: resume, jobDescription, companyName?)
POST   /api/linkedin          - Analyze LinkedIn profile (JSON: profileText)
POST   /api/builder           - Build resume (JSON: personalInfo, experience, skills, etc.)
```

### Job Management (Auth Required)
```
GET    /api/jobs              - List user's jobs
POST   /api/jobs              - Create new job
GET    /api/jobs/:id          - Get job details
PUT    /api/jobs/:id          - Update job
DELETE /api/jobs/:id          - Delete job
```

### Application Tracking (Auth Required)
```
GET    /api/applications      - List applications
POST   /api/applications      - Create application
GET    /api/applications/:id  - Get application
PUT    /api/applications/:id  - Update application
DELETE /api/applications/:id  - Delete application
```

### Analytics (Auth Required)
```
GET    /api/analytics         - Get user analytics
```

## 🛠️ Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create `.env.local`:
```env
MONGODB_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
JWT_SECRET=your_jwt_secret_min_32_characters
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### 3. Run Development Server
```bash
npm run dev
```

Server runs on `http://localhost:3000`

### 4. Build for Production
```bash
npm run build
npm start
```

## 🔒 Authentication

The API uses JWT tokens stored in HTTP-only cookies. Include credentials in requests:

```javascript
fetch('http://localhost:3000/api/auth/me', {
  credentials: 'include'
})
```

Or use Bearer token:
```javascript
fetch('http://localhost:3000/api/jobs', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
```

## 📦 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: MongoDB with Mongoose
- **AI**: Groq SDK (Llama 3.3)
- **PDF Processing**: pdf-parse v2
- **Validation**: Zod
- **Authentication**: JWT + bcryptjs
- **TypeScript**: Full type safety

## 🌐 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms
Works on any Node.js hosting platform:
- AWS Lambda
- Netlify Functions
- Railway
- Render

## 📝 Models

- **User** - User authentication
- **Analysis** - Resume analysis results
- **Job** - Job postings
- **Application** - Job applications
- **JobMatch** - Job matching results
- **Comparison** - Resume comparisons
- **ResumeBuilder** - Resume builder data
- **CoverLetter** - Generated cover letters
- **LinkedIn** - LinkedIn profile analyses

## 🔧 Configuration

### Rate Limiting
In-memory rate limiting configured in `lib/middleware/rateLimit.ts`:
- 15-minute windows
- Configurable per endpoint

### File Upload
- Max file size: 5MB
- Accepted types: PDF only
- Configured in `lib/config/constants.ts`

### Database
- Connection pooling: 10 connections
- Auto-reconnect enabled
- Timeout: 5 seconds

## 📚 Development

### Adding New Routes
1. Create route file: `src/app/api/your-route/route.ts`
2. Export HTTP methods: `GET`, `POST`, `PUT`, `DELETE`
3. Use helpers: `connectDB()`, `requireAuth()`, `errorResponse()`

Example:
```typescript
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/config/db';
import { requireAuth } from '@/lib/middleware/auth';
import { errorResponse } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const userId = await requireAuth(request);
    
    // Your logic here
    
    return Response.json({ success: true, data: {} });
  } catch (error) {
    return errorResponse(error);
  }
}
```

## 🐛 Error Handling

All errors use centralized `AppError` class:
```typescript
throw new AppError(400, 'Custom error message');
```

Errors are automatically formatted by `errorResponse()`.

## 📄 License

MIT

## 👨‍💻 Author

Built with ❤️ for professional resume analysis
