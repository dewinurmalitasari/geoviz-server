import Material from "../model/Material.js";
import mongoose from "mongoose";

// Helper function to validate YouTube URL format
function isValidYouTubeUrl(url) {
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/;
    return youtubeRegex.test(url);
}

export default async function materialRoutes(fastify) {
    // Get all materials
    fastify.get('/materials', {
        preHandler: fastify.authorize(['admin', 'teacher', 'student']),
        schema: {
            security: [{bearerAuth: []}],
            querystring: {
                type: 'object',
                properties: {
                    onlyIdTitleDesc: {type: 'boolean'}
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'},
                        materials: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    _id: {type: 'string'},
                                    title: {type: 'string'},
                                    description: {type: 'string'},
                                    formula: {type: 'string'},
                                    example: {type: 'string'},
                                    youtubeLinks: {type: 'array', items: {type: 'string'}},
                                    imageLinks: {type: 'array', items: {type: 'string'}},
                                    createdAt: {type: 'string'},
                                    updatedAt: {type: 'string'}
                                }
                            }
                        }
                    }
                }
            }
        }
    }, async (request) => {
        const {onlyIdTitleDesc} = request.query;

        if (onlyIdTitleDesc) {
            const materials = await Material.find().select('_id title description').lean();
            return {message: 'Materi berhasil diambil', materials};
        }

        const materials = await Material.find().lean();
        return {message: 'Materi berhasil diambil', materials};
    });

    // Get material by ID
    fastify.get('/materials/:id', {
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
                        material: {
                            type: 'object',
                            properties: {
                                _id: {type: 'string'},
                                title: {type: 'string'},
                                description: {type: 'string'},
                                formula: {type: 'string'},
                                example: {type: 'string'},
                                youtubeLinks: {type: 'array', items: {type: 'string'}},
                                imageLinks: {type: 'array', items: {type: 'string'}},
                                createdAt: {type: 'string'},
                                updatedAt: {type: 'string'}
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
        const {id} = request.params;

        if (!mongoose.isValidObjectId(id)) {
            return reply.code(404).send({message: 'Materi tidak ditemukan'});
        }

        const material = await Material.findById(id).lean();
        if (!material) {
            return reply.code(404).send({message: 'Materi tidak ditemukan'});
        }

        return {message: 'Materi berhasil diambil', material};
    });

    // Create new material
    fastify.post('/materials', {
        preHandler: fastify.authorize(['admin']),
        schema: {
            security: [{bearerAuth: []}],
            body: {
                type: 'object',
                required: ['title', 'description', 'formula', 'example'],
                properties: {
                    title: {type: 'string', minLength: 1, maxLength: 255},
                    description: {type: 'string', minLength: 1},
                    formula: {type: 'string', minLength: 1},
                    example: {type: 'string', minLength: 1},
                    youtubeLinks: {type: 'array', items: {type: 'string'}},
                    imageLinks: {type: 'array', items: {type: 'string'}}
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'},
                        material: {
                            type: 'object',
                            properties: {
                                _id: {type: 'string'},
                                title: {type: 'string'},
                                description: {type: 'string'},
                                formula: {type: 'string'},
                                example: {type: 'string'},
                                youtubeLinks: {type: 'array', items: {type: 'string'}},
                                imageLinks: {type: 'array', items: {type: 'string'}},
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
        const {title, description, formula, example, youtubeLinks = [], imageLinks = []} = request.body;

        // Validate YouTube URLs
        if (youtubeLinks.length > 0) {
            for (const url of youtubeLinks) {
                if (!isValidYouTubeUrl(url)) {
                    return reply.code(400).send({
                        message: 'Format URL YouTube tidak valid. Gunakan format: https://www.youtube.com/watch?v=VIDEO_ID'
                    });
                }
            }
        }

        // Check if material with same title already exists
        const existingMaterial = await Material.findOne({title});
        if (existingMaterial) {
            return reply.code(409).send({message: 'Materi dengan judul ini sudah ada'});
        }

        const material = await Material.create({
            title,
            description,
            formula,
            example,
            youtubeLinks,
            imageLinks
        });

        reply.code(201).send({message: 'Materi berhasil dibuat', material});
    });

    // Update material by ID
    fastify.put('/materials/:id', {
        preHandler: fastify.authorize(['admin']),
        schema: {
            security: [{bearerAuth: []}],
            params: {
                type: 'object',
                properties: {
                    id: {type: 'string'}
                }
            },
            body: {
                type: 'object',
                properties: {
                    title: {type: 'string', minLength: 1, maxLength: 255},
                    description: {type: 'string', minLength: 1},
                    formula: {type: 'string', minLength: 1},
                    example: {type: 'string', minLength: 1},
                    youtubeLinks: {type: 'array', items: {type: 'string'}},
                    imageLinks: {type: 'array', items: {type: 'string'}}
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: {type: 'string'},
                        material: {
                            type: 'object',
                            properties: {
                                _id: {type: 'string'},
                                title: {type: 'string'},
                                description: {type: 'string'},
                                formula: {type: 'string'},
                                example: {type: 'string'},
                                youtubeLinks: {type: 'array', items: {type: 'string'}},
                                imageLinks: {type: 'array', items: {type: 'string'}},
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
        const {id} = request.params;
        const {title, description, formula, example, youtubeLinks, imageLinks} = request.body;

        if (!mongoose.isValidObjectId(id)) {
            return reply.code(404).send({message: 'Materi tidak ditemukan'});
        }

        // Validate YouTube URLs if provided
        if (youtubeLinks && youtubeLinks.length > 0) {
            for (const url of youtubeLinks) {
                if (!isValidYouTubeUrl(url)) {
                    return reply.code(400).send({
                        message: 'Format URL YouTube tidak valid. Gunakan format: https://www.youtube.com/watch?v=VIDEO_ID'
                    });
                }
            }
        }

        // Check if material exists
        const material = await Material.findById(id);
        if (!material) {
            return reply.code(404).send({message: 'Materi tidak ditemukan'});
        }

        // Check if title is being changed and if it conflicts with existing material
        if (title && title !== material.title) {
            const existingMaterial = await Material.findOne({title});
            if (existingMaterial) {
                return reply.code(409).send({message: 'Materi dengan judul ini sudah ada'});
            }
        }

        // Update material
        const updateData = {};
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (formula) updateData.formula = formula;
        if (example) updateData.example = example;
        if (youtubeLinks !== undefined) updateData.youtubeLinks = youtubeLinks;
        if (imageLinks !== undefined) updateData.imageLinks = imageLinks;

        const updatedMaterial = await Material.findByIdAndUpdate(
            id,
            updateData,
            {new: true, runValidators: true}
        );

        return {
            message: 'Materi berhasil diperbarui',
            material: updatedMaterial
        };
    });

    // Delete material by ID
    fastify.delete('/materials/:id', {
        preHandler: fastify.authorize(['admin']),
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
            return reply.code(404).send({message: 'Materi tidak ditemukan'});
        }

        const material = await Material.findByIdAndDelete(id);
        if (!material) {
            return reply.code(404).send({message: 'Materi tidak ditemukan'});
        }

        return {message: 'Materi berhasil dihapus'};
    });
}