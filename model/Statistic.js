import mongoose from 'mongoose'

const statisticSchema = new mongoose.Schema({
    type: { type: String, required: true, enum: ['visit', 'material', 'practice_attempt', 'practice_completed'] },
    data: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, minimize: false })

export default mongoose.model('Statistic', statisticSchema)

/* Statistic Data Model
* visit: {}
* material: { material: ObjectId }
* practice_attempt: { code: String }
* practice_completed: { code: String, practice: ObjectId }
*/