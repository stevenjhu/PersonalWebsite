import { GITHUB_URL } from "./social";

export interface Project {
  title: string;
  description: string;
  tech: string[];
  /** Optional thumbnail (place in public/ or use an R2 URL). */
  image?: string;
  liveUrl?: string;
  repoUrl?: string;
  featured?: boolean;
}

// PLACEHOLDER — populated from Steven's resume / portfolio once provided.
export const projects: Project[] = [
  {
    title: "This Portfolio",
    description:
      "Static-first Astro site with React islands, deployed on Cloudflare Workers " +
      "with a serverless contact API and a Cloudflare R2 image pipeline.",
    tech: [
      "Astro",
      "React",
      "TypeScript",
      "Tailwind",
      "Azure Functions",
      "Cloudflare R2",
    ],
    repoUrl: GITHUB_URL,
    featured: true,
  },
  {
    title: "Project Two",
    description: "Placeholder — replace with a real project description.",
    tech: ["TypeScript", "Node.js"],
    repoUrl: GITHUB_URL,
  },
  {
    title: "Project Three",
    description: "Placeholder — replace with a real project description.",
    tech: ["React", "PostgreSQL"],
    repoUrl: GITHUB_URL,
  },
];
