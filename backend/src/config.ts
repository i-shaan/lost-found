// src/config.ts

if (!process.env.JWT_SECRET) {
    throw new Error("Missing environment variable: JWT_SECRET");
  }
  
  if (!process.env.JWT_EXPIRES_IN) {
    throw new Error("Missing environment variable: JWT_EXPIRES_IN");
  }
  
  // Add any others as needed
  export const JWT_SECRET = process.env.JWT_SECRET;
  export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
  