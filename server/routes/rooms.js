import express from 'express'
import { authenticate } from '../middleware/auth.js'
import Room from '../models/Room.js'
import { logAuditEvent } from '../utils/audit.js'

const router = express.Router()

// Get all rooms for the current user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id

    // Get rooms where user is owner or member
    const rooms = await Room.find({
      $or: [
        { ownerId: userId },
        { memberIds: userId }
      ]
    })
      .populate('ownerId', 'name email')
      .sort({ updatedAt: -1 })

    const roomsWithDetails = rooms.map(room => ({
      id: room._id.toString(),
      name: room.name,
      description: room.description,
      isPrivate: room.isPrivate,
      members: room.members,
      maxMembers: room.maxMembers,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      ownerId: room.ownerId?._id?.toString() || room.ownerId?.toString(),
      memberIds: room.memberIds.map(id => id.toString()),
      roomLevel: room.roomLevel,
      classification: room.classification
    }))

    res.json(roomsWithDetails)
  } catch (error) {
    console.error('Error fetching rooms:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get a single room by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user._id

    const room = await Room.findById(id)
      .populate('ownerId', 'name email')
      .populate('memberIds', 'name email')

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Check if user has access
    const isOwner = room.ownerId._id.toString() === userId.toString()
    const isMember = room.memberIds.some(memberId => memberId._id.toString() === userId.toString())

    if (!isOwner && !isMember) {
      return res.status(403).json({ error: 'Access denied' })
    }

    res.json({
      id: room._id.toString(),
      name: room.name,
      description: room.description,
      isPrivate: room.isPrivate,
      members: room.members,
      maxMembers: room.maxMembers,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      ownerId: room.ownerId._id.toString(),
      memberIds: room.memberIds.map(m => m._id.toString()),
      roomLevel: room.roomLevel,
      classification: room.classification
    })
  } catch (error) {
    console.error('Error fetching room:', error)
    res.status(500).json({ error: error.message })
  }
})

// Create a new room
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, roomLevel, classification, isPrivate } = req.body
    const userId = req.user._id

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Room name is required' })
    }

    const room = new Room({
      name: name.trim(),
      description: description || '',
      isPrivate: isPrivate || false,
      members: 1,
      maxMembers: 50,
      ownerId: userId,
      memberIds: [userId],
      roomLevel: roomLevel || 'Normal',
      classification: classification || roomLevel || 'Normal'
    })

    await room.save()

    // Log audit event
    try {
      await logAuditEvent('room_create', userId.toString(), `Created room: ${room.name}`, {
        roomId: room._id.toString(),
        roomName: room.name
      })
    } catch (auditError) {
      console.error('⚠️ Audit log error (non-fatal):', auditError.message)
    }

    res.status(201).json({
      id: room._id.toString(),
      name: room.name,
      description: room.description,
      isPrivate: room.isPrivate,
      members: room.members,
      maxMembers: room.maxMembers,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      ownerId: room.ownerId.toString(),
      memberIds: room.memberIds.map(id => id.toString()),
      roomLevel: room.roomLevel,
      classification: room.classification
    })
  } catch (error) {
    console.error('Error creating room:', error)
    res.status(500).json({ error: error.message })
  }
})

// Update a room
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user._id
    const { name, description, roomLevel, classification, memberIds } = req.body

    const room = await Room.findById(id)

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Check if user is owner or admin
    const isOwner = room.ownerId.toString() === userId.toString()
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only room owner or admin can update room' })
    }

    // Update fields
    if (name !== undefined) room.name = name.trim()
    if (description !== undefined) room.description = description
    if (roomLevel !== undefined) room.roomLevel = roomLevel
    if (classification !== undefined) room.classification = classification
    if (memberIds !== undefined && Array.isArray(memberIds)) {
      // Convert string IDs to ObjectIds
      const mongoose = await import('mongoose')
      room.memberIds = memberIds.map(memberId => {
        try {
          return mongoose.default.Types.ObjectId.isValid(memberId)
            ? new mongoose.default.Types.ObjectId(memberId)
            : memberId
        } catch {
          return memberId
        }
      })
      room.members = room.memberIds.length
    }

    await room.save()

    // Log audit event
    try {
      await logAuditEvent('room_update', userId.toString(), `Updated room: ${room.name}`, {
        roomId: room._id.toString(),
        roomName: room.name
      })
    } catch (auditError) {
      console.error('⚠️ Audit log error (non-fatal):', auditError.message)
    }

    res.json({
      id: room._id.toString(),
      name: room.name,
      description: room.description,
      isPrivate: room.isPrivate,
      members: room.members,
      maxMembers: room.maxMembers,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      ownerId: room.ownerId.toString(),
      memberIds: room.memberIds.map(id => id.toString()),
      roomLevel: room.roomLevel,
      classification: room.classification
    })
  } catch (error) {
    console.error('Error updating room:', error)
    res.status(500).json({ error: error.message })
  }
})

// Delete a room
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user._id

    const room = await Room.findById(id)

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Check if user is owner or admin
    const isOwner = room.ownerId.toString() === userId.toString()
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only room owner or admin can delete room' })
    }

    const roomName = room.name
    await Room.findByIdAndDelete(id)

    // Log audit event
    try {
      await logAuditEvent('room_delete', userId.toString(), `Deleted room: ${roomName}`, {
        roomId: id,
        roomName
      })
    } catch (auditError) {
      console.error('⚠️ Audit log error (non-fatal):', auditError.message)
    }

    res.json({ success: true, message: 'Room deleted successfully' })
  } catch (error) {
    console.error('Error deleting room:', error)
    res.status(500).json({ error: error.message })
  }
})

// Add member to room
router.post('/:id/members', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const { userId: memberUserId } = req.body
    const currentUserId = req.user._id

    if (!memberUserId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    const room = await Room.findById(id)

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Check if user is owner or admin
    const isOwner = room.ownerId.toString() === currentUserId.toString()
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only room owner or admin can add members' })
    }

    // Convert memberUserId to ObjectId
    const mongoose = await import('mongoose')
    const memberObjectId = mongoose.default.Types.ObjectId.isValid(memberUserId)
      ? new mongoose.default.Types.ObjectId(memberUserId)
      : memberUserId

    // Check if already a member
    if (room.memberIds.some(id => id.toString() === memberObjectId.toString())) {
      return res.status(400).json({ error: 'User is already a member' })
    }

    room.memberIds.push(memberObjectId)
    room.members = room.memberIds.length
    await room.save()

    res.json({
      id: room._id.toString(),
      memberIds: room.memberIds.map(id => id.toString()),
      members: room.members
    })
  } catch (error) {
    console.error('Error adding member:', error)
    res.status(500).json({ error: error.message })
  }
})

// Remove member from room
router.delete('/:id/members/:memberId', authenticate, async (req, res) => {
  try {
    const { id, memberId } = req.params
    const currentUserId = req.user._id

    const room = await Room.findById(id)

    if (!room) {
      return res.status(404).json({ error: 'Room not found' })
    }

    // Check if user is owner or admin
    const isOwner = room.ownerId.toString() === currentUserId.toString()
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only room owner or admin can remove members' })
    }

    // Convert memberId to ObjectId
    const mongoose = await import('mongoose')
    const memberObjectId = mongoose.default.Types.ObjectId.isValid(memberId)
      ? new mongoose.default.Types.ObjectId(memberId)
      : memberId

    room.memberIds = room.memberIds.filter(id => id.toString() !== memberObjectId.toString())
    room.members = Math.max(1, room.memberIds.length)
    await room.save()

    res.json({
      id: room._id.toString(),
      memberIds: room.memberIds.map(id => id.toString()),
      members: room.members
    })
  } catch (error) {
    console.error('Error removing member:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router

