/**
 * workers related tasks
 */

// Dependencies
const path = require('path')
const fs = require('fs')
const _data = require('./data')
const http = require('http')
const https = require('https')
const helpers = require('./helpers')
const url = require('url')
const _logs = require('./logs')
const util = require('util')
const debug = util.debuglog('workers')

// Instantiate the workers object
const workers = {}

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = () => {
    // Get all checks
    _data.list('checks', (err, checks) => {
        if (!err && checks && checks.length > 0) {
            checks.forEach(check => {
                // Read in the check data
                _data.read('checks', check, (err, originalCheckData) => {
                    if (!err && originalCheckData) {
                        // Pass it to the check validator, and let that function continue or log error 
                        workers.validateCheckData(originalCheckData)
                    } else {
                        debug('Error: Could not read one of the check data')
                    }
                })
            });
        } else {
            debug('Error: Could not find any checks to process')
        }
    })
}

// Sanity-check the check-data
workers.validateCheckData = (originalCheckData) => {
    originalCheckData = typeof (originalCheckData) == 'object' && originalCheckData != null ? originalCheckData : {}
    originalCheckData.id = typeof (originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false
    originalCheckData.userPhone = typeof (originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false
    originalCheckData.protocol = typeof (originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false
    originalCheckData.url = typeof (originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false
    originalCheckData.method = typeof (originalCheckData.method) == 'string' && ['get', 'post', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false
    originalCheckData.successCodes = typeof (originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false
    originalCheckData.timeoutSeconds = typeof (originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false

    // Set the keys that maynot be set (if the worker have never seen this check)
    originalCheckData.state = typeof (originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down'
    originalCheckData.lastChecked = typeof (originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false

    // If all th checks pass, pass the data along to the next step in the process

    if (originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.url &&
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds
    ) {
        workers.performCheck(originalCheckData)
    } else {
        debug('Error: One of the checks is not properly formatted, skipping it')
    }
}

// Perform the check, send the originalCheckData and the outcome of the check process
workers.performCheck = (originalCheckData) => {
    // Prepare the initial check outcome
    let checkOutcome = {
        'error': null,
        'responseCode': null
    }

    // Mark that the outcome has not been sent yet
    let outcomeSent = false

    // Parse the hostname and the path out of the original check data
    let parseUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true)

    let hostName = parseUrl.hostname
    let urlPath = parseUrl.path // Using path and not pathname because we want the query string

    // Constructing the request
    let requestDetails = {
        'protocol': originalCheckData.protocol + ':',
        'hostname': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': urlPath,
        'timeout': originalCheckData.timeoutSeconds * 1000
    }

    // Instantiate the request object (using either the http ot https module)
    let _moduleToUse = originalCheckData.protocol == 'http' ? http : https
    let req = _moduleToUse.request(requestDetails, (res) => {
        // Grab the status of the sent request
        let status = res.statusCode

        checkOutcome.responseCode = status
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSent = true
        }
    })

    // Bind to the error event so it does not get thrown
    req.on('error', (err) => {
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': err
        }
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSent = true
        }
    })

    // Bind to the timeout event
    req.on('timeout', (err) => {
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': 'timeout'
        }
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSent = true
        }
    })
    // End the request
    req.end()
}

// Process the check outcome, update the check data as needed, trigger an alert to the user if needed
// Special logic for accomodating a check that has never been tested before (don't alert on that)
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
    // Decide if the check is considered up or down
    let state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down'
    // Decide if an alert is wanted
    let alertWanted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false

    // Log the outcome
    let timeOfCheck = Date.now()
    workers.log(originalCheckData, checkOutcome, state, alertWanted, timeOfCheck)

    // Update the check data
    let newCheckData = originalCheckData
    newCheckData.state = state
    newCheckData.lastChecked = timeOfCheck

    // Save the updates
    _data.update('checks', newCheckData.id, newCheckData, (err) => {
        if (!err) {
            if (alertWanted) {
                workers.alertUserToStatusChange(newCheckData)
            } else {
                debug('Check outcome has not changed, no alert needed')
            }
        } else {
            debug('Error: Could not save updates to one of the checks')
        }
    })
}

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = (newCheckData) => {
    let msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
    helpers.sendTwilioSms(newCheckData.userPhone, msg, (err) => {
        if (!err) {
            debug(`Success: User was alerted to a status change in their check, via below sms ${msg}`)
        } else {
            debug(`Error: Could not send sms alert to a user who had a state change in their check`)
        }
    })
}

// Timer to execute the worker-process once per minute
workers.loop = () => {
    setInterval(() => {
        workers.gatherAllChecks()
    }, 1000 * 60)
}

workers.log = (originalCheckData, checkOutcome, state, alertWanted, timeOfCheck) => {
    // Form the data
    let logData = {
        check: originalCheckData,
        outcome: checkOutcome,
        state: state,
        alert: alertWanted,
        time: timeOfCheck
    }

    // Convert data to a string
    let logString = JSON.stringify(logData)

    // Determine the name of the log file
    let logFileName = originalCheckData.id

    // Append the log string to the file
    _logs.append(logFileName, logString, (err) => {
        if (!err) {
            debug('Logging to file succeeded')
        } else {
            debug('Logging to file failed')
        }
    })
}

// Rotete (compress) the log files
workers.rotateLogs = () => {
    // List all the (non compressed) logs files
    _logs.list(false, (err, logs) => {
        if (!err && logs && logs.length > 0) {
            logs.forEach(logName => {
                let logId = logName.replace('.log', '')
                let newFileId = `${logId}-${Date.now()}`
                _logs.compress(logId, newFileId, (err) => {
                    if (!err) {
                        // Truncate the log
                        _logs.truncate(logId, (err) => {
                            if (!err) {
                                debug('Success truncating log file')
                            } else {
                                debug('Error truncating log file')
                            }
                        })
                    } else {
                        debug('Error compressing one of the file', err)
                    }
                })
            })
        } else {
            debug('Error: Could not find any logs to rotate')
        }
    })
}

// Timer to execute the log rotation process per day
workers.logRotationLoop = () => {
    setInterval(() => {
        workers.rotateLogs()
    }, 1000 * 60 * 60 * 24)
}

// Init Script
workers.init = () => {

    // Send to console, in yellow
    console.log('\x1b[33m%s\x1b[0m', 'Background workers are running')

    // Execute all the checks immidiately
    workers.gatherAllChecks()

    // Call the loop so the checks will execute later on
    workers.loop()

    // Compress all the logs immediately
    workers.rotateLogs()

    // Call the compression loop so logs will be compressed later on
    workers.logRotationLoop()
}

module.exports = workers
