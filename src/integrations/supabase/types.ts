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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          active_seats: number | null
          approved_image_version: string | null
          client_name: string
          compliance_score: number | null
          created_at: string
          go_live_date: string | null
          id: string
          notes: string | null
          program_name: string
          required_hardware_specs: Json | null
          required_software: Json | null
          security_controls: Json | null
          status: string | null
          total_seats: number | null
          updated_at: string
        }
        Insert: {
          active_seats?: number | null
          approved_image_version?: string | null
          client_name: string
          compliance_score?: number | null
          created_at?: string
          go_live_date?: string | null
          id?: string
          notes?: string | null
          program_name: string
          required_hardware_specs?: Json | null
          required_software?: Json | null
          security_controls?: Json | null
          status?: string | null
          total_seats?: number | null
          updated_at?: string
        }
        Update: {
          active_seats?: number | null
          approved_image_version?: string | null
          client_name?: string
          compliance_score?: number | null
          created_at?: string
          go_live_date?: string | null
          id?: string
          notes?: string | null
          program_name?: string
          required_hardware_specs?: Json | null
          required_software?: Json | null
          security_controls?: Json | null
          status?: string | null
          total_seats?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          performed_at: string | null
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          performed_at?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          performed_at?: string | null
          performed_by?: string | null
        }
        Relationships: []
      }
      hardware_assets: {
        Row: {
          antivirus_status: string | null
          asset_tag: string
          asset_type: string
          assigned_agent: string | null
          assigned_seat_id: string | null
          brand: string | null
          cpu: string | null
          created_at: string
          disk_space_gb: number | null
          disk_type: string | null
          encryption_status: boolean | null
          floor: string | null
          hostname: string | null
          id: string
          image_version: string | null
          last_user_login: string | null
          logged_in_user: string | null
          mac_address: string | null
          model: string | null
          notes: string | null
          purchase_cost: number | null
          purchase_date: string | null
          ram_gb: number | null
          serial_number: string | null
          site: string | null
          specs: Json | null
          status: string | null
          updated_at: string
          usb_policy_applied: boolean | null
          user_profile_count: number | null
          warranty_expiry: string | null
        }
        Insert: {
          antivirus_status?: string | null
          asset_tag: string
          asset_type?: string
          assigned_agent?: string | null
          assigned_seat_id?: string | null
          brand?: string | null
          cpu?: string | null
          created_at?: string
          disk_space_gb?: number | null
          disk_type?: string | null
          encryption_status?: boolean | null
          floor?: string | null
          hostname?: string | null
          id?: string
          image_version?: string | null
          last_user_login?: string | null
          logged_in_user?: string | null
          mac_address?: string | null
          model?: string | null
          notes?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          ram_gb?: number | null
          serial_number?: string | null
          site?: string | null
          specs?: Json | null
          status?: string | null
          updated_at?: string
          usb_policy_applied?: boolean | null
          user_profile_count?: number | null
          warranty_expiry?: string | null
        }
        Update: {
          antivirus_status?: string | null
          asset_tag?: string
          asset_type?: string
          assigned_agent?: string | null
          assigned_seat_id?: string | null
          brand?: string | null
          cpu?: string | null
          created_at?: string
          disk_space_gb?: number | null
          disk_type?: string | null
          encryption_status?: boolean | null
          floor?: string | null
          hostname?: string | null
          id?: string
          image_version?: string | null
          last_user_login?: string | null
          logged_in_user?: string | null
          mac_address?: string | null
          model?: string | null
          notes?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          ram_gb?: number | null
          serial_number?: string | null
          site?: string | null
          specs?: Json | null
          status?: string | null
          updated_at?: string
          usb_policy_applied?: boolean | null
          user_profile_count?: number | null
          warranty_expiry?: string | null
        }
        Relationships: []
      }
      maintenance_records: {
        Row: {
          asset_id: string | null
          created_at: string
          description: string | null
          downtime_minutes: number | null
          id: string
          issue_type: string
          priority: string | null
          repair_cost: number | null
          reported_at: string | null
          resolution_notes: string | null
          resolved_at: string | null
          seat_id: string | null
          status: string | null
          technician: string | null
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          description?: string | null
          downtime_minutes?: number | null
          id?: string
          issue_type: string
          priority?: string | null
          repair_cost?: number | null
          reported_at?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          seat_id?: string | null
          status?: string | null
          technician?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          description?: string | null
          downtime_minutes?: number | null
          id?: string
          issue_type?: string
          priority?: string | null
          repair_cost?: number | null
          reported_at?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          seat_id?: string | null
          status?: string | null
          technician?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hardware_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
        ]
      }
      new_hires: {
        Row: {
          account_access_provisioned: boolean | null
          account_id: string | null
          assigned_seat_id: string | null
          created_at: string
          employee_id: string | null
          employee_name: string
          headset_issued: boolean | null
          hire_date: string
          id: string
          notes: string | null
          pc_imaged: boolean | null
          software_installed: boolean | null
          status: string | null
          updated_at: string
        }
        Insert: {
          account_access_provisioned?: boolean | null
          account_id?: string | null
          assigned_seat_id?: string | null
          created_at?: string
          employee_id?: string | null
          employee_name: string
          headset_issued?: boolean | null
          hire_date: string
          id?: string
          notes?: string | null
          pc_imaged?: boolean | null
          software_installed?: boolean | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          account_access_provisioned?: boolean | null
          account_id?: string | null
          assigned_seat_id?: string | null
          created_at?: string
          employee_id?: string | null
          employee_name?: string
          headset_issued?: boolean | null
          hire_date?: string
          id?: string
          notes?: string | null
          pc_imaged?: boolean | null
          software_installed?: boolean | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "new_hires_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "new_hires_assigned_seat_id_fkey"
            columns: ["assigned_seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      registered_devices: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          device_id: string
          hostname: string | null
          id: string
          last_sync_at: string | null
          notes: string | null
          registration_key: string
          status: string
          sync_count: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          device_id: string
          hostname?: string | null
          id?: string
          last_sync_at?: string | null
          notes?: string | null
          registration_key: string
          status?: string
          sync_count?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          device_id?: string
          hostname?: string | null
          id?: string
          last_sync_at?: string | null
          notes?: string | null
          registration_key?: string
          status?: string
          sync_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      seats: {
        Row: {
          account_id: string | null
          assigned_agent: string | null
          created_at: string
          floor: string | null
          headset_id: string | null
          id: string
          monitor_id: string | null
          network_port: string | null
          pc_asset_id: string | null
          phone_id: string | null
          position: string | null
          row: string | null
          seat_id: string
          shift: string | null
          site: string | null
          status: string | null
          updated_at: string
          vlan: string | null
        }
        Insert: {
          account_id?: string | null
          assigned_agent?: string | null
          created_at?: string
          floor?: string | null
          headset_id?: string | null
          id?: string
          monitor_id?: string | null
          network_port?: string | null
          pc_asset_id?: string | null
          phone_id?: string | null
          position?: string | null
          row?: string | null
          seat_id: string
          shift?: string | null
          site?: string | null
          status?: string | null
          updated_at?: string
          vlan?: string | null
        }
        Update: {
          account_id?: string | null
          assigned_agent?: string | null
          created_at?: string
          floor?: string | null
          headset_id?: string | null
          id?: string
          monitor_id?: string | null
          network_port?: string | null
          pc_asset_id?: string | null
          phone_id?: string | null
          position?: string | null
          row?: string | null
          seat_id?: string
          shift?: string | null
          site?: string | null
          status?: string | null
          updated_at?: string
          vlan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seats_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seats_pc_asset_id_fkey"
            columns: ["pc_asset_id"]
            isOneToOne: false
            referencedRelation: "hardware_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      security_incidents: {
        Row: {
          asset_id: string | null
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          incident_type: string
          reported_at: string | null
          reported_by: string | null
          resolution_notes: string | null
          resolved_at: string | null
          seat_id: string | null
          severity: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          incident_type: string
          reported_at?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          seat_id?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          incident_type?: string
          reported_at?: string | null
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          seat_id?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_incidents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "hardware_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_incidents_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "seats"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      software_licenses: {
        Row: {
          account_id: string | null
          compliance_status: string | null
          cost_per_seat: number | null
          created_at: string
          expiry_date: string | null
          id: string
          is_client_provided: boolean | null
          license_key: string | null
          license_type: string | null
          notes: string | null
          software_name: string
          total_seats: number | null
          updated_at: string
          used_seats: number | null
          vendor: string | null
        }
        Insert: {
          account_id?: string | null
          compliance_status?: string | null
          cost_per_seat?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_client_provided?: boolean | null
          license_key?: string | null
          license_type?: string | null
          notes?: string | null
          software_name: string
          total_seats?: number | null
          updated_at?: string
          used_seats?: number | null
          vendor?: string | null
        }
        Update: {
          account_id?: string | null
          compliance_status?: string | null
          cost_per_seat?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_client_provided?: boolean | null
          license_key?: string | null
          license_type?: string | null
          notes?: string | null
          software_name?: string
          total_seats?: number | null
          updated_at?: string
          used_seats?: number | null
          vendor?: string | null
        }
        Relationships: []
      }
      sync_schedules: {
        Row: {
          created_at: string
          cron_expression: string
          enabled: boolean
          id: string
          last_run_at: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cron_expression?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cron_expression?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operator" | "viewer"
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
      app_role: ["admin", "operator", "viewer"],
    },
  },
} as const
