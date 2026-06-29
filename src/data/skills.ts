export interface SkillGroup {
  category: string;
  items: string[];
}

export const skills: SkillGroup[] = [
  {
    category: "Languages",
    items: ["C#", "TypeScript", "JavaScript", "HTML", "CSS", "SQL"],
  },
  {
    category: "Frameworks",
    items: [".NET", "Blazor", "Entity Framework Core", "Telerik", "React", "Astro", "Tailwind", "Bootstrap"],
  },
  {
    category: "Cloud & DevOps",
    items: ["Azure CI/CD", "Azure App Service", "APIM", "Azure Functions", "Cloudflare R2", "GitHub Actions"],
  },
  {
    category: "Testing",
    items: ["xUnit", "Moq", "Playwright", "Postman"],
  },
];
