/**
 * Marketplace API Service
 * Centralized API client for all backend operations
 */

import { supabase } from "@/integrations/supabase/client";

// Types
export interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  price_usd: number;
  price_idr: number;
  thumbnail_url: string | null;
  total_sales: number;
  created_at: string;
  affiliate_enabled: boolean;
  seller?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  seller_profile?: {
    trust_score: number;
    verification_status: string;
  };
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sellerId?: string;
  search?: string;
  sortBy?: "created_at" | "price_usd" | "total_sales";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface Order {
  id: string;
  amount_usd: number;
  amount_idr: number;
  currency: string;
  payment_status: string;
  escrow_status: string;
  created_at: string;
  paid_at: string | null;
  buyer_confirmed_at: string | null;
  auto_release_at: string | null;
  product?: {
    id: string;
    title: string;
    thumbnail_url: string | null;
  };
  dispute?: {
    id: string;
    status: string;
  }[];
}

export interface Dispute {
  id: string;
  status: string;
  buyer_message: string;
  seller_response: string | null;
  admin_decision: string | null;
  created_at: string;
  resolved_at: string | null;
  order?: {
    id: string;
    amount_usd: number;
    product?: {
      title: string;
    };
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// API Helper
async function callEdgeFunction<T>(
  functionName: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: Record<string, unknown>;
    queryParams?: Record<string, string | number | undefined>;
  } = {}
): Promise<T> {
  const { method = "GET", body, queryParams } = options;

  // Build URL with query params
  let path = functionName;
  if (queryParams) {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    if (queryString) {
      path += `?${queryString}`;
    }
  }

  const { data, error } = await supabase.functions.invoke(path, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (error) {
    throw new Error(error.message || "API request failed");
  }

  return data as T;
}

// Products API
export const productsApi = {
  /**
   * Get list of products with optional filters
   */
  async list(filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
    return callEdgeFunction("products-api", {
      queryParams: {
        category: filters.category,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        sellerId: filters.sellerId,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page: filters.page,
        limit: filters.limit,
      },
    });
  },

  /**
   * Get single product by ID
   */
  async get(productId: string): Promise<SingleResponse<Product>> {
    return callEdgeFunction(`products-api/${productId}`);
  },

  /**
   * Create a new product (seller only)
   */
  async create(product: {
    title: string;
    description: string;
    category: string;
    price_usd: number;
    price_idr: number;
    thumbnail_url?: string;
    file_url?: string;
    refund_allowed?: boolean;
  }): Promise<SingleResponse<Product>> {
    return callEdgeFunction("products-api", {
      method: "POST",
      body: product,
    });
  },
};

// Orders API
export const ordersApi = {
  /**
   * Get list of orders for current user
   */
  async list(options: {
    role?: "buyer" | "seller";
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResponse<Order>> {
    return callEdgeFunction("orders-api", {
      queryParams: {
        role: options.role,
        status: options.status,
        page: options.page,
        limit: options.limit,
      },
    });
  },

  /**
   * Get single order by ID
   */
  async get(orderId: string): Promise<SingleResponse<Order>> {
    return callEdgeFunction(`orders-api/${orderId}`);
  },

  /**
   * Create a new order
   */
  async create(order: {
    productId: string;
    currency: "USD" | "IDR";
    affiliateCode?: string;
  }): Promise<SingleResponse<Order>> {
    return callEdgeFunction("orders-api", {
      method: "POST",
      body: order,
    });
  },

  /**
   * Confirm delivery (buyer only)
   */
  async confirmDelivery(orderId: string): Promise<SingleResponse<{ escrow_status: string }>> {
    return callEdgeFunction("confirm-delivery", {
      method: "POST",
      body: { orderId },
    });
  },
};

// Disputes API
export const disputesApi = {
  /**
   * Get list of disputes for current user
   */
  async list(options: {
    role?: "buyer" | "seller";
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<PaginatedResponse<Dispute>> {
    return callEdgeFunction("disputes-api", {
      queryParams: {
        role: options.role,
        status: options.status,
        page: options.page,
        limit: options.limit,
      },
    });
  },

  /**
   * Get single dispute by ID
   */
  async get(disputeId: string): Promise<SingleResponse<Dispute>> {
    return callEdgeFunction(`disputes-api/${disputeId}`);
  },

  /**
   * Create a new dispute (buyer only)
   */
  async create(dispute: {
    orderId: string;
    message: string;
  }): Promise<SingleResponse<Dispute>> {
    return callEdgeFunction("disputes-api", {
      method: "POST",
      body: dispute,
    });
  },

  /**
   * Respond to a dispute (seller only)
   */
  async respond(disputeId: string, response: string): Promise<SingleResponse<Dispute>> {
    return callEdgeFunction(`disputes-api/${disputeId}`, {
      method: "PATCH",
      body: { response },
    });
  },
};

// Escrow/Payment API
export const escrowApi = {
  /**
   * Create escrow payment
   */
  async createPayment(payment: {
    orderId: string;
    paymentProvider: string;
    paymentReference: string;
    amount: number;
    currency: string;
  }): Promise<SingleResponse<{
    transaction_id: string;
    escrow_status: string;
    platform_fee: number;
    seller_payout: number;
  }>> {
    return callEdgeFunction("create-escrow-payment", {
      method: "POST",
      body: payment,
    });
  },
};

// Admin API
export const adminApi = {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<SingleResponse<{
    totalOrders: number;
    totalRevenue: number;
    openDisputes: number;
    suspendedSellers: number;
    pendingPayouts: number;
    frozenFunds: number;
    platformFee: number;
  }>> {
    return callEdgeFunction("admin-actions", {
      method: "POST",
      body: { action: "get_dashboard_stats" },
    });
  },

  /**
   * Freeze a payout
   */
  async freezePayout(transactionId: string, reason: string): Promise<SingleResponse<{ success: boolean }>> {
    return callEdgeFunction("admin-actions", {
      method: "POST",
      body: {
        action: "freeze_payout",
        targetId: transactionId,
        reason,
      },
    });
  },

  /**
   * Unfreeze a payout
   */
  async unfreezePayout(transactionId: string): Promise<SingleResponse<{ success: boolean }>> {
    return callEdgeFunction("admin-actions", {
      method: "POST",
      body: {
        action: "unfreeze_payout",
        targetId: transactionId,
      },
    });
  },

  /**
   * Suspend a seller
   */
  async suspendSeller(sellerId: string, reason: string): Promise<SingleResponse<{ success: boolean }>> {
    return callEdgeFunction("admin-actions", {
      method: "POST",
      body: {
        action: "suspend_seller",
        targetId: sellerId,
        reason,
      },
    });
  },

  /**
   * Unsuspend a seller
   */
  async unsuspendSeller(sellerId: string): Promise<SingleResponse<{ success: boolean }>> {
    return callEdgeFunction("admin-actions", {
      method: "POST",
      body: {
        action: "unsuspend_seller",
        targetId: sellerId,
      },
    });
  },

  /**
   * Flag a product
   */
  async flagProduct(productId: string, reason: string): Promise<SingleResponse<{ success: boolean }>> {
    return callEdgeFunction("admin-actions", {
      method: "POST",
      body: {
        action: "flag_product",
        targetId: productId,
        reason,
      },
    });
  },

  /**
   * Unflag a product
   */
  async unflagProduct(productId: string): Promise<SingleResponse<{ success: boolean }>> {
    return callEdgeFunction("admin-actions", {
      method: "POST",
      body: {
        action: "unflag_product",
        targetId: productId,
      },
    });
  },

  /**
   * Update platform fee percentage
   */
  async updatePlatformFee(feePercent: number): Promise<SingleResponse<{ success: boolean }>> {
    return callEdgeFunction("admin-actions", {
      method: "POST",
      body: {
        action: "update_platform_fee",
        value: feePercent,
      },
    });
  },

  /**
   * Resolve a dispute
   */
  async resolveDispute(
    disputeId: string,
    decision: string,
    inFavorOf: "buyer" | "seller"
  ): Promise<SingleResponse<{ success: boolean }>> {
    return callEdgeFunction("handle-dispute", {
      method: "POST",
      body: {
        action: "resolve",
        disputeId,
        decision,
        inFavorOf,
      },
    });
  },
};

// Export default API object
export const marketplaceApi = {
  products: productsApi,
  orders: ordersApi,
  disputes: disputesApi,
  escrow: escrowApi,
  admin: adminApi,
};

export default marketplaceApi;
