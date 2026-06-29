export interface ExperienceEntry {
  role: string;
  company: string;
  /** Free-form date range, e.g. "Jan 2023 – Present". */
  period: string;
  location?: string;
  highlights: string[];
  tech: string[];
}

export const experience: ExperienceEntry[] = [
  {
    role: "Full Stack Engineer",
    company: "Choctaw Nation of Oklahoma",
    period: "Feb 2023 – Present",
    highlights: [
      "Owned end-to-end development of 6 of 50 member-services programs as component-based SPAs in C# .NET and Blazor on an Agile team, spanning member and admin platforms for a tribal government",
      "Modernized a legacy app, rebuilding the frontend in Blazor and refactoring stored procedures and views behind an EF Core database-first layer, cutting report load from 20s to 5s, server response 30%, and initial UI load 20%",
      "Architected a real-time notification system serving 400k+ members with a REST API on Azure App Service, APIM, and Functions",
      "Reduced processing time 20% and prevented 90% of data-entry errors by digitizing 2 admin workflows with frontend input sanitation and back-end validation",
      "Streamlined intake for 30+ programs with a stateful multi-step onboarding wizard built from reusable Telerik UI components with JavaScript, HTML, CSS, and Bootstrap",
      "Cut data ingestion time 15% by building a SQL Server ETL pipeline with SQL Agent jobs and T-SQL stored procedures to automate backend data flow across systems",
      "Extended 4 program modules with role-based access, inline editing, and Telerik CRUD data grids over an EF Core database-first data layer",
      "Improved reliability with unit, integration, and end-to-end coverage using xUnit, Moq, Playwright, and Postman, wired into Azure CI/CD pipelines",
      "Built a recommendation engine surfacing 5 personalized suggestions from profile and eligibility, driving a 10% lift in program click-through and applications",
    ],
    tech: ["C#", ".NET", "Blazor", "Entity Framework Core", "Telerik", "Azure App Service", "APIM", "Azure Functions", "SQL Server", "xUnit", "Moq", "Playwright", "JavaScript", "Bootstrap"],
  },
  {
    role: "Software Engineer Intern",
    company: "Bank of China (Hong Kong)",
    period: "Jul 2021 – Aug 2021",
    highlights: [
      "Migrated a legacy Excel-powered reporting system to SQL Server, cutting data processing time by 90% for the corporate banking team",
      "Automated reporting with SQL analytical tools over 800k+ client records and transaction histories, supporting a 10% lift in financial product conversion rates",
    ],
    tech: ["SQL Server", "SQL Analytics"],
  },
  {
    role: "Software Engineer Intern",
    company: "Megvii",
    period: "Dec 2020 – Apr 2021",
    highlights: [
      "Built SQL ETL pipelines automating data transformation, reducing report generation time 20% and enabling data-driven design of a loyalty program for 800k active users",
      "Reduced strategy response time by 10% by developing BI dashboards that surfaced real-time retail performance during high-traffic periods",
    ],
    tech: ["SQL", "ETL", "BI Dashboards"],
  },
];
