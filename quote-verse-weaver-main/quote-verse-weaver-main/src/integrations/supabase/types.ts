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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotations: {
        Row: {
          cot_code: string
          currency: string
          delivery_days: number | null
          freight_cost: number | null
          id: string
          incoterm: string | null
          moq: number
          observations: string | null
          production_days: number | null
          received_at: string
          rfq_id: string
          rfq_supplier_id: string
          score: number | null
          unit_price: number
          validity_days: number | null
        }
        Insert: {
          cot_code: string
          currency?: string
          delivery_days?: number | null
          freight_cost?: number | null
          id?: string
          incoterm?: string | null
          moq?: number
          observations?: string | null
          production_days?: number | null
          received_at?: string
          rfq_id: string
          rfq_supplier_id: string
          score?: number | null
          unit_price: number
          validity_days?: number | null
        }
        Update: {
          cot_code?: string
          currency?: string
          delivery_days?: number | null
          freight_cost?: number | null
          id?: string
          incoterm?: string | null
          moq?: number
          observations?: string | null
          production_days?: number | null
          received_at?: string
          rfq_id?: string
          rfq_supplier_id?: string
          score?: number | null
          unit_price?: number
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_rfq_supplier_id_fkey"
            columns: ["rfq_supplier_id"]
            isOneToOne: false
            referencedRelation: "rfq_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_suppliers: {
        Row: {
          created_at: string
          email_sent_at: string | null
          id: string
          rfq_id: string
          secure_token: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          email_sent_at?: string | null
          id?: string
          rfq_id: string
          secure_token?: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          email_sent_at?: string | null
          id?: string
          rfq_id?: string
          secure_token?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_suppliers_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          category: string | null
          certifications: string | null
          code: string
          color: string | null
          created_at: string
          created_by: string
          currency: string
          deadline: string | null
          description: string | null
          dimensions: string | null
          id: string
          material: string | null
          packaging: string | null
          quantity: number
          status: Database["public"]["Enums"]["rfq_status"]
          supplier_code: string | null
          title: string
          updated_at: string
          usage_context: string | null
          weight: string | null
        }
        Insert: {
          category?: string | null
          certifications?: string | null
          code: string
          color?: string | null
          created_at?: string
          created_by: string
          currency?: string
          deadline?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string
          material?: string | null
          packaging?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["rfq_status"]
          supplier_code?: string | null
          title: string
          updated_at?: string
          usage_context?: string | null
          weight?: string | null
        }
        Update: {
          category?: string | null
          certifications?: string | null
          code?: string
          color?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          deadline?: string | null
          description?: string | null
          dimensions?: string | null
          id?: string
          material?: string | null
          packaging?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["rfq_status"]
          supplier_code?: string | null
          title?: string
          updated_at?: string
          usage_context?: string | null
          weight?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          country: string
          created_at: string
          created_by: string | null
          email: string
          flag: string
          id: string
          language: string
          name: string
          rating: number | null
          total_quotes: number | null
          updated_at: string
        }
        Insert: {
          country: string
          created_at?: string
          created_by?: string | null
          email: string
          flag?: string
          id?: string
          language?: string
          name: string
          rating?: number | null
          total_quotes?: number | null
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string
          flag?: string
          id?: string
          language?: string
          name?: string
          rating?: number | null
          total_quotes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_cot_code: { Args: never; Returns: string }
      generate_rfq_code: { Args: never; Returns: string }
    }
    Enums: {
      rfq_status:
        | "draft"
        | "sent"
        | "quoting"
        | "ai_analysis"
        | "closed"
        | "cancelled"
        | "auto_closed"
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
      rfq_status: [
        "draft",
        "sent",
        "quoting",
        "ai_analysis",
        "closed",
        "cancelled",
        "auto_closed",
      ],
    },
  },
} as const
