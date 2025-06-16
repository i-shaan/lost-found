import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lost & Found API',
      version: '1.0.0',
      description: 'API documentation for the Lost & Found Platform',
    },
    servers: [
      {
        url: 'http://localhost:5001', // change if needed
      },
    ],
    components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          Item: {
            type: 'object',
            required: ['title', 'description', 'category', 'type', 'location', 'reporter'],
            properties: {
              title: { type: 'string', example: 'Lost Wallet' },
              description: { type: 'string', example: 'Brown wallet with ID and cards' },
              category: {
                type: 'string',
                enum: [
                  'Electronics', 'Jewelry', 'Clothing', 'Bags & Wallets', 'Keys',
                  'Documents', 'Toys', 'Sports Equipment', 'Books & Stationery',
                  'Accessories', 'Other'
                ],
                example: 'Accessories'
              },
              type: {
                type: 'string',
                enum: ['lost', 'found'],
                example: 'lost'
              },
              images: {
                type: 'array',
                items: { type: 'string', format: 'uri' },
                example: ['https://example.com/image1.jpg']
              },
              location: {
                type: 'object',
                required: ['type', 'coordinates', 'address'],
                properties: {
                  type: {
                    type: 'string',
                    enum: ['Point'],
                    example: 'Point'
                  },
                  coordinates: {
                    type: 'array',
                    items: { type: 'number' },
                    minItems: 2,
                    maxItems: 2,
                    example: [77.5946, 12.9716]
                  },
                  address: {
                    type: 'string',
                    example: 'VIT Vellore'
                  }
                }
              },

              status: {
                type: 'string',
                enum: ['active', 'matched', 'claimed', 'expired'],
                example: 'active'
              },
              reporter: {
                type: 'string',
                format: 'uuid',
                example: '64dbf321d9e85b9c5a2c1c77'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                example: ['wallet', 'brown']
              },
            }
          }
        }
      },      
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // path to your route files
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
