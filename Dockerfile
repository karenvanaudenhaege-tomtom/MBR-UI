FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY mbr_index_html.html ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
