import Fastify from 'fastify'
import routes from "./route/route.js";
import auth from "./plugins/auth.js";
import {config} from 'dotenv'
import mongoosePlugin from './plugins/mongoose.js'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import cors from '@fastify/cors'

config()

const fastify = Fastify({
    logger: true,
    ajv: {
        customOptions: {
            removeAdditional: false,
            useDefaults: true,
            coerceTypes: true,
            allErrors: true
        }
    },
    schemaErrorFormatter: (errors, dataVar) => {
        const messages = errors.map(err => {
            const field = err.instancePath.replace('/', '') || err.params.missingProperty;

            if (err.keyword === 'required') {
                return `${err.params.missingProperty} wajib diisi`;
            }
            if (err.keyword === 'minLength') {
                return `${field} minimal ${err.params.limit} karakter`;
            }
            if (err.keyword === 'maxLength') {
                return `${field} maksimal ${err.params.limit} karakter`;
            }
            if (err.keyword === 'enum') {
                return `${field} harus salah satu dari: ${err.params.allowedValues.join(', ')}`;
            }
            if (err.keyword === 'type') {
                return `${field} harus bertipe ${err.params.type}`;
            }
            return err.message;
        });

        return new Error(messages.join(', '));
    }
})

// CORS configuration for development
fastify.register(cors, {
    origin: (origin, cb) => {
        const allowedOrigins = [
            'http://localhost:', // Development
            'https://dewinurmalitasari.github.io' // Production
        ];

        if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
            cb(null, true);
        } else {
            cb(new Error('Not allowed'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Swagger configuration
fastify.register(swagger, {
    openapi: {
        info: {
            title: 'GeoViz API Documentation',
            description: 'Back-End Server for GeoViz',
            version: '1.0.0'
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    }
})

// Swagger UI configuration
fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'full',
        deepLinking: false,
        persistAuthorization: true,
        tryItOutEnabled: true
    },
    initOAuth: {},
    uiHooks: {
        onRequest: function (request, reply, next) {
            next()
        },
        preHandler: function (request, reply, next) {
            next()
        }
    }
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

export default async (req, res) => {
    await fastify.ready();
    fastify.server.emit('request', req, res);
}
