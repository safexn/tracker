FROM node:16-alpine

RUN apk add curl

ADD . /usr/src/node/server/

WORKDIR /usr/src/node/server/

EXPOSE 3000

CMD [ "sh", "-c", "node ./build/index.js" ]
