import mongoose from 'mongoose'
import bcrypt from "bcrypt";

const materialScheme = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    formula: { type: String, required: true },
    example: { type: String, required: true },
}, { timestamps: true })

export default mongoose.model('Material', materialScheme)