import fp from 'fastify-plugin'
import mongoose from 'mongoose'

export default fp(async function (fastify, opts) {
    return new Promise(async (resolve, reject) => {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                directConnection: true,
            })
            fastify.log.info('MongoDB connected')

            // Expose mongoose to Fastify instance
            fastify.decorate('mongoose', mongoose)
            resolve()
        } catch (err) {
            fastify.log.error('MongoDB connection error:', err)
            reject(err)
        }
    })
}, {
    name: 'mongoose-connection'
})