import { GET as collect } from "../weather/collect/route";
export const runtime = "nodejs";
export const maxDuration = 60;
// Preserve the existing protected URL for schedulers during migration.
export const GET = collect;
