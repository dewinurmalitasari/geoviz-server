import Statistic from '../model/Statistic.js'
import mongoose from "mongoose";

export default async function statisticRoute(fastify) {
    // Track statistics
    fastify.post('/statistics', {
        preHandler: fastify.authorize(['student']),
        schema: {
            security: [{bearerAuth: []}],
            body: {
                type: 'object',
                required: ['type', 'data'],
                properties: {
                    type: {
                        type: 'string',
                        enum: ['visit', 'material', 'practice_attempt']
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
                        message: {type: 'string'},
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
                    return reply.code(400).send({message: 'Data kunjungan harus kosong'})
                }
                break
            case 'material':
                if (!data.material) {
                    return reply.code(400).send({message: 'ID materi diperlukan'})
                }
                break
            case 'practice_attempt':
                if (!data.code || typeof data.code !== 'string') {
                    return reply.code(400).send({message: 'Kode latihan diperlukan'})
                }
                break
            default:
                return reply.code(400).send({message: 'Tipe statistik tidak valid'})
        }

        const statistic = new Statistic({type, data: data, user: userId})
        await statistic.save()

        return reply.code(201).send({message: 'Statistik berhasil dicatat', statistic})
    })

    // Get statistics by student id (admin and teacher only)
    fastify.get('/statistics/user/:id', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            security: [{bearerAuth: []}],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'},
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
        const userId = request.params.id

        if (!mongoose.isValidObjectId(userId)) {
            return reply.code(404).send({message: 'Pengguna tidak ditemukan'})
        }

        const statistics = await Statistic.find({user: userId}).sort({createdAt: -1})
        return reply.code(200).send({message: 'Statistik berhasil diambil', statistics})
    })

    // Get statistics summary for a student
    fastify.get('/statistics/summary/user/:id', {
        preHandler: fastify.authorize(['admin', 'teacher']),
        schema: {
            security: [{bearerAuth: []}],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'},
                        summary: {
                            type: 'object',
                            properties: {
                                totalVisits: {type: 'number'},
                                totalMaterialsUnique: {type: 'number'},
                                totalMaterialsAccessed: {type: 'number'},
                                totalPracticesUnique: {type: 'number'},
                                totalPracticeAttempts: {type: 'number'},
                                totalPracticesCompleted: {type: 'number'},
                                materialAccessCount: {
                                    type: 'object',
                                    additionalProperties: {type: 'number'}
                                },
                                practiceCount: {
                                    type: 'object',
                                    additionalProperties: {
                                        type: 'object',
                                        properties: {
                                            attempted: {type: 'number'},
                                            completed: {type: 'number'}
                                        }
                                    }
                                }
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
        const userId = request.params.id

        if (!mongoose.isValidObjectId(userId)) {
            return reply.code(404).send({message: 'Pengguna tidak ditemukan'})
        }

        const stats = await Statistic.aggregate([
            {$match: {user: new mongoose.Types.ObjectId(userId)}},
            {
                $facet: {
                    typeCounts: [
                        {$group: {_id: '$type', count: {$sum: 1}}}
                    ],
                    materialCounts: [
                        {$match: {type: 'material'}},
                        {$group: {_id: '$data.material', count: {$sum: 1}}},
                        {
                            $lookup: {
                                from: 'materials',
                                localField: '_id',
                                foreignField: '_id',
                                as: 'materialInfo'
                            }
                        },
                        {$unwind: '$materialInfo'},
                        {
                            $project: {
                                title: '$materialInfo.title',
                                count: 1
                            }
                        }
                    ],
                    practiceCounts: [
                        {$match: {$or: [{type: 'practice_attempt'}, {type: 'practice_completed'}]}},
                        {
                            $group: {
                                _id: '$data.code',
                                attempted: {$sum: {$cond: [{$eq: ['$type', 'practice_attempt']}, 1, 0]}},
                                completed: {$sum: {$cond: [{$eq: ['$type', 'practice_completed']}, 1, 0]}}
                            }
                        }
                    ]
                }
            }
        ])

        const result = stats[0]
        const typeCounts = Object.fromEntries(result.typeCounts.map(t => [t._id, t.count]))
        const materialAccessCount = Object.fromEntries(result.materialCounts.map(m => [m.title, m.count]))
        const practiceCount = Object.fromEntries(result.practiceCounts.map(p => [p._id, {
            attempted: p.attempted,
            completed: p.completed
        }]))

        return reply.code(200).send({
            message: 'Ringkasan statistik berhasil diambil',
            summary: {
                totalVisits: typeCounts.visit || 0,
                totalMaterialsUnique: result.materialCounts.length,
                totalMaterialsAccessed: typeCounts.material || 0,
                totalPracticesUnique: result.practiceCounts.length,
                totalPracticeAttempts: result.practiceCounts.reduce((sum, p) => sum + p.attempted, 0),
                totalPracticesCompleted: result.practiceCounts.reduce((sum, p) => sum + p.completed, 0),
                materialAccessCount,
                practiceCount
            }
        })
    })
}
