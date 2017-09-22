FROM node

RUN apt-get update && \
    apt-get install -y vim \
    curl

COPY server /opt
WORKDIR /opt
RUN npm install -g babel-cli
RUN npm install

EXPOSE 3000
CMD npm start
#CMD sleep 3000