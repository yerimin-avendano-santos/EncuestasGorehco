import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/Layout';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SurveyFormPage } from './pages/SurveyFormPage';
import { SurveyDetailPage } from './pages/SurveyDetailPage';
import { MyRecordsPage, AllRecordsPage } from './pages/RecordsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AccountPage } from './pages/AccountPage';
import { NotFoundPage } from './pages/NotFoundPage';

function NewSurveyPage() {
  const location = useLocation();
  // Al pulsar “Nueva encuesta” estando en la misma ruta, React Router crea
  // una nueva entrada. La key reinicia el formulario para no mostrar el
  // panel de la encuesta recién enviada.
  return <SurveyFormPage key={location.key} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="encuestas/nueva" element={<NewSurveyPage />} />
                <Route path="encuestas/:id" element={<SurveyDetailPage />} />
                <Route path="encuestas/:id/editar" element={<SurveyFormPage />} />
                <Route path="mis-registros" element={<MyRecordsPage />} />
                <Route path="cuenta" element={<AccountPage />} />

                <Route element={<ProtectedRoute adminOnly />}>
                  <Route path="registros" element={<AllRecordsPage />} />
                  <Route path="admin/usuarios" element={<AdminUsersPage />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
