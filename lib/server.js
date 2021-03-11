/*
    Server related tasks
*/

// Depedencies
const http = require('http')
const https = require('https')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder
const config = require('../config')
const fs = require('fs')
const handlers = require('./handlers')
const helpers = require('./helpers')
const path = require('path')
const util = require('util')
const debug = util.debuglog('server')


// Instatiate the server module object
const server = {}

// Instantiate the HTTP server
server.httpServer = http.createServer((req, res) => {
    server.unifiedServer(req, res)
})

// Instantiate the HTTPS server
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
}

server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
    server.unifiedServer(req, res)
})

// All server logic for both the http and https server
server.unifiedServer = (req, res) => {
    // Get the URL and parse it
    let parsedUrl = url.parse(req.url, true)

    // Get the path
    let path = parsedUrl.pathname
    let trimmedPath = path.replace(/^\/+|\/+$/g, '')

    // Get the query string as an object
    let queryStringObject = parsedUrl.query

    // Get HTTP Method
    let method = req.method.toLowerCase()

    // Get the haders as an Object
    let headers = req.headers

    // Get the payload, if any
    let decoder = new StringDecoder('utf-8')
    let buffer = ''
    req.on('data', (data) => {
        buffer += decoder.write(data)
    })

    req.on('end', () => {
        buffer += decoder.end()

        // Choose the handler this request should go to, If one is not found use the notFound handler
        let chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound

        // Construct the data object to send to the handler
        let data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        }

        // Route the request to the handler specified in the router
        chosenHandler(data, (statusCode, payload) => {
            // Use the status code called back by handler, or default to 200
            statusCode = typeof (statusCode) == 'number' ? statusCode : 200

            // Use the payload called back to handler, or default empty object
            payload = typeof (payload) == 'object' ? payload : {}

            // Convert the payload to a string
            let payloadString = JSON.stringify(payload)

            // Return the response
            res.setHeader('Content-Type', 'application/json')
            res.writeHead(statusCode)
            res.end(payloadString)

            // If the response is 200, print green otherwise print red
            statusCode == 200 ?
                debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath}  ${statusCode}`) :
                debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath}  ${statusCode}`)
        })
    })
}

// Define a request router
server.router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks
}

// Init script
server.init = () => {
    // Start the HTTP server and listen on httpPort
    server.httpServer.listen(config.httpPort, () => {
        console.log('\x1b[36m%s\x1b[0m', `The server is lstening on port ${config.httpPort} in ${config.envName} now`)
    })

    // Start the HTTPS server and listen on httpsPort
    server.httpsServer.listen(config.httpsPort, () => {
        console.log('\x1b[36m%s\x1b[0m', `The server is lstening on port ${config.httpsPort} in ${config.envName} now`)
    })
}


// Export the server
module.exports = server