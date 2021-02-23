/**
 * Helpers for variour tasks
 */

// Dependencies
const crypto = require('crypto')
const config = require('../config')

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
        for(i = 1 ; i <= strLength; i++){
            // Get a random character from the possibleCharacters string
            let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
            // Append this character to the final string
            str += randomCharacter
        }
        return  str 
    } else {
        return false
    }
}

module.exports = helpers