FROM keymetrics/pm2:8-alpine

# Nginx
RUN apk add --no-cache nginx && \
    mkdir -p /run/nginx/ && \
    mkdir -p /var/lib/app/data && \
    chown -R nginx:nginx /var/lib/app/data && \
    rm /etc/nginx/conf.d/default.conf
COPY ["resources/discloud-core.conf", "/etc/nginx/conf.d/"]

# Bundle APP files
RUN ["mkdir", "-p", "/var/lib/app"]
RUN ["mkdir", "-p", "/var/lib/app/log"]
COPY ["src", "/var/lib/app/src/"]
COPY ["config", "/var/lib/app/config/"]
COPY ["index.js", "boot.js", "app.js", "config.json", "config.js", "package.json", "process.json", "/var/lib/app/"]

# Install app dependencies
ENV NPM_CONFIG_LOGLEVEL warn
RUN cd /var/lib/app ; npm install --production --no-optional

# Run nginx
RUN nginx

ENV NODE_ENV production
ENV NODE_PORT 8000
WORKDIR /var/lib/app
CMD [ "pm2-runtime", "start", "process.json" ]
