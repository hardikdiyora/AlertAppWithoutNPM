/**
 * Helpers for variour tasks
 */

// Dependencies
const crypto = require('crypto')
const config = require('../config')
const https = require('https')
const querystring = require('querystring')

// Container for all the helpers
const helpers = {}

// Create a SHA256 hash
helpers.hash = (str) => {
    if (typeof (str) == 'string' && str.length > 0) {
        return crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex')
    } else {
        return false
    }
}

// Parsed JSON string to an object in all cases, without throwing error
helpers.parseJsonToObject = (str) => {
    try {
        return JSON.parse(str)
    } catch (error) {
        return {}
    }
}

// Create a string of random alphanumeric characters, of the given length
helpers.createRandomString = (strLength) => {
    if (typeof (strLength) == 'number' && strLength > 0) {
        // Define all the possible characters that could go into a string
        let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz1234567890'

        // Start the final string
        let str = ''
        let i
        for (i = 1; i <= strLength; i++) {
            // Get a random character from the possibleCharacters string
            let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
            // Append this character to the final string
            str += randomCharacter
        }
        return str
    } else {
        return false
    }
}

// Send an SMS message via Twilio
helpers.sendTwilioSms = (phone, message, callback) => {
    // Validates parameters
    phone = typeof (phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false
    message = typeof (message) == 'string' && message.trim().length > 0 && message.trim().length <= 1600 ? message.trim() : false

    if (phone && message) {
        // Configure the request payload
        let payload = {
            'From': config.twilio.fromPhone,
            'To': '+1' + phone,
            'Body': message
        }

        // Stringify the payload
        let stringPayload = querystring.stringify(payload)

        // Configure the request details
        let requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.frankfurt.us1.twilio.com',
            'method':'POST',
            'path': '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
            'auth': config.twilio.accountSid + ':' + config.twilio.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        }

        // Instatiate the request object
        let req = https.request(requestDetails, (res) => {
            // Grab the status of the sent request
            let status = res.statusCode

            // Callback successfully if the request went through
            if (status == 200 || status == 201) {
                callback(false)
            } else {
                callback(`Status code returned as ${status}`)
            }
        })

        // Bind to the error vent so it does not get thrown
        req.on('error', (e) => {
            callback(e)
        })

        // Add the payload
        req.write(stringPayload)

        // End the request
        req.end()
    } else {
        callback('Given parameters were missing or invalid')
    }
}

module.exports = helpers