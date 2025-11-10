import mongoose from 'mongoose'
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 32 },
    password: { type: String, required: true, minlength: 8 },
    role: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
    reactions: [{
        _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
        reaction: { type: String, enum: ['happy', 'neutral', 'sad', 'confused'], required: true },
        type: { type: String, enum: ['material', 'practice'], required: true },
        materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
        practiceCode: { type: String },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true })

// Update the updatedAt field for reactions when they are modified
userSchema.pre('save', function(next) {
    if (this.isModified('reactions')) {
        this.reactions.forEach(reaction => {
            if (reaction.isModified && reaction.isModified()) {
                reaction.updatedAt = new Date();
            }
        });
    }
    next();
});

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
