import Statistic from '../model/Statistic.js'
import mongoose from "mongoose";

export default async function statisticRoute(fastify) {
    // Track statistics
    fastify.post('/statistics', {
        preHandler: fastify.authorize(['student']),
        schema: {
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['type', 'data'],
                properties: {
                    type: {
                        type: 'string',
                        enum: ['visit', 'material', 'practice']
                    },
                    data: {
                        type: 'object',
                        additionalProperties: true
                    }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        statistic: {
                            type: 'object',
                            properties: {
                                _id: {type: 'string'},
                                type: {type: 'string'},
                                data: {
                                    type: 'object',
                                    additionalProperties: true
                                },
                                user: {type: 'string'},
                                createdAt: {type: 'string'},
                                updatedAt: {type: 'string'}
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
        const {type, data} = request.body
        const userId = request.user.id

        // Validate data based on type
        switch (type) {
            case 'visit':
                if (Object.keys(data).length !== 0) {
                    return reply.code(400).send({message: 'Visit data must be empty'})
                }
                break
            case 'material':
                if (!data.material) {
                    return reply.code(400).send({message: 'Material ID is required'})
                }
                break
            case 'practice':
                if (!data.code || typeof data.code !== 'string') {
                    return reply.code(400).send({message: 'Practice code is required'})
                }
                break
            default:
                return reply.code(400).send({message: 'Invalid statistic type'})
        }

        const statistic = new Statistic({type, data: data, user: userId})
        await statistic.save()

        return reply.code(201).send({ message: 'Statistic tracked successfully', statistic })
    })

    // Get statistics by student id (admin and teacher only)
    fastify.get('/statistics/user/:id', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        statistics: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    _id: {type: 'string'},
                                    type: {type: 'string'},
                                    data: {
                                        type: 'object',
                                        additionalProperties: true
                                    },
                                    user: {type: 'string'},
                                    createdAt: {type: 'string'},
                                    updatedAt: {type: 'string'}
                                }
                            }
                        }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const userId = request.params.id

        if (!mongoose.isValidObjectId(userId)) {
            return reply.code(404).send({message: 'User not found'})
        }

        const statistics = await Statistic.find({user: userId}).sort({ createdAt: -1 })
        return reply.code(200).send({ message: 'Statistics retrieved successfully', statistics })
    })
}
