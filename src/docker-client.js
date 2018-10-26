/*
BSD 3-Clause License

Copyright (c) 2018, Indiana University
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
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
