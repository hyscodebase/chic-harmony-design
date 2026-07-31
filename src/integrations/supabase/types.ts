export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      cancellation_requests: {
        Row: {
          completed_at: string;
          id: string;
          idempotency_key: string;
          operator_id: string;
          order_id: string;
          reason: string;
        };
        Insert: {
          completed_at?: string;
          id?: string;
          idempotency_key: string;
          operator_id: string;
          order_id: string;
          reason: string;
        };
        Update: {
          completed_at?: string;
          id?: string;
          idempotency_key?: string;
          operator_id?: string;
          order_id?: string;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cancellation_requests_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      entitlements: {
        Row: {
          expires_at: string;
          granted_at: string;
          id: string;
          order_id: string;
          product_id: string;
          reports_remaining: number;
          revoked_at: string | null;
          status: Database["public"]["Enums"]["entitlement_status"];
          user_id: string;
        };
        Insert: {
          expires_at: string;
          granted_at?: string;
          id?: string;
          order_id: string;
          product_id: string;
          reports_remaining: number;
          revoked_at?: string | null;
          status?: Database["public"]["Enums"]["entitlement_status"];
          user_id: string;
        };
        Update: {
          expires_at?: string;
          granted_at?: string;
          id?: string;
          order_id?: string;
          product_id?: string;
          reports_remaining?: number;
          revoked_at?: string | null;
          status?: Database["public"]["Enums"]["entitlement_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entitlements_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entitlements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      guardian_reports: {
        Row: {
          created_at: string;
          entitlement_id: string;
          id: string;
          proposed_amount_krw: number;
          proposed_purpose: string;
          raw: Json;
          reason: string;
          scenario: string;
          user_id: string;
          verdict: Database["public"]["Enums"]["report_verdict"];
        };
        Insert: {
          created_at?: string;
          entitlement_id: string;
          id?: string;
          proposed_amount_krw: number;
          proposed_purpose: string;
          raw?: Json;
          reason: string;
          scenario: string;
          user_id: string;
          verdict: Database["public"]["Enums"]["report_verdict"];
        };
        Update: {
          created_at?: string;
          entitlement_id?: string;
          id?: string;
          proposed_amount_krw?: number;
          proposed_purpose?: string;
          raw?: Json;
          reason?: string;
          scenario?: string;
          user_id?: string;
          verdict?: Database["public"]["Enums"]["report_verdict"];
        };
        Relationships: [
          {
            foreignKeyName: "guardian_reports_entitlement_id_fkey";
            columns: ["entitlement_id"];
            isOneToOne: false;
            referencedRelation: "entitlements";
            referencedColumns: ["id"];
          },
        ];
      };
      intent_contracts: {
        Row: {
          amount_limit_krw: number;
          approved_at: string | null;
          created_at: string;
          expires_at: string;
          fingerprint: string;
          id: string;
          natural_language: string;
          normalized: Json;
          order_id: string;
          policy_reason: string | null;
          policy_verdict: string | null;
          purpose: string;
          status: Database["public"]["Enums"]["contract_status"];
          user_id: string;
          version: number;
        };
        Insert: {
          amount_limit_krw: number;
          approved_at?: string | null;
          created_at?: string;
          expires_at?: string;
          fingerprint: string;
          id?: string;
          natural_language: string;
          normalized: Json;
          order_id: string;
          policy_reason?: string | null;
          policy_verdict?: string | null;
          purpose: string;
          status?: Database["public"]["Enums"]["contract_status"];
          user_id: string;
          version: number;
        };
        Update: {
          amount_limit_krw?: number;
          approved_at?: string | null;
          created_at?: string;
          expires_at?: string;
          fingerprint?: string;
          id?: string;
          natural_language?: string;
          normalized?: Json;
          order_id?: string;
          policy_reason?: string | null;
          policy_verdict?: string | null;
          purpose?: string;
          status?: Database["public"]["Enums"]["contract_status"];
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "intent_contracts_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          amount_krw: number;
          created_at: string;
          id: string;
          idempotency_key: string;
          order_no: string;
          product_id: string;
          product_name: string;
          status: Database["public"]["Enums"]["order_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_krw: number;
          created_at?: string;
          id?: string;
          idempotency_key: string;
          order_no: string;
          product_id: string;
          product_name: string;
          status?: Database["public"]["Enums"]["order_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_krw?: number;
          created_at?: string;
          id?: string;
          idempotency_key?: string;
          order_no?: string;
          product_id?: string;
          product_name?: string;
          status?: Database["public"]["Enums"]["order_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_events: {
        Row: {
          created_at: string;
          event_type: string;
          handler: string;
          id: string;
          order_id: string;
          payload: Json;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          handler: string;
          id?: string;
          order_id: string;
          payload?: Json;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          handler?: string;
          id?: string;
          order_id?: string;
          payload?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_krw: number;
          approved_at: string | null;
          canceled_at: string | null;
          contract_id: string;
          created_at: string;
          id: string;
          method: string | null;
          mock_payment_key: string | null;
          order_id: string;
          receipt_no: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          user_id: string;
        };
        Insert: {
          amount_krw: number;
          approved_at?: string | null;
          canceled_at?: string | null;
          contract_id: string;
          created_at?: string;
          id?: string;
          method?: string | null;
          mock_payment_key?: string | null;
          order_id: string;
          receipt_no?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          user_id: string;
        };
        Update: {
          amount_krw?: number;
          approved_at?: string | null;
          canceled_at?: string | null;
          contract_id?: string;
          created_at?: string;
          id?: string;
          method?: string | null;
          mock_payment_key?: string | null;
          order_id?: string;
          receipt_no?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "intent_contracts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          access_days: number;
          amount_krw: number;
          code: string;
          created_at: string;
          description: string;
          id: string;
          is_active: boolean;
          name: string;
          purpose: string;
          report_quota: number;
        };
        Insert: {
          access_days?: number;
          amount_krw: number;
          code: string;
          created_at?: string;
          description: string;
          id?: string;
          is_active?: boolean;
          name: string;
          purpose: string;
          report_quota?: number;
        };
        Update: {
          access_days?: number;
          amount_krw?: number;
          code?: string;
          created_at?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          purpose?: string;
          report_quota?: number;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "operator" | "user";
      contract_status: "PENDING" | "APPROVED" | "CONSUMED" | "SUPERSEDED" | "EXPIRED";
      entitlement_status: "ACTIVE" | "REVOKED" | "EXPIRED";
      order_status: "PENDING" | "PAID" | "CANCELED" | "FULFILLED";
      payment_status: "READY" | "APPROVED" | "CANCELED" | "FAILED";
      report_verdict: "ALLOW" | "BLOCK";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["operator", "user"],
      contract_status: ["PENDING", "APPROVED", "CONSUMED", "SUPERSEDED", "EXPIRED"],
      entitlement_status: ["ACTIVE", "REVOKED", "EXPIRED"],
      order_status: ["PENDING", "PAID", "CANCELED", "FULFILLED"],
      payment_status: ["READY", "APPROVED", "CANCELED", "FAILED"],
      report_verdict: ["ALLOW", "BLOCK"],
    },
  },
} as const;
