FROM node:14-alpine

WORKDIR /app

COPY . .

RUN npm install

# Development
CMD ["npm", "run", "start"]

# Production