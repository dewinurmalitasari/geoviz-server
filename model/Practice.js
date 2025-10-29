import mongoose from 'mongoose'

const practiceSchema = new mongoose.Schema({
    code: { type: String, required: true },
    score: {
        correct: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 }
    },
    content: { type: mongoose.Schema.Types.Mixed },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

export default mongoose.model('Practice', practiceSchema)