import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProductFilters {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const productId = pathParts[pathParts.length - 1];
    
    // Check if this is a specific product request (UUID format)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
    
    // Use anon key for public access, service key for admin operations
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, authHeader ? supabaseAnonKey : supabaseAnonKey);
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // GET single product
    if (req.method === "GET" && isUUID) {
      console.log(`Fetching product: ${productId}`);
      
      const { data: product, error } = await supabase
        .from("products")
        .select(`
          *,
          seller:profiles!products_seller_id_fkey(id, full_name, avatar_url),
          seller_profile:seller_profiles!inner(trust_score, verification_status)
        `)
        .eq("id", productId)
        .eq("status", "active")
        .single();

      if (error || !product) {
        return new Response(
          JSON.stringify({ error: "Product not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      // Increment view count (fire and forget)
      adminSupabase
        .from("product_views")
        .insert({ product_id: productId })
        .then(() => console.log("View recorded"));

      return new Response(
        JSON.stringify({ success: true, data: product }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // GET products list with filters
    if (req.method === "GET") {
      const filters: ProductFilters = {
        category: url.searchParams.get("category") || undefined,
        minPrice: url.searchParams.get("minPrice") ? Number(url.searchParams.get("minPrice")) : undefined,
        maxPrice: url.searchParams.get("maxPrice") ? Number(url.searchParams.get("maxPrice")) : undefined,
        sellerId: url.searchParams.get("sellerId") || undefined,
        search: url.searchParams.get("search") || undefined,
        sortBy: (url.searchParams.get("sortBy") as ProductFilters["sortBy"]) || "created_at",
        sortOrder: (url.searchParams.get("sortOrder") as ProductFilters["sortOrder"]) || "desc",
        page: Number(url.searchParams.get("page")) || 1,
        limit: Math.min(Number(url.searchParams.get("limit")) || 20, 100), // Max 100 per page
      };

      console.log("Fetching products with filters:", filters);

      let query = supabase
        .from("products")
        .select(`
          id, title, description, category, price_usd, price_idr, 
          thumbnail_url, total_sales, created_at, affiliate_enabled,
          seller:profiles!products_seller_id_fkey(id, full_name, avatar_url)
        `, { count: "exact" })
        .eq("status", "active");

      // Apply filters
      if (filters.category) {
        query = query.eq("category", filters.category);
      }
      if (filters.minPrice !== undefined) {
        query = query.gte("price_usd", filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte("price_usd", filters.maxPrice);
      }
      if (filters.sellerId) {
        query = query.eq("seller_id", filters.sellerId);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Apply sorting
      query = query.order(filters.sortBy!, { ascending: filters.sortOrder === "asc" });

      // Apply pagination
      const from = (filters.page! - 1) * filters.limit!;
      const to = from + filters.limit! - 1;
      query = query.range(from, to);

      const { data: products, error, count } = await query;

      if (error) {
        console.error("Products query error:", error);
        throw new Error("Failed to fetch products");
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: products,
          pagination: {
            page: filters.page,
            limit: filters.limit,
            total: count,
            totalPages: Math.ceil((count || 0) / filters.limit!),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // POST - Create product (requires auth + seller role)
    if (req.method === "POST") {
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Authorization required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid token" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }

      // Check seller role
      const { data: hasSellerRole } = await adminSupabase.rpc("has_role", {
        _user_id: user.id,
        _role: "seller",
      });

      if (!hasSellerRole) {
        return new Response(
          JSON.stringify({ error: "Seller role required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      // Check if seller is suspended
      const { data: sellerProfile } = await adminSupabase
        .from("seller_profiles")
        .select("is_suspended")
        .eq("user_id", user.id)
        .single();

      if (sellerProfile?.is_suspended) {
        return new Response(
          JSON.stringify({ error: "Seller account is suspended" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      const body = await req.json();
      const { title, description, category, price_usd, price_idr, thumbnail_url, file_url, refund_allowed } = body;

      if (!title || !description || !category || !price_usd || !price_idr) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const { data: product, error: insertError } = await adminSupabase
        .from("products")
        .insert({
          seller_id: user.id,
          title,
          description,
          category,
          price_usd,
          price_idr,
          thumbnail_url,
          file_url,
          refund_allowed: refund_allowed ?? true,
          status: "active",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Product insert error:", insertError);
        throw new Error("Failed to create product");
      }

      console.log(`Product created: ${product.id} by seller ${user.id}`);

      return new Response(
        JSON.stringify({ success: true, data: product }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Products API error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
