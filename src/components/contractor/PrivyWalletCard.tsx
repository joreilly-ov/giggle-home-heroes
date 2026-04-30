import { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet2, Copy, CheckCircle2, Loader2, ExternalLink, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function PrivyWalletCard() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const address = embeddedWallet?.address;
  const isConnected = authenticated && !!address;

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast({ title: "Address copied", description: "Wallet address copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet2 className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base font-heading">Crypto Wallet for Digital Payouts</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Receive payments in USDC on Base — instant, no bank delays.
            </CardDescription>
          </div>
          {isConnected && (
            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/25 gap-1 shrink-0">
              <CheckCircle2 className="w-3 h-3" /> Active
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!ready ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Initialising wallet…
          </div>
        ) : isConnected ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm text-foreground space-y-3">
            <p className="font-medium">Your crypto wallet is ready.</p>
            <p className="text-muted-foreground text-xs">
              When homeowners release escrow you'll be able to receive your payout in USDC on Base.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-background border border-border rounded-lg px-3 py-2 text-foreground truncate">
                {truncate(address!)}
              </code>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0"
                onClick={copyAddress}
              >
                {copied ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <button
              onClick={logout}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Disconnect wallet
            </button>
          </div>
        ) : (
          <>
            <div className="bg-secondary/60 border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Coins className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Create a free embedded crypto wallet — no MetaMask or crypto experience needed.
                  We'll use it to send USDC the moment escrow is released.
                </p>
              </div>
            </div>
            <Button onClick={login} disabled={!ready} className="gap-2">
              <Wallet2 className="w-4 h-4" />
              Set up crypto wallet
            </Button>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          Powered by{" "}
          <a
            href="https://privy.io"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5"
          >
            Privy <ExternalLink className="w-2.5 h-2.5" />
          </a>
          {" · "}USDC on{" "}
          <a
            href="https://base.org"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5"
          >
            Base <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
