import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bid, JobStatus } from "@/lib/api";
import {
  Loader2,
  AlertTriangle,
  Gavel,
  Check,
  X,
  Circle,
  Building2,
  PoundSterling,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useJobBids, useAcceptBid, useRejectBid } from "@/hooks/use-api-queries";

// ─── Status config ────────────────────────────────────────────────────────────

const BID_STATUS_CONFIG = {
  pending: {
    label: "Pending",
    classes:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
    dot: "bg-amber-400",
  },
  accepted: {
    label: "Accepted",
    classes:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
    dot: "bg-green-500",
  },
  rejected: {
    label: "Declined",
    classes:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
    dot: "bg-red-500",
  },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

interface JobBidsProps {
  jobId: string;
  jobStatus: JobStatus;
  onBidAccepted?: () => void;
}

export function JobBids({ jobId, jobStatus, onBidAccepted }: JobBidsProps) {
  const { toast } = useToast();
  const [acting, setActing] = useState<string | null>(null);

  const { data: bids = [], isLoading, error, refetch } = useJobBids(jobId);
  const { mutate: acceptBid } = useAcceptBid();
  const { mutate: rejectBid } = useRejectBid();

  const respond = async (bidId: string, action: "accept" | "reject") => {
    setActing(bidId);
    try {
      if (action === "accept") {
        acceptBid(
          { jobId, bidId },
          {
            onSuccess: () => {
              toast({
                title: "Bid accepted!",
                description:
                  "All other bids have been declined and the job is now awarded.",
              });
              onBidAccepted?.();
            },
            onError: (err) => {
              toast({
                title: "Failed to accept bid",
                description: err instanceof Error ? err.message : "Something went wrong",
                variant: "destructive",
              });
            },
            onSettled: () => setActing(null),
          }
        );
      } else {
        rejectBid(
          { jobId, bidId },
          {
            onSuccess: () => {
              toast({ title: "Bid declined." });
            },
            onError: (err) => {
              toast({
                title: "Failed to reject bid",
                description: err instanceof Error ? err.message : "Something went wrong",
                variant: "destructive",
              });
            },
            onSettled: () => setActing(null),
          }
        );
      }
    } catch (e) {
      setActing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading bids…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <p className="text-xs text-destructive">{error instanceof Error ? error.message : String(error)}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Gavel className="w-7 h-7 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">No bids yet</p>
        <p className="text-xs text-muted-foreground">
          {jobStatus === "open"
            ? "Contractors can see this job and will submit bids soon."
            : "Publish the job to start receiving bids."}
        </p>
      </div>
    );
  }

  const canAct = jobStatus === "open";

  return (
    <div className="space-y-3">
      {bids.map((bid) => {
        const cfg = BID_STATUS_CONFIG[bid.status] ?? BID_STATUS_CONFIG.pending;
        const pounds = (bid.amount_pence / 100).toLocaleString("en-GB", {
          style: "currency",
          currency: "GBP",
        });
        const isActing = acting === bid.id;

        return (
          <div
            key={bid.id}
            className="bg-secondary/40 border border-border rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {bid.contractor?.business_name ?? "Contractor"}
                  </p>
                  {bid.contractor?.expertise &&
                    bid.contractor.expertise.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {bid.contractor.expertise.slice(0, 3).join(" · ")}
                      </p>
                    )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-0.5 text-base font-bold text-foreground">
                  <PoundSterling className="w-3.5 h-3.5" />
                  {(bid.amount_pence / 100).toFixed(2)}
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold border flex items-center gap-1.5 ${cfg.classes}`}
                >
                  <Circle
                    className={`w-1.5 h-1.5 fill-current ${cfg.dot} rounded-full`}
                  />
                  {cfg.label}
                </Badge>
              </div>
            </div>

            {bid.note && (
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                {bid.note}
              </p>
            )}

            {canAct && bid.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                  disabled={isActing}
                  onClick={() => respond(bid.id, "reject")}
                >
                  {isActing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5 mr-1" />
                  )}
                  Decline
                </Button>
                <Button
                  size="sm"
                  disabled={isActing}
                  onClick={() => respond(bid.id, "accept")}
                >
                  {isActing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 mr-1" />
                  )}
                  Accept
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
