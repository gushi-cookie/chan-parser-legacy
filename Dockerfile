FROM node:latest

WORKDIR /app
EXPOSE 1337/tcp

CMD node ./index.js