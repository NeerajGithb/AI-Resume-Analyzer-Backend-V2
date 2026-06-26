export async function GET() {
  return Response.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    service: 'ResuPulse API'
  });
}
