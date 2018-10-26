'use strict';

const Docker = require('dockerode');
const fs = require('fs');
const path = require('path')

let dockerClient = undefined;

if(process.env.DOCKER_HOST) {
  const [ , host, port ] = process.env.DOCKER_HOST.match(/tcp:\/\/(.+):(\d+)/);
  dockerClient = new Docker({
    host,
    port,
    ca: fs.readFileSync(path.join(process.env.DOCKER_CERT_PATH, 'ca.pem')),
    cert: fs.readFileSync(path.join(process.env.DOCKER_CERT_PATH, 'cert.pem')),
    key: fs.readFileSync(path.join(process.env.DOCKER_CERT_PATH, 'key.pem')),
  });
} else if(fs.existsSync('/var/run/docker.sock')) {
  dockerClient = new Docker({
    socketPath: '/var/run/docker.sock'
  });
} else {
  dockerClient = new Docker({
    host: 'localhost',
    port: 2375,
    protocol: 'http'
  });
}

module.exports = dockerClient;
