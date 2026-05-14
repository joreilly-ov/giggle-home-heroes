import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { api } from "@/lib/api";
import type { RfpDocument, MatchResponse, Job } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, Video, Image as ImageIcon, ArrowLeft, CheckCircle, AlertTriangle, Loader2, X, Wrench, Package } from "lucide-react";
import { useVertical } from "@/contexts/VerticalContext";
import TaskBreakdown from "@/components/photo-analyzer/TaskBreakdown";
import { ClarificationsStep } from "@/components/post-project/ClarificationsStep";
import { RfpReviewStep } from "@/components/post-project/RfpReviewStep";
import { MatchedContractorsStep } from "@/components/post-project/MatchedContractorsStep";
import { fileToPhotoDataUri } from "@/lib/photo-analysis";

type VideoMetadata = {
  duration_seconds?: number;
  width?: number;
  height?: number;
  latitude?: number;
  longitude?: number;
  location_source?: string;
};

type AnalysisResult = {
  // Actual Gemini response fields
  problem_type?: string;
  description?: string;
  location_in_home?: string;
  urgency?: string; // "low" | "medium" | "high" | "emergency"
  materials_involved?: string[];
  clarifying_questions?: string[];
  video_metadata?: VideoMetadata;
  // Legacy/fallback fields the UI also checks
  summary?: string;
  likely_issue?: string;
  urgency_score?: number;
  trade_category?: string;
  materials?: string[];
  estimated_cost_range?: string;
  recommendations?: string[];
  required_tools?: string[];
  estimated_parts?: string[];
  materials_components_visible?: string[];
  [key: string]: unknown;
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const URGENCY_STYLES: Record<string, { bg: string; label: string }> = {
  emergency: { bg: "bg-destructive/10 text-destructive", label: "🚨 Emergency" },
  high: { bg: "bg-destructive/10 text-destructive", label: "High" },
  medium: { bg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", label: "Medium" },
  low: { bg: "bg-primary/10 text-primary", label: "Low" },
};

const getUrgencyStyle = (urgency: string) => {
  const key = urgency.toLowerCase();
  return URGENCY_STYLES[key] || { bg: "bg-muted text-muted-foreground", label: urgency };
};

const backendErrorMessage = (data: unknown, status: number) => {
  const payload = typeof data === "object" && data !== null ? data as Record<string, unknown> : {};
  if (typeof payload.error === "string") return payload.error;
  if (typeof payload.detail === "string") return payload.detail;
  if (Array.isArray(payload.detail)) {
    return payload.detail.map((item) => {
      if (typeof item === "object" && item !== null) {
        const detail = item as Record<string, unknown>;
        return detail.msg || detail.message || JSON.stringify(detail);
      }
      return String(item);
    }).join("; ");
  }
  return `Analysis failed (${status})`;
};

const PostProject = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { categories } = useVertical();

  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileKind, setFileKind] = useState<"video" | "image" | null>(null);
  const [description, setDescription] = useState("");
  const [tradeCategory, setTradeCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  type DebugInfo = {
    timestamp: string;
    endpoint: string;
    method: string;
    requestHeaders: Record<string, string>;
    requestPayload: Record<string, unknown>;
    responseStatus?: number;
    responseHeaders?: Record<string, string>;
    responseBodyRaw?: string;
    responseBodyParsed?: unknown;
    errorMessage?: string;
  };
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  // Post-analysis flow state
  type PostAnalysisStep = "analysis" | "clarifications" | "rfp" | "matches";
  const [postStep, setPostStep] = useState<PostAnalysisStep>("analysis");
  const [createdJob, setCreatedJob] = useState<Job | null>(null);

  // The cars Cloud Run backend does not expose POST /jobs — the job row is
  // created server-side as part of /analyse and the id is returned in the
  // analyse response. Pull that id (job_id / id) and synthesize a Job object.
  const ensureJob = async (analysis: AnalysisResult): Promise<Job> => {
    const candidate = (analysis as Record<string, unknown>).job_id
      ?? (analysis as Record<string, unknown>).id;
    if (typeof candidate === "string" && candidate.length > 0) {
      return {
        id: candidate,
        user_id: user?.id ?? "",
        status: "draft",
        analysis_result: analysis as Record<string, unknown>,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    // Fallback to the legacy collection endpoint (will 404 on cars backend).
    return api.jobs.create(analysis as Record<string, unknown>);
  };
  const [rfpDoc, setRfpDoc] = useState<RfpDocument | null>(null);
  const [matchData, setMatchData] = useState<MatchResponse | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  // Backend accepts only these image MIME types (validated by magic bytes server-side)
  const SUPPORTED_IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"];
  const SUPPORTED_VIDEO_EXTS = ["mp4", "mov", "webm", "m4v", "quicktime"];

  const acceptFile = (selected: File): boolean => {
    const ext = selected.name.split(".").pop()?.toLowerCase() ?? "";
    const isImage = selected.type.startsWith("image/") || SUPPORTED_IMAGE_EXTS.includes(ext);
    const isVideo = selected.type.startsWith("video/") || SUPPORTED_VIDEO_EXTS.includes(ext);

    if (!isVideo && !isImage) {
      toast({ title: "Invalid file", description: "Please select a video or photo.", variant: "destructive" });
      return false;
    }

    // Block unsupported image formats (HEIC/HEIF from iPhone, GIF, BMP, TIFF, etc.)
    if (isImage && !SUPPORTED_IMAGE_EXTS.includes(ext)) {
      toast({
        title: "Unsupported photo format",
        description: "Please use JPG, PNG or WebP. iPhone HEIC photos aren't supported — change your camera setting to 'Most Compatible' or convert the file first.",
        variant: "destructive",
      });
      return false;
    }

    if (selected.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 100MB.", variant: "destructive" });
      return false;
    }

    setFile(selected);
    setFilePreview(URL.createObjectURL(selected));
    setFileKind(isVideo ? "video" : "image");
    setResult(null);
    setError(null);
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) acceptFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) acceptFile(dropped);
  };

  const clearFile = () => {
    setFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    setFileKind(null);
    setDescription("");
    setTradeCategory("");
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const analyseVideo = async () => {
    if (!file) return;
    // Cloud Run caps: 32MB hard limit (returns 413 without CORS — surfaces as network error).
    // Backend caps videos at 32MB and images at 20MB; we use 30MB / 20MB to leave headroom.
    const isImage = fileKind === "image";
    const MAX_BYTES = isImage ? 20 * 1024 * 1024 : 30 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      const msg = `${isImage ? "Photo" : "Video"} is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Please keep it under ${isImage ? "20" : "30"} MB.`;
      setError(msg);
      toast({ title: "File too large", description: msg, variant: "destructive" });
      return;
    }
    if (isImage && description.trim().length < 10) {
      const msg = "Please describe the problem in at least 10 characters before analysing a photo.";
      setError(msg);
      toast({ title: "Description too short", description: msg, variant: "destructive" });
      return;
    }
    setUploading(true);
    setProgress(10);
    setError(null);
    setDebugInfo(null);

    try {
      setProgress(30);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const locationFields = !isImage && "geolocation" in navigator
        ? await new Promise<{ lat: string; lon: string } | null>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude.toString(), lon: pos.coords.longitude.toString() }),
              () => resolve(null),
              { timeout: 5000 }
            );
          })
        : null;

      const body = isImage
        ? JSON.stringify({
            images: [await fileToPhotoDataUri(file)],
            description: description.trim(),
            ...(tradeCategory && tradeCategory !== "_auto" ? { trade_category: tradeCategory } : {}),
          })
        : (() => {
            // Normalize MIME — some browsers send .mov as application/octet-stream, which the backend rejects.
            let uploadFile: File = file;
            if (!file.type.startsWith("video/")) {
              const ext = file.name.split(".").pop()?.toLowerCase();
              const fallback = ext === "mov" ? "video/quicktime" : ext === "webm" ? "video/webm" : "video/mp4";
              uploadFile = new File([file], file.name, { type: fallback });
            }
            const formData = new FormData();
            formData.append("file", uploadFile);
            if (description.trim().length >= 10) formData.append("description", description.trim());
            if (tradeCategory && tradeCategory !== "_auto") formData.append("trade_category", tradeCategory);
            if (locationFields) {
              formData.append("browser_lat", locationFields.lat);
              formData.append("browser_lon", locationFields.lon);
            }
            return formData;
          })();

      const endpoint = `https://stable-gig-cars-374485351183.europe-west1.run.app/analyse${isImage ? "/photos" : ""}`;
      const requestHeaders: Record<string, string> = {
        ...(isImage ? { "Content-Type": "application/json" } : { "Content-Type": "multipart/form-data (browser-set)" }),
        ...(token ? { Authorization: `Bearer ${token.slice(0, 12)}…(redacted)` } : {}),
      };

      // Build a redacted snapshot of the payload for the debug modal
      let payloadSnapshot: Record<string, unknown>;
      if (isImage) {
        const parsed = JSON.parse(body as string) as { images: string[]; description: string; trade_category?: string };
        payloadSnapshot = {
          images: parsed.images.map((uri, i) => {
            const match = /^data:([^;]+);base64,(.*)$/.exec(uri);
            return {
              index: i,
              mime: match?.[1] ?? "(unknown)",
              base64_length: match?.[2]?.length ?? 0,
              approx_bytes: match?.[2] ? Math.floor((match[2].length * 3) / 4) : 0,
              preview: uri.slice(0, 80) + "…",
            };
          }),
          description: parsed.description,
          description_length: parsed.description.length,
          trade_category: parsed.trade_category ?? null,
        };
      } else {
        const fd = body as FormData;
        const fields: Record<string, unknown> = {};
        fd.forEach((value, key) => {
          if (value instanceof File) {
            fields[key] = { filename: value.name, type: value.type, size_bytes: value.size };
          } else {
            fields[key] = value;
          }
        });
        payloadSnapshot = fields;
      }

      const debug: DebugInfo = {
        timestamp: new Date().toISOString(),
        endpoint,
        method: "POST",
        requestHeaders,
        requestPayload: payloadSnapshot,
      };

      const response = await fetch(endpoint, {
        method: "POST",
        body,
        headers: {
          ...(isImage ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      setProgress(90);

      const rawText = await response.text();
      let data: Record<string, unknown> = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { error: rawText || `Analysis failed (${response.status})` };
      }
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => { responseHeaders[k] = v; });
      debug.responseStatus = response.status;
      debug.responseHeaders = responseHeaders;
      debug.responseBodyRaw = rawText;
      debug.responseBodyParsed = data;
      setDebugInfo(debug);
      if (import.meta.env.DEV) {
        console.log("[PostProject] /analyse status:", response.status);
        console.log("[PostProject] /analyse body:", data);
      }
      if (!response.ok) {
        throw new Error(backendErrorMessage(data, response.status));
      }
      if (typeof data.error === "string") throw new Error(data.error);

      setResult(data as AnalysisResult);
      setProgress(100);

      // Save analysis to videos table
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("postcode, city, state")
          .eq("id", user.id)
          .maybeSingle();

        await supabase.from("videos").insert({
          user_id: user.id,
          filename: file.name,
          analysis_result: data as Json,
          status: "draft",
          trade_category: typeof data.problem_type === "string" ? data.problem_type : typeof data.trade_category === "string" ? data.trade_category : null,
          description: typeof data.description === "string" ? data.description : typeof data.likely_issue === "string" ? data.likely_issue : typeof data.summary === "string" ? data.summary : null,
          postcode: profile?.postcode || null,
          city: profile?.city || null,
          state: profile?.state || null,
        });
      }

      toast({
        title: "Analysis complete!",
        description: `Your ${fileKind === "image" ? "photo" : "video"} has been processed.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setDebugInfo((prev) => prev ? { ...prev, errorMessage: msg } : { timestamp: new Date().toISOString(), endpoint: "(failed before fetch)", method: "POST", requestHeaders: {}, requestPayload: {}, errorMessage: msg });
      toast({ title: "Analysis failed", description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (loading) return null;

  // Resolve actual Gemini fields with legacy fallbacks
  const displayDescription = result?.description || result?.likely_issue || result?.summary;
  const displayProblemType = result?.problem_type || result?.trade_category;
  const displayMaterials = result?.materials_involved || result?.materials || result?.materials_components_visible;
  const displayUrgency = result?.urgency;

  return (
    <div className="min-h-screen page-bg">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto flex items-center h-16 px-4 gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-heading font-bold text-foreground">Post a Project</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Upload area */}
        {!result && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
                Show us what needs fixing
              </h2>
              <p className="text-muted-foreground">
                Upload a photo or short video of the problem area. Our AI will analyse it and suggest the right trades and estimated costs.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">New</span>
                Photos are now supported — upload a JPG or PNG instead of a video
              </div>
            </div>

            {!file ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="group flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <ImageIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-foreground font-semibold">Upload a photo</p>
                      <p className="text-xs text-muted-foreground mt-1">JPG, PNG or WebP · Max 20MB</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="group flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Video className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-foreground font-semibold">Upload a video</p>
                      <p className="text-xs text-muted-foreground mt-1">MP4, MOV or WebM · Max 30MB</p>
                    </div>
                  </button>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Or drag & drop a file anywhere in this area
                </p>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-secondary">
                  {fileKind === "video" ? (
                    <video
                      src={filePreview!}
                      controls
                      className="w-full max-h-[400px] object-contain"
                    />
                  ) : (
                    <img
                      src={filePreview!}
                      alt="Selected preview"
                      className="w-full max-h-[400px] object-contain"
                    />
                  )}
                  <button
                    onClick={clearFile}
                    className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-background transition-colors"
                  >
                    <X className="w-4 h-4 text-foreground" />
                  </button>
                </div>

                <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-4">
                  {fileKind === "video" ? (
                    <Video className="w-5 h-5 text-primary flex-shrink-0" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Describe the problem <span className="text-muted-foreground font-normal">(min 10 characters)</span>
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Water is leaking from under the kitchen sink when the tap is running..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Trade category */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Trade category</label>
                  <Select value={tradeCategory} onValueChange={setTradeCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-detect (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_auto">Auto-detect (optional)</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.icon ? `${cat.icon} ` : ""}{cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analysing your {fileKind === "image" ? "photo" : "video"} — this may take a minute...
                    </p>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">Analysis failed</p>
                      <p className="text-sm text-destructive/80">{error}</p>
                      {debugInfo && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => setDebugOpen(true)}
                        >
                          View debug info
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {debugInfo && !error && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setDebugOpen(true)}
                  >
                    View last request debug info
                  </Button>
                )}

                <Button
                  onClick={analyseVideo}
                  disabled={uploading}
                  className="w-full gap-2"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Analysing...
                    </>
                  ) : (
                    <>Analyse {fileKind === "image" ? "Photo" : "Video"}</>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-primary" />
              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground">Analysis Complete</h2>
                <p className="text-muted-foreground">Here's what our AI found</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Description — main text block */}
              {displayDescription && (
                <div className="md:col-span-2 bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">What We Found</h3>
                  <p className="text-foreground text-lg font-semibold">{displayDescription}</p>
                </div>
              )}

              {/* Urgency badge */}
              {displayUrgency && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">Urgency</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getUrgencyStyle(displayUrgency).bg}`}>
                    {getUrgencyStyle(displayUrgency).label}
                  </span>
                </div>
              )}

              {/* Problem Type / Trade Category */}
              {displayProblemType && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">Trade Category</h3>
                  <p className="text-foreground font-semibold capitalize">{displayProblemType}</p>
                </div>
              )}

              {/* Location in Home */}
              {result.location_in_home && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">Location in Home</h3>
                  <p className="text-foreground font-semibold capitalize">{result.location_in_home}</p>
                </div>
              )}

              {/* Estimated Cost (if backend ever adds it) */}
              {result.estimated_cost_range && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">Estimated Cost</h3>
                  <p className="text-foreground font-semibold">{result.estimated_cost_range}</p>
                </div>
              )}

              {/* Materials Involved — shown as tags */}
              {displayMaterials && displayMaterials.length > 0 && (
                <div className="md:col-span-2 bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Materials Involved</h3>
                  <div className="flex flex-wrap gap-2">
                    {displayMaterials.map((m, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-foreground text-sm font-medium">
                        <Package className="w-3.5 h-3.5 text-primary" /> {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Tools */}
              {result.required_tools && result.required_tools.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">Required Tools</h3>
                  <ul className="space-y-1">
                    {result.required_tools.map((tool, i) => (
                      <li key={i} className="text-foreground text-sm flex items-start gap-2">
                        <Wrench className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" /> {tool}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Estimated Parts */}
              {result.estimated_parts && result.estimated_parts.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">Estimated Parts</h3>
                  <ul className="space-y-1">
                    {result.estimated_parts.map((part, i) => (
                      <li key={i} className="text-foreground text-sm flex items-start gap-2">
                        <Package className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" /> {part}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="md:col-span-2 bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">Recommendations</h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="text-foreground text-sm flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clarifying Questions — checklist for the tradesman */}
              {result.clarifying_questions && result.clarifying_questions.length > 0 && (
                <div className="md:col-span-2 bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Questions for the Contractor</h3>
                  <ul className="space-y-3">
                    {result.clarifying_questions.map((q, i) => (
                      <li key={i} className="flex items-start gap-3 text-foreground text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Video Metadata */}
              {result.video_metadata && (
                <div className="md:col-span-2 bg-card border border-border rounded-xl p-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">Video Details</h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                    {result.video_metadata.duration_seconds != null && (
                      <span>Duration: {Math.round(result.video_metadata.duration_seconds)}s</span>
                    )}
                    {result.video_metadata.width && result.video_metadata.height && (
                      <span>Resolution: {result.video_metadata.width}×{result.video_metadata.height}</span>
                    )}
                    {result.video_metadata.latitude != null && result.video_metadata.longitude != null && (
                      <span>GPS: {result.video_metadata.latitude.toFixed(4)}, {result.video_metadata.longitude.toFixed(4)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Task Breakdown */}
            <TaskBreakdown
              description={displayDescription || ""}
              urgency={displayUrgency}
              requiredTools={result.required_tools}
            />

            {/* Post-analysis stepped flow */}
            {postStep === "analysis" && result.clarifying_questions && result.clarifying_questions.length > 0 && (
              <div className="flex gap-3">
                <Button
                  onClick={async () => {
                    try {
                      const job = await ensureJob(result);
                      setCreatedJob(job);
                      setPostStep("clarifications");
                    } catch (err) {
                      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create job", variant: "destructive" });
                    }
                  }}
                  className="gap-2 flex-1"
                  size="lg"
                >
                  <CheckCircle className="w-4 h-4" /> Continue — Answer Questions
                </Button>
                <Button variant="outline" onClick={clearFile} className="gap-2">
                  <Upload className="w-4 h-4" /> Upload Another
                </Button>
              </div>
            )}

            {postStep === "analysis" && (!result.clarifying_questions || result.clarifying_questions.length === 0) && (
              <div className="flex gap-3">
                <Button
                  onClick={async () => {
                    try {
                      const job = await ensureJob(result);
                      setCreatedJob(job);
                      const rfpRes = await api.rfp.generate(job.id, {});
                      setRfpDoc(rfpRes.rfp_document);
                      setPostStep("rfp");
                    } catch (err) {
                      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create brief", variant: "destructive" });
                    }
                  }}
                  className="gap-2 flex-1"
                  size="lg"
                >
                  <CheckCircle className="w-4 h-4" /> Generate Project Brief
                </Button>
                <Button variant="outline" onClick={clearFile} className="gap-2">
                  <Upload className="w-4 h-4" /> Upload Another
                </Button>
              </div>
            )}

            {postStep === "clarifications" && createdJob && result.clarifying_questions && (
              <ClarificationsStep
                questions={result.clarifying_questions}
                onSubmit={async (answers) => {
                  const rfpRes = await api.rfp.generate(createdJob.id, answers);
                  setRfpDoc(rfpRes.rfp_document);
                  setPostStep("rfp");
                }}
              />
            )}

            {postStep === "rfp" && rfpDoc && createdJob && (
              <RfpReviewStep
                rfp={rfpDoc}
                onFindContractors={async () => {
                  const matches = await api.matching.get(createdJob.id);
                  setMatchData(matches);
                  setPostStep("matches");
                }}
              />
            )}

            {postStep === "matches" && matchData && createdJob && (
              <MatchedContractorsStep
                matchData={matchData}
                onPublish={async () => {
                  await api.jobs.updateStatus(createdJob.id, "open");
                  // Also update local videos table
                  if (user) {
                    await supabase
                      .from("videos")
                      .update({ status: "posted" })
                      .eq("user_id", user.id)
                      .eq("status", "draft")
                      .order("created_at", { ascending: false })
                      .limit(1);
                  }
                  toast({ title: "Job published!", description: "Contractors can now see and bid on your project." });
                  navigate("/dashboard");
                }}
              />
            )}
          </div>
        )}
      </main>

      <Dialog open={debugOpen} onOpenChange={setDebugOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Photo analysis debug info</DialogTitle>
            <DialogDescription>
              Exact request payload sent to the backend and the response received. Useful for diagnosing 4xx/5xx errors.
            </DialogDescription>
          </DialogHeader>
          {debugInfo ? (
            <div className="space-y-4 text-xs">
              <div>
                <p className="font-semibold mb-1">Endpoint</p>
                <code className="block bg-muted p-2 rounded break-all">{debugInfo.method} {debugInfo.endpoint}</code>
                <p className="text-muted-foreground mt-1">at {debugInfo.timestamp}</p>
              </div>
              <div>
                <p className="font-semibold mb-1">Request headers</p>
                <pre className="bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">{JSON.stringify(debugInfo.requestHeaders, null, 2)}</pre>
              </div>
              <div>
                <p className="font-semibold mb-1">Request payload (redacted)</p>
                <pre className="bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">{JSON.stringify(debugInfo.requestPayload, null, 2)}</pre>
              </div>
              {debugInfo.responseStatus !== undefined && (
                <div>
                  <p className="font-semibold mb-1">Response status</p>
                  <code className="block bg-muted p-2 rounded">{debugInfo.responseStatus}</code>
                </div>
              )}
              {debugInfo.responseHeaders && (
                <div>
                  <p className="font-semibold mb-1">Response headers</p>
                  <pre className="bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">{JSON.stringify(debugInfo.responseHeaders, null, 2)}</pre>
                </div>
              )}
              {debugInfo.responseBodyParsed !== undefined && (
                <div>
                  <p className="font-semibold mb-1">Response body (parsed)</p>
                  <pre className="bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">{JSON.stringify(debugInfo.responseBodyParsed, null, 2)}</pre>
                </div>
              )}
              {debugInfo.responseBodyRaw && (
                <div>
                  <p className="font-semibold mb-1">Response body (raw)</p>
                  <pre className="bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">{debugInfo.responseBodyRaw}</pre>
                </div>
              )}
              {debugInfo.errorMessage && (
                <div>
                  <p className="font-semibold mb-1">Error message</p>
                  <pre className="bg-destructive/10 text-destructive p-2 rounded overflow-x-auto whitespace-pre-wrap">{debugInfo.errorMessage}</pre>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))}
              >
                Copy all to clipboard
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No debug info captured yet.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostProject;
