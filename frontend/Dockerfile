FROM node:20-alpine AS builder

WORKDIR /app
COPY . .
COPY .env.docker-compose.frontend .env.production
RUN npm install
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/out /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]