FROM node:20-alpine

RUN mkdir /bot

RUN mkdir /bot/data
RUN mkdir /bot/config
RUN mkdir /bot/logs
RUN mkdir /bot/instances

WORKDIR /bot

# Install dependencies

ADD package.json /bot/package.json
ADD package-lock.json /bot/package-lock.json

RUN npm install

# Add source files

ADD . /bot

ENV NODE_ENV=production

# Entry point

ENTRYPOINT ["node", "run-forever"]
