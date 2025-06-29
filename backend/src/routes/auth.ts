// import express from 'express';
// import { body } from 'express-validator';
// import { validate } from '../middleware/validate';
// import auth from '../middleware/auth';
// import {
//   register,
//   login,
//   logout,
//   refreshToken,
//   getProfile
// } from '../controllers/authController'

// const router = express.Router();

// /**
//  * @swagger
//  * /auth/register:
//  *   post:
//  *     summary: Register a new user
//  *     tags: [Authentication]
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - name
//  *               - email
//  *               - password
//  *             properties:
//  *               name:
//  *                 type: string
//  *                 minLength: 2
//  *                 maxLength: 50
//  *                 example: "John Doe"
//  *               email:
//  *                 type: string
//  *                 format: email
//  *                 example: "john@example.com"
//  *               password:
//  *                 type: string
//  *                 minLength: 6
//  *                 example: "password123"
//  *               phone:
//  *                 type: string
//  *                 example: "+1234567890"
//  *     responses:
//  *       201:
//  *         description: User registered successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: true
//  *                 message:
//  *                   type: string
//  *                   example: "User registered successfully"
//  *                 data:
//  *                   type: object
//  *                   properties:
//  *                     user:
//  *                       $ref: '#/components/schemas/User'
//  *                     accessToken:
//  *                       type: string
//  *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
//  *         headers:
//  *           Set-Cookie:
//  *             description: Refresh token stored in httpOnly cookie
//  *             schema:
//  *               type: string
//  *               example: "refreshToken=abc123; HttpOnly; Secure; SameSite=Strict"
//  *       400:
//  *         description: Validation error or user already exists
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       500:
//  *         description: Internal server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */

// /**
//  * @swagger
//  * /auth/login:
//  *   post:
//  *     summary: Login user
//  *     tags: [Authentication]
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - email
//  *               - password
//  *             properties:
//  *               email:
//  *                 type: string
//  *                 format: email
//  *                 example: "john@example.com"
//  *               password:
//  *                 type: string
//  *                 example: "password123"
//  *     responses:
//  *       200:
//  *         description: Login successful
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: true
//  *                 message:
//  *                   type: string
//  *                   example: "Login successful"
//  *                 data:
//  *                   type: object
//  *                   properties:
//  *                     user:
//  *                       $ref: '#/components/schemas/User'
//  *                     accessToken:
//  *                       type: string
//  *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
//  *         headers:
//  *           Set-Cookie:
//  *             description: Refresh token stored in httpOnly cookie
//  *             schema:
//  *               type: string
//  *               example: "refreshToken=abc123; HttpOnly; Secure; SameSite=Strict"
//  *       401:
//  *         description: Invalid credentials or account deactivated
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       500:
//  *         description: Internal server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */

// /**
//  * @swagger
//  * /auth/logout:
//  *   post:
//  *     summary: Logout user
//  *     tags: [Authentication]
//  *     responses:
//  *       200:
//  *         description: Logout successful
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: true
//  *                 message:
//  *                   type: string
//  *                   example: "Logout successful"
//  *         headers:
//  *           Set-Cookie:
//  *             description: Refresh token cookie cleared
//  *             schema:
//  *               type: string
//  *               example: "refreshToken=; HttpOnly; Secure; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
//  *       500:
//  *         description: Internal server error
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */

// /**
//  * @swagger
//  * /auth/refresh-token:
//  *   post:
//  *     summary: Refresh access token
//  *     tags: [Authentication]
//  *     security:
//  *       - cookieAuth: []
//  *     responses:
//  *       200:
//  *         description: Token refreshed successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: true
//  *                 data:
//  *                   type: object
//  *                   properties:
//  *                     accessToken:
//  *                       type: string
//  *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
//  *         headers:
//  *           Set-Cookie:
//  *             description: New refresh token stored in httpOnly cookie
//  *             schema:
//  *               type: string
//  *               example: "refreshToken=xyz789; HttpOnly; Secure; SameSite=Strict"
//  *       401:
//  *         description: Invalid or missing refresh token
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */

// /**
//  * @swagger
//  * /auth/profile:
//  *   get:
//  *     summary: Get current user profile
//  *     tags: [Authentication]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: Profile retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: true
//  *                 data:
//  *                   type: object
//  *                   properties:
//  *                     user:
//  *                       $ref: '#/components/schemas/User'
//  *       401:
//  *         description: Unauthorized - Invalid or missing token
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       404:
//  *         description: User not found
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */

// // Validation rules
// const registerValidation = [
//   body('name')
//     .trim()
//     .isLength({ min: 2, max: 50 })
//     .withMessage('Name must be between 2 and 50 characters'),
//   body('email')
//     .isEmail()
//     .normalizeEmail()
//     .withMessage('Please provide a valid email'),
//   body('password')
//     .isLength({ min: 6 })
//     .withMessage('Password must be at least 6 characters long'),
//   body('phone')
//     .optional()
//     .isMobilePhone('any')
//     .withMessage('Please provide a valid phone number')
// ];

// const loginValidation = [
//   body('email')
//     .isEmail()
//     .normalizeEmail()
//     .withMessage('Please provide a valid email'),
//   body('password')
//     .notEmpty()
//     .withMessage('Password is required')
// ];

// // Routes
// router.post('/register', registerValidation, validate, register);
// router.post('/login', loginValidation, validate, login);
// router.post('/logout', logout);
// router.post('/refresh-token', refreshToken);
// router.get('/profile', auth, getProfile);

// export default router;