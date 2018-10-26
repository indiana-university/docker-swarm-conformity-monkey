FROM node:10.12.0-alpine
LABEL maintainer="ESI Middleware Team <bl-uits-esi-sit@exchange.uits.iu.edu>"

WORKDIR /usr/src/app
ENTRYPOINT ["/usr/src/app/docker-entrypoint.sh"]
CMD ["all"]

RUN apk add --no-cache git

COPY package.json /usr/src/app/
RUN npm install --no-package-lock

COPY check docker-entrypoint.sh /usr/src/app/
COPY src/ /usr/src/app/src/
RUN chmod u+x check docker-entrypoint.sh
