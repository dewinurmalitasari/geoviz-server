import mongoose from 'mongoose'

const statisticSchema = new mongoose.Schema({
    type: { type: String, required: true, enum: ['visit', 'material', 'practice', 'practice_completed'] },
    data: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, minimize: false })

export default mongoose.model('Statistic', statisticSchema)