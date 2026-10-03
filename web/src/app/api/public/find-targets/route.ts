import { getDemoFindTargets } from "@/lib/finder/demo-targets";
export const dynamic="force-dynamic";
export async function GET(){
  return Response.json({targets:await getDemoFindTargets()},{headers:{"Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff"}});
}
