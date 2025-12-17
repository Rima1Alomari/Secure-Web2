import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import SecuritySettings from '../models/SecuritySettings.js'
import { logAuditEvent } from '../utils/audit.js'
import { deviceFingerprint } from '../middleware/security.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h' // Short-lived tokens for zero-trust

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Validate role if provided
    const validRoles = ['user', 'admin']
    const userRole = role && validRoles.includes(role) ? role : 'user'

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    const user = new User({ name, email, password, role: userRole })
    await user.save()

    // Create security settings
    const securitySettings = new SecuritySettings({ 
      user: user._id,
      quantumProofMode: process.env.HIGH_SECURITY_MODE !== 'false'
    })
    await securitySettings.save()

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRY })

    // Generate device fingerprint if not already set
    let deviceFingerprint = req.deviceFingerprint
    if (!deviceFingerprint) {
      const crypto = await import('crypto')
      const fingerprint = req.headers['user-agent'] + req.ip
      deviceFingerprint = crypto.createHash('sha256').update(fingerprint).digest('hex')
    }

    await logAuditEvent('register', user._id.toString(), 'User registered', {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceFingerprint: deviceFingerprint
    })

    res.json({ token, user: { id: user._id, userId: user.userId, name: user.name, email: user.email, role: user.role || 'user' } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/login', async (req, res) => {
  console.log('🔐 Login attempt:', { email: req.body.email, ip: req.ip })
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      await logAuditEvent('access_denied', 'unknown', 'Failed login attempt - user not found', {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      })
      return res.status(401).json({ 
        error: 'Account not found. Please create a new account.',
        error_ar: 'الحساب غير موجود. يرجى إنشاء حساب جديد.',
        accountNotFound: true
      })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      await logAuditEvent('access_denied', user._id.toString(), 'Failed login attempt - invalid password', {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate userId if it doesn't exist (for existing users)
    if (!user.userId) {
      const rolePrefix = {
        'admin': 'AD',
        'user': 'US'
      }[user.role] || 'US'
      
      try {
        const lastUser = await User.findOne(
          { userId: new RegExp(`^#${rolePrefix}`) },
          { userId: 1 }
        ).sort({ userId: -1 }).exec()
        
        let nextNumber = 1
        if (lastUser && lastUser.userId) {
          const match = lastUser.userId.match(/#\w{2}(\d+)/)
          if (match) {
            nextNumber = parseInt(match[1], 10) + 1
          }
        }
        
        user.userId = `#${rolePrefix}${String(nextNumber).padStart(3, '0')}`
        await user.save()
      } catch (error) {
        console.error('Error generating userId on login:', error)
      }
    }

    // MFA check removed - login with email and password only
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRY })

    // Generate device fingerprint if not already set
    let deviceFingerprint = req.deviceFingerprint
    if (!deviceFingerprint) {
      const crypto = await import('crypto')
      const fingerprint = req.headers['user-agent'] + req.ip
      deviceFingerprint = crypto.createHash('sha256').update(fingerprint).digest('hex')
    }

    await logAuditEvent('login', user._id.toString(), 'User logged in', {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceFingerprint: deviceFingerprint
    })

    res.json({ token, user: { id: user._id, userId: user.userId, name: user.name, email: user.email, role: user.role || 'user' } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get all users (for permission selection)
router.get('/users', authenticate, async (req, res) => {
  try {
    const mongoose = await import('mongoose')
    if (mongoose.default.connection.readyState !== 1) {
      return res.json([]) // Return empty array if MongoDB not connected
    }

    const users = await User.find({}).select('name email _id role userId').sort({ name: 1 })
    res.json(users.map(u => ({
      id: u._id.toString(),
      _id: u._id.toString(),
      userId: u.userId,
      name: u.name,
      email: u.email,
      role: u.role || 'user'
    })))
  } catch (error) {
    console.error('Error fetching users:', error)
    res.json([]) // Return empty array on error
  }
})

// Change password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' })
    }

    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      await logAuditEvent('password_change_failed', user._id.toString(), 'Failed password change - incorrect current password', {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      })
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    user.password = newPassword
    await user.save()

    await logAuditEvent('password_change', user._id.toString(), 'Password changed successfully', {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Endpoint to assign userIds to existing users (one-time migration)
router.post('/assign-user-ids', authenticate, async (req, res) => {
  try {
    const mongoose = await import('mongoose')
    if (mongoose.default.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected' })
    }

    const usersWithoutId = await User.find({ $or: [{ userId: { $exists: false } }, { userId: null }] })
    let updatedCount = 0

    for (const user of usersWithoutId) {
      const rolePrefix = {
        'admin': 'AD',
        'user': 'US'
      }[user.role] || 'US'

      const lastUser = await User.findOne(
        { userId: new RegExp(`^#${rolePrefix}`) },
        { userId: 1 }
      ).sort({ userId: -1 }).exec()

      let nextNumber = 1
      if (lastUser && lastUser.userId) {
        const match = lastUser.userId.match(/#\w{2}(\d+)/)
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1
        }
      }

      user.userId = `#${rolePrefix}${String(nextNumber).padStart(3, '0')}`
      await user.save()
      updatedCount++
    }

    res.json({ message: `Assigned userIds to ${updatedCount} users`, updatedCount })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router

