import Material from "../model/Material.js";

export default async function materialRoutes(fastify) {
    // Get all materials
    fastify.get('/materials', {
        preHandler: fastify.authorize(['admin']),
        schema: {
            response: {
                200: {
                    type: 'object',
                    properties: {
                        materials: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    _id: { type: 'string' },
                                    title: { type: 'string' },
                                    description: { type: 'string' },
                                    formula: { type: 'string' },
                                    example: { type: 'string' },
                                    createdAt: { type: 'string' },
                                    updatedAt: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    }, async () => {
        const materials = await Material.find().sort({ createdAt: -1 });
        return { materials };
    });

    // Get material by ID
    fastify.get('/materials/:id', {
        preHandler: fastify.authorize(['admin']),
        schema: {
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
                        material: {
                            type: 'object',
                            properties: {
                                _id: { type: 'string' },
                                title: { type: 'string' },
                                description: { type: 'string' },
                                formula: { type: 'string' },
                                example: { type: 'string' },
                                createdAt: { type: 'string' },
                                updatedAt: { type: 'string' }
                            }
                        }
                    }
                },
                404: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { id } = request.params;

        const material = await Material.findById(id);
        if (!material) {
            return reply.code(404).send({ message: 'Material not found' });
        }

        return { material };
    });

    // Create new material
    fastify.post('/materials', {
        preHandler: fastify.authorize(['admin']),
        schema: {
            body: {
                type: 'object',
                required: ['title', 'description', 'formula', 'example'],
                properties: {
                    title: { type: 'string', minLength: 1, maxLength: 255 },
                    description: { type: 'string', minLength: 1 },
                    formula: { type: 'string', minLength: 1 },
                    example: { type: 'string', minLength: 1 }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        material: {
                            type: 'object',
                            properties: {
                                _id: { type: 'string' },
                                title: { type: 'string' },
                                description: { type: 'string' },
                                formula: { type: 'string' },
                                example: { type: 'string' },
                                createdAt: { type: 'string' },
                                updatedAt: { type: 'string' }
                            }
                        }
                    }
                },
                409: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { title, description, formula, example } = request.body;

        // Check if material with same title already exists
        const existingMaterial = await Material.findOne({ title });
        if (existingMaterial) {
            return reply.code(409).send({ message: 'Material with this title already exists' });
        }

        const material = await Material.create({
            title,
            description,
            formula,
            example
        });

        reply.code(201).send({material});
    });

    // Update material by ID
    fastify.put('/materials/:id', {
        preHandler: fastify.authorize(['admin']),
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    title: { type: 'string', minLength: 1, maxLength: 255 },
                    description: { type: 'string', minLength: 1 },
                    formula: { type: 'string', minLength: 1 },
                    example: { type: 'string', minLength: 1 }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        material: {
                            type: 'object',
                            properties: {
                                _id: { type: 'string' },
                                title: { type: 'string' },
                                description: { type: 'string' },
                                formula: { type: 'string' },
                                example: { type: 'string' },
                                createdAt: { type: 'string' },
                                updatedAt: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { id } = request.params;
        const { title, description, formula, example } = request.body;

        // Check if material exists
        const material = await Material.findById(id);
        if (!material) {
            return reply.code(404).send({ message: 'Material not found' });
        }

        // Check if title is being changed and if it conflicts with existing material
        if (title && title !== material.title) {
            const existingMaterial = await Material.findOne({ title });
            if (existingMaterial) {
                return reply.code(409).send({ message: 'Material with this title already exists' });
            }
        }

        // Update material
        const updateData = {};
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (formula) updateData.formula = formula;
        if (example) updateData.example = example;

        const updatedMaterial = await Material.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        return {
            material: updatedMaterial
        };
    });

    // Delete material by ID
    fastify.delete('/materials/:id', {
        preHandler: fastify.authorize(['admin']),
        schema: {
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
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { id } = request.params;

        const material = await Material.findByIdAndDelete(id);
        if (!material) {
            return reply.code(404).send({ message: 'Material not found' });
        }

        return { message: 'Material deleted successfully' };
    });
}