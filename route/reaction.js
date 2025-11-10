import User from "../model/User.js";
import Material from "../model/Material.js";
import mongoose from "mongoose";

export default async function reactionRoutes(fastify) {
    // Create/Update reaction
    fastify.post('/reactions', {
        preHandler: fastify.authorize(['student']),
        schema: {
            security: [{bearerAuth: []}],
            body: {
                type: 'object',
                required: ['reaction', 'type'],
                properties: {
                    reaction: {
                        type: 'string',
                        enum: ['happy', 'neutral', 'sad', 'confused']
                    },
                    type: {
                        type: 'string',
                        enum: ['material', 'practice']
                    },
                    materialId: {type: 'string'},
                    practiceCode: {type: 'string'}
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'},
                        reaction: {
                            type: 'object',
                            properties: {
                                _id: {type: 'string'},
                                reaction: {type: 'string'},
                                type: {type: 'string'},
                                materialId: {type: 'string'},
                                practiceCode: {type: 'string'},
                                createdAt: {type: 'string', format: 'date-time'},
                                updatedAt: {type: 'string', format: 'date-time'}
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
        const {reaction, type, materialId, practiceCode} = request.body;
        const userId = request.user.id;

        // Validate based on type
        if (type === 'material') {
            if (!materialId) {
                return reply.code(400).send({message: 'materialId diperlukan untuk reaksi materi'});
            }
            if (!mongoose.isValidObjectId(materialId)) {
                return reply.code(400).send({message: 'materialId tidak valid'});
            }
            // Verify material exists
            const material = await Material.findById(materialId);
            if (!material) {
                return reply.code(400).send({message: 'Materi tidak ditemukan'});
            }
        } else if (type === 'practice') {
            if (!practiceCode) {
                return reply.code(400).send({message: 'practiceCode diperlukan untuk reaksi latihan'});
            }
        }

        // Find user and check for existing reaction
        const user = await User.findById(userId);
        if (!user) {
            return reply.code(400).send({message: 'Pengguna tidak ditemukan'});
        }

        // Find existing reaction
        const existingReactionIndex = user.reactions.findIndex(r => {
            if (type === 'material') {
                return r.type === 'material' && r.materialId?.toString() === materialId;
            } else {
                return r.type === 'practice' && r.practiceCode === practiceCode;
            }
        });

        let savedReaction;

        if (existingReactionIndex !== -1) {
            // Update existing reaction
            user.reactions[existingReactionIndex].reaction = reaction;
            user.reactions[existingReactionIndex].updatedAt = new Date();
            savedReaction = user.reactions[existingReactionIndex];
        } else {
            // Add new reaction
            const newReaction = {
                reaction,
                type,
                materialId: type === 'material' ? materialId : undefined,
                practiceCode: type === 'practice' ? practiceCode : undefined
            };
            user.reactions.push(newReaction);
            savedReaction = user.reactions[user.reactions.length - 1];
        }

        await user.save();

        return reply.code(201).send({
            message: 'Reaksi berhasil disimpan',
            reaction: savedReaction
        });
    });

    // Get all reactions for a user
    fastify.get('/reactions/user/:id', {
        preHandler: fastify.authorize(['admin', 'teacher', 'student']),
        schema: {
            security: [{bearerAuth: []}],
            params: {
                type: 'object',
                properties: {
                    id: {type: 'string'}
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'},
                        reactions: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    _id: {type: 'string'},
                                    reaction: {type: 'string'},
                                    type: {type: 'string'},
                                    materialId: {type: 'string'},
                                    practiceCode: {type: 'string'},
                                    createdAt: {type: 'string', format: 'date-time'},
                                    updatedAt: {type: 'string', format: 'date-time'}
                                }
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
                }
            }
        }
    }, async (request, reply) => {
        const {id} = request.params;

        if (!mongoose.isValidObjectId(id)) {
            return reply.code(404).send({message: 'Pengguna tidak ditemukan'});
        }

        // If the requester is a student, ensure they can only access their own reactions
        if (request.user.role === 'student' && request.user.id !== id) {
            return reply.code(403).send({message: 'Akses ditolak'});
        }

        const user = await User.findById(id);
        if (!user) {
            return reply.code(404).send({message: 'Pengguna tidak ditemukan'});
        }

        return {
            message: 'Reaksi berhasil diambil',
            reactions: user.reactions
        };
    });

    // Get specific reaction by materialId
    fastify.get('/reactions/material/:materialId', {
        preHandler: fastify.authorize(['student']),
        schema: {
            security: [{bearerAuth: []}],
            params: {
                type: 'object',
                properties: {
                    materialId: {type: 'string'}
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'},
                        reaction: {
                            type: 'object',
                            properties: {
                                _id: {type: 'string'},
                                reaction: {type: 'string'},
                                type: {type: 'string'},
                                materialId: {type: 'string'},
                                createdAt: {type: 'string', format: 'date-time'},
                                updatedAt: {type: 'string', format: 'date-time'}
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
        const {materialId} = request.params;
        const userId = request.user.id;

        if (!mongoose.isValidObjectId(materialId)) {
            return reply.code(404).send({message: 'Material tidak ditemukan'});
        }

        const user = await User.findById(userId);
        if (!user) {
            return reply.code(404).send({message: 'Pengguna tidak ditemukan'});
        }

        const reaction = user.reactions.find(r =>
            r.type === 'material' && r.materialId?.toString() === materialId
        );

        if (!reaction) {
            return reply.code(404).send({message: 'Reaksi tidak ditemukan'});
        }

        return {
            message: 'Reaksi berhasil diambil',
            reaction
        };
    });

    // Get specific reaction by practiceCode
    fastify.get('/reactions/practice/:practiceCode', {
        preHandler: fastify.authorize(['student']),
        schema: {
            security: [{bearerAuth: []}],
            params: {
                type: 'object',
                properties: {
                    practiceCode: {type: 'string'}
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'},
                        reaction: {
                            type: 'object',
                            properties: {
                                _id: {type: 'string'},
                                reaction: {type: 'string'},
                                type: {type: 'string'},
                                practiceCode: {type: 'string'},
                                createdAt: {type: 'string', format: 'date-time'},
                                updatedAt: {type: 'string', format: 'date-time'}
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
        const {practiceCode} = request.params;
        const userId = request.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return reply.code(404).send({message: 'Pengguna tidak ditemukan'});
        }

        const reaction = user.reactions.find(r =>
            r.type === 'practice' && r.practiceCode === practiceCode
        );

        if (!reaction) {
            return reply.code(404).send({message: 'Reaksi tidak ditemukan'});
        }

        return {
            message: 'Reaksi berhasil diambil',
            reaction
        };
    });

    // Delete reaction by materialId
    fastify.delete('/reactions/material/:materialId', {
        preHandler: fastify.authorize(['student']),
        schema: {
            security: [{bearerAuth: []}],
            params: {
                type: 'object',
                properties: {
                    materialId: {type: 'string'}
                }
            },
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
        const {materialId} = request.params;
        const userId = request.user.id;

        if (!mongoose.isValidObjectId(materialId)) {
            return reply.code(404).send({message: 'Material tidak ditemukan'});
        }

        const user = await User.findById(userId);
        if (!user) {
            return reply.code(404).send({message: 'Pengguna tidak ditemukan'});
        }

        const reactionIndex = user.reactions.findIndex(r =>
            r.type === 'material' && r.materialId?.toString() === materialId
        );

        if (reactionIndex === -1) {
            return reply.code(404).send({message: 'Reaksi tidak ditemukan'});
        }

        user.reactions.splice(reactionIndex, 1);
        await user.save();

        return {message: 'Reaksi berhasil dihapus'};
    });

    // Delete reaction by practiceCode
    fastify.delete('/reactions/practice/:practiceCode', {
        preHandler: fastify.authorize(['student']),
        schema: {
            security: [{bearerAuth: []}],
            params: {
                type: 'object',
                properties: {
                    practiceCode: {type: 'string'}
                }
            },
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
        const {practiceCode} = request.params;
        const userId = request.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return reply.code(404).send({message: 'Pengguna tidak ditemukan'});
        }

        const reactionIndex = user.reactions.findIndex(r =>
            r.type === 'practice' && r.practiceCode === practiceCode
        );

        if (reactionIndex === -1) {
            return reply.code(404).send({message: 'Reaksi tidak ditemukan'});
        }

        user.reactions.splice(reactionIndex, 1);
        await user.save();

        return {message: 'Reaksi berhasil dihapus'};
    });
}
