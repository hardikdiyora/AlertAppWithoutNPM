/**
 * Frontend logic for the Application
 */

// Container for frontend app
const app = {}

// Config
app.config = {
  'sessionToken': false
}

// AJAX Client for the restfull APIs
app.client = {}

// Interface for the making API calls
app.client.request = (headers, path, method, queryStringObject, payload, callback) => {

  // Set defaults
  headers = typeof (headers) == 'object' && headers !== null ? headers : {}
  path = typeof (path) == 'string' ? path : '/'
  method = typeof (method) == 'string' && ['GET', 'PUT', 'POST', 'DELETE'].indexOf(method) > -1 ? method : false
  queryStringObject = typeof (queryStringObject) == 'object' ? queryStringObject : {}
  payload = typeof (payload) == 'object' ? payload : {}
  callback = typeof (callback) == 'function' ? callback : false

  // For each query string parameter sent, add it to the path
  let requestUrl = path + '?'

  let counter = 0
  for (let key in queryStringObject) {
    counter++
    if (counter > 1) {
      requestUrl += '&'
    }
    requestUrl += `${key}=${queryStringObject[key]}`
  }

  // Form a HTTP request as a JSON type
  let xhr = new XMLHttpRequest()
  xhr.open(method, requestUrl, true)
  xhr.setRequestHeader("Content-Type", "application/json")

  // For each header sent, add it to the request
  for (let key in headers) {
    xhr.setRequestHeader(key, headers[key])
  }

  // If there is a current session token set, add that as header
  if (app.config.sessionToken) {
    xhr.setRequestHeader("token", app.config.sessionToken.id)
  }

  // When the request comes back, handle the request
  xhr.onreadystatechange = () => {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      let statusCode = xhr.status
      let responseReturned = xhr.responseText

      // Callback if requested
      if (callback) {
        try {
          let parsedResponse = JSON.parse(responseReturned)
          callback(statusCode, parsedResponse)
        } catch (error) {
          callback(statusCode, false)
        }
      }
    }
  }

  // Send the payload as JSON
  let payloadString = JSON.stringify(payload)
  xhr.send(payloadString)
}

// Bind the forms
app.bindForms = () => {
  document.querySelector("form").addEventListener("submit", (e) => {

    // Stop it from submitting
    e.preventDefault();
    let formId = this.id;
    let path = this.action;
    let method = this.method.toUpperCase();

    // Hide the error message (if it's currently shown due to a previous error)
    document.querySelector("#" + formId + " .formError").style.display = 'hidden';

    // Turn the inputs into a payload
    let payload = {};
    let elements = this.elements;
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].type !== 'submit') {
        let valueOfElement = elements[i].type == 'checkbox' ? elements[i].checked : elements[i].value;
        payload[elements[i].name] = valueOfElement;
      }
    }

    // Call the API
    app.client.request(undefined, path, method, undefined, payload, (statusCode, responsePayload) => {
      // Display an error on the form if needed
      if (statusCode !== 200) {

        // Try to get the error from the api, or set a default error message
        let error = typeof (responsePayload.Error) == 'string' ? responsePayload.Error : 'An error has occured, please try again';

        // Set the formError field with the error text
        document.querySelector("#" + formId + " .formError").innerHTML = error;

        // Show (unhide) the form error field on the form
        document.querySelector("#" + formId + " .formError").style.display = 'block';

      } else {
        // If successful, send to form response processor
        app.formResponseProcessor(formId, payload, responsePayload);
      }

    });
  });
};

// Form response processor
app.formResponseProcessor = function (formId, requestPayload, responsePayload) {
  let functionToCall = false;
  if (formId == 'accountCreate') {
    console.log("Account form submitted")
    // @TODO Do something here now that the account has been created successfully
  }
};

// Init (bootstrapping)
app.init = function () {
  // Bind all form submissions
  app.bindForms();
};

// Call the init processes after the window loads
window.onload = function () {
  app.init();
};