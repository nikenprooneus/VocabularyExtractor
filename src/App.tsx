import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ConceptProvider } from './contexts/ConceptContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import Layout from './components/Layout';
import GeneratorPage from './pages/GeneratorPage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboard from './pages/AdminDashboard';
import KnowledgeGraphPage from './pages/KnowledgeGraphPage';
import ReaderPage from './pages/ReaderPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <ConceptProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'hsl(30 10% 12%)',
                color: 'hsl(36 20% 88%)',
                border: '1px solid hsl(30 10% 20%)',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
              },
              success: {
                iconTheme: {
                  primary: 'hsl(43 74% 52%)',
                  secondary: 'hsl(30 10% 9%)',
                },
              },
              error: {
                iconTheme: {
                  primary: 'hsl(0 62% 50%)',
                  secondary: 'hsl(30 10% 9%)',
                },
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<GeneratorPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
                      <Route path="/reader" element={<ReaderPage />} />
                      <Route
                        path="/admin"
                        element={
                          <ProtectedRoute requireAdmin>
                            <AdminDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
          </ConceptProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
