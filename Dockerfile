# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose ports
EXPOSE 3000 8080

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["npm", "start"]
