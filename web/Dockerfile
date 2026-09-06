FROM node:22-alpine
WORKDIR /app
COPY . .
RUN node build.js
ENV PORT=8080 MAZER_DATA=/data
VOLUME ["/data"]
EXPOSE 8080
CMD ["node", "server.js"]
