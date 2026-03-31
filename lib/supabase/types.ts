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
      aggregates: {
        Row: {
          application_id: string
          computed_at: string | null
          computed_with_formula: string | null
          created_at: string | null
          criteria_snapshot: Json | null
          diploma_generated_at: string | null
          diploma_template_version: number | null
          diploma_type: string | null
          id: string
          judge_weights_snapshot: Json | null
          mean: number | null
          nomination_id: string
          published_globally_at: string | null
          qr_verification_token: string | null
          rank: number | null
          round: string
          total: number | null
          visible_to_participant: boolean | null
        }
        Insert: {
          application_id: string
          computed_at?: string | null
          computed_with_formula?: string | null
          created_at?: string | null
          criteria_snapshot?: Json | null
          diploma_generated_at?: string | null
          diploma_template_version?: number | null
          diploma_type?: string | null
          id?: string
          judge_weights_snapshot?: Json | null
          mean?: number | null
          nomination_id: string
          published_globally_at?: string | null
          qr_verification_token?: string | null
          rank?: number | null
          round?: string
          total?: number | null
          visible_to_participant?: boolean | null
        }
        Update: {
          application_id?: string
          computed_at?: string | null
          computed_with_formula?: string | null
          created_at?: string | null
          criteria_snapshot?: Json | null
          diploma_generated_at?: string | null
          diploma_template_version?: number | null
          diploma_type?: string | null
          id?: string
          judge_weights_snapshot?: Json | null
          mean?: number | null
          nomination_id?: string
          published_globally_at?: string | null
          qr_verification_token?: string | null
          rank?: number | null
          round?: string
          total?: number | null
          visible_to_participant?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "aggregates_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aggregates_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "nominations"
            referencedColumns: ["id"]
          },
        ]
      }
      application_files: {
        Row: {
          application_id: string
          id: string
          original_name: string | null
          size_bytes: number | null
          storage_backend: string
          storage_path: string
          type: string
          uploaded_at: string | null
        }
        Insert: {
          application_id: string
          id?: string
          original_name?: string | null
          size_bytes?: number | null
          storage_backend: string
          storage_path: string
          type: string
          uploaded_at?: string | null
        }
        Update: {
          application_id?: string
          id?: string
          original_name?: string | null
          size_bytes?: number | null
          storage_backend?: string
          storage_path?: string
          type?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_files_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_members: {
        Row: {
          application_id: string
          birth_date: string | null
          created_at: string | null
          full_name: string
          id: string
          role: string | null
        }
        Insert: {
          application_id: string
          birth_date?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          role?: string | null
        }
        Update: {
          application_id?: string
          birth_date?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_members_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_packages: {
        Row: {
          application_id: string
          created_at: string | null
          id: string
          package_id: string
          paid_amount: number | null
          paid_at: string | null
          quantity: number
        }
        Insert: {
          application_id: string
          created_at?: string | null
          id?: string
          package_id: string
          paid_amount?: number | null
          paid_at?: string | null
          quantity?: number
        }
        Update: {
          application_id?: string
          created_at?: string | null
          id?: string
          package_id?: string
          paid_amount?: number | null
          paid_at?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "application_packages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          applicant_type: string
          category_id: string
          city: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          country: string | null
          created_at: string | null
          festival_id: string
          id: string
          lang_pref: string | null
          name: string
          nomination_id: string
          notes: string | null
          payment_status: string
          performance_duration_sec: number | null
          performance_number: number | null
          performance_number_assigned_at: string | null
          performance_title: string | null
          status: string
          video_link: string | null
        }
        Insert: {
          applicant_type: string
          category_id: string
          city?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          festival_id: string
          id?: string
          lang_pref?: string | null
          name: string
          nomination_id: string
          notes?: string | null
          payment_status?: string
          performance_duration_sec?: number | null
          performance_number?: number | null
          performance_number_assigned_at?: string | null
          performance_title?: string | null
          status?: string
          video_link?: string | null
        }
        Update: {
          applicant_type?: string
          category_id?: string
          city?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          festival_id?: string
          id?: string
          lang_pref?: string | null
          name?: string
          nomination_id?: string
          notes?: string | null
          payment_status?: string
          performance_duration_sec?: number | null
          performance_number?: number | null
          performance_number_assigned_at?: string | null
          performance_title?: string | null
          status?: string
          video_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_festival_id_fkey"
            columns: ["festival_id"]
            isOneToOne: false
            referencedRelation: "festivals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "nominations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          festival_id: string
          id: string
          name_i18n: Json
          type: string
        }
        Insert: {
          created_at?: string | null
          festival_id: string
          id?: string
          name_i18n?: Json
          type: string
        }
        Update: {
          created_at?: string | null
          festival_id?: string
          id?: string
          name_i18n?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_festival_id_fkey"
            columns: ["festival_id"]
            isOneToOne: false
            referencedRelation: "festivals"
            referencedColumns: ["id"]
          },
        ]
      }
      criteria: {
        Row: {
          created_at: string | null
          id: string
          max_value: number
          min_value: number
          name_i18n: Json
          nomination_id: string
          sort_order: number | null
          weight: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_value?: number
          min_value?: number
          name_i18n?: Json
          nomination_id: string
          sort_order?: number | null
          weight?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          max_value?: number
          min_value?: number
          name_i18n?: Json
          nomination_id?: string
          sort_order?: number | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "criteria_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "nominations"
            referencedColumns: ["id"]
          },
        ]
      }
      diploma_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          deprecated_at: string | null
          festival_id: string
          id: string
          layout_json: Json | null
          logo_path: string | null
          name: string
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deprecated_at?: string | null
          festival_id: string
          id?: string
          layout_json?: Json | null
          logo_path?: string | null
          name: string
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deprecated_at?: string | null
          festival_id?: string
          id?: string
          layout_json?: Json | null
          logo_path?: string | null
          name?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "diploma_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diploma_templates_festival_id_fkey"
            columns: ["festival_id"]
            isOneToOne: false
            referencedRelation: "festivals"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notifications: {
        Row: {
          application_id: string | null
          created_at: string | null
          event_type: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          next_retry_at: string | null
          recipient_email: string
          retry_count: number | null
          sent_at: string | null
          subject_i18n: Json | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string | null
          event_type: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          next_retry_at?: string | null
          recipient_email: string
          retry_count?: number | null
          sent_at?: string | null
          subject_i18n?: Json | null
        }
        Update: {
          application_id?: string | null
          created_at?: string | null
          event_type?: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          next_retry_at?: string | null
          recipient_email?: string
          retry_count?: number | null
          sent_at?: string | null
          subject_i18n?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      festivals: {
        Row: {
          created_at: string | null
          ends_at: string | null
          id: string
          location: string | null
          name: string
          settings_json: Json | null
          starts_at: string | null
          status: string
          year: number
        }
        Insert: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          name: string
          settings_json?: Json | null
          starts_at?: string | null
          status?: string
          year: number
        }
        Update: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          name?: string
          settings_json?: Json | null
          starts_at?: string | null
          status?: string
          year?: number
        }
        Relationships: []
      }
      judge_assignments: {
        Row: {
          created_at: string | null
          festival_id: string
          id: string
          judge_id: string
          nomination_id: string
          weight: number
        }
        Insert: {
          created_at?: string | null
          festival_id: string
          id?: string
          judge_id: string
          nomination_id: string
          weight?: number
        }
        Update: {
          created_at?: string | null
          festival_id?: string
          id?: string
          judge_id?: string
          nomination_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "judge_assignments_festival_id_fkey"
            columns: ["festival_id"]
            isOneToOne: false
            referencedRelation: "festivals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_assignments_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_assignments_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "nominations"
            referencedColumns: ["id"]
          },
        ]
      }
      nominations: {
        Row: {
          age_max: number | null
          age_min: number | null
          category_id: string
          created_at: string | null
          diploma_labels_json: Json | null
          id: string
          name_i18n: Json
          score_ranges_json: Json
          scoring_formula: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          category_id: string
          created_at?: string | null
          diploma_labels_json?: Json | null
          id?: string
          name_i18n?: Json
          score_ranges_json?: Json
          scoring_formula?: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          category_id?: string
          created_at?: string | null
          diploma_labels_json?: Json | null
          id?: string
          name_i18n?: Json
          score_ranges_json?: Json
          scoring_formula?: string
        }
        Relationships: [
          {
            foreignKeyName: "nominations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          active: boolean | null
          created_at: string | null
          currency: string
          festival_id: string
          id: string
          includes_json: Json | null
          name_i18n: Json
          price: number
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          currency?: string
          festival_id: string
          id?: string
          includes_json?: Json | null
          name_i18n?: Json
          price?: number
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          currency?: string
          festival_id?: string
          id?: string
          includes_json?: Json | null
          name_i18n?: Json
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "packages_festival_id_fkey"
            columns: ["festival_id"]
            isOneToOne: false
            referencedRelation: "festivals"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          application_id: string | null
          created_at: string | null
          currency: string
          id: string
          processed_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_webhook_event_id: string | null
          type: string
        }
        Insert: {
          amount: number
          application_id?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          processed_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_webhook_event_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          application_id?: string | null
          created_at?: string | null
          currency?: string
          id?: string
          processed_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_webhook_event_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      program: {
        Row: {
          application_id: string | null
          audio_file_name: string | null
          audio_file_path: string | null
          created_at: string | null
          date: string
          festival_id: string
          hall: string | null
          how_it_starts: string | null
          id: string
          microphones_count: number | null
          order_number: number
          print_ready: boolean | null
          slot_time: string | null
          status: string
          technical_notes: string | null
          video_link: string | null
        }
        Insert: {
          application_id?: string | null
          audio_file_name?: string | null
          audio_file_path?: string | null
          created_at?: string | null
          date: string
          festival_id: string
          hall?: string | null
          how_it_starts?: string | null
          id?: string
          microphones_count?: number | null
          order_number?: number
          print_ready?: boolean | null
          slot_time?: string | null
          status?: string
          technical_notes?: string | null
          video_link?: string | null
        }
        Update: {
          application_id?: string | null
          audio_file_name?: string | null
          audio_file_path?: string | null
          created_at?: string | null
          date?: string
          festival_id?: string
          hall?: string | null
          how_it_starts?: string | null
          id?: string
          microphones_count?: number | null
          order_number?: number
          print_ready?: boolean | null
          slot_time?: string | null
          status?: string
          technical_notes?: string | null
          video_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_festival_id_fkey"
            columns: ["festival_id"]
            isOneToOne: false
            referencedRelation: "festivals"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          application_id: string
          comment_visible: boolean | null
          created_at: string | null
          criterion_id: string
          id: string
          idempotency_key: string | null
          judge_comment: string | null
          judge_id: string
          nomination_id: string
          round: string
          value: number
        }
        Insert: {
          application_id: string
          comment_visible?: boolean | null
          created_at?: string | null
          criterion_id: string
          id?: string
          idempotency_key?: string | null
          judge_comment?: string | null
          judge_id: string
          nomination_id: string
          round?: string
          value: number
        }
        Update: {
          application_id?: string
          comment_visible?: boolean | null
          created_at?: string | null
          criterion_id?: string
          id?: string
          idempotency_key?: string | null
          judge_comment?: string | null
          judge_id?: string
          nomination_id?: string
          round?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "scores_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "nominations"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          application_id: string | null
          buyer_name: string | null
          cashier_user_id: string | null
          currency: string
          festival_id: string
          id: string
          payment_id: string | null
          payment_method: string
          price: number
          sold_at: string | null
          stripe_pi_id: string | null
          ticket_type: string
        }
        Insert: {
          application_id?: string | null
          buyer_name?: string | null
          cashier_user_id?: string | null
          currency?: string
          festival_id: string
          id?: string
          payment_id?: string | null
          payment_method: string
          price?: number
          sold_at?: string | null
          stripe_pi_id?: string | null
          ticket_type: string
        }
        Update: {
          application_id?: string | null
          buyer_name?: string | null
          cashier_user_id?: string | null
          currency?: string
          festival_id?: string
          id?: string
          payment_id?: string | null
          payment_method?: string
          price?: number
          sold_at?: string | null
          stripe_pi_id?: string | null
          ticket_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_cashier_user_id_fkey"
            columns: ["cashier_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_festival_id_fkey"
            columns: ["festival_id"]
            isOneToOne: false
            referencedRelation: "festivals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean | null
          created_at: string | null
          display_name: string | null
          email: string
          festival_id: string | null
          id: string
          lang_pref: string | null
          role: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          display_name?: string | null
          email: string
          festival_id?: string | null
          id: string
          lang_pref?: string | null
          role: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          festival_id?: string | null
          id?: string
          lang_pref?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_festival_id_fkey"
            columns: ["festival_id"]
            isOneToOne: false
            referencedRelation: "festivals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_festival_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
