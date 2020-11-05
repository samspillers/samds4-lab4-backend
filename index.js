//express is the framework we're going to use to handle requests
const express = require('express')
//Create a new instance of express
const app = express()

//let middleware = require('./utilities/middleware')

const bodyParser = require("body-parser");
//This allows parsing of the body of POST requests, that are encoded in JSON
app.use(bodyParser.json())

//Obtain a Pool of DB connections. 
const { Pool } = require('pg');
const { response, request } = require('express');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    }
})

app.get("/hello", (request, response) => {
    response.send({
        message: "Hello, you sent a GET request"
    })
})

app.post("/hello", (request, reponse) => {
    reponse.send({
        message: "Hello, you sent a POST request"
    })
})

app.get("/params", (request, response) => {
    if (request.query.name) {
        response.send({
            // req.query is a reference to arguments in the POST body
            message:"Hello, " + request.query.name + "! You sent a GET Request"
        })
    } else {
        response.status(400)
        response.send({
            message:"Missing required information"
        })
    }
})

app.post("/params", (request, response) => {
    if (request.body.name) {
        response.send({
            // req.body is a reference to arguments in the POST body
            message: "Hello, " + request.body.name + "! You sent a POST request"
        })
    } else {
        response.status(400)
        response.send({
            message:"Missing required information"
        })
    }
})

app.get("/wait", (request, response) => {
    setTimeout(() => {
        response.send({
            message:"Thanks for waiting"
        })
    }, 5000)
})

app.post("demosql", (request, response) => {
    if (request.body.name && request.body.message) {
        const theQuery = "INSERT INTO DEMO(Name, Message) VALUES ($1, $2) RETURNING *"
        const values = [request.body.name, request.body.message]

        pool.query(theQuery, values)
            .then(result => {
                response.send({
                    success: true,
                    message: "Inserted: " + result.rows[0].name
                })
            })
            .catch(err => {
                // log the error
                console.log(err)
                if (err.constraint == "demo_name_key") {
                    response.status(400).send({
                        message: "Name exists"
                    })
                } else {
                    response.status(400).send({
                        message: err.detail
                    })
                }
            })
    } else {
        response.status(400).send({
            message: "Missing required information"
        })
    }
})

app.get("/demosql", (request, response) => {
    const theQuery = 'SELECT name, message FROM Demo WHERE name LIKE $1'
    let values = [request.params.name]

    // No name was sent so SELECT on all
    if (!request.params.name)
        values = ["%"]
    
    pool.query(theQuery, values)
        .then(result => {
            if (result.rowCount > 0) {
                response.send({
                    success: true,
                    names: result.rows
                })
            } else {
                response.status(400).send({
                    message: "Name not found"
                })
            }
        })
        .catch(err => {
            // log the error
            console.log(err.details)
            response.status(400).send({
                message: err.detail
            })
        })
})

/*
 * This middleware function will respond to inproperly formed JSON in 
 * request parameters.
 */
app.use(function(err, req, res, next) {

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    res.status(400).send({ message: "malformed JSON in parameters" });
  } else next();
})

/*
 * Return HTML for the / end point. 
 * This is a nice location to document your web service API
 * Create a web page in HTML/CSS and have this end point return it. 
 * Look up the node module 'fs' ex: require('fs');
 */
app.get("/", (request, response) => {
    //this is a Web page so set the content-type to HTML
    response.writeHead(200, {'Content-Type': 'text/html'});
    for (i = 1; i < 7; i++) {
        //write a response to the client
        response.write('<h' + i + ' style="color:blue">Hello World!</h' + i + '>'); 
    }
    response.end(); //end the response
});

/*
 * Serve the API documentation genertated by apidoc as HTML. 
 * https://apidocjs.com/
 */
// app.use("/doc", express.static('apidoc'))

/* 
* Heroku will assign a port you can use via the 'PORT' environment variable
* To accesss an environment variable, use process.env.<ENV>
* If there isn't an environment variable, process.env.PORT will be null (or undefined)
* If a value is 'falsy', i.e. null or undefined, javascript will evaluate the rest of the 'or'
* In this case, we assign the port to be 5000 if the PORT variable isn't set
* You can consider 'let port = process.env.PORT || 5000' to be equivalent to:
* let port; = process.env.PORT;
* if(port == null) {port = 5000} 
*/ 
app.listen(process.env.PORT || 5000, () => {
    console.log("Server up and running on port: " + (process.env.PORT || 5000));
});