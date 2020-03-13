FROM node:12-slim
WORKDIR /usr/src/server

COPY package*.json ./

#RUN npm install
RUN cd $(npm root -g)/npm && npm install
CMD ["npm", "start"]
