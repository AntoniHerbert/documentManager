FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npx prisma generate

RUN npx prisma migrate dev --name init --skip-seed --preview-feature

EXPOSE 3000

CMD ["npm", "start"]
