import userRoutes from "./user.js";
import User from "../models/User.js";

export default async function routes(fastify, options) {
    fastify.get('/', async (request, reply) => {
        return {message: 'ok'}
    })

    // Authentication route
    // Login
    fastify.post('/login', {
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                    username: {type: 'string', minLength: 3, maxLength: 32},
                    password: {type: 'string', minLength: 8}
                }
            }
        }
    }, async (request, reply) => {
        const {username, password} = request.body
        const user = await User.findOne({username})
        if (!user) return reply.code(400).send({message: 'User not found'})

        const match = await user.comparePassword(password)
        if (!match) return reply.code(401).send({message: 'Invalid password'})

        return {
            message: 'Login successful',
            user: {id: user._id, username: user.username, role: user.role},
            token: fastify.jwt.sign({id: user._id, role: user.role})
        }
    })

    // User route
    fastify.register(userRoutes);

    // Material route

    // Practice route

    // Tracker route
    // - visit site, access material, access practice, complete practice
}
