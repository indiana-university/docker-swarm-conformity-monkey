'use strict';

const winston = require('winston');
const util = require('util');
const prettyjson = require('prettyjson');

const CustomTransport = function (options) {
  this.name = 'docker-swarm-conformity-monkey';
  this.level = options.level || 'info';
};

util.inherits(CustomTransport, winston.Transport);

CustomTransport.prototype.log = (level, msg, meta, callback) => {
  if (meta !== null && typeof meta === 'object' && Object.keys(meta).length) {
    msg += "\n" + prettyjson.render(meta);
  }
  msg += "\n";
  const levelInt = winston.levels[level];
  const stdio = levelInt === 0 ? 'stderr' : 'stdout';
  process[stdio].write(msg);
  callback(null, true, stdio);
};

module.exports = new (winston.Logger)({
  transports: [
    new (CustomTransport)({})
  ]
});
