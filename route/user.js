import User from "../model/User.js";

export default async function userRoutes(fastify) {
    // Get all users
    fastify.get('/users', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
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
        return { message: 'Users retrieved successfully', users }
    })

    // Get all teachers
    fastify.get('/teachers', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
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
        return { message: 'Teachers retrieved successfully', teachers }
    })

    // Get all students
    fastify.get('/students', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
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
        return { message: 'Students retrieved successfully', students }
    })

    // Get user by ID
    fastify.get('/users/:id', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        user: {
                            type: 'object',
                            properties: {
                                _id: {type: 'string'},
                                username: {type: 'string'},
                                role: {type: 'string'}
                            }
                        }
                    }
                },
                404: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'}
                    }
                }
            }
        }
    }, async (request, reply) => {
        const {id} = request.params
        const user = await User.findById(id, '-password')
        if (!user) return reply.code(404).send({message: 'User not found'})
        return { message: 'User retrieved successfully', user }
    })

    // Create new user
    fastify.post('/users', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['username', 'password', 'role'],
                properties: {
                    username: {type: 'string', minLength: 3, maxLength: 32},
                    password: {type: 'string', minLength: 8},
                    role: {type: 'string', enum: ['admin', 'teacher', 'student']}
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        user: {
                            type: 'object',
                            properties: {
                                _id: {type: 'string'},
                                username: {type: 'string'},
                                role: {type: 'string'}
                            }
                        }
                    }
                },
                403: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'}
                    }
                },
                409: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'}
                    }
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

        // Check if username already exists
        const existingUser = await User.findOne({username})
        if (existingUser) {
            return reply.code(409).send({message: 'Username already exists'})
        }

        const user = await User.create({username, password, role})
        reply.code(201).send({ message: 'User created successfully', user: {id: user._id, username, role} })
    })

    // Update user by ID
    fastify.put('/users/:id', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                properties: {
                    username: {type: 'string', minLength: 3, maxLength: 32},
                    password: {type: 'string', minLength: 8},
                    role: {type: 'string', enum: ['admin', 'teacher', 'student']}
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        user: {
                            type: 'object',
                            properties: {
                                _id: {type: 'string'},
                                username: {type: 'string'},
                                role: {type: 'string'}
                            }
                        }
                    }
                },
                403: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'}
                    }
                },
                404: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'}
                    }
                },
                409: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'}
                    }
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

        const user = await User.findById(id)
        if (!user) return reply.code(404).send({message: 'User not found'})

        // Check if username is being changed and already exists
        if (username && username !== user.username) {
            const existingUser = await User.findOne({username})
            if (existingUser) {
                return reply.code(409).send({message: 'Username already exists'})
            }
        }

        const updateData = {}
        if (username) updateData.username = username
        if (password) updateData.password = password
        if (role) updateData.role = role


        Object.assign(user, updateData)
        await user.save()

        return { message: 'User updated successfully', user: {id: user._id, username: user.username, role: user.role} }
    })

    // Delete user by ID
    fastify.delete('/users/:id', {
        preHandler: fastify.authorize(['admin']),
        schema: {
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'}
                    }
                },
                404: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'}
                    }
                }
            }
        }
    }, async (request, reply) => {
        const {id} = request.params
        const user = await User.findByIdAndDelete(id)
        if (!user) return reply.code(404).send({message: 'User not found'})
        return {message: 'User deleted'}
    })
}