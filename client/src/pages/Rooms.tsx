import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FaPlus, FaUsers, FaLock, FaUnlock, FaClock, FaEllipsisV, FaInfo, FaEdit, FaTrash, FaSearch, FaTimes, FaUserPlus } from 'react-icons/fa'
import { Modal, ConfirmDialog, Toast } from '../components/common'
import { getJSON, setJSON, nowISO } from '../data/storage'
import { ROOMS_KEY, CHAT_MESSAGES_KEY, ADMIN_USERS_KEY } from '../data/keys'
import { Room, ChatMessage, AdminUserMock } from '../types/models'
import { useUser } from '../contexts/UserContext'
import { auditHelpers } from '../utils/audit'
import { getToken } from '../utils/auth'

const API_URL = (import.meta as any).env.VITE_API_URL || '/api'

const Rooms = () => {
  const navigate = useNavigate()
  const { role, user } = useUser()
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRoom, setNewRoom] = useState({ name: '', description: '' })
  const [roomClassification, setRoomClassification] = useState<'Normal' | 'Confidential' | 'Restricted'>('Normal')
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedRoomMenu, setSelectedRoomMenu] = useState<string | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [addMemberSearchQuery, setAddMemberSearchQuery] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  // Close menu when clicking outside or pressing ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setSelectedRoomMenu(null)
      }
    }
    
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedRoomMenu(null)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  // Get all users
  const allUsers = useMemo(() => {
    return getJSON<AdminUserMock[]>(ADMIN_USERS_KEY, []) || []
  }, [])

  // State for rooms from API
  const [roomsFromAPI, setRoomsFromAPI] = useState<Room[]>([])
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)

  // Fetch rooms from API
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setIsLoadingRooms(true)
        const token = getToken() || 'mock-token-for-testing'
        const response = await axios.get(`${API_URL}/rooms`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (response.data && Array.isArray(response.data)) {
          const apiRooms = response.data.map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description || '',
            isPrivate: r.isPrivate || false,
            members: r.members || 1,
            maxMembers: r.maxMembers || 50,
            createdAt: r.createdAt || nowISO(),
            updatedAt: r.updatedAt || nowISO(),
            ownerId: r.ownerId,
            memberIds: r.memberIds || [],
            roomLevel: r.roomLevel || 'Normal',
            classification: r.classification || r.roomLevel || 'Normal'
          }))
          setRoomsFromAPI(apiRooms)
          // Also save to localStorage as backup
          setJSON(ROOMS_KEY, apiRooms)
        }
      } catch (error) {
        console.error('Error fetching rooms from API:', error)
        // Fallback to localStorage
        const savedRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
        setRoomsFromAPI(savedRooms)
      } finally {
        setIsLoadingRooms(false)
      }
    }
    
    fetchRooms()
  }, [refreshKey])

  // Get rooms with last message and unread count (filtered by user)
  const rooms = useMemo(() => {
    const allMessages = getJSON<ChatMessage[]>(CHAT_MESSAGES_KEY, []) || []
    
    return roomsFromAPI.map(room => {
      const roomMessages = allMessages
        .filter(msg => msg.roomId === room.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      const lastMessage = roomMessages[0]
      const unreadCount = roomMessages.filter(msg => !msg.isOwn && msg.read !== true).length
      
      const lastMessageTime = lastMessage?.timestamp 
        ? (typeof lastMessage.timestamp === 'string' ? lastMessage.timestamp : new Date(lastMessage.timestamp).toISOString())
        : (typeof room.updatedAt === 'string' ? room.updatedAt : new Date(room.updatedAt).toISOString())
      
      return {
        ...room,
        lastMessage: lastMessage?.message || 'No messages yet',
        lastMessageTime,
        unreadCount: unreadCount || 0,
      }
    }).sort((a, b) => {
      const timeA = typeof a.lastMessageTime === 'string' ? new Date(a.lastMessageTime).getTime() : new Date(a.updatedAt).getTime()
      const timeB = typeof b.lastMessageTime === 'string' ? new Date(b.lastMessageTime).getTime() : new Date(b.updatedAt).getTime()
      return timeB - timeA
    })
  }, [roomsFromAPI, refreshKey])

  const handleCreateRoom = async () => {
    if (!newRoom.name.trim()) {
      return
    }

    try {
      const token = getToken() || 'mock-token-for-testing'
      const response = await axios.post(`${API_URL}/rooms`, {
        name: newRoom.name,
        description: newRoom.description,
        roomLevel: roomClassification,
        classification: roomClassification,
        isPrivate: false
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const createdRoom = response.data
      
      // Log audit event
      auditHelpers.logRoomCreate(createdRoom.name, createdRoom.id)
      
      setNewRoom({ name: '', description: '' })
      setRoomClassification('Normal')
      setShowCreateModal(false)
      setRefreshKey(prev => prev + 1)
      setToast({ message: `Room "${createdRoom.name}" created successfully`, type: 'success' })
    } catch (error: any) {
      console.error('Error creating room:', error)
      setToast({ 
        message: error.response?.data?.error || 'Failed to create room. Please try again.', 
        type: 'error' 
      })
    }
  }

  const handleRoomClick = (roomId: string, event?: React.MouseEvent) => {
    // Don't navigate if clicking on the menu button
    if (event && (event.target as HTMLElement).closest('.room-menu-button')) {
      return
    }
    navigate(`/rooms/${roomId}`)
  }

  const handleMenuClick = (room: Room, event: React.MouseEvent) => {
    event.stopPropagation()
    setSelectedRoomMenu(selectedRoomMenu === room.id ? null : room.id)
    setSelectedRoom(room)
  }

  const handleInfoClick = () => {
    setShowInfoModal(true)
    setSelectedRoomMenu(null)
  }

  const handleRenameClick = () => {
    if (selectedRoom) {
      setRenameValue(selectedRoom.name)
      setShowRenameModal(true)
      setSelectedRoomMenu(null)
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
    setSelectedRoomMenu(null)
  }

  const handleRename = async () => {
    if (!selectedRoom) return
    
    const trimmedName = renameValue.trim()
    
    // Validation
    if (!trimmedName) {
      setToast({ message: 'Room name is required', type: 'error' })
      return
    }
    
    if (trimmedName.length < 2) {
      setToast({ message: 'Room name must be at least 2 characters', type: 'error' })
      return
    }
    
    if (trimmedName.length > 40) {
      setToast({ message: 'Room name must be 40 characters or less', type: 'error' })
      return
    }

    try {
      const token = getToken() || 'mock-token-for-testing'
      await axios.put(`${API_URL}/rooms/${selectedRoom.id}`, {
        name: trimmedName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setShowRenameModal(false)
      setSelectedRoom(null)
      setRenameValue('')
      setRefreshKey(prev => prev + 1)
      setToast({ message: 'Room renamed', type: 'success' })
    } catch (error: any) {
      console.error('Error renaming room:', error)
      setToast({ 
        message: error.response?.data?.error || 'Failed to rename room. Please try again.', 
        type: 'error' 
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedRoom) return

    try {
      const token = getToken() || 'mock-token-for-testing'
      await axios.delete(`${API_URL}/rooms/${selectedRoom.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setShowDeleteConfirm(false)
      setSelectedRoom(null)
      setRefreshKey(prev => prev + 1)
      setToast({ message: 'Room deleted successfully', type: 'success' })
    } catch (error: any) {
      console.error('Error deleting room:', error)
      setToast({ 
        message: error.response?.data?.error || 'Failed to delete room. Please try again.', 
        type: 'error' 
      })
    }
  }

  const handleAddMember = async (userId: string, userName: string) => {
    if (!selectedRoom) return

    try {
      const token = getToken() || 'mock-token-for-testing'
      await axios.post(`${API_URL}/rooms/${selectedRoom.id}/members`, {
        userId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setShowAddMemberModal(false)
      setAddMemberSearchQuery('')
      setRefreshKey(prev => prev + 1)
      setToast({ message: `${userName} added to room`, type: 'success' })
    } catch (error: any) {
      console.error('Error adding member:', error)
      const errorMsg = error.response?.data?.error || 'Failed to add member'
      setToast({ message: errorMsg, type: errorMsg.includes('already') ? 'warning' : 'error' })
    }
  }

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!selectedRoom || role !== 'admin') return

    try {
      const token = getToken() || 'mock-token-for-testing'
      await axios.delete(`${API_URL}/rooms/${selectedRoom.id}/members/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setRefreshKey(prev => prev + 1)
      setToast({ message: `${userName} removed from room`, type: 'success' })
    } catch (error: any) {
      console.error('Error removing member:', error)
      setToast({ 
        message: error.response?.data?.error || 'Failed to remove member. Please try again.', 
        type: 'error' 
      })
    }
  }

  // Get room members
  const roomMembers = useMemo(() => {
    if (!selectedRoom) return []
    const memberIds = selectedRoom.memberIds || []
    return allUsers.filter(u => memberIds.includes(u.id))
  }, [selectedRoom, allUsers])

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return roomMembers
    const query = memberSearchQuery.toLowerCase()
    return roomMembers.filter(m => 
      m.name.toLowerCase().includes(query) || m.email.toLowerCase().includes(query)
    )
  }, [roomMembers, memberSearchQuery])

  // Filter users for adding members
  const filteredUsersForAdd = useMemo(() => {
    if (!addMemberSearchQuery.trim()) return []
    const query = addMemberSearchQuery.toLowerCase()
    const memberIds = selectedRoom?.memberIds || []
    return allUsers
      .filter(u => !memberIds.includes(u.id) && (u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)))
      .slice(0, 10)
  }, [allUsers, addMemberSearchQuery, selectedRoom])

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getClassificationColor = (level?: 'Normal' | 'Confidential' | 'Restricted') => {
    switch (level) {
      case 'Normal':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
      case 'Confidential':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
      case 'Restricted':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
    }
  }

  if (isLoading) {
    return (
      <div className="page-content">
        <div className="page-container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card h-40 bg-gray-200 dark:bg-gray-600"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-container">
        <div className="flex justify-between items-center page-header">
          <h1 className="page-title">Rooms</h1>
          {role === 'admin' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              <FaPlus className="text-sm" /> Create Room
            </button>
          )}
        </div>

        {rooms.length === 0 ? (
          <div className="card p-12 md:p-16">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30 rounded-full mb-6">
                <FaUsers className="text-blue-600 dark:text-blue-400 text-4xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                No rooms yet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                {role === 'admin' 
                  ? 'Create your first room to start collaborating with your team.'
                  : 'No rooms available. Contact an admin to create a room.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`relative text-left card-hover p-6 transition-all duration-200 ${
                  room.unreadCount && room.unreadCount > 0
                    ? 'border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20'
                    : ''
                }`}
              >
                <button
                  onClick={(e) => handleRoomClick(room.id, e)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                        {room.name}
                      </h3>
                      {(room.classification || room.roomLevel) && (
                        <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full border ${getClassificationColor(room.classification || room.roomLevel)}`}>
                          {room.classification || room.roomLevel}
                        </span>
                      )}
                      {room.unreadCount && room.unreadCount > 0 && (
                        <span className="flex-shrink-0 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <FaUsers />
                      <span>{room.members}/{room.maxMembers} members</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaClock />
                      <span>{formatTimeAgo(room.lastMessageTime || room.updatedAt)}</span>
                    </div>
                  </div>
                </button>
                
                {/* 3-dots Menu */}
                <div className="absolute top-4 right-4" ref={menuRef}>
                  <button
                    onClick={(e) => handleMenuClick(room, e)}
                    className="room-menu-button p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Room options"
                  >
                    <FaEllipsisV className="text-gray-600 dark:text-gray-400" />
                  </button>
                  
                  {selectedRoomMenu === room.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
                      <button
                        onClick={handleInfoClick}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-xl"
                      >
                        <FaInfo className="text-blue-600 dark:text-blue-400" />
                        <span className="text-gray-900 dark:text-white">Info</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowAddMemberModal(true)
                          setSelectedRoomMenu(null)
                        }}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <FaUserPlus className="text-green-600 dark:text-green-400" />
                        <span className="text-gray-900 dark:text-white">Add Member</span>
                      </button>
                      {role === 'admin' && (
                        <>
                          <button
                            onClick={handleRenameClick}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <FaEdit className="text-green-600 dark:text-green-400" />
                            <span className="text-gray-900 dark:text-white">Rename</span>
                          </button>
                          <button
                            onClick={handleDeleteClick}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-b-xl text-red-600 dark:text-red-400"
                          >
                            <FaTrash className="text-red-600 dark:text-red-400" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Modal */}
        <Modal
          isOpen={showInfoModal}
          onClose={() => {
            setShowInfoModal(false)
            setSelectedRoom(null)
            setMemberSearchQuery('')
          }}
          title="Room Info"
        >
          {selectedRoom && (
            <div className="space-y-6">
              {/* Room Details */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Room Name
                  </label>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                    {selectedRoom.name}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Members
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                    {selectedRoom.members}/{selectedRoom.maxMembers}
                  </p>
                </div>
                
                {selectedRoom.createdAt && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Created
                    </label>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      {new Date(selectedRoom.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Admin Action Buttons */}
              {role === 'admin' && (
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowInfoModal(false)
                      setRenameValue(selectedRoom.name)
                      setShowRenameModal(true)
                    }}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                  >
                    <FaEdit /> Rename
                  </button>
                  <button
                    onClick={() => {
                      setShowInfoModal(false)
                      setShowDeleteConfirm(true)
                    }}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              )}

              {/* Search Members */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="relative mb-4">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Search members…"
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  />
                </div>
                
                {/* Add Member Button */}
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="w-full btn-primary flex items-center justify-center gap-2 mb-4"
                >
                  <FaUserPlus /> Add Member
                </button>

                {/* Members List */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Members ({filteredMembers.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredMembers.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-500 text-center py-4">
                        No members found
                      </p>
                    ) : (
                      <>
                        {filteredMembers.slice(0, 5).map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <FaUsers className="text-white text-sm" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white truncate">
                                  {member.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {member.email}
                                </p>
                              </div>
                            </div>
                            {role === 'admin' && (
                              <button
                                onClick={() => handleRemoveMember(member.id, member.name)}
                                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Remove member"
                              >
                                <FaTimes />
                              </button>
                            )}
                          </div>
                        ))}
                        {filteredMembers.length > 5 && (
                          <div className="text-center pt-2">
                            <button
                              onClick={() => {
                                // Could navigate to a full members list page or expand the modal
                                setToast({ message: `${filteredMembers.length - 5} more members`, type: 'info' })
                              }}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              View all {filteredMembers.length} members
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Add Member Modal */}
        <Modal
          isOpen={showAddMemberModal}
          onClose={() => {
            setShowAddMemberModal(false)
            setAddMemberSearchQuery('')
          }}
          title={selectedRoom ? `Add Member to ${selectedRoom.name}` : "Add Member"}
        >
          <div className="space-y-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                value={addMemberSearchQuery}
                onChange={(e) => setAddMemberSearchQuery(e.target.value)}
                placeholder="Search users…"
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredUsersForAdd.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-500 text-center py-4">
                  {addMemberSearchQuery.trim() ? 'No users found' : 'Start typing to search users'}
                </p>
              ) : (
                filteredUsersForAdd.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleAddMember(user.id, user.name)}
                    className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-green-600 dark:bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <FaUsers className="text-white text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <FaPlus className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </Modal>

        {/* Rename Modal */}
        <Modal
          isOpen={showRenameModal}
          onClose={() => {
            setShowRenameModal(false)
            setRenameValue('')
            setSelectedRoom(null)
          }}
          title="Rename Room"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Room Name *
              </label>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter room name"
                maxLength={40}
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {renameValue.length}/40 characters (minimum 2)
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowRenameModal(false)
                  setRenameValue('')
                  setSelectedRoom(null)
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                className="btn-primary flex-1"
              >
                Rename
              </button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirm Modal */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onCancel={() => {
            setShowDeleteConfirm(false)
            setSelectedRoom(null)
          }}
          onConfirm={() => {
            handleDelete()
            setShowDeleteConfirm(false)
          }}
          title="Delete Room"
          message={`Delete room "${selectedRoom?.name}"?`}
          confirmText="Delete"
          confirmVariant="danger"
        />

        {/* Create Room Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setNewRoom({ name: '', description: '' })
            setRoomClassification('Normal')
          }}
          title="Create New Room"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Room Name *
              </label>
              <input
                type="text"
                value={newRoom.name}
                onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter room name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={newRoom.description}
                onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter room description"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Data Classification Level *
              </label>
              <select
                value={roomClassification}
                onChange={(e) => setRoomClassification(e.target.value as 'Normal' | 'Confidential' | 'Restricted')}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="Normal">Normal - Standard business data, accessible to all authorized users</option>
                <option value="Confidential">Confidential - Sensitive data, restricted access, requires admin/security roles</option>
                <option value="Restricted">Restricted - Highly sensitive data, security role only with approval</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Select the appropriate classification level for this room's data
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewRoom({ name: '', description: '' })
                  setRoomClassification('Normal')
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                className="btn-primary flex-1"
              >
                Create
              </button>
            </div>
          </div>
        </Modal>

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  )
}

export default Rooms
