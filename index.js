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
    let trimmdPath = path.replace(/^\/+|\/+$/g, '')

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

        // Send the response
        res.end('Hello World \n')

        // Log th request path
        console.log(`Request recevied with payload: ${buffer}`)
    })
})

// Start the server and listen on port 3000
server.listen(3000, () => {
    console.log('The server is lstening on port 3000 now...')
})