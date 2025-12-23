import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token || token === 'mock-token-for-testing') {
      // For development/testing, try to get user from token or use fallback
      if (process.env.NODE_ENV === 'development') {
        // Try to find any user in the database (prefer admin, but any user works)
        try {
          const mongoose = await import('mongoose')
          if (mongoose.default.connection.readyState === 1) {
            // First try to find admin user
            let user = await User.findOne({ role: 'admin' })
            // If no admin, get any user
            if (!user) {
              user = await User.findOne()
            }
            if (user) {
              req.user = { 
                _id: user._id,
                role: user.role || 'user',
                name: user.name,
                email: user.email
              }
              console.log(`✅ Development mode: Using user ${user.name} (${user.email}) for ${req.method} ${req.path}`)
              return next()
            }
          }
        } catch (dbError) {
          console.error('Error finding user in development mode:', dbError)
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
