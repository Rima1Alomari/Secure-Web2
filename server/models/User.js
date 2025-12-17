import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
})

// Generate unique user ID before saving
userSchema.pre('save', async function (next) {
  // Hash password if modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10)
  }
  
  // Generate userId if it doesn't exist
  if (!this.userId) {
    const rolePrefix = {
      'admin': 'AD',
      'user': 'US'
    }[this.role] || 'US'
    
    try {
      // Find the highest number for this role
      const UserModel = mongoose.model('User')
      const lastUser = await UserModel.findOne(
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
      
      this.userId = `#${rolePrefix}${String(nextNumber).padStart(3, '0')}`
    } catch (error) {
      // If error, generate a simple ID
      console.error('Error generating userId:', error)
      this.userId = `#${rolePrefix}001`
    }
  }
  
  next()
})

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password)
}

export default mongoose.model('User', userSchema)

