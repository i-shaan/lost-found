// src/utils/swagger.ts

import swaggerJsdoc from 'swagger-jsdoc';

export const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lost & Found API',
      version: '1.0.0',
      description: 'API documentation for Lost & Found service',
    },
    servers: [
      {
        url: '/api', // Base path
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the route files for Swagger comments
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
