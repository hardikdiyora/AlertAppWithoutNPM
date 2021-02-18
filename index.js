/*
    Primary file for APIs
*/

// Depedencies
const http = require('http')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder

// The server should respond to all requests with string
const server = http.createServer((req, res) => {
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
        let chosenHandler = typeof (router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound

        // Construct the data object to send to the handler
        let data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': buffer
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

            // Log server result
            console.log(`Returning this response with status code: ${statusCode}, and a payload ${payloadString}`)
        })
    })
})

// Start the server and listen on port 3000
server.listen(3000, () => {
    console.log('The server is lstening on port 3000 now...')
})

// Define the handlers
let handlers = {}

// Sample handler
handlers.sample = (data, callback) => {
    // Callback a http status code, and a payload object
    callback(406, { 'name': 'Sample Handler..' })
}

// Not found handler
handlers.notFound = (data, callback) => {
    callback(404)
}


// Define a request router
let router = {
    'sample': handlers.sample
}