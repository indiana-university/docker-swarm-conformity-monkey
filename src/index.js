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

const program = require('caporal');
const chalk = require('chalk');

const projectConfig = require('../package.json');
const dockerClient = require('./docker-client');
const logger = require('./logger');
const serviceChecks = require('./service-checks');

process.on('uncaughtException', (err) => {
  logger.error(err.message);
  process.exit(2);
});

process.on('unhandledRejection', (err) => {
  logger.error(err.message);
  process.exit(2);
});

const check = async ({ serviceName }, options) => {
  let errorCount = 0;
  if(serviceName && serviceName !== 'all') {
    const service = await dockerClient.getService(serviceName).inspect();
    errorCount = await checkService(service, options);
  } else {
    errorCount = await checkAllServices(options);
  }
  process.exit(errorCount > 0 ? 1 : 0);
};

const checkService = async (service, options) => {
  const serviceName = service.Spec.Name;
  const results = await Promise.all(serviceChecks.map(async (serviceCheck) => await serviceCheck(service)));
  const passedCount = results.filter((result) => result.passed).length;
  const errorCount = results.filter((result) => !result.passed && !result.warning).length;
  const warningCount = results.filter((result) => !result.passed && result.warning).length;
  const summary = `${serviceName} (${passedCount} ${chalk.green('passed')}${errorCount > 0 ? `, ${errorCount} ${chalk.red('failed')}` : ''}${ warningCount > 0 ? `, ${warningCount} ${chalk.yellow(warningCount === 1 ? 'warning' : 'warnings')}` : ''})`
  if(errorCount > 0) {
    logger.warn(summary);
  } else {
    logger.info(summary);
  }
  results.forEach((result) => {
    if(result.passed) {
      logger.debug(result.message);
    } else if(result.warning) {
      logger.info(result.message);
    } else {
      logger.error(result.message);
    }
  });
  return errorCount;
};

const checkAllServices = async (options) => {
  let errorCount = 0;
  const services = await dockerClient.listServices();
  for(const service of services) {
    errorCount += await checkService(service, options);
  }
  if(errorCount > 0) {
    logger.warn(`\n${errorCount} failures found across all services`);
  } else {
    logger.info('\nNo failures found in any service');
  }
  return errorCount;
};

program
  .name(projectConfig.name)
  .version(projectConfig.version)
  .logger(logger)
  .argument('[serviceName]', 'The name of the service to check.  If blank, all services will be checked.')
  .action(check)
  .description(projectConfig.description)
  .and()
  .parse(process.argv);
