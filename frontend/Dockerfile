FROM node:18-alpine AS builder

WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=4096 --openssl-legacy-provider"
ENV GENERATE_SOURCEMAP=false

COPY package.json package-lock.json ./
RUN npm install

COPY . .
COPY .env.docker .env

RUN npm run build


FROM nginx:1-alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]