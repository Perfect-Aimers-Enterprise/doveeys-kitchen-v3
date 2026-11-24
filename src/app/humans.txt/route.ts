import { brandConfig, developerConfig } from "@/config";

export const dynamic = "force-static";

export function GET() {
  const body = `/* TEAM */
Developer: ${developerConfig.name}
Role: ${developerConfig.role}; ${developerConfig.companyRole}, ${developerConfig.company}
Portfolio: ${developerConfig.portfolioUrl}

/* SITE */
Name: ${brandConfig.name}
Built by: ${developerConfig.name} (${developerConfig.company})
Standards: HTML5, CSS3, Next.js, TypeScript, PostgreSQL
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
