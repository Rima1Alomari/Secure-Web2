import { useUser, UserRole } from '../contexts/UserContext'

/**
 * Role Switcher Component - For testing/demo purposes
 * Allows switching between user roles to test role-based access control
 * This should be removed or hidden in production
 */
export default function RoleSwitcher() {
  const { user, setUser, role } = useUser()

  const roles: UserRole[] = ['user', 'admin', 'security']

  const handleRoleChange = (newRole: UserRole) => {
    if (user) {
      setUser({
        ...user,
        role: newRole,
      })
    }
  }

  return (
    <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-blue-200/50 dark:border-blue-800/50 rounded-lg px-3 py-1.5 shadow-sm">
      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
        Role: <span className="text-blue-600 dark:text-blue-400 font-bold">{role}</span>
      </div>
      <div className="flex gap-1">
        {roles.map((r) => (
          <button
            key={r}
            onClick={() => handleRoleChange(r)}
            className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
              role === r
                ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}


