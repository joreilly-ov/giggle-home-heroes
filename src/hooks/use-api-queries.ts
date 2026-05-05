/**
 * React Query hooks for API calls
 * 
 * This provides centralized, cached API queries to eliminate duplicate network requests
 * and improve performance on mobile networks.
 * 
 * Migration guide:
 * 1. Replace direct api.* calls with these hooks
 * 2. Benefits:
 *    - Automatic request deduplication
 *    - Background refetching when app comes to foreground
 *    - Proper cache invalidation
 *    - Request retry on network failure
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Job, Bid, MatchResponse, RfpDocument } from '@/lib/api';

// ─── Jobs Query ────────────────────────────────────────────────────────────

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.jobs.list(),
    staleTime: 60 * 1000, // Cache for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes
    refetchOnWindowFocus: true, // Refetch when app comes back to foreground
    refetchOnReconnect: true, // Refetch when network reconnects
  });
}

export function useJob(jobId: string) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => api.jobs.get(jobId),
    staleTime: 30 * 1000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000,
    enabled: !!jobId,
  });
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ jobId, status }: { jobId: string; status: string }) =>
      api.jobs.updateStatus(jobId, status),
    onSuccess: (_, { jobId }) => {
      // Invalidate job queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    },
  });
}

// ─── Bids Query ────────────────────────────────────────────────────────────

export function useJobBids(jobId: string) {
  return useQuery({
    queryKey: ['bids', jobId],
    queryFn: () => api.bids.listForJob(jobId),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!jobId,
    refetchOnWindowFocus: true,
  });
}

export function useMyBids() {
  return useQuery({
    queryKey: ['bids:my'],
    queryFn: () => api.bids.mine(),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useSubmitBid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ jobId, amount_pence, note }: { jobId: string; amount_pence: number; note: string }) =>
      api.bids.submit(jobId, amount_pence, note),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['bids:my'] });
      queryClient.invalidateQueries({ queryKey: ['bids'] });
    },
  });
}

export function useWithdrawBid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ jobId, bidId }: { jobId: string; bidId: string }) =>
      api.bids.withdraw(jobId, bidId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids:my'] });
      queryClient.invalidateQueries({ queryKey: ['bids'] });
    },
  });
}

export function useAcceptBid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ jobId, bidId }: { jobId: string; bidId: string }) =>
      api.bids.respond(jobId, bidId, 'accept'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['bids'] });
    },
  });
}

export function useRejectBid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ jobId, bidId }: { jobId: string; bidId: string }) =>
      api.bids.respond(jobId, bidId, 'reject'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
    },
  });
}

// ─── Escrow Query ──────────────────────────────────────────────────────────

export function useEscrowStatus(jobId: string) {
  return useQuery({
    queryKey: ['escrow', jobId],
    queryFn: () => api.escrow.status(jobId),
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!jobId,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useInitiateEscrow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (jobId: string) => api.escrow.initiate(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['escrow', jobId] });
    },
  });
}

export function useReleaseEscrow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ jobId, note }: { jobId: string; note?: string }) =>
      api.escrow.release(jobId, note),
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ['escrow', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    },
  });
}

export function useRefundEscrow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ jobId, reason }: { jobId: string; reason?: string }) =>
      api.escrow.refund(jobId, reason),
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ['escrow', jobId] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    },
  });
}

// ─── Questions Query ──────────────────────────────────────────────────────

export function useJobQuestions(jobId: string) {
  return useQuery({
    queryKey: ['questions', jobId],
    queryFn: () => api.questions.list(jobId),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!jobId,
    refetchOnWindowFocus: true,
  });
}

export function useSubmitQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ jobId, question }: { jobId: string; question: string }) =>
      api.questions.submit(jobId, question),
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ['questions', jobId] });
    },
  });
}

export function useAnswerQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ jobId, questionId, answer }: { jobId: string; questionId: string; answer: string }) =>
      api.questions.answer(jobId, questionId, answer),
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ['questions', jobId] });
    },
  });
}

// ─── Milestones Query ─────────────────────────────────────────────────────

export function useMilestones(jobId: string) {
  return useQuery({
    queryKey: ['milestones', jobId],
    queryFn: () => api.milestones.list(jobId),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!jobId,
    refetchOnWindowFocus: true,
  });
}

// ─── Contractor Query ─────────────────────────────────────────────────────

export function useContractorConnectStatus() {
  return useQuery({
    queryKey: ['contractor:connect-status'],
    queryFn: () => api.contractor.connectStatus(),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useContractorDocuments() {
  return useQuery({
    queryKey: ['contractor:documents'],
    queryFn: () => api.documents.listMine(),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useUploadContractorDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: Parameters<typeof api.documents.upload>[0]) =>
      api.documents.upload(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor:documents'] });
    },
  });
}

export function useDeleteContractorDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (docId: string) => api.documents.remove(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor:documents'] });
    },
  });
}

// ─── Vertical Config Query ────────────────────────────────────────────────

export function useVerticalConfig() {
  return useQuery({
    queryKey: ['vertical:config'],
    queryFn: () => api.vertical.config(),
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
    gcTime: 24 * 60 * 60 * 1000,
  });
}
