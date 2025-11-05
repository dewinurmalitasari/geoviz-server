import mongoose from 'mongoose'
import bcrypt from "bcrypt";

const materialScheme = new mongoose.Schema({
    title: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    formula: { type: String, required: true },
    example: { type: String, required: true },
    youtubeLinks: { type: [String], required: false },
    imageLinks: { type: [String], required: false },
}, { timestamps: true })

export default mongoose.model('Material', materialScheme)