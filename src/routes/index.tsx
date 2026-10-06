import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { PatientLayout } from '@/components/layout/PatientLayout';
import { DoctorLayout } from '@/components/layout/DoctorLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

import { PublicRoute } from './PublicRoute';
import { ProtectedRoute } from './ProtectedRoute';

import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { VideoCallPage } from '@/pages/VideoCallPage';
import { CallPage } from '@/pages/CallPage';
import { TermsPage } from '@/pages/legal/TermsPage';
import { PrivacyPage } from '@/pages/legal/PrivacyPage';

import {
  SplashPage, OnboardingPage, LoginPage, RegisterPage, ForgotPasswordPage,
  ResetPasswordPage, SelectRolePage,
} from '@/pages/auth';

import {
  PatientDashboardPage, FindDoctorsPage, DoctorProfilePage as PatientDoctorProfilePage,
  BookAppointmentPage, BookingConfirmationPage, MyAppointmentsPage, AppointmentDetailsPage,
  RateVisitPage, HealthMetricsPage, HealthTipsPage, HealthTipDetailPage, MedicalHistoryPage, PatientReferralsPage, PrescriptionsPage,
  ChatListPage, ChatDetailPage, DrugSearchPage, DrugDetailPage, NotificationsPage,
  PatientProfilePage, EditProfilePage, SettingsPage,
} from '@/pages/patient';

import {
  DoctorDashboardPage, DoctorAppointmentsPage, DoctorAppointmentDetailsPage,
  DoctorPatientsPage, DoctorPatientDetailsPage, DoctorChatListPage, DoctorChatDetailPage,
  DoctorAvailabilityPage, DoctorProfilePage as DoctorSelfProfilePage,
  DoctorEditProfilePage, DoctorNotificationsPage, DoctorSettingsPage, DoctorReferralsPage,
} from '@/pages/doctor';

import {
  AdminDashboardPage, AdminDoctorsPage, AdminPatientsPage, AdminAppointmentsPage,
  AdminUserDetailsPage, AdminReportsPage, AdminSettingsPage, AdminHealthTipsPage, AdminNhisClaimsPage,
} from '@/pages/admin';


/**
 * Renders one of three role-scoped route trees. Each tree owns the app's
 * shared URLs (e.g. /appointments) with its own layout and page components.
 */
function RoleRouter() {
  const { loading, role } = useAuth();
  if (loading) return <LoadingSpinner fullScreen label="Loading…" />;

  if (role === 'patient') {
    return (
      <Routes>
        <Route element={<PatientLayout />}>
          <Route index element={<PatientDashboardPage />} />
          <Route path="doctors" element={<FindDoctorsPage />} />
          <Route path="doctors/:id" element={<PatientDoctorProfilePage />} />
          <Route path="doctors/:id/book" element={<BookAppointmentPage />} />
          <Route path="appointments" element={<MyAppointmentsPage />} />
          <Route path="appointments/:id" element={<AppointmentDetailsPage />} />
          <Route path="appointments/:id/confirmed" element={<BookingConfirmationPage />} />
          <Route path="appointments/:id/review" element={<RateVisitPage />} />
          <Route path="appointments/:id/call" element={<VideoCallPage />} />
          <Route path="call/:conversationId" element={<CallPage />} />
          <Route path="metrics" element={<HealthMetricsPage />} />
          <Route path="tips" element={<HealthTipsPage />} />
          <Route path="tips/:id" element={<HealthTipDetailPage />} />
          <Route path="chat" element={<ChatListPage />} />
          <Route path="chat/:conversationId" element={<ChatDetailPage />} />
          <Route path="drugs" element={<DrugSearchPage />} />
          <Route path="drugs/:id" element={<DrugDetailPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<PatientProfilePage />} />
          <Route path="profile/edit" element={<EditProfilePage />} />
          <Route path="profile/medical-history" element={<MedicalHistoryPage />} />
          <Route path="referrals" element={<PatientReferralsPage />} />
          <Route path="prescriptions" element={<PrescriptionsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }

  // Doctors and nurses share the same route tree (both are independent
  // clinicians in Doctor Cares' Independent Clinician model). The pages
  // themselves branch on role where the copy/behavior differs.
  if (role === 'doctor' || role === 'nurse') {
    return (
      <Routes>
        <Route element={<DoctorLayout />}>
          <Route index element={<DoctorDashboardPage />} />
          <Route path="appointments" element={<DoctorAppointmentsPage />} />
          <Route path="appointments/:id" element={<DoctorAppointmentDetailsPage />} />
          <Route path="appointments/:id/call" element={<VideoCallPage />} />
          <Route path="call/:conversationId" element={<CallPage />} />
          <Route path="patients" element={<DoctorPatientsPage />} />
          <Route path="patients/:id" element={<DoctorPatientDetailsPage />} />
          <Route path="chat" element={<DoctorChatListPage />} />
          <Route path="chat/:conversationId" element={<DoctorChatDetailPage />} />
          <Route path="availability" element={<DoctorAvailabilityPage />} />
          <Route path="referrals" element={<DoctorReferralsPage />} />
          <Route path="profile" element={<DoctorSelfProfilePage />} />
          <Route path="profile/edit" element={<DoctorEditProfilePage />} />
          <Route path="notifications" element={<DoctorNotificationsPage />} />
          <Route path="settings" element={<DoctorSettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }

  if (role === 'admin') {
    return (
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="doctors" element={<AdminDoctorsPage />} />
          <Route path="patients" element={<AdminPatientsPage />} />
          <Route path="appointments" element={<AdminAppointmentsPage />} />
          <Route path="users/:id" element={<AdminUserDetailsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="tips" element={<AdminHealthTipsPage />} />
          <Route path="claims" element={<AdminNhisClaimsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }

  // Authenticated but no role yet — nudge to role selection.
  return <Navigate to="/select-role" replace />;
}

/**
 * Top-level routes. Public auth pages sit outside the app; everything else
 * flows through <RoleRouter/> once the user is signed in.
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Marketing / onboarding — accessible whether signed in or not. */}
      <Route path="/welcome" element={<SplashPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />

      {/* Legal — publicly accessible, no auth required. */}
      <Route path="/terms"   element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      {/* Auth pages — redirect signed-in users to app. */}
      <Route element={<PublicRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
      </Route>

      {/* Password recovery — reachable whether signed in or not so the
          recovery-session set up by the email link can be used to reset. */}
      <Route element={<AuthLayout />}>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Role selection — signed-in users without a role. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/select-role" element={<SelectRolePage />} />
        </Route>
      </Route>

      {/* Everything else: authenticated, role-scoped. */}
      <Route
        path="/*"
        element={
          <ProtectedRoute allow={['patient', 'doctor', 'nurse', 'admin']}>
            <RoleRouter />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
