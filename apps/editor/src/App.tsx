import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'

// Lazy load views
const EditorView = lazy(() => import('./views/EditorView'))
const BrowseContentsView = lazy(() => import('./views/BrowseContentsView'))
const UnauthorizedView = lazy(() => import('./views/UnauthorizedView'))

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-editor-bg">
      <div className="text-editor-text">Loading...</div>
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<EditorView />} />
        <Route path="/browse" element={<BrowseContentsView />} />
        <Route path="/unauthorized" element={<UnauthorizedView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
