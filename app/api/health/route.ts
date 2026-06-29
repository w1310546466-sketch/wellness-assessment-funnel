import { ok } from "@/lib/api/response";

export async function GET() {
  return ok({
    status: "ok",
    service: "ruiqi-health-funnel"
  });
}

