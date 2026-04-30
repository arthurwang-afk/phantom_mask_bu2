import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import staticFiles from '@fastify/static'
import fjwt from '@fastify/jwt'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { pharmaciesRoutes } from './routes/pharmacies.js'
import { usersRoutes } from './routes/users.js'
import { purchasesRoutes } from './routes/purchases.js'
import { masksRoutes } from './routes/masks.js'
import { searchRoutes } from './routes/search.js'
import { authRoutes } from './routes/auth.js'
import { AppError } from './errors.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })

  app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  })

  app.register(rateLimit, { max: 100, timeWindow: '1 minute' })

  app.register(fjwt, { secret: process.env.JWT_SECRET ?? 'phantom-mask-dev-secret' })

  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify()
    } catch {
      reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Valid token required' })
    }
  })

  app.register(staticFiles, { root: join(__dirname, 'public'), prefix: '/' })

  app.register(swagger, {
    openapi: {
      info: { title: 'Phantom Mask API', description: 'Pharmacy platform REST API', version: '1.0.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  })

  app.register(swaggerUi, { routePrefix: '/docs', uiConfig: { docExpansion: 'list' } })

  app.get('/healthz', async () => ({ status: 'ok' }))

  app.register(authRoutes, { prefix: '/auth' })
  app.register(pharmaciesRoutes, { prefix: '/pharmacies' })
  app.register(usersRoutes, { prefix: '/users' })
  app.register(purchasesRoutes, { prefix: '/purchases' })
  app.register(masksRoutes, { prefix: '/masks' })
  app.register(searchRoutes, { prefix: '/search' })

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name,
        message: error.message,
      })
    }
    const statusCode = (error as any).statusCode ?? 500
    reply.status(statusCode).send({
      statusCode,
      error: error.name,
      message: error.message,
    })
  })

  return app
}
