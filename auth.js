import fp from 'fastify-plugin'

export default fp(async function (fastify, opts) {
    // Register JWT plugin
    fastify.register(import('@fastify/jwt'), {
        secret: process.env.JWT_SECRET
    })

    // Decorator to verify JWT and attach user to request
    fastify.decorate("authenticate", async function (request, reply) {
        try {
            await request.jwtVerify()
        } catch (err) {
            reply.code(401).send({ message: 'Unauthorized' })
        }
    })

    // Decorator for role-based access
    fastify.decorate("authorize", function (roles = []) {
        return async function (request, reply) {
            try {
                await request.jwtVerify()
                const userRole = request.user.role
                if (!roles.includes(userRole)) {
                    return reply.code(403).send({ message: 'Forbidden' })
                }
            } catch (err) {
                reply.code(401).send({ message: 'Unauthorized' })
            }
        }
    })
})
