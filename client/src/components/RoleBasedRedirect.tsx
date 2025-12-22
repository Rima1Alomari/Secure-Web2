import { Navigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'

/**
 * Component that redirects users to role-specific pages
 */
export default function RoleBasedRedirect() {
  const { role } = useUser()

  // Determine redirect path based on role - each role goes to their own page
  let redirectPath = '/rooms' // Default for user

  switch (role) {
    case 'admin':
      redirectPath = '/administration'
      break
    case 'security':
      redirectPath = '/security'
      break
    case 'user':
    default:
      redirectPath = '/rooms'
      break
  }

  return <Navigate to={redirectPath} replace />
}

