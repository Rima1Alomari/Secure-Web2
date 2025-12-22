import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token || token === 'mock-token-for-testing') {
      // For development/testing, try to get user from token or use fallback
      if (process.env.NODE_ENV === 'development') {
        // Try to find any admin user in the database
        try {
          const mongoose = await import('mongoose')
          if (mongoose.default.connection.readyState === 1) {
            const adminUser = await User.findOne({ role: 'admin' })
            if (adminUser) {
              req.user = { _id: adminUser._id }
              return next()
            }
          }
        } catch (dbError) {
          console.error('Error finding admin user:', dbError)
        }
      }
      
      return res.status(401).json({ error: 'No token provided' })
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      
      // Verify user exists in database
      const mongoose = await import('mongoose')
      if (mongoose.default.connection.readyState === 1) {
        const user = await User.findById(decoded.userId).select('name email role')
        if (!user) {
          console.error(`❌ User not found in database: ${decoded.userId}`)
          return res.status(401).json({ error: 'User not found' })
        }
        req.user = { 
          _id: user._id, 
          role: user.role || 'user',
          name: user.name,
          email: user.email
        }
        console.log(`✅ Authenticated user: ${user.name} (${user.email}) - Role: ${user.role}`)
      } else {
        // If MongoDB not connected, use decoded userId
        console.warn('⚠️ MongoDB not connected, using decoded userId only')
        req.user = { _id: decoded.userId }
      }
      
      next()
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError)
      return res.status(401).json({ error: 'Invalid token' })
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return res.status(500).json({ error: 'Authentication failed' })
  }
}
