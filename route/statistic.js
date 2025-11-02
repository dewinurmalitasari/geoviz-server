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
                if (!data.title || typeof data.title !== 'string') {
                    return reply.code(400).send({message: 'Judul materi dipperlukan'})
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

    // Get progress statistics for a student (optimized)
    fastify.get('/statistics/progress/user/:id', {
        preHandler: fastify.authorize(['admin', 'teacher', 'student']),
        schema: {
            security: [{bearerAuth: []}],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'},
                        progress: {
                            type: 'object',
                            properties: {
                                totalMaterialsAvailable: {type: 'number'},
                                totalMaterialsAccessed: {type: 'number'},
                                totalPracticesAvailable: {type: 'number'},
                                totalPracticesCompleted: {type: 'number'},
                                completionRateMaterials: {type: 'number'},
                                completionRatePractices: {type: 'number'}
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

        // Get total counts and user progress in parallel
        const [totalMaterialsAvailable, totalPracticesAvailable, progressStats] = await Promise.all([
            mongoose.model('Material').countDocuments(),
            mongoose.model('Practice').distinct('code').then(codes => codes.length),
            Statistic.aggregate([
                {$match: {user: new mongoose.Types.ObjectId(userId)}},
                {
                    $group: {
                        _id: '$type',
                        uniqueItems: {
                            $addToSet: {
                                $cond: [
                                    {$eq: ['$type', 'material']},
                                    '$data.material',
                                    {$cond: [{$eq: ['$type', 'practice_completed']}, '$data.code', null]}
                                ]
                            }
                        }
                    }
                }
            ])
        ])

        const materialStat = progressStats.find(s => s._id === 'material')
        const practiceStat = progressStats.find(s => s._id === 'practice_completed')

        const totalMaterialsAccessed = materialStat
            ? materialStat.uniqueItems.filter(m => m !== null).length
            : 0
        const totalPracticesCompleted = practiceStat
            ? practiceStat.uniqueItems.filter(p => p !== null).length
            : 0

        return reply.code(200).send({
            message: 'Progress statistik berhasil diambil',
            progress: {
                totalMaterialsAvailable,
                totalMaterialsAccessed,
                totalPracticesAvailable,
                totalPracticesCompleted,
                completionRateMaterials: totalMaterialsAvailable > 0
                    ? (totalMaterialsAccessed / totalMaterialsAvailable) * 100
                    : 0,
                completionRatePractices: totalPracticesAvailable > 0
                    ? (totalPracticesCompleted / totalPracticesAvailable) * 100
                    : 0
            }
        })
    })

    // Get statistics summary for a student
    fastify.get('/statistics/summary/user/:id', {
        preHandler: fastify.authorize(['admin', 'teacher', 'student']),
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
                                totalMaterialsAvailable: {type: 'number'},
                                totalMaterialsAccessed: {type: 'number'},
                                totalPracticesAvailable: {type: 'number'},
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
                                },
                                completionRateMaterials: {type: 'number'},
                                completionRatePractices: {type: 'number'}
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

        // Get total counts and user statistics in parallel
        const [totalMaterialsAvailable, totalPracticesAvailable, allMaterials, allPracticeCodes, stats] = await Promise.all([
            mongoose.model('Material').countDocuments(),
            mongoose.model('Practice').distinct('code').then(codes => codes.length),
            mongoose.model('Material').find({}, '_id title'),
            mongoose.model('Practice').distinct('code'),
            Statistic.aggregate([
                {$match: {user: new mongoose.Types.ObjectId(userId)}},
                {
                    $facet: {
                        typeCounts: [
                            {$group: {_id: '$type', count: {$sum: 1}}}
                        ],
                        materialCounts: [
                            {$match: {type: 'material'}},
                            {$group: {_id: '$data.material', count: {$sum: 1}}}
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
        ])

        const result = stats[0]
        const typeCounts = Object.fromEntries(result.typeCounts.map(t => [t._id, t.count]))

        const materialAccessCount = {}
        allMaterials.forEach(material => {
            const materialId = material._id.toString()
            const userMaterial = result.materialCounts.find(m => m._id.toString() === materialId)
            materialAccessCount[material.title] = userMaterial ? userMaterial.count : 0
        })

        const practiceCount = {}
        allPracticeCodes.forEach(practiceCode => {
            const userPractice = result.practiceCounts.find(p => p._id === practiceCode)
            practiceCount[practiceCode] = {
                attempted: userPractice ? userPractice.attempted : 0,
                completed: userPractice ? userPractice.completed : 0
            }
        })

        const completedPracticesCount = Object.values(practiceCount).filter(p => p.completed > 0).length
        const accessedMaterialsCount = Object.values(materialAccessCount).filter(count => count > 0).length

        return reply.code(200).send({
            message: 'Ringkasan statistik berhasil diambil',
            summary: {
                totalVisits: typeCounts.visit || 0,
                totalMaterialsAvailable,
                totalMaterialsAccessed: typeCounts.material || 0,
                totalPracticesAvailable,
                totalPracticeAttempts: result.practiceCounts.reduce((sum, p) => sum + p.attempted, 0),
                totalPracticesCompleted: result.practiceCounts.reduce((sum, p) => sum + p.completed, 0),
                materialAccessCount,
                practiceCount,
                completionRateMaterials: totalMaterialsAvailable > 0
                    ? (accessedMaterialsCount / totalMaterialsAvailable) * 100
                    : 0,
                completionRatePractices: totalPracticesAvailable > 0
                    ? (completedPracticesCount / totalPracticesAvailable) * 100
                    : 0
            }
        })
    })
}