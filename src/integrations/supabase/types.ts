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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          organization_id: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          organization_id?: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          organization_id?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          name: string
          organization_id: string
          tax_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          name: string
          organization_id?: string
          tax_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          name?: string
          organization_id?: string
          tax_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          fornecedor: string | null
          id: string
          kind: Database["public"]["Enums"]["expense_kind"]
          note: string | null
          occurred_at: string
          organization_id: string
          produto: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          kind: Database["public"]["Enums"]["expense_kind"]
          note?: string | null
          occurred_at?: string
          organization_id?: string
          produto?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["expense_kind"]
          note?: string | null
          occurred_at?: string
          organization_id?: string
          produto?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      key_conversion: {
        Row: {
          brand: string | null
          created_at: string
          dovale_code: string | null
          gold_code: string | null
          id: number
          jas_code: string | null
          land_code: string | null
          subgroup: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          dovale_code?: string | null
          gold_code?: string | null
          id?: number
          jas_code?: string | null
          land_code?: string | null
          subgroup?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          dovale_code?: string | null
          gold_code?: string | null
          id?: number
          jas_code?: string | null
          land_code?: string | null
          subgroup?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      movements: {
        Row: {
          card_brand: string | null
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          occurred_at: string
          organization_id: string
          payment_method: string | null
          product_id: string
          quantity: number
          type: Database["public"]["Enums"]["movement_type"]
          unit_cost: number | null
          unit_cost_includes_fee: boolean
          unit_price: number
        }
        Insert: {
          card_brand?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          organization_id?: string
          payment_method?: string | null
          product_id: string
          quantity: number
          type: Database["public"]["Enums"]["movement_type"]
          unit_cost?: number | null
          unit_cost_includes_fee?: boolean
          unit_price?: number
        }
        Update: {
          card_brand?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          occurred_at?: string
          organization_id?: string
          payment_method?: string | null
          product_id?: string
          quantity?: number
          type?: Database["public"]["Enums"]["movement_type"]
          unit_cost?: number | null
          unit_cost_includes_fee?: boolean
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          blocked_at: string | null
          blocked_reason: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          neighborhood: string | null
          phone: string | null
          primary_color: string | null
          slug: string
          state: string | null
          stock_control_enabled: boolean
          street: string | null
          subscription_expires_at: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          subscription_started_at: string
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_reason?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          neighborhood?: string | null
          phone?: string | null
          primary_color?: string | null
          slug: string
          state?: string | null
          stock_control_enabled?: boolean
          street?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_started_at?: string
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_reason?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          neighborhood?: string | null
          phone?: string | null
          primary_color?: string | null
          slug?: string
          state?: string | null
          stock_control_enabled?: boolean
          street?: string | null
          subscription_expires_at?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_started_at?: string
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      payment_fee_history: {
        Row: {
          boleto_fee: number
          created_at: string
          credit_pct: number
          credit_pct_other: number
          debit_pct: number
          debit_pct_other: number
          effective_date: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          boleto_fee?: number
          created_at?: string
          credit_pct?: number
          credit_pct_other?: number
          debit_pct?: number
          debit_pct_other?: number
          effective_date: string
          organization_id?: string
          updated_at?: string
        }
        Update: {
          boleto_fee?: number
          created_at?: string
          credit_pct?: number
          credit_pct_other?: number
          debit_pct?: number
          debit_pct_other?: number
          effective_date?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          entity_id: string
          entity_name: string | null
          entity_type: string
          field: string
          id: string
          new_value: number | null
          old_value: number | null
          organization_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          entity_id: string
          entity_name?: string | null
          entity_type: string
          field: string
          id?: string
          new_value?: number | null
          old_value?: number | null
          organization_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          field?: string
          id?: string
          new_value?: number | null
          old_value?: number | null
          organization_id?: string
        }
        Relationships: []
      }
      product_references: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization_id: string
          purchase_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization_id?: string
          purchase_price?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          purchase_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_references_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          codigo: string | null
          codigo_fornecedor: string | null
          created_at: string
          id: string
          marca: string | null
          min_stock: number
          name: string
          organization_id: string
          purchase_price: number
          referencia: string | null
          sale_price: number
          sku: string | null
          stock: number
          stock_controlled: boolean
          supplier: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          codigo?: string | null
          codigo_fornecedor?: string | null
          created_at?: string
          id?: string
          marca?: string | null
          min_stock?: number
          name: string
          organization_id?: string
          purchase_price?: number
          referencia?: string | null
          sale_price?: number
          sku?: string | null
          stock?: number
          stock_controlled?: boolean
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          codigo?: string | null
          codigo_fornecedor?: string | null
          created_at?: string
          id?: string
          marca?: string | null
          min_stock?: number
          name?: string
          organization_id?: string
          purchase_price?: number
          referencia?: string | null
          sale_price?: number
          sku?: string | null
          stock?: number
          stock_controlled?: boolean
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string
          display_name: string | null
          email: string | null
          organization_id: string
          provider: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          display_name?: string | null
          email?: string | null
          organization_id?: string
          provider?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          display_name?: string | null
          email?: string | null
          organization_id?: string
          provider?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_list_items: {
        Row: {
          checked: boolean
          codigo: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
          position: number
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          checked?: boolean
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id?: string
          position?: number
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          checked?: boolean
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          position?: number
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_list_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_data: Json
          customer_id: string | null
          date: string | null
          id: string
          items: Json
          organization_id: string
          receipt_number: number
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_data: Json
          customer_id?: string | null
          date?: string | null
          id?: string
          items: Json
          organization_id?: string
          receipt_number: number
          total_amount: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_data?: Json
          customer_id?: string | null
          date?: string | null
          id?: string
          items?: Json
          organization_id?: string
          receipt_number?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_doc: string | null
          customer_name: string
          customer_phone: string | null
          equipment: string | null
          id: string
          kind: Database["public"]["Enums"]["service_order_kind"]
          notes: string | null
          number: number
          occurred_at: string
          organization_id: string
          problem: string | null
          products: Json
          scheduled_at: string | null
          scheduled_has_time: boolean
          service_address: string | null
          service_lat: number | null
          service_lng: number | null
          services: Json
          show_products_pdf: boolean
          status: Database["public"]["Enums"]["service_order_status"]
          total: number
          updated_at: string
          validity_date: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_doc?: string | null
          customer_name: string
          customer_phone?: string | null
          equipment?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["service_order_kind"]
          notes?: string | null
          number: number
          occurred_at?: string
          organization_id?: string
          problem?: string | null
          products?: Json
          scheduled_at?: string | null
          scheduled_has_time?: boolean
          service_address?: string | null
          service_lat?: number | null
          service_lng?: number | null
          services?: Json
          show_products_pdf?: boolean
          status?: Database["public"]["Enums"]["service_order_status"]
          total?: number
          updated_at?: string
          validity_date?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_doc?: string | null
          customer_name?: string
          customer_phone?: string | null
          equipment?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["service_order_kind"]
          notes?: string | null
          number?: number
          occurred_at?: string
          organization_id?: string
          problem?: string | null
          products?: Json
          scheduled_at?: string | null
          scheduled_has_time?: boolean
          service_address?: string | null
          service_lat?: number | null
          service_lng?: number | null
          services?: Json
          show_products_pdf?: boolean
          status?: Database["public"]["Enums"]["service_order_status"]
          total?: number
          updated_at?: string
          validity_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_requests: {
        Row: {
          activated_at: string | null
          activated_organization_id: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string
          id: string
          nome_cliente: string
          nome_fantasia: string
          numero: string | null
          rua: string | null
          status: string
          uf: string | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          activated_at?: string | null
          activated_organization_id?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          id?: string
          nome_cliente: string
          nome_fantasia: string
          numero?: string | null
          rua?: string | null
          status?: string
          uf?: string | null
          updated_at?: string
          whatsapp: string
        }
        Update: {
          activated_at?: string | null
          activated_organization_id?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          id?: string
          nome_cliente?: string
          nome_fantasia?: string
          numero?: string | null
          rua?: string | null
          status?: string
          uf?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "signup_requests_activated_organization_id_fkey"
            columns: ["activated_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          new_expires_at: string | null
          new_plan: Database["public"]["Enums"]["subscription_plan"] | null
          new_status: Database["public"]["Enums"]["subscription_status"] | null
          old_expires_at: string | null
          old_plan: Database["public"]["Enums"]["subscription_plan"] | null
          old_status: Database["public"]["Enums"]["subscription_status"] | null
          organization_id: string
          reason: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_expires_at?: string | null
          new_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          new_status?: Database["public"]["Enums"]["subscription_status"] | null
          old_expires_at?: string | null
          old_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          old_status?: Database["public"]["Enums"]["subscription_status"] | null
          organization_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_expires_at?: string | null
          new_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          new_status?: Database["public"]["Enums"]["subscription_status"] | null
          old_expires_at?: string | null
          old_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          old_status?: Database["public"]["Enums"]["subscription_status"] | null
          organization_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cnpj_already_registered: { Args: { _cnpj: string }; Returns: boolean }
      current_org_id: { Args: never; Returns: string }
      expire_overdue_subscriptions: { Args: never; Returns: undefined }
      get_org_color_by_nickname: {
        Args: { _nickname: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_active: { Args: { _org_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      next_receipt_number: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin"
      expense_kind: "despesa" | "compra_estoque"
      movement_type: "in" | "out"
      service_order_kind: "os" | "orcamento"
      service_order_status:
        | "aberta"
        | "em_andamento"
        | "concluida"
        | "entregue"
        | "aprovado"
        | "rejeitado"
        | "expirado"
        | "cancelada"
      subscription_plan:
        | "trial"
        | "monthly"
        | "semiannual"
        | "annual"
        | "free_lifetime"
      subscription_status: "trial" | "active" | "expired" | "blocked"
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
      app_role: ["admin", "user", "super_admin"],
      expense_kind: ["despesa", "compra_estoque"],
      movement_type: ["in", "out"],
      service_order_kind: ["os", "orcamento"],
      service_order_status: [
        "aberta",
        "em_andamento",
        "concluida",
        "entregue",
        "aprovado",
        "rejeitado",
        "expirado",
        "cancelada",
      ],
      subscription_plan: [
        "trial",
        "monthly",
        "semiannual",
        "annual",
        "free_lifetime",
      ],
      subscription_status: ["trial", "active", "expired", "blocked"],
    },
  },
} as const
