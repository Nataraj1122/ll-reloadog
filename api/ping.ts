
export default async function handler(req: any, res: any) {
  console.log("[PING] API Route Hit");
  return res.status(200).json({
    success: true,
    message: "API working",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
}
