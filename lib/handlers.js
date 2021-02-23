/**
 * Request handlers
 */

// Dependecies 
const { callbackify } = require('util')
const _data = require('./data')
const helpers = require('./helpers')

// Define the handlers
let handlers = {}

// Users
handlers.users = (data, callback) => {
    let acceptableMethods = ['post', 'get', 'put', 'delete']
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback)
    } else {
        callback(405)
    }
}

// Container foe the users route operations
handlers._users = {}

// Users - post
// Required data: firstName, lastName, phone, password, tosAggrement
// Optional data: none
handlers._users.post = (data, callback) => {
    // Check that all required fields are filled out
    let firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
    let lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
    let phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false
    let tosAggrement = typeof (data.payload.tosAggrement) == 'boolean' && data.payload.tosAggrement ? true : false

    if (firstName && lastName && phone && password && tosAggrement) {
        // Make sure that the user doesn't already exist
        _data.read('users', phone, (err) => {
            if (err) {
                // Hash the password
                let hashedPassword = helpers.hash(password)

                // Create the user object
                if (hashedPassword) {
                    let userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'hashedPassword': hashedPassword,
                        'tosAggrement': true
                    }

                    // Store the user
                    _data.create('users', phone, userObject, (err) => {
                        if (!err) {
                            callback(200, { status: 'User is created successfully' })
                        } else {
                            callback(500, { Error: 'Could not create the new user' })
                        }
                    })

                } else {
                    callback(500, { Error: 'Could not hash the user\'s password' })
                }
            } else {
                // User already exist
                callback(400, { Error: 'A user with that phone number is already exists' })
            }
        })
    } else {
        callback(400, { Error: 'Missing or wrong required fields' })
    }
}

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = (data, callback) => {
    // Check that the phone number is valid
    let phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false
    if (phone) {
        // Get the token from the headers
        let token = typeof (data.headers.token) == 'string' ? data.headers.token : false
        // Verify the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (tokenIsValid) {
                // Lookup the user
                _data.read('users', phone, (err, userData) => {
                    if (!err && userData) {
                        // Remove the hashd password from the user object before responding
                        delete userData.hashedPassword
                        callback(200, userData)
                    } else {
                        callback(404, { Error: 'A User is not found' })
                    }
                })
            } else {
                callback(403, { Error: 'Missing or wrong required token header' })
            }
        })
    } else {
        callback(400, { Error: 'Missing or wrong required field' })
    }
}

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = (data, callback) => {
    // Check for the required field
    let phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false

    // Check for the optional fields
    let firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
    let lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
    let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false

    // Error if the phone is invalid
    if (phone) {
        // Error if nothing is sent to update
        if (firstName || lastName || password) {
            // Get the token from the headers
            let token = typeof (data.headers.token) == 'string' ? data.headers.token : false
            // Verify the given token is valid for the phone number
            handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
                if (tokenIsValid) {
                    // Lookup for user
                    _data.read('users', phone, (err, userData) => {
                        if (!err && userData) {
                            // Update the fields necessary
                            if (firstName) {
                                userData.firstName = firstName
                            }
                            if (lastName) {
                                userData.lastName = lastName
                            }
                            if (password) {
                                userData.hashedPassword = helpers.hash(password)
                            }
                            // Store the new updates
                            _data.update('users', phone, userData, (err) => {
                                if (!err) {
                                    callback(200, { status: 'The user is updated successfully' })
                                } else {
                                    callback(500, { Error: 'Could not update the user' })
                                }
                            })
                        } else {
                            callback(400, { Error: 'The specified user does not exist' })
                        }
                    })
                } else {
                    callback(403, { Error: 'Missing or wrong required token header' })
                }
            })
        }
        else {
            callback(400, { Error: 'No field specified to update' })
        }
    }
    else {
        callback(400, { Error: 'Missing or wrong required field' })
    }
}

// Users - delete
// Required data: phone
// @TODO Cleanup (delete) any other data files associated with their user
handlers._users.delete = (data, callback) => {
    // Check that the phone number is valid
    let phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false
    if (phone) {
        // Get the token from the headers
        let token = typeof (data.headers.token) == 'string' ? data.headers.token : false
        // Verify the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (tokenIsValid) {
                // Lookup the user
                _data.read('users', phone, (err, data) => {
                    if (!err && data) {
                        // Delete the user file
                        _data.delete('users', phone, (err) => {
                            if (!err) {
                                callback(200, { status: `The user with phone number ${phone} is deleted successfully` })
                            } else {
                                callback(500, { Error: 'Could not delete the specified user' })
                            }
                        })
                    } else {
                        callback(400, { Error: 'Could not find the specified user' })
                    }
                })
            } else {
                callback(403, { Error: 'Missing or wrong required token header' })
            }
        })
    } else {
        callback(400, { Error: 'Missing or wrong required field' })
    }
}


// Tokens
handlers.tokens = (data, callback) => {
    let acceptableMethods = ['post', 'get', 'put', 'delete']
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback)
    } else {
        callback(405)
    }
}

// Containers for all the tokens methods
handlers._tokens = {}

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
    let phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false
    if (phone && password) {
        // Lookup the user who matches that phone number
        _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
                // Hash the sent password, and compare it with to the stored in the user object's password
                let hashedPassword = helpers.hash(password)
                if (hashedPassword == userData.hashedPassword) {
                    // Create a new toekn with a random name, Set expiration date 1 hour in the future
                    let tokenId = helpers.createRandomString(20)
                    let expires = Date.now() + 1000 * 60 * 60
                    let tokenObject = {
                        phone: phone,
                        id: tokenId,
                        expires: expires
                    }

                    // Store the token
                    _data.create('tokens', tokenId, tokenObject, (err) => {
                        if (!err) {
                            callback(200, tokenObject)
                        } else {
                            callback(500, { Error: 'Could not creat the new token' })
                        }
                    })
                } else {
                    callback(400, { Error: 'Password did not match the specified user stored password' })
                }
            } else {
                callback(400, { Error: 'Could not find the specified user' })
            }
        })
    } else {
        callback(400, { Error: 'Missing or wrong required fields' })
    }
}

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
    // Check that token id is valid
    let id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false
    if (id) {
        // Lookup the user
        _data.read('tokens', id, (err, tokenData) => {
            if (!err && tokenData) {
                callback(200, tokenData)
            } else {
                callback(404, { Error: 'A token is not found' })
            }
        })
    } else {
        callback(400, { Error: 'Missing or wrong required field' })
    }
}

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
    let id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false
    let extend = typeof (data.payload.extend) == 'boolean' && data.payload.extend ? true : false

    if (id && extend) {
        // Lookup for token
        _data.read('tokens', id, (err, tokenData) => {
            if (!err && tokenData) {
                // Make sure the token is not already expired
                if (tokenData.expires > Date.now()) {
                    // Set the expiration an hour from now
                    tokenData.expires = Date.now() + 1000 * 60 * 60
                    _data.update('tokens', id, tokenData, (err) => {
                        if (!err) {
                            callback(200, { status: 'Token is extended' })
                        } else {
                            callback(500, { Error: 'Could not update the token expiration' })
                        }
                    })
                } else {
                    callback(400, { Error: 'The token has already expired and cannot be extended' })
                }
            } else {
                callback(400, { Error: 'The specified token does not exist' })
            }
        })
    } else {
        callback(400, { Error: 'Missing or wrong required field' })
    }
}

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
    // Check that the phone number is valid
    let id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false
    if (id) {
        // Lookup the token
        _data.read('tokens', id, (err, tokenData) => {
            if (!err && tokenData) {
                // Delete the token file
                _data.delete('tokens', id, (err) => {
                    if (!err) {
                        callback(200, { status: `The token with id ${id} is deleted successfully` })
                    } else {
                        callback(500, { Error: 'Could not delete the specified token' })
                    }
                })
            } else {
                callback(400, { Error: 'Could not find the specified token' })
            }
        })
    } else {
        callback(400, { Error: 'Missing or wrong required field' })
    }
}

// Verify if a given id is correctly valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {
    // Lookup the token
    _data.read('tokens', id, (err, tokenData) => {
        if (!err && tokenData) {
            // Check that the token is for the given user and has not expired
            if (tokenData.phone == phone && tokenData.expires > Date.now()) {
                callback(true)
            } else {
                callback(false)
            }
        } else {
            callback(false)
        }
    })

}

// Ping handler
handlers.ping = (data, callback) => {
    callback(200, { 'status': 'I am alive...' })
}
// Not found handler
handlers.notFound = (data, callback) => {
    callback(404)
}

module.exports = handlers