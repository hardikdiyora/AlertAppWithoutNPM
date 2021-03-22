/**
 * Request handlers
 */

// Dependecies 
const _data = require('./data')
const helpers = require('./helpers')
const config = require('../config')

// Define the handlers
let handlers = {}


/**
 * HTML Handlers
 */

// Index handler
handlers.index = (data, callback) => {
    if (data.method == 'get') {

        // Prepare data for interpolation
        let templateData = {
            'head.title': 'Uptime Monitoring - Alert App',
            'head.description': 'The App monitors the HTTP/HTTPS sites, When your sites goes down it will give alert',
            'body.class': 'index'
        }

        // Read in a template as a string
        helpers.getTemplate('index', templateData, (err, str) => {
            if (!err && str) {
                // Add the univarsal header and footer
                helpers.addUniversalTemplates(str, templateData, (err, fullString) => {
                    if (!err && fullString) {
                        callback(200, fullString, 'html')
                    } else {
                        callback(500, undefined, 'html')
                    }
                })
            } else {
                callback(500, undefined, 'html')
            }
        })
    } else {
        callback(405, undefined, 'html')
    }
}

// Create account
handlers.accountCreate = (data, callback) => {
    if (data.method == 'get') {

        // Prepare data for interpolation
        let templateData = {
            'head.title': 'Create an account',
            'head.description': 'Signup is easy and only takes few seconds',
            'body.class': 'accuntCreate'
        }

        // Read in a template as a string
        helpers.getTemplate('accountCreate', templateData, (err, str) => {
            if (!err && str) {
                // Add the univarsal header and footer
                helpers.addUniversalTemplates(str, templateData, (err, fullString) => {
                    if (!err && fullString) {
                        callback(200, fullString, 'html')
                    } else {
                        callback(500, undefined, 'html')
                    }
                })
            } else {
                callback(500, undefined, 'html')
            }
        })
    } else {
        callback(405, undefined, 'html')
    }
}

// Favicon
handlers.favicon = (data, callback) => {
    // Reject any request that is not a GET
    if (data.method == 'get') {
        // Read in the favicon's data
        helpers.getStaticAsset('favicon.ico', (err, data) => {
            if (!err && data) {
                // Callback the data
                callback(200, data, 'favicon')
            } else {
                callback(500)
            }
        })
    } else {
        callback(405)
    }
}

// Public assets
handlers.public = (data, callback) => {
    // Reject any request that is not a GET
    if (data.method == 'get') {
        // Get the filename being requested
        let trimmedAssetName = data.trimmedPath.replace('public/', '').trim()
        if (trimmedAssetName.length > 0) {
            helpers.getStaticAsset(trimmedAssetName, (err, data) => {
                if (!err && data) {
                    // Determine the content type and default to plain text
                    let contentType = 'plain'
                    if (trimmedAssetName.indexOf('.css') > -1) {
                        contentType = 'css'
                    }
                    if (trimmedAssetName.indexOf('.png') > -1) {
                        contentType = 'png'
                    }
                    if (trimmedAssetName.indexOf('.jpg') > -1) {
                        contentType = 'jpg'
                    }
                    if (trimmedAssetName.indexOf('.ico') > -1) {
                        contentType = 'ico'
                    }
                    callback(200, data, contentType)
                } else {
                    callback(404)
                }
            })
        } else {
            callback(404)
        }
    } else {
        callback(405)
    }
}


/**
 * JSON API Handlers 
 */

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
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
    // Check that all required fields are filled out
    let firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
    let lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
    let phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false
    let tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement ? true : false

    if (firstName && lastName && phone && password && tosAgreement) {
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
                        'tosAgreement': true
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
                _data.read('users', phone, (err, userData) => {
                    if (!err && userData) {
                        // Delete the user file
                        _data.delete('users', phone, (err) => {
                            if (!err) {
                                // Delete all checks which are associated with this user
                                let userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
                                let checksToDelete = userChecks.length
                                if (checksToDelete) {
                                    let checksDeleted = 0
                                    let deletionErrors = false

                                    userChecks.forEach((checkId) => {
                                        _data.delete('checks', checkId, (err) => {
                                            if (err) {
                                                deletionErrors = true
                                            }
                                            checksDeleted++
                                            if (checksDeleted == checksToDelete) {
                                                if (!deletionErrors) {
                                                    callback(200, { status: 'User deleted successfully with all associated data' })
                                                } else {
                                                    callback(500, { Error: 'Error encounter while attempting to delete all the checks of the user. All checks might not delete for this user.' })
                                                }
                                            }
                                        })
                                    });
                                } else {
                                    callback(200, { status: 'User deleted successfully' })
                                }
                            } else {
                                callback(500, { Error: 'Could not delete the specified user' })
                            }
                        })
                    } else {
                        callback(404, { Error: 'Could not find the specified user' })
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
                callback(404, { Error: 'Could not find the specified token' })
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

// Checks
handlers.checks = (data, callback) => {
    let acceptableMethods = ['post', 'get', 'put', 'delete']
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data, callback)
    } else {
        callback(405)
    }
}

// Containers for all the checks methods
handlers._checks = {}

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = (data, callback) => {
    // Validate inputs
    let protocol = typeof (data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false
    let url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false
    let method = typeof (data.payload.method) == 'string' && ['get', 'post', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
    let successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
    let timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false

    if (protocol && url && method && successCodes && timeoutSeconds) {
        // Get the token from headers
        let token = typeof (data.headers.token) == 'string' ? data.headers.token : false

        // Lookup the user by reading the token
        _data.read('tokens', token, (err, tokenData) => {
            if (!err && tokenData) {
                let userPhone = tokenData.phone

                handlers._tokens.verifyToken(token, userPhone, (tokenIsValid) => {
                    if (tokenIsValid) {
                        // Lookup the user data
                        _data.read('users', userPhone, (err, userData) => {
                            if (!err && userData) {
                                let userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []

                                // Verify the user has the less than the number of max-checks-per-users
                                if (userChecks.length < config.maxChecks) {
                                    // Create a random ID for the check
                                    let checkId = helpers.createRandomString(20)

                                    // Create the check object, and include the user phone
                                    let checkObject = {
                                        id: checkId,
                                        userPhone: userPhone,
                                        url: url,
                                        protocol: protocol,
                                        method: method,
                                        successCodes: successCodes,
                                        timeoutSeconds: timeoutSeconds
                                    }

                                    // Save the object
                                    _data.create('checks', checkId, checkObject, (err) => {
                                        if (!err) {
                                            // Add the checkId to the user object
                                            userData.checks = userChecks
                                            userData.checks.push(checkId)

                                            // Save the new user data
                                            _data.update('users', userPhone, userData, (err) => {
                                                if (!err) {
                                                    // Return the data about the new check
                                                    callback(200, checkObject)
                                                } else {
                                                    callback(500, { Error: 'Could not update the user with new check' })
                                                }
                                            })
                                        } else {
                                            callback(500, { Error: 'Could not create the new check' })
                                        }
                                    })
                                } else {
                                    callback(400, { Error: `The user already has the maximum number of the checks (${config.maxChecks})` })
                                }
                            } else {
                                callback(404, { Error: 'Could not read user which is associated with this token' })
                            }
                        })
                    } else {
                        callback(403, { Error: 'Provided token is expired for the user' })
                    }
                })
            } else {
                callback(403, { Error: 'Missing or wrong required token header' })
            }

        })
    } else {
        callback(400, { Error: 'Missing or wrong inputs' })
    }
}

// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = (data, callback) => {
    // Check that the check id is valid
    let checkId = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false
    if (checkId) {
        // Lookup the check
        _data.read('checks', checkId, (err, checkData) => {
            if (!err && checkData) {

                // Get the token from the headers
                let token = typeof (data.headers.token) == 'string' ? data.headers.token : false
                // Verify the given token is valid for the id
                handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                    if (tokenIsValid) {
                        // Return the check data
                        callback(200, checkData)
                    } else {
                        callback(403, { Error: 'Missing or wrong required token header' })
                    }
                })
            } else {
                callback(404, { Error: 'Could not find the specified check' })
            }
        })
    } else {
        callback(400, { Error: 'Missing or wrong required field' })
    }
}

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds (at least one must be specified)
handlers._checks.put = (data, callback) => {
    // Check that the check id is valid
    let checkId = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false

    // Validate inputs
    let protocol = typeof (data.payload.protocol) == 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false
    let url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false
    let method = typeof (data.payload.method) == 'string' && ['get', 'post', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
    let successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
    let timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false

    if (checkId) {
        if (protocol || url || method || successCodes || timeoutSeconds) {
            _data.read('checks', checkId, (err, checkData) => {
                if (!err && checkData) {
                    // Get the token from the headers
                    let token = typeof (data.headers.token) == 'string' ? data.headers.token : false
                    // Verify the given token is valid for the id
                    handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                        if (tokenIsValid) {
                            if (protocol)
                                checkData.protocol = protocol
                            if (url)
                                checkData.url = url
                            if (method)
                                checkData.method = method
                            if (successCodes)
                                checkData.successCodes = successCodes
                            if (timeoutSeconds)
                                checkData.timeoutSeconds = timeoutSeconds

                            _data.update('checks', checkId, checkData, (err) => {
                                if (!err) {
                                    callback(200)
                                } else {
                                    callback(500, { Error: 'Could not update the check' })
                                }
                            })
                        } else {
                            callback(403, { Error: 'Missing or wrong required token header' })
                        }
                    })
                } else {
                    callback(404, { Error: 'Could not find the specified check' })
                }
            })
        } else {
            callback(400, { Error: 'Missing fields to update' })
        }
    } else {
        callback(400, { Error: 'Missing or wronf required field' })
    }
}

// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = (data, callback) => {
    // Check that the id is valid
    let checkId = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false
    if (checkId) {
        _data.read('checks', checkId, (err, checkData) => {
            if (!err && checkData) {
                // Get the token from the headers
                let token = typeof (data.headers.token) == 'string' ? data.headers.token : false

                // Verify the given token is valid for the phone number
                handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                    if (tokenIsValid) {
                        // Delete the check
                        _data.delete('checks', checkId, (err) => {
                            if (!err) {
                                // Lookup the user
                                _data.read('users', checkData.userPhone, (err, userData) => {
                                    if (!err && userData) {
                                        let userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []

                                        // Remove the deleted check from list of checks
                                        let checkPosition = userChecks.indexOf(checkId)
                                        if (checkPosition > -1) {
                                            userChecks.splice(checkPosition, 1)
                                            // Re-save the user data
                                            _data.update('users', checkData.userPhone, userData, (err) => {
                                                if (!err) {
                                                    callback(200, { status: `The check deleted and user updated successfully` })
                                                } else {
                                                    callback(500, { Error: 'Could not update the user while deleting the check' })
                                                }
                                            })
                                        } else {
                                            callback(500, { Error: 'Could not find the check in user object so could not delete check' })
                                        }
                                    } else {
                                        callback(500, { Error: 'Could not find the user who created the check so could not delete the check' })
                                    }
                                })
                            } else {
                                callback(400, { Error: 'Could not delete the check' })
                            }
                        })
                    } else {
                        callback(403, { Error: 'Missing or wrong required token header' })
                    }
                })
            } else {
                callback(404, { Error: 'Could not find the specified check' })
            }
        })
    }
    else {
        callback(400, { Error: 'Missing or wrong required field' })
    }
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