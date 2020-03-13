FROM node:12-slim
WORKDIR /usr/src/server

COPY package*.json ./
RUN npm install
COPY . .

CMD ["npm", "start"]