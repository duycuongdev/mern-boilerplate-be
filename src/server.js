import express from 'express'
import exitHook from 'async-exit-hook'
import { CONNECT_DB, CLOSE_DB } from '~/config/mongodb'
import { env } from '~/config/environment'
import { APIs_V1 } from '~/routes/v1'
import { errorHandlingMiddleware } from '~/middlewares/errorHandlingMiddleware'
import { rateLimiterMiddleware } from '~/middlewares/rateLimiterMiddleware'
import { CREATE_DB_INDEXES } from '~/config/indexes'
import { logger } from '~/utils/logger'
import cors from 'cors'
import { corsOptions } from '~/config/cors'
import cookieParser from 'cookie-parser'
import socketIo from 'socket.io'
import http from 'http'
import { initSocketEvents, setSocketServerInstance } from '~/sockets/socketServer'
import { socketAuthMiddleware } from '~/sockets/socketAuthMiddleware'

const START_SERVER = () => {
  const app = express()

  // Disable x-powered-by header to prevent server fingerprinting
  app.disable('x-powered-by')

  // Enable trust proxy for correct IP identification behind Cloudflare / Render / Nginx reverse proxies
  app.set('trust proxy', 1)

  // Basic HTTP security headers (anti-sniffing, anti-clickjacking, XSS filter)
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    next()
  })

  // Parse Cookie header and populate req.cookies
  app.use(cookieParser())

  // Disable aggressive caching for API responses
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  // CORS configuration
  app.use(cors(corsOptions))

  // Parse incoming JSON payloads
  app.use(express.json())

  // Apply global rate limiting to all /v1 endpoints
  app.use('/v1', rateLimiterMiddleware.apiLimiter, APIs_V1)

  // Root health-check endpoint (for ping services like UptimeRobot)
  app.get('/', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'MERN Boilerplate API is running smoothly!' })
  })

  // Centralized Error Handling Middleware
  app.use(errorHandlingMiddleware)

  // Create HTTP server wrapping Express
  const server = http.createServer(app)

  // Create Socket.IO server
  const io = new socketIo.Server(server, { cors: corsOptions })
  // Register io instance for the service layer (e.g. kick users from rooms)
  setSocketServerInstance(io)
  // Mandatory JWT authentication at handshake - unauthenticated connections are rejected
  io.use(socketAuthMiddleware)
  io.on('connection', (socket) => {
    initSocketEvents(socket, io)
  })

  // Start listening
  if (env.BUILD_MODE === 'production') {
    const port = process.env.PORT || 8000
    server.listen(port, () => {
      logger.info(`🚀 Production server running on port: ${port}`)
    })
  } else {
    server.listen(env.LOCAL_DEV_APP_PORT, env.LOCAL_DEV_APP_HOST, () => {
      logger.info(`🛠️ Local Dev server running at http://${env.LOCAL_DEV_APP_HOST}:${env.LOCAL_DEV_APP_PORT}`)
    })
  }

  // Graceful shutdown on process termination
  exitHook(() => {
    logger.info('🔄 Server is shutting down, closing database connections...')
    CLOSE_DB()
    logger.info('✅ Database connections closed cleanly.')
  })
}

// Connect to MongoDB before starting server
(async () => {
  try {
    logger.info('⏳ Connecting to MongoDB...')
    await CONNECT_DB()
    logger.info('✅ Successfully connected to MongoDB!')

    // Ensure required indexes exist (idempotent, non-fatal on error)
    await CREATE_DB_INDEXES()

    START_SERVER()
  } catch (error) {
    logger.error('❌ Failed to connect to MongoDB:', error)
    process.exit(1)
  }
})()
