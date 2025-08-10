# Uses the official Playwright image with Node.js and browsers pre-installed
FROM mcr.microsoft.com/playwright:v1.45.0-jammy

# Sets the working directory inside the container
WORKDIR /usr/src/app

# Copies the project definition files
COPY package*.json ./

# Installs dependencies optimized for production
RUN npm ci --only=production

# Copies the source code of our application
COPY ./src ./src

# Exposes the port that our API will use
EXPOSE 3000

# Default command to start the application
CMD ["node", "src/bridge-server.js"]