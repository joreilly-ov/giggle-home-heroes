import { Link } from "react-router-dom";
import { ArrowLeft, GitCommit, FileCode2, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { changelog, repoUrl } from "@/data/changelog";

const Changelog = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar variant="solid" />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back home
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Backend Changelog</h1>
          <p className="text-muted-foreground mt-2">
            Recent changes to the KisX backend (Cloud Run + Supabase functions).
          </p>
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
          >
            View repository <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </header>

        <ol className="space-y-4">
          {changelog.map((entry) => (
            <li key={entry.sha}>
              <Card className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-lg leading-tight">{entry.title}</h2>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="inline-flex items-center gap-1">
                        <GitCommit className="w-3.5 h-3.5" />
                        <code className="font-mono">{entry.sha.slice(0, 7)}</code>
                      </span>
                      <span>{new Date(entry.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a href={entry.commitUrl} target="_blank" rel="noopener noreferrer">
                      View commit <ExternalLink className="w-3.5 h-3.5 ml-1" />
                    </a>
                  </Button>
                </div>

                <p className="text-sm text-foreground/80 mt-3">{entry.summary}</p>

                {entry.files.length > 0 && (
                  <div className="mt-4 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Changed files ({entry.files.length})
                    </p>
                    <ul className="space-y-1">
                      {entry.files.map((f) => (
                        <li key={f.path}>
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-mono break-all"
                          >
                            <FileCode2 className="w-3.5 h-3.5 flex-shrink-0" />
                            {f.path}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ol>
      </main>
      <Footer />
    </div>
  );
};

export default Changelog;