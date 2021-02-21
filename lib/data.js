/**
 * Library for storing and editing data
 */

// Dependecies
const fs = require('fs')
const path = require('path')
const helpers = require('./helpers')

// Container for the module (to be exported)
const lib = {}

// Base dirctory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/')

const fileFullPath = (fileDirectory, fileName) => (`${lib.baseDir + fileDirectory}/${fileName}.json`)

// Write data to a file
lib.create = (fileDirectory, fileName, data, callback) => {
    // Open the file for writing
    
    fs.open(fileFullPath(fileDirectory, fileName), 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // Convert data to string
            let stringData = JSON.stringify(data)

            // Write to file and close it
            fs.writeFile(fileDescriptor, stringData, (err) => {
                if (!err) {
                    fs.close(fileDescriptor, (err) => {
                        if (!err) {
                            callback(false)
                        } else {
                            callback('Error closing new file')
                        }
                    })
                } else {
                    callback('Error writing th new file')
                }
            })
        } else {
            callback('Could not create new file, it may already exist')
        }
    })
}

// Read data from file
lib.read = (fileDirectory, fileName, callback) => {
    fs.readFile(fileFullPath(fileDirectory, fileName), 'utf8', (err, data) => {
        if(!err && data) {
            let parsedData = helpers.parseJsonToObject(data)
            callback(false, parsedData)
        }
        else {
            callback(err, data)
        }
    })
}

// Update data inside a file
lib.update = (fileDirectory, fileName, data, callback) => {
    // Open the file for writing
    fs.open(fileFullPath(fileDirectory, fileName), 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // Convert data to string
            let stringData = JSON.stringify(data)

            // Truncate the file
            fs.ftruncate(fileDescriptor, (err) => {
                if (!err) {
                    fs.writeFile(fileDescriptor, stringData, (err) => {
                        if (!err) {
                            fs.close(fileDescriptor, (err) => {
                                if (!err) {
                                    callback(false)
                                } else {
                                    callback('Error closing file')
                                }
                            })
                        } else {
                            callback('Error writing to exsiting file')
                        }
                    })
                } else {
                    callback('Error truncating file')
                }
            })
        } else {
            callback('Could not open the file for updating, it may not exist yet')
        }
    })
}

// Delete a file
lib.delete = (fileDirectory, fileName, callback) => {
    // Unlink the file
    fs.unlink(fileFullPath(fileDirectory, fileName), (err) => {
        if (!err) {
            callback(false)
        } else {
            callback('Error deleting file')
        }
    })

}

// Export the module
module.exports = lib