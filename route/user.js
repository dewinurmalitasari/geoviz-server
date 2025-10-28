import User from "../models/User.js";

export default async function userRoutes(fastify) {
    // Get all users
    fastify.get('/users', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        users: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    _id: {type: 'string'},
                                    username: {type: 'string'},
                                    role: {type: 'string'}
                                }
                            }
                        }
                    }
                }
            }
        }
    }, async () => {
        const users = await User.find({}, '-password') // exclude password
        return {users}
    })

    // Get all teachers
    fastify.get('/teachers', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        teachers: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    _id: {type: 'string'},
                                    username: {type: 'string'},
                                    role: {type: 'string'}
                                }
                            }
                        }
                    }
                }
            }
        }
    }, async () => {
        const teachers = await User.find({role: 'teacher'}, '-password') // exclude password
        return {teachers}
    })

    // Get all students
    fastify.get('/students', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        students: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    _id: {type: 'string'},
                                    username: {type: 'string'},
                                    role: {type: 'string'}
                                }
                            }
                        }
                    }
                }
            }
        }
    }, async () => {
        const students = await User.find({role: 'student'}, '-password') // exclude password
        return {students}
    })

    // Get user by ID
    fastify.get('/users/:id', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        user: {
                            type: 'object',
                            properties: {
                                _id: {type: 'string'},
                                username: {type: 'string'},
                                role: {type: 'string'}
                            }
                        }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const {id} = request.params
        const user = await User.findById(id, '-password')
        if (!user) return reply.code(404).send({message: 'User not found'})
        return {user}
    })

    // Create new user
    fastify.post('/users', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password', 'role'],
                properties: {
                    username: {type: 'string', minLength: 3, maxLength: 32},
                    password: {type: 'string', minLength: 8},
                    role: {type: 'string', enum: ['admin', 'teacher', 'student']}
                }
            }
        }
    }, async (request, reply) => {
        const {username, password, role} = request.body
        const creatorRole = request.user.role

        // Role-based restrictions
        if (creatorRole === 'teacher' && role !== 'student') {
            return reply.code(403).send({message: 'Teachers can only create student accounts'})
        }

        const user = await User.create({username, password, role})
        return {message: 'User created', user: {id: user._id, username, role}}
    })

    // Update user by ID
    fastify.put('/users/:id', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            body: {
                type: 'object',
                properties: {
                    username: {type: 'string', minLength: 3, maxLength: 32},
                    password: {type: 'string', minLength: 8},
                    role: {type: 'string', enum: ['admin', 'teacher', 'student']}
                }
            }
        }
    }, async (request, reply) => {
        const {id} = request.params
        const {username, password, role} = request.body
        const updaterRole = request.user.role

        // Role-based restrictions
        if (updaterRole === 'teacher' && role && role !== 'student') {
            return reply.code(403).send({message: 'Teachers can only assign student role'})
        }

        const updateData = {}
        if (username) updateData.username = username
        if (password) updateData.password = password
        if (role) updateData.role = role

        const user = await User.findById(id)
        if (!user) return reply.code(404).send({message: 'User not found'})

        Object.assign(user, updateData)
        await user.save()

        return {message: 'User updated', user: {id: user._id, username: user.username, role: user.role}}
    })

    // Delete user by ID
    fastify.delete('/users/:id', {
        preHandler: fastify.authorize(['admin']),
    }, async (request, reply) => {
        const {id} = request.params
        const user = await User.findByIdAndDelete(id)
        if (!user) return reply.code(404).send({message: 'User not found'})
        return {message: 'User deleted'}
    })
}