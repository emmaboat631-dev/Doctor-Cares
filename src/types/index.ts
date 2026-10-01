/**
 * Re-exports the concrete DB row types + enums as the app's domain types.
 * Single source of truth is `src/types/database.ts` — this file just aliases.
 */

export type {
  UserRole,
  AccountStatus,
  AppointmentStatus,
  AppointmentMode,
  NotificationType,
  ReportStatus,
  ReportPriority,
  ReportTargetType,
} from './database';

import type {
  ProfileRow,
  PatientProfileRow,
  DoctorProfileRow,
  DoctorAvailabilityRow,
  DoctorBlockedDateRow,
  AppointmentRow,
  ConversationRow,
  ConversationParticipantRow,
  MessageRow,
  NotificationRow,
  ReportRow,
} from './database';

export type Profile               = ProfileRow;
export type PatientProfile        = PatientProfileRow;
export type DoctorProfile         = DoctorProfileRow;
export type DoctorAvailability    = DoctorAvailabilityRow;
export type DoctorBlockedDate     = DoctorBlockedDateRow;
export type Appointment           = AppointmentRow;
export type Conversation          = ConversationRow;
export type ConversationParticipant = ConversationParticipantRow;
export type Message               = MessageRow;
export type Notification          = NotificationRow;
export type Report                = ReportRow;

/** Doctor with the underlying profile joined (common query shape). */
export interface DoctorWithProfile extends DoctorProfileRow {
  profile: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url' | 'status'>;
}

/** Appointment enriched with the counterparty's profile. */
export interface AppointmentWithParties extends AppointmentRow {
  patient?: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'>;
  doctor?: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'> & Partial<Pick<DoctorProfileRow, 'specialty'>>;
}
