/**
 * React Query hooks for Marketplace API
 * Provides type-safe data fetching with caching and automatic refetching
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { marketplaceApi, ProductFilters, Product, Order, Dispute } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

// Query Keys
export const queryKeys = {
  products: {
    all: ["products"] as const,
    list: (filters: ProductFilters) => ["products", "list", filters] as const,
    detail: (id: string) => ["products", "detail", id] as const,
  },
  orders: {
    all: ["orders"] as const,
    list: (role: string, status?: string) => ["orders", "list", role, status] as const,
    detail: (id: string) => ["orders", "detail", id] as const,
  },
  disputes: {
    all: ["disputes"] as const,
    list: (role: string, status?: string) => ["disputes", "list", role, status] as const,
    detail: (id: string) => ["disputes", "detail", id] as const,
  },
  admin: {
    stats: ["admin", "stats"] as const,
  },
};

// Products Hooks
export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => marketplaceApi.products.list(filters),
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: () => marketplaceApi.products.get(productId),
    enabled: !!productId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: marketplaceApi.products.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast({
        title: "Product Created",
        description: "Your product has been published successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });
}

// Orders Hooks
export function useOrders(role: "buyer" | "seller" = "buyer", status?: string) {
  return useQuery({
    queryKey: queryKeys.orders.list(role, status),
    queryFn: () => marketplaceApi.orders.list({ role, status }),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => marketplaceApi.orders.get(orderId),
    enabled: !!orderId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: marketplaceApi.orders.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast({
        title: "Order Created",
        description: "Proceed to payment to complete your purchase.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });
}

export function useConfirmDelivery() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: marketplaceApi.orders.confirmDelivery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast({
        title: "Delivery Confirmed",
        description: "Funds have been released to the seller.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm delivery",
        variant: "destructive",
      });
    },
  });
}

// Disputes Hooks
export function useDisputes(role: "buyer" | "seller" = "buyer", status?: string) {
  return useQuery({
    queryKey: queryKeys.disputes.list(role, status),
    queryFn: () => marketplaceApi.disputes.list({ role, status }),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useDispute(disputeId: string) {
  return useQuery({
    queryKey: queryKeys.disputes.detail(disputeId),
    queryFn: () => marketplaceApi.disputes.get(disputeId),
    enabled: !!disputeId,
  });
}

export function useCreateDispute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: marketplaceApi.disputes.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.disputes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast({
        title: "Dispute Opened",
        description: "The seller will be notified and an admin will review your case.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create dispute",
        variant: "destructive",
      });
    },
  });
}

export function useRespondToDispute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ disputeId, response }: { disputeId: string; response: string }) =>
      marketplaceApi.disputes.respond(disputeId, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.disputes.all });
      toast({
        title: "Response Submitted",
        description: "An admin will review the dispute.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit response",
        variant: "destructive",
      });
    },
  });
}

// Admin Hooks
export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: () => marketplaceApi.admin.getDashboardStats(),
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useFreezePayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ transactionId, reason }: { transactionId: string; reason: string }) =>
      marketplaceApi.admin.freezePayout(transactionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      toast({
        title: "Payout Frozen",
        description: "The transaction has been frozen.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to freeze payout",
        variant: "destructive",
      });
    },
  });
}

export function useSuspendSeller() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ sellerId, reason }: { sellerId: string; reason: string }) =>
      marketplaceApi.admin.suspendSeller(sellerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      toast({
        title: "Seller Suspended",
        description: "The seller account has been suspended.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to suspend seller",
        variant: "destructive",
      });
    },
  });
}

export function useFlagProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ productId, reason }: { productId: string; reason: string }) =>
      marketplaceApi.admin.flagProduct(productId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast({
        title: "Product Flagged",
        description: "The product has been flagged for review.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to flag product",
        variant: "destructive",
      });
    },
  });
}

export function useResolveDispute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      disputeId,
      decision,
      inFavorOf,
    }: {
      disputeId: string;
      decision: string;
      inFavorOf: "buyer" | "seller";
    }) => marketplaceApi.admin.resolveDispute(disputeId, decision, inFavorOf),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.disputes.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      toast({
        title: "Dispute Resolved",
        description: "The dispute has been resolved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve dispute",
        variant: "destructive",
      });
    },
  });
}
