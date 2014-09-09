'use strict';

var config = {
  development: {
    app: {
      name: 'Candidate API'
    },
    db: 'mongodb://192.168.33.10/candidate_dev'
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
