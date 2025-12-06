import { useNavigate } from 'react-router-dom'

/**
 * UnauthorizedView - Displayed when user is not authorized
 */
export default function UnauthorizedView() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-editor-bg flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="text-6xl mb-6">🔒</div>
        <h1 className="text-2xl font-bold text-editor-text mb-4">
          Access Denied
        </h1>
        <p className="text-editor-text-muted mb-8">
          You don't have permission to access this page. Please sign in with an authorized account or contact your administrator.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-editor-accent text-white rounded hover:bg-editor-accent-hover transition-colors"
        >
          Go to Home
        </button>
      </div>
    </div>
  )
}
