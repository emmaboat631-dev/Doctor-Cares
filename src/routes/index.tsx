import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { PatientLayout } from '@/components/layout/PatientLayout';
import { DoctorLayout } from '@/components/layout/DoctorLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

import { PublicRoute } from './PublicRoute';
import { ProtectedRoute } from './ProtectedRoute';

import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

import {
  SplashPage, OnboardingPage, LoginPage, RegisterPage, ForgotPasswordPage,
  ResetPasswordPage, SelectRolePage,
} from '@/pages/auth';

// --- Daily-use pages: eager-loaded for fast first paint ---------------------
import {
  PatientDashboardPage, FindDoctorsPage, DoctorProfilePage as PatientDoctorProfilePage,
  BookAppointmentPage, BookingConfirmationPage, MyAppointmentsPage, AppointmentDetailsPage,
  ChatListPage, ChatDetailPage, NotificationsPage,
  PatientProfilePage, SettingsPage,
} from '@/pages/patient';

import {
  DoctorDashboardPage, DoctorAppointmentsPage, DoctorAppointmentDetailsPage,
  DoctorPatientsPage, DoctorPatientDetailsPage, DoctorChatListPage, DoctorChatDetailPage,
  DoctorProfilePage as DoctorSelfProfilePage,
  DoctorNotificationsPage, DoctorSettingsPage,
} from '@/pages/doctor';

// --- Rarely-visited routes: lazy-loaded so first paint stays small ----------
// Each becomes its own Vite chunk; only downloaded when the user visits them.
const CallPage               = lazy(() => import('@/pages/CallPage').then((m) => ({ default: m.CallPage })));
const VideoCallPage          = lazy(() => import('@/pages/VideoCallPage').then((m) => ({ default: m.VideoCallPage })));
const TermsPage              = lazy(() => import('@/pages/legal/TermsPage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage            = lazy(() => import('@/pages/legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));

const RateVisitPage          = lazy(() => import('@/pages/patient/RateVisitPage').then((m) => ({ default: m.RateVisitPage })));
const HealthMetricsPage      = lazy(() => import('@/pages/patient/HealthMetricsPage').then((m) => ({ default: m.HealthMetricsPage })));
const HealthTipsPage         = lazy(() => import('@/pages/patient/HealthTipsPage').then((m) => ({ default: m.HealthTipsPage })));
const HealthTipDetailPage    = lazy(() => import('@/pages/patient/HealthTipDetailPage').then((m) => ({ default: m.HealthTipDetailPage })));
const MedicalHistoryPage     = lazy(() => import('@/pages/patient/MedicalHistoryPage').then((m) => ({ default: m.MedicalHistoryPage })));
const PatientReferralsPage   = lazy(() => import('@/pages/patient/ReferralsPage').then((m) => ({ default: m.PatientReferralsPage })));
const PrescriptionsPage      = lazy(() => import('@/pages/patient/PrescriptionsPage').then((m) => ({ default: m.PrescriptionsPage })));
const EditProfilePage        = lazy(() => import('@/pages/patient/EditProfilePage').then((m) => ({ default: m.EditProfilePage })));
const DrugSearchPage         = lazy(() => import('@/pages/patient/DrugSearchPage').then((m) => ({ default: m.DrugSearchPage })));
const DrugDetailPage         = lazy(() => import('@/pages/patient/DrugDetailPage').then((m) => ({ default: m.DrugDetailPage })));

const DoctorAvailabilityPage = lazy(() => import('@/pages/doctor/AvailabilityPage').then((m) => ({ default: m.DoctorAvailabilityPage })));
const DoctorEditProfilePage  = lazy(() => import('@/pages/doctor/EditProfilePage').then((m) => ({ default: m.DoctorEditProfilePage })));
const DoctorReferralsPage    = lazy(() => import('@/pages/doctor/ReferralsPage').then((m) => ({ default: m.DoctorReferralsPage })));

// Entire admin tree is lazy — most users (patients, doctors, nurses) will
// never hit it, so there's no reason to ship ~40 KB of admin JS to them.
const AdminDashboardPage     = lazy(() => import('@/pages/admin/DashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminDoctorsPage       = lazy(() => import('@/pages/admin/DoctorsPage').then((m) => ({ default: m.AdminDoctorsPage })));
const AdminPatientsPage      = lazy(() => import('@/pages/admin/PatientsPage').then((m) => ({ default: m.AdminPatientsPage })));
const AdminAppointmentsPage  = lazy(() => import('@/pages/admin/AppointmentsPage').then((m) => ({ default: m.AdminAppointmentsPage })));
const AdminUserDetailsPage   = lazy(() => import('@/pages/admin/UserDetailsPage').then((m) => ({ default: m.AdminUserDetailsPage })));
const AdminReportsPage       = lazy(() => import('@/pages/admin/ReportsPage').then((m) => ({ default: m.AdminReportsPage })));
const AdminSettingsPage      = lazy(() => import('@/pages/admin/SettingsPage').then((m) => ({ default: m.AdminSettingsPage })));
const AdminHealthTipsPage    = lazy(() => import('@/pages/admin/HealthTipsPage').then((m) => ({ default: m.AdminHealthTipsPage })));
const AdminNhisClaimsPage    = lazy(() => import('@/pages/admin/NhisClaimsPage').then((m) => ({ default: m.AdminNhisClaimsPage })));

/** Suspense fallback shared across every lazy route. */
const Loading = () => <LoadingSpinner fullScreen label="Loading…" />;

function RoleRouter() {
  const { loading, role } = useAuth();
  if (loading) return <LoadingSpinner fullScreen label="Loading…" />;

  if (role === 'patient') {
    return (
      <Suspense fallback={<Loading />}>
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
      </Suspense>
    );
  }

  if (role === 'doctor' || role === 'nurse') {
    return (
      <Suspense fallback={<Loading />}>
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
      </Suspense>
    );
  }

  if (role === 'admin') {
    return (
      <Suspense fallback={<Loading />}>
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
      </Suspense>
    );
  }

  return <Navigate to="/select-role" replace />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/welcome" element={<SplashPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/terms"   element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        <Route element={<PublicRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/select-role" element={<SelectRolePage />} />
          </Route>
        </Route>

        <Route
          path="/*"
          element={
            <ProtectedRoute allow={['patient', 'doctor', 'nurse', 'admin']}>
              <RoleRouter />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}
