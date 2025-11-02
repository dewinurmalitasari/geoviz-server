import User from "../model/User.js";
import Statistic from "../model/Statistic.js";
import Practice from "../model/Practice.js";
import mongoose from "mongoose";

export default async function userRoutes(fastify) {
    // Get all users with optional role filter
    fastify.get('/users', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            security: [{bearerAuth: []}],
            querystring: {
                type: 'object',
                properties: {
                    role: {type: 'string', enum: ['admin', 'teacher', 'student']}
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'},
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
    }, async (request) => {
        const {role} = request.query;
        const filter = role ? {role} : {};
        const users = await User.find(filter, '-password').sort({createdAt: -1}).lean();
        return {message: 'Pengguna berhasil diambil', users};
    });


    // Get user by ID
    fastify.get('/users/:id', {
        preHandler: fastify.authorize(['admin', 'teacher', 'student']),
        schema: {
            security: [{bearerAuth: []}],
            response: {
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

        if (!mongoose.isValidObjectId(id)) {
            return reply.code(404).send({message: 'Pengguna tidak ditemukan'})
        }

        const user = await User.findById(id, '-password').lean()
        if (!user) return reply.code(404).send({message: 'Pengguna tidak ditemukan'})
        return {message: 'Pengguna berhasil diambil', user}
    })

    // Create new user
    fastify.post('/users', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            security: [{bearerAuth: []}],
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
                        message: {type: 'string'},
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
            return reply.code(403).send({message: 'Guru hanya dapat membuat akun siswa'})
        }

        // Check if username already exists
        const existingUser = await User.findOne({username})
        if (existingUser) {
            return reply.code(409).send({message: 'Nama pengguna sudah ada'})
        }

        const user = await User.create({username, password, role})
        reply.code(201).send({
            message: 'Pengguna berhasil dibuat',
            user: {_id: user._id, username: user.username, role: user.role}
        })
    })

    // Update user by ID
    fastify.put('/users/:id', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            security: [{bearerAuth: []}],
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
                        message: {type: 'string'},
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

        if (!mongoose.isValidObjectId(id)) {
            return reply.code(404).send({message: 'Pengguna tidak ditemukan'})
        }

        // Role-based restrictions
        if (updaterRole === 'teacher' && role && role !== 'student') {
            return reply.code(403).send({message: 'Guru hanya dapat memberikan peran siswa'})
        }

        const user = await User.findById(id)
        if (!user) return reply.code(404).send({message: 'Pengguna tidak ditemukan'})

        // Check if username is being changed and already exists
        if (username && username !== user.username) {
            const existingUser = await User.findOne({username})
            if (existingUser) {
                return reply.code(409).send({message: 'Nama pengguna sudah ada'})
            }
        }

        const updateData = {}
        if (username) updateData.username = username
        if (password) updateData.password = password
        if (role) updateData.role = role


        Object.assign(user, updateData)
        await user.save()

        return {
            message: 'Pengguna berhasil diperbarui',
            user: {_id: user._id, username: user.username, role: user.role}
        }
    })

    // Delete user by ID
    fastify.delete('/users/:id', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            security: [{bearerAuth: []}],
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
        const currentUserRole = request.user.role

        if (!mongoose.isValidObjectId(id)) {
            return reply.code(404).send({message: 'Pengguna tidak ditemukan'})
        }

        const userToDelete = await User.findById(id)
        if (!userToDelete) {
            return reply.code(404).send({message: 'Pengguna tidak ditemukan'})
        }

        // Teachers can only delete student accounts
        if (currentUserRole === 'teacher' && userToDelete.role !== 'student') {
            return reply.code(403).send({message: 'Guru hanya dapat menghapus akun siswa'})
        }

        const [deleteUserResult] = await Promise.all([
            User.findByIdAndDelete(id),
            Statistic.deleteMany({user: id}),
            Practice.deleteMany({user: id})
        ])

        // For consistency and just in case
        if (!deleteUserResult) {
            return reply.code(404).send({message: 'Pengguna tidak ditemukan'})
        }

        return {message: 'Pengguna berhasil dihapus'}
    })
}