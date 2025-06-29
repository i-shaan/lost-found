// import { Request, Response } from 'express';
// import jwt from 'jsonwebtoken';
// import User from '../models/Users';
// import { logger } from '../utils/loggers';
// import { sendEmail } from '../services/emailService';
// import { generateTokens, verifyRefreshToken} from '../utils/tokenUtils'

// export const register = async (req: Request, res: Response) => {
//   try {
//     const { name, email, password, phone } = req.body;

//     // Check if user already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: 'User already exists with this email'
//       });
//     }

//     // Create new user
//     const user = new User({
//       name,
//       email,
//       password,
//       phone
//     });

//     await user.save();

//     // Generate tokens
//     const { accessToken, refreshToken } = generateTokens((user._id as string).toString());

//     // Set refresh token as httpOnly cookie
//     res.cookie('refreshToken', refreshToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
//     });

//     // Send welcome email
//     try {
//       await sendEmail({
//         to: user.email,
//         subject: 'Welcome to Lost & Found Platform',
//         template: 'welcome',
//         data: { name: user.name }
//       });
//     } catch (emailError) {
//       logger.error('Failed to send welcome email:', emailError);
//     }

//     res.status(201).json({
//       success: true,
//       message: 'User registered successfully',
//       data: {
//         user: {
//           id: user._id,
//           name: user.name,
//           email: user.email,
//           role: user.role
//         },
//         accessToken
//       }
//     });

//   } catch (error) {
//     logger.error('Registration error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error'
//     });
//   }
// };

// export const login = async (req: Request, res: Response) => {
//   try {
//     const { email, password } = req.body;

//     // Find user and include password
//     const user = await User.findOne({ email }).select('+password');
//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials'
//       });
//     }

//     // Check if user is active
//     if (!user.isActive) {
//       return res.status(401).json({
//         success: false,
//         message: 'Account is deactivated'
//       });
//     }

//     // Verify password
//     const isPasswordValid = await user.comparePassword(password);
//     if (!isPasswordValid) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials'
//       });
//     }

//     // Update last login
//     user.lastLogin = new Date();
//     await user.save();

//     // Generate tokens
//     const { accessToken, refreshToken } = generateTokens((user._id as string).toString());

//     // Set refresh token as httpOnly cookie
//     res.cookie('refreshToken', refreshToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
//     });

//     res.json({
//       success: true,
//       message: 'Login successful',
//       data: {
//         user: {
//           id: user._id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//           avatar: user.avatar
//         },
//         accessToken
//       }
//     });

//   } catch (error) {
//     logger.error('Login error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error'
//     });
//   }
// };

// export const logout = async (req: Request, res: Response) => {
//   try {
//     res.clearCookie('refreshToken');
//     res.json({
//       success: true,
//       message: 'Logout successful'
//     });
//   } catch (error) {
//     logger.error('Logout error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error'
//     });
//   }
// };

// export const refreshToken = async (req: Request, res: Response) => {
//   try {
//     const { refreshToken } = req.cookies;

//     if (!refreshToken) {
//       return res.status(401).json({
//         success: false,
//         message: 'Refresh token not provided'
//       });
//     }

//     const decoded = verifyRefreshToken(refreshToken);
//     const user = await User.findById(decoded.userId);

//     if (!user || !user.isActive) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid refresh token'
//       });
//     }

//     const { accessToken, refreshToken: newRefreshToken } = generateTokens((user._id as string).toString());

//     // Set new refresh token
//     res.cookie('refreshToken', newRefreshToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
//     });

//     res.json({
//       success: true,
//       data: {
//         accessToken
//       }
//     });

//   } catch (error) {
//     logger.error('Refresh token error:', error);
//     res.status(401).json({
//       success: false,
//       message: 'Invalid refresh token'
//     });
//   }
// };

// export const getProfile = async (req: Request, res: Response) => {
//   try {
//     const user = await User.findById(req.user?.id);
    
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     res.json({
//       success: true,
//       data: { user }
//     });

//   } catch (error) {
//     logger.error('Get profile error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Internal server error'
//     });
//   }
// };