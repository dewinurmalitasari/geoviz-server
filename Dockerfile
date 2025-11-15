# Use the official Node.js runtime as a base image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Copy environment file
COPY .env .env

# Expose the port from your env (default to 3000 if not set)
EXPOSE ${PORT:-3000}

# Command to run the application
CMD ["npm", "start"]