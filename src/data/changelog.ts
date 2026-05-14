export type ChangelogEntry = {
  sha: string;
  date: string; // ISO
  title: string;
  summary: string;
  files: { path: string; url: string }[];
  commitUrl: string;
};

const REPO = "vaggab0nd/KisX-backend";
const base = `https://github.com/${REPO}`;

// NOTE: Backend repo is private — entries below are curated manually.
// To add a new entry, append to the top of this list.
export const changelog: ChangelogEntry[] = [
  {
    sha: "pending",
    date: new Date().toISOString(),
    title: "Backend changes pending sync",
    summary:
      "The KisX-backend repository is private, so commit history cannot be fetched automatically. Add entries to src/data/changelog.ts as backend changes ship, or grant repo access to enable auto-population.",
    files: [],
    commitUrl: `${base}/commits`,
  },
];

export const repoUrl = base;
export const fileUrl = (path: string, sha = "main") =>
  `${base}/blob/${sha}/${path}`;