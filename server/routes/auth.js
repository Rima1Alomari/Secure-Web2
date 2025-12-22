import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import SecuritySettings from '../models/SecuritySettings.js'
import { logAuditEvent } from '../utils/audit.js'
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
    const validRoles = ['user', 'admin', 'security']
    const userRole = role && validRoles.includes(role) ? role : 'user'

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    const user = new User({ name, email, password, role: userRole })
    
    try {
      await user.save()
      console.log(`✅ User saved: ${user.email} (${user._id})`)
    } catch (saveError) {
      console.error('❌ Error saving user:', saveError)
      if (saveError.code === 11000) {
        return res.status(400).json({ error: 'Email already exists' })
      }
      throw saveError
    }

    // Create security settings
    try {
      const securitySettings = new SecuritySettings({ 
        user: user._id,
        quantumProofMode: process.env.HIGH_SECURITY_MODE !== 'false'
      })
      await securitySettings.save()
      console.log(`✅ Security settings saved for user: ${user.email}`)
    } catch (settingsError) {
      console.error('⚠️ Error saving security settings (non-critical):', settingsError)
      // Continue even if security settings fail
    }

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

    res.json({ 
      token, 
      user: { 
        id: user._id.toString(), 
        name: user.name, 
        email: user.email, 
        role: user.role || 'user',
        jobTitle: user.jobTitle || '',
        department: user.department || '',
        phone: user.phone || '',
        bio: user.bio || ''
      } 
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/login', async (req, res) => {
  console.log('🔐 Login attempt:', { email: req.body.email, ip: req.ip })
  try {
    const { email, password, mfaCode } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Check MongoDB connection
    const mongoose = await import('mongoose')
    if (mongoose.default.connection.readyState !== 1) {
      console.error('❌ MongoDB not connected')
      return res.status(500).json({ 
        error: 'Database connection error. Please try again later.',
        error_ar: 'خطأ في الاتصال بقاعدة البيانات. يرجى المحاولة لاحقاً.'
      })
    }

    const user = await User.findOne({ email })
    if (!user) {
      try {
        await logAuditEvent('access_denied', 'unknown', 'Failed login attempt - user not found', {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        })
      } catch (auditError) {
        console.error('⚠️ Audit log error (non-fatal):', auditError.message)
      }
      return res.status(401).json({ 
        error: 'Account not found. Please create a new account.',
        error_ar: 'الحساب غير موجود. يرجى إنشاء حساب جديد.',
        accountNotFound: true
      })
    }

    let isMatch = false
    try {
      isMatch = await user.comparePassword(password)
    } catch (compareError) {
      console.error('❌ Password comparison error:', compareError)
      return res.status(500).json({ 
        error: 'Authentication error. Please try again.',
        error_ar: 'خطأ في المصادقة. يرجى المحاولة مرة أخرى.'
      })
    }

    if (!isMatch) {
      try {
        await logAuditEvent('access_denied', user._id.toString(), 'Failed login attempt - invalid password', {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        })
      } catch (auditError) {
        console.error('⚠️ Audit log error (non-fatal):', auditError.message)
      }
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Check MFA - mandatory in KSA mode
    let securitySettings = null
    try {
      securitySettings = await SecuritySettings.findOne({ user: user._id })
    } catch (settingsError) {
      console.error('⚠️ Error fetching security settings (non-fatal):', settingsError.message)
      // Continue without security settings
    }

    const ksaMode = process.env.KSA_HIGH_SECURITY_MODE !== 'false'
    const mfaRequired = ksaMode || securitySettings?.mfaEnabled
    
    if (mfaRequired) {
      if (!mfaCode) {
        return res.status(401).json({ 
          error: 'MFA code required', 
          mfaRequired: true,
          error_ar: 'رمز المصادقة متعددة العوامل مطلوب'
        })
      }
      // In production, verify TOTP code
      // For now, accept any code in development
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRY })

    // Generate device fingerprint if not already set
    let deviceFingerprint = req.deviceFingerprint
    if (!deviceFingerprint) {
      try {
        const crypto = await import('crypto')
        const fingerprint = req.headers['user-agent'] + req.ip
        deviceFingerprint = crypto.createHash('sha256').update(fingerprint).digest('hex')
      } catch (cryptoError) {
        console.error('⚠️ Device fingerprint error (non-fatal):', cryptoError.message)
        deviceFingerprint = 'unknown'
      }
    }

    try {
      await logAuditEvent('login', user._id.toString(), 'User logged in', {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceFingerprint: deviceFingerprint,
        mfaUsed: securitySettings?.mfaEnabled || false
      })
    } catch (auditError) {
      console.error('⚠️ Audit log error (non-fatal):', auditError.message)
      // Continue even if audit logging fails
    }

    console.log(`✅ Login successful: ${user.email} (${user._id})`)

    res.json({ 
      token, 
      user: { 
        id: user._id.toString(), 
        name: user.name, 
        email: user.email, 
        role: user.role || 'user',
        jobTitle: user.jobTitle || '',
        department: user.department || '',
        phone: user.phone || '',
        bio: user.bio || ''
      } 
    })
  } catch (error) {
    console.error('❌ Login error:', error)
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      error_ar: 'خطأ في الخادم. يرجى المحاولة لاحقاً.'
    })
  }
})

// Get all users (for permission selection)
router.get('/users', authenticate, async (req, res) => {
  try {
    const mongoose = await import('mongoose')
    if (mongoose.default.connection.readyState !== 1) {
      return res.json([]) // Return empty array if MongoDB not connected
    }

    const users = await User.find({}).select('name email _id role jobTitle department phone bio').sort({ name: 1 })
    res.json(users.map(u => ({
      id: u._id.toString(),
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role || 'user',
      jobTitle: u.jobTitle || '',
      department: u.department || '',
      phone: u.phone || '',
      bio: u.bio || ''
    })))
  } catch (error) {
    console.error('Error fetching users:', error)
    res.json([]) // Return empty array on error
  }
})

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, email, jobTitle, department, phone, bio } = req.body
    const userId = req.user._id

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' })
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email, _id: { $ne: userId } })
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    user.name = name
    user.email = email
    if (jobTitle !== undefined) user.jobTitle = jobTitle
    if (department !== undefined) user.department = department
    if (phone !== undefined) user.phone = phone
    if (bio !== undefined) user.bio = bio
    await user.save()

    await logAuditEvent('settings_change', userId.toString(), 'Profile updated', {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceFingerprint: req.deviceFingerprint
    })

    res.json({ 
      user: { 
        id: user._id.toString(), 
        name: user.name, 
        email: user.email, 
        role: user.role || 'user',
        jobTitle: user.jobTitle || '',
        department: user.department || '',
        phone: user.phone || '',
        bio: user.bio || ''
      } 
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    res.status(500).json({ error: error.message })
  }
})

// Change password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user._id

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      await logAuditEvent('access_denied', userId.toString(), 'Failed password change - incorrect current password', {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceFingerprint: req.deviceFingerprint
      })
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    // Update password
    user.password = newPassword
    await user.save()

    await logAuditEvent('settings_change', userId.toString(), 'Password changed', {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceFingerprint: req.deviceFingerprint
    })

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Error changing password:', error)
    res.status(500).json({ error: error.message })
  }
})

// Delete user (admin only)
router.delete('/users/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params
    const currentUserId = req.user._id

    // Check if current user is admin
    const currentUser = await User.findById(currentUserId)
    if (!currentUser) {
      return res.status(404).json({ error: 'Current user not found' })
    }

    if (currentUser.role !== 'admin') {
      await logAuditEvent('access_denied', currentUserId.toString(), 'Unauthorized user deletion attempt', {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceFingerprint: req.deviceFingerprint,
        targetUserId: userId
      })
      return res.status(403).json({ error: 'Only admins can delete users' })
    }

    // Prevent self-deletion
    if (userId === currentUserId.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own account' })
    }

    // Find the user to delete
    const userToDelete = await User.findById(userId)
    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Delete the user
    await User.findByIdAndDelete(userId)

    // Log audit event
    await logAuditEvent('user_delete', currentUserId.toString(), `Deleted user: ${userToDelete.email}`, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceFingerprint: req.deviceFingerprint,
      deletedUserId: userId,
      deletedUserEmail: userToDelete.email
    })

    console.log(`✅ User deleted: ${userToDelete.email} (${userId}) by admin ${currentUser.email}`)

    res.json({ 
      message: `User "${userToDelete.name}" deleted successfully`,
      deletedUser: {
        id: userId,
        name: userToDelete.name,
        email: userToDelete.email
      }
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: error.message || 'Failed to delete user' })
  }
})

export default router

