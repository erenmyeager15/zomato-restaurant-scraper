FROM apify/actor-node-playwright-chrome:20

COPY package*.json ./
RUN npm ci --include=dev

COPY . ./
RUN npm run build

CMD ["npm", "start"]
