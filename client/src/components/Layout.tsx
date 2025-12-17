import { ReactNode, useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  FaVideo, 
  FaFile, 
  FaSignOutAlt, 
  FaShieldAlt, 
  FaLock,
  FaHome,
  FaComments,
  FaCalendarAlt,
  FaClock,
  FaTrash,
  FaCog,
  FaUsers,
  FaChevronLeft,
  FaChevronRight,
  FaMoon,
  FaSun,
  FaInfoCircle,
  FaUser,
  FaCircle,
  FaPlus,
  FaChevronDown
} from 'react-icons/fa'
import { removeToken, getToken } from '../utils/auth'
import { removeJSON } from '../data/storage'
import { ROOMS_KEY, CHAT_MESSAGES_KEY, EVENTS_KEY } from '../data/keys'
import FloatingAIAssistant from './FloatingAIAssistant'
import GlobalSearch from './GlobalSearch'
import NotificationsCenter from './NotificationsCenter'
import { useUser, UserRole } from '../contexts/UserContext'
import { getJSON } from '../data/storage'
import Modal from './common/Modal'
import { Toast } from './common'
import axios from 'axios'

interface LayoutProps {
  children: ReactNode
  onLogout?: () => void
}

export default function Layout({ children, onLogout }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, setUser, user } = useUser()
  
  // Extract first name from user's name
  const firstName = user?.name ? user.name.split(' ')[0] : ''
  
  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [userStatus, setUserStatus] = useState<'Available' | 'Busy' | 'Away' | 'DoNotDisturb'>('Available')
  const userMenuRef = useRef<HTMLDivElement>(null)
  const userMenuRefMobile = useRef<HTMLDivElement>(null)
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark')
  })
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  
  // Get uploaded logo from settings
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    const settings = getJSON<{ logoUrl?: string }>('admin-theme-settings', null)
    return settings?.logoUrl || null
  })
  
  // Listen for logo updates
  useEffect(() => {
    const handleStorageChange = () => {
      const settings = getJSON<{ logoUrl?: string }>('admin-theme-settings', null)
      setLogoUrl(settings?.logoUrl || null)
    }
    
    // Listen for custom event (when logo is updated in Administration)
    window.addEventListener('logo-updated', handleStorageChange)
    // Also listen for storage events (in case of cross-tab updates)
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('logo-updated', handleStorageChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const clickedInsideDesktop = userMenuRef.current?.contains(target)
      const clickedInsideMobile = userMenuRefMobile.current?.contains(target)
      
      // Close if clicked outside both menus (or if the relevant menu ref doesn't exist)
      if (!clickedInsideDesktop && !clickedInsideMobile) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  const handleLogout = () => {
    // Remove token and user data
    removeToken()
    setUser(null)
    
    // Clear rooms, chat messages, and events when logging out
    // This ensures data doesn't persist across different user accounts
    removeJSON(ROOMS_KEY)
    removeJSON(CHAT_MESSAGES_KEY)
    removeJSON(EVENTS_KEY)
    
    // Notify parent component if callback provided
    if (onLogout) {
      onLogout()
    }
    
    // Navigate to login
    navigate('/login')
  }

  const handlePasswordChange = async () => {
    setPasswordError('')
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password')
      return
    }

    try {
      setPasswordLoading(true)
      const token = getToken() || 'mock-token-for-testing'
      const API_URL = import.meta.env.VITE_API_URL || '/api'
      
      await axios.put(`${API_URL}/auth/change-password`, {
        currentPassword,
        newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setToast({ message: 'Password changed successfully', type: 'success' })
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError('')
    } catch (error: any) {
      setPasswordError(error.response?.data?.error || 'Failed to change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  // Define all navigation items with their required roles
  const allNavItems = [
    { path: '/dashboard', icon: FaHome, label: 'Dashboard', roles: ['user', 'admin'] as UserRole[] },
    { path: '/rooms', icon: FaUsers, label: 'Rooms', roles: ['user', 'admin'] as UserRole[] },
    { path: '/chat', icon: FaComments, label: 'Chat', roles: ['user', 'admin'] as UserRole[] },
    { path: '/calendar', icon: FaCalendarAlt, label: 'Calendar', roles: ['user', 'admin'] as UserRole[] },
    { path: '/files', icon: FaFile, label: 'Files', roles: ['user', 'admin'] as UserRole[] },
    { path: '/recent', icon: FaClock, label: 'Recent', roles: ['user', 'admin'] as UserRole[] },
    { path: '/trash', icon: FaTrash, label: 'Trash', roles: ['admin'] as UserRole[] },
    { path: '/administration', icon: FaCog, label: 'Admin', roles: ['admin'] as UserRole[] },
  ]

  // Filter navigation items based on user role
  const navItems = useMemo(() => {
    return allNavItems.filter(item => item.roles.includes(role))
  }, [role])

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 transition-colors flex">
      {/* Left Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-r border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/5 sticky top-0 h-screen transition-all duration-300 ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        {/* Logo & Collapse Toggle */}
        <div className="p-6 border-b border-blue-200/50 dark:border-blue-800/50">
          <div className="flex items-center gap-3 justify-between">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="w-12 h-12 rounded-xl object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-blue-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20">
                    <FaShieldAlt className="text-white text-xl" />
                  </div>
                )}
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent tracking-tight">
                  Secure Web
                </h1>
              </div>
            )}
            {isSidebarCollapsed && (
              <>
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="w-12 h-12 rounded-xl object-contain mx-auto"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-blue-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20 mx-auto">
                    <FaShieldAlt className="text-white text-xl" />
                  </div>
                )}
              </>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 hover:text-gray-900 dark:hover:text-white"
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <FaChevronRight className="text-sm" />
              ) : (
                <FaChevronLeft className="text-sm" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`group relative w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-3 ${
                  active
                    ? 'bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-500 dark:to-green-500 text-white shadow-md'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={isSidebarCollapsed ? item.label : ''}
              >
                {/* Left Indicator Bar for Active State */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white dark:bg-white rounded-r-full shadow-lg transition-all duration-300" />
                )}
                <Icon className={`text-base flex-shrink-0 transition-transform duration-300 ${isSidebarCollapsed ? 'mx-auto' : ''} ${!active ? 'group-hover:scale-110' : ''}`} />
                {!isSidebarCollapsed && (
                  <span className="transition-opacity duration-300 whitespace-nowrap">{item.label}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-blue-200/50 dark:border-blue-800/50 flex items-center justify-between gap-2">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 flex items-center justify-center text-gray-700 dark:text-gray-300 shadow-md hover:shadow-lg"
            title="Settings"
          >
            <FaCog className="text-sm" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newIsDark = !isDark
                setIsDark(newIsDark)
                if (newIsDark) {
                  document.documentElement.classList.add('dark')
                  localStorage.setItem('theme', 'dark')
                } else {
                  document.documentElement.classList.remove('dark')
                  localStorage.setItem('theme', 'light')
                }
              }}
              className="w-9 h-9 rounded-full bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 hover:from-blue-100 hover:to-green-100 dark:hover:from-blue-900/30 dark:hover:to-green-900/30 transition-all duration-300 flex items-center justify-center text-gray-700 dark:text-gray-300 shadow-md hover:shadow-lg"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <FaSun className="text-yellow-500 text-sm" />
              ) : (
                <FaMoon className="text-blue-600 dark:text-blue-400 text-sm" />
              )}
            </button>
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all duration-300 flex items-center justify-center shadow-md hover:shadow-lg"
              title="Logout"
            >
              <FaSignOutAlt className="text-sm" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar (Mobile & Desktop Header) */}
        <nav className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-b border-blue-200/50 dark:border-blue-800/50 sticky top-0 z-50 shadow-lg shadow-blue-500/5">
          <div className="px-2 sm:px-4 lg:px-8">
            {/* Mobile Layout */}
            <div className="lg:hidden space-y-2 py-2">
              <div className="flex justify-between items-center gap-2">
                {/* Mobile Logo */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt="Logo" 
                      className="w-9 h-9 rounded-xl object-contain"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-600 via-blue-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20">
                      <FaShieldAlt className="text-white text-base" />
                    </div>
                  )}
                  <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent tracking-tight">
                    Secure Web
                  </h1>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-3 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-blue-200/50 dark:border-blue-800/50 rounded-lg">
                    Role: <span className="text-blue-600 dark:text-blue-400 font-bold capitalize">{role}</span>
                  </div>
                  <NotificationsCenter />
                  {/* User Avatar Menu */}
                  {user && (
                    <div ref={userMenuRefMobile} className="relative">
                      <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center text-white font-semibold text-sm hover:ring-2 hover:ring-blue-500 transition-all"
                        title={user.name}
                      >
                        {getUserInitials(user.name)}
                      </button>
                      
                      {/* User Menu Dropdown */}
                      {showUserMenu && (
                        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 animate-fade-in">
                          {/* User Info Header */}
                          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center text-white font-semibold">
                                {getUserInitials(user.name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Status Section */}
                          <div className="p-2">
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              Status
                            </div>
                            {(['Available', 'Busy', 'Away', 'DoNotDisturb'] as const).map((status) => (
                              <button
                                key={status}
                                onClick={() => {
                                  setUserStatus(status)
                                  setShowUserMenu(false)
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                                  userStatus === status
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                <FaCircle 
                                  className={`text-xs ${
                                    status === 'Available' ? 'text-green-500' :
                                    status === 'Busy' ? 'text-red-500' :
                                    status === 'Away' ? 'text-yellow-500' :
                                    'text-purple-500'
                                  }`}
                                />
                                <span className="text-sm">{status === 'DoNotDisturb' ? 'Do Not Disturb' : status}</span>
                                {userStatus === status && (
                                  <FaCircle className="text-xs text-blue-600 dark:text-blue-400 ml-auto" />
                                )}
                              </button>
                            ))}
                          </div>
                          
                          {/* Profile Section */}
                          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                              Account Info
                            </div>
                            <div className="px-3 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</div>
                                <p className="text-sm text-gray-900 dark:text-white font-medium">{user.email}</p>
                              </div>
                              {user.userId && (
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID</div>
                                  <p className="text-sm text-gray-900 dark:text-white font-mono font-semibold">{user.userId}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Add Account */}
                          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() => {
                                setShowUserMenu(false)
                                // Could open add account modal
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <FaPlus className="text-sm" />
                              <span className="text-sm">Add account</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Global Search - Mobile */}
              <div className="w-full">
                <GlobalSearch />
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden lg:flex justify-between items-center gap-4 h-16">
              {/* Desktop Header (Empty space for logo) */}
              <div className="flex-shrink-0"></div>

              {/* Global Search - Center */}
              <div className="flex-1 max-w-2xl">
                <GlobalSearch />
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-base font-semibold text-gray-700 dark:text-gray-300 px-4 py-2.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-blue-200/50 dark:border-blue-800/50 rounded-lg">
                  Role: <span className="text-blue-600 dark:text-blue-400 font-bold capitalize">{role}</span>
                </div>
                <NotificationsCenter />
                {/* User Avatar Menu */}
                {user && (
                  <div ref={userMenuRef} className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center text-white font-semibold text-sm hover:ring-2 hover:ring-blue-500 transition-all"
                      title={user.name}
                    >
                      {getUserInitials(user.name)}
                    </button>
                    
                    {/* User Menu Dropdown */}
                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 animate-fade-in">
                        {/* User Info Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center text-white font-semibold">
                              {getUserInitials(user.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Status Section */}
                        <div className="p-2">
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Status
                          </div>
                          {(['Available', 'Busy', 'Away', 'DoNotDisturb'] as const).map((status) => (
                            <button
                              key={status}
                              onClick={() => {
                                setUserStatus(status)
                                setShowUserMenu(false)
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                                userStatus === status
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              <FaCircle 
                                className={`text-xs ${
                                  status === 'Available' ? 'text-green-500' :
                                  status === 'Busy' ? 'text-red-500' :
                                  status === 'Away' ? 'text-yellow-500' :
                                  'text-purple-500'
                                }`}
                              />
                              <span className="text-sm">{status === 'DoNotDisturb' ? 'Do Not Disturb' : status}</span>
                              {userStatus === status && (
                                <FaCircle className="text-xs text-blue-600 dark:text-blue-400 ml-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                        
                        {/* Profile Section */}
                        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                            Account Info
                          </div>
                          <div className="px-3 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</div>
                              <p className="text-sm text-gray-900 dark:text-white font-medium">{user.email}</p>
                            </div>
                            {user.userId && (
                              <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID</div>
                                <p className="text-sm text-gray-900 dark:text-white font-mono font-semibold">{user.userId}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Add Account */}
                        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => {
                              setShowUserMenu(false)
                              // Could open add account modal
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <FaPlus className="text-sm" />
                            <span className="text-sm">Add account</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="lg:hidden pb-3 pt-2 flex overflow-x-auto gap-1 scrollbar-hide">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                      active
                        ? 'bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-500 dark:to-green-500 text-white shadow-md'
                        : 'bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Icon className="text-sm" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 pb-8">
          {children}
        </main>

        {/* Floating AI Assistant */}
        <FloatingAIAssistant />
      </div>

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setPasswordError('')
        }}
        title="Change Password"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter new password (min. 6 characters)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm new password"
            />
          </div>
          {passwordError && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              {passwordError}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowPasswordModal(false)
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
                setPasswordError('')
              }}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handlePasswordChange}
              disabled={passwordLoading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-lg transition-all duration-300 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

