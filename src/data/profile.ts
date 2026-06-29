import { GITHUB_URL, LINKEDIN_URL } from "./social";

export interface SocialLink {
  label: string;
  href: string;
}

export interface Profile {
  name: string;
  shortName: string;
  role: string;
  /** One-line value prop shown in the hero. */
  tagline: string;
  /** Slightly longer intro for the About section. */
  intro: string;
  email: string;
  location: string;
  resumeUrl: string;
  socials: SocialLink[];
}

export const profile: Profile = {
  name: "Shiqi Hu",
  shortName: "Steven",
  role: "Full Stack Engineer",
  // TODO: replace with the final lighthearted/quirky one-liner.
  tagline:
    "I turn caffeine into clean commits and the occasional working feature.",
  intro:
    "I'm Steven — a full stack engineer who likes building things that are fast, " +
    "reliable, and a little delightful. I care about clean architecture, sensible " +
    "trade-offs, and shipping. When I'm not writing code, I'm usually behind a camera.",
  email: "shiqistevenhu@gmail.com",
  location: "",
  resumeUrl: import.meta.env.PUBLIC_RESUME_URL,
  socials: [
    { label: "GitHub", href: GITHUB_URL },
    { label: "LinkedIn", href: LINKEDIN_URL },
  ],
};
