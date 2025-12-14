/**
 * TypeScript models for the application
 * Centralized type definitions for data structures
 */

export interface Room {
  id: string
  name: string
  description: string
  isPrivate: boolean
  members: number
  maxMembers: number
  createdAt: string
  updatedAt: string
  ownerId?: string
}

export interface EventItem {
  id: string
  title: string
  description: string
  date: Date | string
  time: string
  location?: string
  attendees?: string[]
  createdAt: string
  updatedAt: string
  organizerId?: string
}

export interface FileItem {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string
  owner: string
  ownerId?: string
  path?: string
  url?: string
  tags?: string[]
  category?: string
  isTrashed?: boolean
  isFolder?: boolean
  deletedAt?: string
}

export interface SecurityLog {
  id: string
  timestamp: string
  event: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  source: string
  status: 'Resolved' | 'Completed' | 'Blocked' | 'Investigating' | 'Pending'
  details?: string
  userId?: string
  ipAddress?: string
}

export interface NotificationItem {
  id: string
  message: string
  type: 'security' | 'room' | 'meeting' | 'file' | 'system' | 'user'
  timestamp: Date | string
  read: boolean
  actionUrl?: string
  metadata?: Record<string, any>
}

export interface AdminUserMock {
  id: string
  name: string
  email: string
  role: 'Admin' | 'User' | 'Moderator' | 'Guest'
  status: 'Active' | 'Inactive' | 'Suspended'
  createdAt: string
  lastLogin?: string
  avatar?: string
}

export interface RecentActivity {
  id: string
  type: 'file' | 'video' | 'room' | 'chat' | 'event'
  name: string
  action: string
  timestamp: Date | string
  userId?: string
}

export interface ChatMessage {
  id: string
  sender: string
  senderId?: string
  message: string
  timestamp: Date | string
  isOwn: boolean
  roomId?: string
}

export interface TrashItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size: number
  deletedAt: string
  originalPath?: string
  canRestore: boolean
}

