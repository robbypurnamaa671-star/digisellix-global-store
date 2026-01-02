export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          ip_address: string | null
          ip_hash: string | null
          product_id: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          ip_hash?: string | null
          product_id: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          ip_hash?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          available_at: string | null
          commission_amount: number
          created_at: string
          id: string
          order_id: string
          product_id: string
          status: string
        }
        Insert: {
          affiliate_id: string
          available_at?: string | null
          commission_amount: number
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          status?: string
        }
        Update: {
          affiliate_id?: string
          available_at?: string | null
          commission_amount?: number
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          affiliate_code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          affiliate_code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          product_id: string | null
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          product_id?: string | null
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          product_id?: string | null
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_decision: string | null
          admin_id: string | null
          admin_notes: string | null
          buyer_id: string
          buyer_message: string
          created_at: string
          id: string
          order_id: string
          resolved_at: string | null
          seller_id: string
          seller_response: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          admin_decision?: string | null
          admin_id?: string | null
          admin_notes?: string | null
          buyer_id: string
          buyer_message: string
          created_at?: string
          id?: string
          order_id: string
          resolved_at?: string | null
          seller_id: string
          seller_response?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          admin_decision?: string | null
          admin_id?: string | null
          admin_notes?: string | null
          buyer_id?: string
          buyer_message?: string
          created_at?: string
          id?: string
          order_id?: string
          resolved_at?: string | null
          seller_id?: string
          seller_response?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      downloads: {
        Row: {
          buyer_id: string
          created_at: string
          download_count: number | null
          id: string
          last_downloaded_at: string | null
          order_id: string
          product_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          download_count?: number | null
          id?: string
          last_downloaded_at?: string | null
          order_id: string
          product_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          download_count?: number | null
          id?: string
          last_downloaded_at?: string | null
          order_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "downloads_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downloads_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downloads_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downloads_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downloads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          topic_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          topic_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_topics: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_topics_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_topics_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_idr: number
          amount_usd: number
          auto_release_at: string | null
          buyer_confirmed_at: string | null
          buyer_id: string
          created_at: string
          currency: string
          custom_order_description: string | null
          custom_order_title: string | null
          escrow_released_at: string | null
          escrow_status: Database["public"]["Enums"]["escrow_status"]
          expires_at: string | null
          fee_payer: string
          id: string
          ipaymu_payment_url: string | null
          ipaymu_session_id: string | null
          ipaymu_transaction_id: string | null
          is_custom_order: boolean | null
          paid_at: string | null
          payment_method: string | null
          payment_status: string | null
          platform_fee_percent: number
          product_id: string | null
          referred_by: string | null
          seller_id: string
          updated_at: string
        }
        Insert: {
          amount_idr: number
          amount_usd: number
          auto_release_at?: string | null
          buyer_confirmed_at?: string | null
          buyer_id: string
          created_at?: string
          currency: string
          custom_order_description?: string | null
          custom_order_title?: string | null
          escrow_released_at?: string | null
          escrow_status?: Database["public"]["Enums"]["escrow_status"]
          expires_at?: string | null
          fee_payer?: string
          id?: string
          ipaymu_payment_url?: string | null
          ipaymu_session_id?: string | null
          ipaymu_transaction_id?: string | null
          is_custom_order?: boolean | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          platform_fee_percent?: number
          product_id?: string | null
          referred_by?: string | null
          seller_id: string
          updated_at?: string
        }
        Update: {
          amount_idr?: number
          amount_usd?: number
          auto_release_at?: string | null
          buyer_confirmed_at?: string | null
          buyer_id?: string
          created_at?: string
          currency?: string
          custom_order_description?: string | null
          custom_order_title?: string | null
          escrow_released_at?: string | null
          escrow_status?: Database["public"]["Enums"]["escrow_status"]
          expires_at?: string | null
          fee_payer?: string
          id?: string
          ipaymu_payment_url?: string | null
          ipaymu_session_id?: string | null
          ipaymu_transaction_id?: string | null
          is_custom_order?: boolean | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          platform_fee_percent?: number
          product_id?: string | null
          referred_by?: string | null
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          admin_notes: string | null
          affiliate_id: string
          amount: number
          created_at: string
          id: string
          processed_at: string | null
          status: string
        }
        Insert: {
          admin_notes?: string | null
          affiliate_id: string
          amount: number
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: string
        }
        Update: {
          admin_notes?: string | null
          affiliate_id?: string
          amount?: number
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      product_views: {
        Row: {
          id: string
          product_id: string
          referrer: string | null
          session_id: string | null
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          product_id: string
          referrer?: string | null
          session_id?: string | null
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          referrer?: string | null
          session_id?: string | null
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          affiliate_commission_percent: number | null
          affiliate_enabled: boolean | null
          category: string
          created_at: string
          description: string
          download_link: string | null
          file_url: string | null
          flagged_at: string | null
          flagged_reason: string | null
          id: string
          is_featured: boolean | null
          moderation_notes: string | null
          price_idr: number
          price_usd: number
          refund_allowed: boolean
          seller_id: string
          status: string | null
          thumbnail_url: string | null
          title: string
          total_sales: number | null
          updated_at: string
        }
        Insert: {
          affiliate_commission_percent?: number | null
          affiliate_enabled?: boolean | null
          category: string
          created_at?: string
          description: string
          download_link?: string | null
          file_url?: string | null
          flagged_at?: string | null
          flagged_reason?: string | null
          id?: string
          is_featured?: boolean | null
          moderation_notes?: string | null
          price_idr: number
          price_usd: number
          refund_allowed?: boolean
          seller_id: string
          status?: string | null
          thumbnail_url?: string | null
          title: string
          total_sales?: number | null
          updated_at?: string
        }
        Update: {
          affiliate_commission_percent?: number | null
          affiliate_enabled?: boolean | null
          category?: string
          created_at?: string
          description?: string
          download_link?: string | null
          file_url?: string | null
          flagged_at?: string | null
          flagged_reason?: string | null
          id?: string
          is_featured?: boolean | null
          moderation_notes?: string | null
          price_idr?: number
          price_usd?: number
          refund_allowed?: boolean
          seller_id?: string
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          total_sales?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          description: string | null
          full_name: string
          id: string
          is_limited: boolean | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          full_name: string
          id: string
          is_limited?: boolean | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          full_name?: string
          id?: string
          is_limited?: boolean | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          buyer_id: string
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          seller_id: string
        }
        Insert: {
          buyer_id: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          seller_id: string
        }
        Update: {
          buyer_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          abuse_count: number
          bio: string | null
          created_at: string
          id: string
          is_suspended: boolean
          portfolio_url: string | null
          suspended_at: string | null
          suspended_reason: string | null
          trust_score: number
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          abuse_count?: number
          bio?: string | null
          created_at?: string
          id?: string
          is_suspended?: boolean
          portfolio_url?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          trust_score?: number
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          abuse_count?: number
          bio?: string | null
          created_at?: string
          id?: string
          is_suspended?: boolean
          portfolio_url?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          trust_score?: number
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          escrow_amount: number | null
          fee_payer: string | null
          frozen_at: string | null
          frozen_by: string | null
          frozen_reason: string | null
          id: string
          order_id: string
          payment_provider: string | null
          payment_reference: string | null
          payout_at: string | null
          payout_reference: string | null
          payout_status: Database["public"]["Enums"]["payout_status"]
          platform_fee: number
          seller_payout: number
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          escrow_amount?: number | null
          fee_payer?: string | null
          frozen_at?: string | null
          frozen_by?: string | null
          frozen_reason?: string | null
          id?: string
          order_id: string
          payment_provider?: string | null
          payment_reference?: string | null
          payout_at?: string | null
          payout_reference?: string | null
          payout_status?: Database["public"]["Enums"]["payout_status"]
          platform_fee?: number
          seller_payout?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          escrow_amount?: number | null
          fee_payer?: string | null
          frozen_at?: string | null
          frozen_by?: string | null
          frozen_reason?: string | null
          id?: string
          order_id?: string
          payment_provider?: string | null
          payment_reference?: string | null
          payout_at?: string | null
          payout_reference?: string | null
          payout_status?: Database["public"]["Enums"]["payout_status"]
          platform_fee?: number
          seller_payout?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      orders_safe: {
        Row: {
          amount_idr: number | null
          amount_usd: number | null
          buyer_id: string | null
          created_at: string | null
          currency: string | null
          custom_order_description: string | null
          custom_order_title: string | null
          expires_at: string | null
          id: string | null
          is_custom_order: boolean | null
          paid_at: string | null
          payment_method: string | null
          payment_status: string | null
          product_id: string | null
          referred_by: string | null
          seller_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_idr?: number | null
          amount_usd?: number | null
          buyer_id?: string | null
          created_at?: string | null
          currency?: string | null
          custom_order_description?: string | null
          custom_order_title?: string | null
          expires_at?: string | null
          id?: string | null
          is_custom_order?: boolean | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          product_id?: string | null
          referred_by?: string | null
          seller_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_idr?: number | null
          amount_usd?: number | null
          buyer_id?: string | null
          created_at?: string | null
          currency?: string | null
          custom_order_description?: string | null
          custom_order_title?: string | null
          expires_at?: string | null
          id?: string | null
          is_custom_order?: boolean | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          product_id?: string | null
          referred_by?: string | null
          seller_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews_public: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string | null
          order_id: string | null
          rating: number | null
          seller_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          order_id?: string | null
          rating?: number | null
          seller_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          order_id?: string | null
          rating?: number | null
          seller_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          description: string | null
          full_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          full_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_flag_product: {
        Args: { p_product_id: string; p_reason: string }
        Returns: boolean
      }
      admin_freeze_payout: {
        Args: { p_reason: string; p_transaction_id: string }
        Returns: boolean
      }
      admin_resolve_dispute: {
        Args: {
          p_decision: string
          p_dispute_id: string
          p_in_favor_of: string
        }
        Returns: boolean
      }
      admin_suspend_seller: {
        Args: { p_reason: string; p_seller_id: string }
        Returns: boolean
      }
      confirm_delivery: { Args: { p_order_id: string }; Returns: boolean }
      generate_affiliate_code: { Args: never; Returns: string }
      get_safe_order_fields: {
        Args: never
        Returns: {
          amount_idr: number
          amount_usd: number
          buyer_id: string
          created_at: string
          currency: string
          custom_order_description: string
          custom_order_title: string
          id: string
          is_custom_order: boolean
          paid_at: string
          payment_method: string
          payment_status: string
          product_id: string
          seller_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          p_action_type: string
          p_details?: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: string
      }
      process_auto_releases: { Args: never; Returns: number }
      update_available_commissions: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "seller" | "buyer"
      dispute_status:
        | "open"
        | "under_review"
        | "resolved_buyer"
        | "resolved_seller"
        | "closed"
      escrow_status: "held" | "released" | "disputed" | "refunded"
      payout_status: "pending" | "paid" | "frozen"
      product_status: "draft" | "published" | "flagged" | "suspended"
      verification_status: "unverified" | "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "seller", "buyer"],
      dispute_status: [
        "open",
        "under_review",
        "resolved_buyer",
        "resolved_seller",
        "closed",
      ],
      escrow_status: ["held", "released", "disputed", "refunded"],
      payout_status: ["pending", "paid", "frozen"],
      product_status: ["draft", "published", "flagged", "suspended"],
      verification_status: ["unverified", "pending", "approved", "rejected"],
    },
  },
} as const
