import Fastify from 'fastify'
import routes from "./route.js";
import auth from "./auth.js";
import { config } from 'dotenv'
import mongoosePlugin from './plugins/mongoose.js'
import User from "./models/User.js";

config()

const fastify = Fastify({
    logger: true
})

fastify.register(mongoosePlugin)
fastify.register(auth)
fastify.register(routes)

const start = async () => {
    try {
        await fastify.listen({port: process.env.PORT, host: process.env.HOST})
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

start()

await fastify.after() // wait for all plugins

const adminExists = await User.findOne({ username: 'admin' })
if (!adminExists) {
    await User.create({ username: 'admin', password: 'thisIsAdmin123', role: 'admin' })
    fastify.log.info('Default admin created')
}

export async function build() {
    const fastify = Fastify({
        logger: false // Disable logger during tests for cleaner output
    })

    fastify.register(mongoosePlugin)
    fastify.register(auth)
    fastify.register(routes)

    return fastify
}