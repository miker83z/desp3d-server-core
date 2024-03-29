FROM node:19.5.0

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY . .

RUN npm install

#EXPOSE 3162

CMD ["npm", "run", "start"]