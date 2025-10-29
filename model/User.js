import mongoose from 'mongoose'
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 32 },
    password: { type: String, required: true, minlength: 8 },
    role: { type: String, enum: ['admin', 'teacher', 'student'], required: true }
}, { timestamps: true })

// Hash password before saving
userSchema.pre('save', async function (next) {
    const user = this

    // Only hash if password is new or modified
    if (!user.isModified('password')) return next()

    try {
        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(user.password, salt)
        next()
    } catch (err) {
        next(err)
    }
})

userSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password)
}

export default mongoose.model('User', userSchema)