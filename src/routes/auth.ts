import { Router, Request, Response } from 'express'
import { OAuth2Client } from 'google-auth-library'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'

const router = Router()
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Sign in with Google
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *             properties:
 *               credential:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token and user
 *       401:
 *         description: Invalid Google token
 */
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload || !payload.sub || !payload.email) {
      res.status(401).json({ message: 'Invalid Google token' })
      return
    }

    let user = await (prisma as any).user.findUnique({
      where: { googleId: payload.sub },
    })

    if (!user) {
      user = await (prisma as any).user.create({
        data: {
          googleId: payload.sub,
          email: payload.email,
          name: payload.name || '',
          avatarUrl: payload.picture || null,
        },
      })
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    )

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    })
  } catch (err) {
    console.error('Google auth error:', err)
    res.status(401).json({ message: 'Authentication failed' })
  }
})

export default router