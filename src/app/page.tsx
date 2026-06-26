export default function Home() {
  const apiInfo = {
    name: "ResuPulse API",
    version: "2.0.0",
    status: "running",
    framework: "Next.js 16",
    description: "AI-Powered Resume Analyzer",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        logout: "POST /api/auth/logout",
        me: "GET /api/auth/me"
      },
      resume: {
        analyze: "POST /api/analyze",
        history: "GET /api/history",
        historyById: "GET /api/history/:id"
      },
      features: {
        match: "POST /api/match",
        compare: "POST /api/compare",
        builder: "POST /api/builder",
        coverLetter: "POST /api/cover-letter",
        linkedin: "POST /api/linkedin"
      },
      jobs: {
        list: "GET /api/jobs",
        create: "POST /api/jobs",
        get: "GET /api/jobs/:id",
        update: "PUT /api/jobs/:id",
        delete: "DELETE /api/jobs/:id"
      },
      applications: {
        list: "GET /api/applications",
        create: "POST /api/applications",
        get: "GET /api/applications/:id",
        update: "PUT /api/applications/:id",
        delete: "DELETE /api/applications/:id"
      },
      analytics: {
        dashboard: "GET /api/analytics"
      }
    },
    documentation: "https://github.com/yourusername/resupulse",
    timestamp: new Date().toISOString()
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{apiInfo.name}</h1>
              <p className="text-blue-100 text-lg">{apiInfo.description}</p>
            </div>
            <div className="text-right">
              <div className="bg-white/20 backdrop-blur-sm rounded-sm px-4 py-2">
                <div className="text-sm text-blue-100">Version</div>
                <div className="text-2xl font-bold">{apiInfo.version}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-green-50 border-b border-green-200 px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-800 font-semibold">API Status: {apiInfo.status.toUpperCase()}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">{apiInfo.framework}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Available Endpoints</h2>
            <p className="text-gray-600 mb-6">
              Professional API for resume analysis, job matching, and application tracking
            </p>
          </div>

          {/* Endpoints Grid */}
          <div className="grid gap-6">
            {Object.entries(apiInfo.endpoints).map(([category, endpoints]) => (
              <div key={category} className="border border-gray-200 rounded-sm p-5 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 capitalize flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  {category}
                </h3>
                <div className="space-y-2">
                  {Object.entries(endpoints as Record<string, string>).map(([name, endpoint]) => {
                    const [method, path] = endpoint.split(' ');
                    return (
                      <div key={name} className="flex items-center gap-3 text-sm">
                        <span className={`px-2 py-1 rounded font-mono text-xs font-semibold ${
                          method === 'GET' ? 'bg-green-100 text-green-700' :
                          method === 'POST' ? 'bg-blue-100 text-blue-700' :
                          method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {method}
                        </span>
                        <code className="text-gray-700 font-mono">{path}</code>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Timestamp:</span>
                <div className="text-gray-700 font-mono mt-1">{apiInfo.timestamp}</div>
              </div>
              <div>
                <span className="text-gray-500">Health Check:</span>
                <div className="text-gray-700 font-mono mt-1">GET /health</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-8 py-4 text-center">
          <p className="text-gray-600 text-sm">
            Built with ❤️ using Next.js, MongoDB, and Groq AI
          </p>
        </div>
      </div>
    </div>
  );
}
