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

const chalk = require('chalk');

const dockerClient = require('./docker-client');

const generateResult = (name, passed, warning = false) => {
  let message;
  if(passed) {
    message = `    ${name.padEnd(32, '.')}...${chalk.green('OK')}`;
  } else if(warning) {
    message = `    ${name.padEnd(32, '.')}...${chalk.yellow('WARN')}`;
  } else {
    message = `    ${name.padEnd(32, '.')}...${chalk.red('FAIL')}`;
  }
  return {
    message,
    passed,
    warning
  };
};

const checkCpuLimit = (service) => {
  return generateResult('CPU Limit', service.Spec.TaskTemplate.Resources && service.Spec.TaskTemplate.Resources.Limits && !isNaN(service.Spec.TaskTemplate.Resources.Limits.NanoCPUs));
};

const checkMemoryLimit = (service) => {
  return generateResult('Memory Limit', service.Spec.TaskTemplate.Resources && service.Spec.TaskTemplate.Resources.Limits && !isNaN(service.Spec.TaskTemplate.Resources.Limits.MemoryBytes));
};

const checkUseOfHttpRoutingMeshLabels = (service) => {
  const serviceLabels = Object.keys(service.Spec.Labels);
  return generateResult('HTTP Routing Mesh Labels', !serviceLabels.some((label) => label.startsWith('com.docker.ucp.mesh.http')));
};

const checkUseofHttpRoutingMeshNetworks = async (service) => {
  const networkIds = service.Spec.TaskTemplate.Networks.map((network) => network.Target);
  let hrmNetworkFound = false;
  for(const networkId of networkIds) {
    const network = await dockerClient.getNetwork(networkId).inspect();
    const networkLabels = Object.keys(network.Labels);
    hrmNetworkFound = networkLabels.some((label) => label.startsWith('com.docker.ucp.mesh.http'));
    if(hrmNetworkFound) {
      break;
    }
  }
  return generateResult('HTTP Routing Mesh Network', !hrmNetworkFound);
};

const checkInterlockNetworkLabel = async (service) => {
  const serviceLabels = Object.keys(service.Spec.Labels);
  let validInterlockNetworkLabel = true;
  if(serviceLabels.includes('com.docker.lb.hosts')) {
    const interlockNetworkLabel = service.Spec.Labels['com.docker.lb.network'];
    const networkCount = service.Spec.TaskTemplate.Networks.length;
    if(networkCount > 1 && !interlockNetworkLabel) {
      validInterlockNetworkLabel = false;
    } else {
      try {
        await dockerClient.getNetwork(interlockNetworkLabel).inspect();
        // If no error caught then the network actually exists
      } catch (err) {
        validInterlockNetworkLabel = false;
      }
    }
  }
  return generateResult('Interlock Network Label', validInterlockNetworkLabel)
};

const checkInterlockUpdateDelay = (service) => {
  const serviceLabels = Object.keys(service.Spec.Labels);
  let validInterlockUpdateDelay = true;
  if(serviceLabels.includes('com.docker.lb.hosts')) {
    validInterlockUpdateDelay = !isNaN(service.Spec.UpdateConfig.Delay);
  }
  return generateResult('Interlock Update Delay', validInterlockUpdateDelay, true);
};

const checkRestartPolicyMaxAttempts = (service) => {
  const restartPolicy = service.Spec.TaskTemplate.RestartPolicy || {};
  const maxAttempts = restartPolicy.MaxAttempts;
  const window = restartPolicy.Window;
  return generateResult('Restart Policy Max Attempts', !(maxAttempts > 0 && (isNaN(window) || window === 0)), true);
};

const checkRestartPolicyDelay = (service) => {
  const restartPolicy = service.Spec.TaskTemplate.RestartPolicy || {};
  const maxAttempts = restartPolicy.MaxAttempts;
  // Delay is specified in nanoseconds
  const delay = restartPolicy.Delay / 10**9;
  return generateResult('Restart Policy Delay', (maxAttempts > 0 || (!isNaN(delay) && delay >= 10)), true);
};

module.exports = [
  checkCpuLimit,
  checkMemoryLimit,
  checkUseOfHttpRoutingMeshLabels,
  checkUseofHttpRoutingMeshNetworks,
  checkInterlockNetworkLabel,
  checkInterlockUpdateDelay,
  checkRestartPolicyMaxAttempts,
  checkRestartPolicyDelay
];
