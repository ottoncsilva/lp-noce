# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Install pm2 globally
RUN npm install pm2 -g

# Copy app source code
COPY . .

# Ensure data directory has correct permissions
RUN mkdir -p data && chmod -R 777 data
RUN mkdir -p public/images && chmod -R 777 public/images

# Rebuild sharp for Linux alpine environment (vital for image compression on Alpine)
RUN npm rebuild sharp

# Expose port
EXPOSE 3000

# Start command
CMD ["pm2-runtime", "server.js"]
