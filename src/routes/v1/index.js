import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { userRoute } from './userRoute'
import { exampleRoute } from './exampleRoute'
import { GET_DB } from '~/config/mongodb'

const Router = express.Router()

/**
 * Health check for monitoring (UptimeRobot, Render Health Check Path, ...)
 * - Pings MongoDB to verify the database is actually reachable
 * - Returns 503 SERVICE_UNAVAILABLE when the DB is down so monitoring can alert
 */
Router.get('/health', async (req, res) => {
  const payload = {
    status: 'ok',
    db: 'up',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  }
  try {
    await GET_DB().command({ ping: 1 })
    res.status(StatusCodes.OK).json(payload)
  } catch (error) {
    res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
      ...payload,
      status: 'degraded',
      db: 'down',
      error: error?.message || 'database ping failed'
    })
  }
})

// Service health check route
Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({
    status: 'OK',
    message: 'APIs V1 are operational and ready to use.'
  })
})

// User & Authentication routes
Router.use('/users', userRoute)

// Example CRUD resource routes
Router.use('/examples', exampleRoute)

export const APIs_V1 = Router

