/**
 * @author Setup
 * @description This is the main of the server, which will handle all parts of the communication and data processing.
 * Starting from a get Request from the browser, getting the Wiki HTML from Parsoid, embedding/mapping the Wiki HTML into a template,
 * running html-pdf to create a PDF and finally offering a download to the user.
 */
var express = require('express');
//TODO https
//var fs = require('fs');
//var http = require('http');
//var https = require('https');
//var privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
//var certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
//var credentials = {key: privateKey, cert: certificate};
var request = require("request");
var app = express();

app.get('/', function(req, res) {
    //request to Parsoid
    var requestURL = "http://localhost:8000/localhost/v3/page/html/" + encodeURIComponent(req.query.title) + "?" + "body_only=true";
    request(requestURL, function(error, response, body) {
        console.log(requestURL);
        //forward Parsoids answer to the User (just to show proof of concept)
        res.send(body);
        //do the mapping here
        /*
            where the **MAGIC** happens
         */
        //TODO: run the html-pdf converter on mapped template
        //TODO: Spit out pdf file for download
        // res.sendFile('template/template-frame_html.html', {root: "./" })
    });


});

app.listen(3000, function() {
    console.log('Example app listening on port 3000!');
});


//var httpServer = http.createServer(app);
//var httpsServer = https.createServer(credentials, app);

//httpServer.listen(8080);
//httpsServer.listen(8443);
