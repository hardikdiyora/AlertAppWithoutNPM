/**
 * Create and export configuration variables
 * 
 * NOTE: This project is purely for learning purpose so you will see that some secret information in config.js or
 *  https certificates are exposed in code repository publicly. 
 *  Ideally, this will be kept as environment variables or using some infrastructure config deployment. 
 */

const { type } = require("os")

// Container for all the environments
let environments = {}

// Staging (default) environment

environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'Staging',
    'hashingSecret': 'thisIsASecret',
    'maxChecks': 5,
    'twilio': {
        'accountSid': 'ACb32d411ad7fe886aac54c665d25e5c5d',
        'authToken': '9455e3eb3109edc12e3d8c92768f7a67',
        'fromPhone':'+15005550006'
    }
}


// Production environment
environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'Production',
    'hashingSecret': 'thisIsASecret',
    'maxChecks': 5
}

// Determine which environment was passed as a command-line argument
let currentEnvironment = typeof (process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : ''

// Check that the current environment is one of the environments above, if not, default to staging
let environmentToExport = typeof (environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging

// Export the module
module.exports = environmentToExport