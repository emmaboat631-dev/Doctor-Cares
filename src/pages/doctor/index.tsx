// Note: no placeholders left on the doctor side in Phase 6.

// Real pages (Phase 5) --------------------------------------------------------
export { DoctorDashboardPage }          from './DashboardPage';
export { DoctorAppointmentsPage }        from './AppointmentsPage';
export { DoctorAppointmentDetailsPage }  from './AppointmentDetailsPage';
export { DoctorPatientsPage }            from './PatientsPage';
export { DoctorPatientDetailsPage }      from './PatientDetailsPage';
export { DoctorAvailabilityPage }        from './AvailabilityPage';
export { DoctorProfilePage }             from './ProfilePage';
export { DoctorEditProfilePage }         from './EditProfilePage';
export { DoctorReferralsPage }           from './ReferralsPage';

// Reused from the patient side — same UI, role-agnostic (uses useAuth). ------
export { NotificationsPage as DoctorNotificationsPage } from '../patient/NotificationsPage';
export { SettingsPage      as DoctorSettingsPage }      from '../patient/SettingsPage';

// Chat (Phase 6) — role-agnostic, lives under src/pages/chat/. --------------
export { ChatListPage   as DoctorChatListPage }   from '../chat/ChatListPage';
export { ChatDetailPage as DoctorChatDetailPage } from '../chat/ChatDetailPage';
