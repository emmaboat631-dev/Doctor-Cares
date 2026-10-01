import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppRoutes } from '@/routes';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ConfigMissingPage } from '@/pages/system/ConfigMissingPage';
import { UpdatePrompt } from '@/components/layout/UpdatePrompt';

export default function App() {
  if (!isSupabaseConfigured) {
    // Boot without a live Supabase connection so the app doesn't crash while
    // the developer copies .env.example. Real routes activate once configured.
    return (
      <ThemeProvider>
        <ConfigMissingPage />
        <UpdatePrompt />
      </ThemeProvider>
    );
  }
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
        {/* Global toasts — outside the route tree so they persist across nav. */}
        <UpdatePrompt />
      </AuthProvider>
    </ThemeProvider>
  );
}
