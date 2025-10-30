import userRoutes from "./user.js";
import User from "../model/User.js";
import materialRoutes from "./material.js";
import practiceRoute from "./practice.js";
import statisticRoute from "./statistic.js";

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
                    username: {type: 'string'},
                    password: {type: 'string'}
                }
            },
            schema: {
                200: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'},
                        user: {
                            type: 'object',
                            properties: {
                                _id: {type: 'string'},
                                username: {type: 'string'},
                                role: {type: 'string'}
                            }
                        },
                        token: {type: 'string'}
                    }
                },
                401: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'}
                    }
                }
            }
        }
    }, async (request, reply) => {
        const {username, password} = request.body
        const user = await User.findOne({username})
        if (!user) return reply.code(401).send({message: 'User not found'})

        const match = await user.comparePassword(password)
        if (!match) return reply.code(401).send({message: 'Invalid password'})

        return {
            message: 'Login successful',
            user: {_id: user._id, username: user.username, role: user.role},
            token: fastify.jwt.sign(
                {id: user._id, role: user.role},
                {expiresIn: '7d'} // Token valid for 7 days
            )
        }
    })

    // User route
    fastify.register(userRoutes);

    // Material route
    fastify.register(materialRoutes);

    // Practice route
    fastify.register(practiceRoute);

    // Statistics route
    fastify.register(statisticRoute)
}
