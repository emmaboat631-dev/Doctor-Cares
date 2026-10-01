/**
 * Hand-written types matching the Phase 2 schema in supabase/migrations/.
 * Regenerate with `npx supabase gen types typescript --project-id <REF>` once
 * you're comfortable with the CLI — this file stays a compatible superset.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enum types (must match SQL) -------------------------------------------------
export type UserRole = 'patient' | 'doctor' | 'admin';
export type AccountStatus = 'active' | 'suspended' | 'pending';
export type AppointmentStatus =
  | 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rejected';
export type AppointmentMode = 'video' | 'clinic' | 'home';
export type NotificationType =
  | 'appointment' | 'message' | 'system' | 'prescription' | 'reminder';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';
export type ReportPriority = 'low' | 'medium' | 'high';
export type ReportTargetType = 'user' | 'appointment' | 'message' | 'conversation';

// Row shapes ------------------------------------------------------------------
export interface ProfileRow {
  id: string;
  role: UserRole;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  status: AccountStatus;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientProfileRow {
  id: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  allergies: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  height_cm: number | null;
  chronic_conditions: string[];
  current_medications: string[];
  past_surgeries: string | null;
  immunizations: string[];
  family_history: string | null;
  smoking_status: 'never' | 'former' | 'current' | null;
  alcohol_use: 'none' | 'occasional' | 'regular' | 'heavy' | null;
  updated_at: string;
}

export interface DoctorProfileRow {
  id: string;
  specialty: string | null;
  qualifications: string | null;
  bio: string | null;
  years_experience: number | null;
  consultation_fee: number | null;
  modes: AppointmentMode[];
  is_verified: boolean;
  rating: number | null;
  rating_count: number;
  clinic_address: string | null;
  languages: string[];
  updated_at: string;
}

export interface DoctorAvailabilityRow {
  id: string;
  doctor_id: string;
  weekday: number;        // 0=Sunday .. 6=Saturday
  start_time: string;     // HH:MM:SS
  end_time: string;
  slot_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface DoctorBlockedDateRow {
  id: string;
  doctor_id: string;
  start_date: string;     // YYYY-MM-DD
  end_date: string;
  reason: string | null;
  created_at: string;
}

export interface AppointmentRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  mode: AppointmentMode;
  status: AppointmentStatus;
  reason: string | null;
  doctor_notes: string | null;
  fee: number | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipantRow {
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachment_url: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  href: string | null;
  metadata: Json;
  read_at: string | null;
  created_at: string;
}

export interface ReportRow {
  id: string;
  reporter_id: string | null;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  priority: ReportPriority;
  status: ReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface DrugSearchHistoryRow {
  id: string;
  user_id: string;
  query: string;
  drug_name: string | null;
  created_at: string;
}

// Insert / Update helpers -----------------------------------------------------
type Insertable<T, Optional extends keyof T> = Omit<T, Optional> & Partial<Pick<T, Optional>>;
type Updatable<T> = Partial<T>;

// Supabase-shape Database type -----------------------------------------------
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Insertable<ProfileRow, 'created_at' | 'updated_at' | 'status' | 'role' | 'full_name' | 'avatar_url' | 'phone'>;
        Update: Updatable<ProfileRow>;
      };
      patient_profiles: {
        Row: PatientProfileRow;
        Insert: Insertable<PatientProfileRow, 'updated_at' | 'date_of_birth' | 'gender' | 'blood_group' | 'allergies' | 'emergency_contact_name' | 'emergency_contact_phone' | 'emergency_contact_relation' | 'height_cm' | 'chronic_conditions' | 'current_medications' | 'past_surgeries' | 'immunizations' | 'family_history' | 'smoking_status' | 'alcohol_use'>;
        Update: Updatable<PatientProfileRow>;
      };
      doctor_profiles: {
        Row: DoctorProfileRow;
        Insert: Insertable<DoctorProfileRow, 'updated_at' | 'specialty' | 'qualifications' | 'bio' | 'years_experience' | 'consultation_fee' | 'modes' | 'is_verified' | 'rating' | 'rating_count' | 'clinic_address' | 'languages'>;
        Update: Updatable<DoctorProfileRow>;
      };
      doctor_availability: {
        Row: DoctorAvailabilityRow;
        Insert: Insertable<DoctorAvailabilityRow, 'id' | 'created_at' | 'updated_at' | 'slot_minutes'>;
        Update: Updatable<DoctorAvailabilityRow>;
      };
      doctor_blocked_dates: {
        Row: DoctorBlockedDateRow;
        Insert: Insertable<DoctorBlockedDateRow, 'id' | 'created_at' | 'reason'>;
        Update: Updatable<DoctorBlockedDateRow>;
      };
      appointments: {
        Row: AppointmentRow;
        Insert: Insertable<AppointmentRow,
          'id' | 'created_at' | 'updated_at' | 'status' | 'duration_minutes' | 'mode'
          | 'reason' | 'doctor_notes' | 'fee'
          | 'cancelled_at' | 'cancelled_by' | 'cancel_reason'>;
        Update: Updatable<AppointmentRow>;
      };
      conversations: {
        Row: ConversationRow;
        Insert: Insertable<ConversationRow, 'id' | 'created_at' | 'updated_at' | 'last_message_at'>;
        Update: Updatable<ConversationRow>;
      };
      conversation_participants: {
        Row: ConversationParticipantRow;
        Insert: Insertable<ConversationParticipantRow, 'last_read_at'>;
        Update: Updatable<ConversationParticipantRow>;
      };
      messages: {
        Row: MessageRow;
        Insert: Insertable<MessageRow, 'id' | 'created_at' | 'attachment_url'>;
        Update: Updatable<MessageRow>;
      };
      notifications: {
        Row: NotificationRow;
        Insert: Insertable<NotificationRow, 'id' | 'created_at' | 'read_at' | 'body' | 'href' | 'metadata'>;
        Update: Updatable<NotificationRow>;
      };
      reports: {
        Row: ReportRow;
        Insert: Insertable<ReportRow, 'id' | 'created_at' | 'updated_at' | 'status' | 'priority'
          | 'resolved_by' | 'resolved_at' | 'resolution_note'>;
        Update: Updatable<ReportRow>;
      };
      drug_search_history: {
        Row: DrugSearchHistoryRow;
        Insert: Insertable<DrugSearchHistoryRow, 'id' | 'created_at' | 'drug_name'>;
        Update: Updatable<DrugSearchHistoryRow>;
      };
    };
    Views: Record<string, { Row: Record<string, unknown> }>;
    Functions: {
      current_role: { Args: Record<string, never>; Returns: UserRole };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_doctor: { Args: Record<string, never>; Returns: boolean };
      is_patient: { Args: Record<string, never>; Returns: boolean };
      has_appointment_with_doctor: { Args: { _doctor_id: string }; Returns: boolean };
      has_appointment_with_patient: { Args: { _patient_id: string }; Returns: boolean };
      is_conversation_participant: { Args: { _conversation_id: string }; Returns: boolean };
      get_or_create_conversation: { Args: { _target_user: string }; Returns: string };
      promote_to_admin: { Args: { _target_user: string }; Returns: void };
    };
    Enums: {
      user_role: UserRole;
      account_status: AccountStatus;
      appointment_status: AppointmentStatus;
      appointment_mode: AppointmentMode;
      notification_type: NotificationType;
      report_status: ReportStatus;
      report_priority: ReportPriority;
      report_target_type: ReportTargetType;
    };
    CompositeTypes: Record<string, unknown>;
  };
};
