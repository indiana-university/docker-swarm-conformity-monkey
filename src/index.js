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
  if(serviceName) {
    const service = await dockerClient.getService(serviceName).inspect();
    process.exit(await checkService(service, options));
  } else {
    process.exit(await checkAllServices(options));
  }
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
    logger.warn(`\n${errorCount} errors found across all services`);
  } else {
    logger.info('\nNo errors found in any service');
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
