import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TemplateList, TemplateEditor } from './pages/Templates';
import { TemplateSetList, TemplateSetForm } from './pages/TemplateSets';
import { ProductTemplateSetList } from './pages/ProductTemplateSets';
import { CategoryManagement } from './pages/Categories';
import { ProductList } from './pages/Products';
import { ReviewList, ReviewDetail } from './pages/Reviews';
import { FontList } from './pages/Library';
import { BackgroundList } from './pages/Library/BackgroundList';
import { ClipartList } from './pages/Library/ClipartList';
import { WorkerJobList } from './pages/WorkerJobs';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={koKR}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            {/* 템플릿 에디터 - 전체화면, MainLayout 외부 */}
            <Route
              path="/templates/editor"
              element={
                <ProtectedRoute>
                  <TemplateEditor />
                </ProtectedRoute>
              }
            />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="templates" element={<TemplateList />} />
              <Route path="template-sets" element={<TemplateSetList />} />
              <Route path="template-sets/new" element={<TemplateSetForm />} />
              <Route path="template-sets/:id" element={<TemplateSetForm />} />
              <Route path="product-template-sets" element={<ProductTemplateSetList />} />
              <Route path="categories" element={<CategoryManagement />} />
              <Route path="products" element={<ProductList />} />
              <Route path="reviews" element={<ReviewList />} />
              <Route path="reviews/:id" element={<ReviewDetail />} />
              <Route path="library/fonts" element={<FontList />} />
              <Route path="library/backgrounds" element={<BackgroundList />} />
              <Route path="library/cliparts" element={<ClipartList />} />
              <Route path="worker-jobs" element={<WorkerJobList />} />
              <Route path="settings" element={<div>설정 (구현 예정)</div>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
