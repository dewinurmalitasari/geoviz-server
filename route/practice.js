import Practice from "../model/Practice.js";
import Statistic from "../model/Statistic.js";
import mongoose from "mongoose";

export default async function practiceRoute(fastify) {
    // Submit practice
    fastify.post('/practices', {
        preHandler: fastify.authorize(['student']),
        schema: {
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['code', 'score'],
                properties: {
                    code: { type: 'string' },
                    score: {
                        type: 'object',
                        required: ['correct', 'total'],
                        properties: {
                            correct: { type: 'number' },
                            total: { type: 'number' }
                        }
                    },
                    content: { type: 'object' }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        practice: {
                            type: 'object',
                            properties: {
                                _id: { type: 'string' },
                                code: { type: 'string' },
                                score: {
                                    type: 'object',
                                    properties: {
                                        correct: { type: 'number' },
                                        total: { type: 'number' }
                                    }
                                },
                                content: {
                                    type: 'object',
                                    additionalProperties: true
                                },
                                user: { type: 'string' },
                                createdAt: { type: 'string' },
                                updatedAt: { type: 'string' }
                            }
                        }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'}
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { code, score, content } = request.body
        const userId = request.user.id

        if (score.correct < 0 || score.total < 0) {
            return reply.code(400).send({
                message: 'Nilai skor tidak boleh negatif'
            })
        }

        const practice = new Practice({
            code,
            score,
            content,
            user: userId
        })
        await practice.save()

        // Track completion event
        const statistic = new Statistic({
            type: 'practice_completed',
            data: {
                code,
                practice: practice._id
            },
            user: userId
        })
        await statistic.save()

        return reply.code(201).send({ message: 'Latihan berhasil dikirim', practice })
    })

    // Get practices by user ID
    fastify.get('/practices/user/:id', {
        preHandler: fastify.authorize(['admin', 'teacher', 'student']),
        schema: {
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        practices: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    _id: { type: 'string' },
                                    code: { type: 'string' },
                                    score: {
                                        type: 'object',
                                        properties: {
                                            correct: { type: 'number' },
                                            total: { type: 'number' }
                                        }
                                    },
                                    content: {
                                        type: 'object',
                                        additionalProperties: true
                                    },
                                    user: { type: 'string' },
                                    createdAt: { type: 'string' },
                                    updatedAt: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                403: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { id } = request.params

        if (!mongoose.isValidObjectId(id)) {
            return reply.code(404).send({ message: 'Pengguna tidak ditemukan' })
        }

        // If the requester is a student, ensure they can only access their own practices
        if (request.user.role === 'student' && request.user.id !== id) {
            return reply.code(403).send({ message: 'Akses ditolak' })
        }

        const practices = await Practice.find({ user: id }).sort({ createdAt: -1 })

        return { message: 'Latihan berhasil diambil', practices }
    })
}