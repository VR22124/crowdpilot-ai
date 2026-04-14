FROM node:20-alpine
WORKDIR /app
COPY server.js ./server.js
RUN npm init -y && npm install express
EXPOSE 8080
CMD ["node", "server.js"]
