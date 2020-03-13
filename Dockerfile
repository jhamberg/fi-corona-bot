FROM node:12-slim
WORKDIR /usr/src/server

COPY package*.json ./

#RUN npm install
RUN npm install
CMD ["npm", "start"]
