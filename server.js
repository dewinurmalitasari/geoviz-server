import Fastify from 'fastify'
import routes from "./route/route.js";
import auth from "./plugins/auth.js";
import { config } from 'dotenv'
import mongoosePlugin from './plugins/mongoose.js'
import User from "./model/User.js";
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

config()

const fastify = Fastify({
    logger: true
})

// Swagger configuration
fastify.register(swagger, {
    swagger: {
        info: {
            title: 'GeoViz API Documentation',
            description: 'Back-End Server for GeoViz',
            version: '1.0.0'
        },
        // host: `${process.env.HOST}:${process.env.PORT}`,
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json'],
        securityDefinitions: {
            bearerAuth: {
                type: 'apiKey',
                name: 'Authorization',
                in: 'header',
                description: 'Enter JWT token in the format: Bearer <token>'
            }
        }
    }
})

// Swagger UI configuration
fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'full',
        deepLinking: false
    },
    uiHooks: {
        onRequest: function (request, reply, next) { next() },
        preHandler: function (request, reply, next) { next() }
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => { return swaggerObject },
    transformSpecificationClone: true
})

fastify.register(mongoosePlugin)
fastify.register(auth)
fastify.register(routes)

const start = async () => {
    try {
        await fastify.listen({port: process.env.PORT, host: process.env.HOST})
        console.log(`Documentation available at http://${process.env.HOST}:${process.env.PORT}/docs`)
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

start()

export async function build() {
    const fastify = Fastify({
        logger: false // Disable logger during tests for cleaner output
    })

    // Register Swagger for test build as well
    fastify.register(swagger, {
        swagger: {
            info: {
                title: 'GeoViz API Documentation',
                description: 'Back-End Server for GeoViz',
                version: '1.0.0'
            },
            host: 'localhost:3000', // Default for tests
            schemes: ['http'],
            consumes: ['application/json'],
            produces: ['application/json']
        }
    })

    fastify.register(swaggerUi, {
        routePrefix: '/docs'
    })

    fastify.register(mongoosePlugin)
    fastify.register(auth)
    fastify.register(routes)

    return fastify
}