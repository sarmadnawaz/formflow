import { NextResponse } from "next/server";
import { appUrl } from "@/lib/ids";
import { openApiSpec } from "@/lib/openapi";

export const GET = () => NextResponse.json(openApiSpec(appUrl()), { headers: { "access-control-allow-origin": "*" } });
