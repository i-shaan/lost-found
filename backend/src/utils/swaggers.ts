import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lost & Found Platform API',
      version: '1.0.0',
      description: 'AI-powered Lost & Found platform API with advanced matching, real-time communication, and comprehensive item management',
      contact: {
        name: 'Lost & Found Team',
        email: 'support@lostfound.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.lostfound.com/api/v1' 
          : `http://localhost:${5001}/api/v1`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login endpoint',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refreshToken',
          description: 'Refresh token stored in httpOnly cookie',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            phone: { type: 'string', example: '+1234567890' },
            avatar: { type: 'string', format: 'uri', example: 'https://example.com/avatar.jpg' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
            location: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['Point'], example: 'Point' },
                coordinates: { 
                  type: 'array', 
                  items: { type: 'number' },
                  minItems: 2,
                  maxItems: 2,
                  example: [-73.968285, 40.785091]
                },
                address: { type: 'string', example: 'New York, NY' }
              }
            },
            emailVerified: { type: 'boolean', example: true },
            phoneVerified: { type: 'boolean', example: false },
            isActive: { type: 'boolean', example: true },
            lastLogin: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Item: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            title: { type: 'string', example: 'Lost iPhone 14 Pro' },
            description: { type: 'string', example: 'Black iPhone 14 Pro lost at Central Park near the lake' },
            category: { 
              type: 'string', 
              enum: ['Electronics', 'Jewelry', 'Clothing', 'Bags & Wallets', 'Keys', 'Documents', 'Toys', 'Sports Equipment', 'Books & Stationery', 'Accessories', 'Other'],
              example: 'Electronics'
            },
            type: { type: 'string', enum: ['lost', 'found'], example: 'lost' },
            images: { 
              type: 'array', 
              items: { type: 'string', format: 'uri' },
              example: ['https://res.cloudinary.com/demo/image/upload/sample.jpg']
            },
            location: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['Point'], example: 'Point' },
                coordinates: { 
                  type: 'array', 
                  items: { type: 'number' },
                  minItems: 2,
                  maxItems: 2,
                  example: [-73.968285, 40.785091]
                },
                address: { type: 'string', example: 'Central Park, New York, NY' }
              }
            },
            dateReported: { type: 'string', format: 'date-time' },
            dateLostFound: { type: 'string', format: 'date-time' },
            status: { 
              type: 'string', 
              enum: ['active', 'matched', 'claimed', 'expired'],
              example: 'active'
            },
            reporter: { $ref: '#/components/schemas/User' },
            tags: { 
              type: 'array', 
              items: { type: 'string' },
              example: ['phone', 'black', 'apple']
            },
            reward: { type: 'number', minimum: 0, example: 100 },
            contactPreference: { 
              type: 'string', 
              enum: ['platform', 'direct'],
              example: 'platform'
            },
            views: { type: 'number', example: 25 },
            isPublic: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            conversation: { type: 'string', example: '507f1f77bcf86cd799439012' },
            sender: { $ref: '#/components/schemas/User' },
            receiver: { $ref: '#/components/schemas/User' },
            content: { type: 'string', example: 'Hi, I think I found your phone!' },
            type: { type: 'string', enum: ['text', 'image', 'system'], example: 'text' },
            read: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            participants: { 
              type: 'array', 
              items: { $ref: '#/components/schemas/User' }
            },
            item: { $ref: '#/components/schemas/Item' },
            lastMessage: { $ref: '#/components/schemas/Message' },
            lastActivity: { type: 'string', format: 'date-time' },
            status: { 
              type: 'string', 
              enum: ['active', 'archived', 'blocked'],
              example: 'active'
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Users',
        description: 'User profile and account management'
      },
      {
        name: 'Items',
        description: 'Lost and found items management'
      },
      {
        name: 'Messages',
        description: 'Real-time messaging and conversations'
      },
      {
        name: 'Upload',
        description: 'File upload and media management'
      },
      {
        name: 'Admin',
        description: 'Administrative functions and dashboard'
      }
    ]
  },
  apis: ['./src/routes/*.ts'], // Path to the API docs
};

export const specs = swaggerJsdoc(options);
export const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Lost & Found API Documentation',
};

export { swaggerUi };