FROM node

RUN apt-get update && \
    apt-get install -y vim \
    curl

COPY server /opt/server
WORKDIR /opt/server
RUN npm install -g babel-cli
RUN npm install

EXPOSE 3000
CMD npm run start-docker
#CMD sleep 3000