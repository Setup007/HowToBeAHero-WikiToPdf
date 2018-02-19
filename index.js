/**
 * @author Setup
 * @description This is the main of the server, which will handle all parts of the communication and data processing.
 * Starting from a get Request from the browser, getting the Wiki HTML from Parsoid, embedding/mapping the Wiki HTML into a template,
 * running html-pdf to create a PDF and finally offering a download to the user.
 */
var express = require('express');
//TODO https
var fs = require('fs');
//var http = require('http');
//var https = require('https');
//var privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
//var certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
//var credentials = {key: privateKey, cert: certificate};
var request = require("request");
var app = express();
//start up parsoid server
const execFile = require('child_process').execFile;
const child = execFile('startParsoid.cmd');
var jqueryPackage = require("jquery");
const jsdom = require("jsdom");
const {JSDOM} = jsdom;
app.use("/template", express.static(__dirname + '/template'));
app.get('/', function(req, res) {
    //request to Parsoid
    var requestURL = "http://localhost:8000/localhost/v3/page/html/" + encodeURIComponent(req.query.title) + "?" + "body_only=true";
    request(requestURL, function(error, response, body) {
        console.log(requestURL);

        mapIntoTemplate(res, req, body);
    });


});


app.listen(3000, function() {
    console.log('Example app listening on port 3000!');
});

/**
 * Does the mapping into template to embed Parsoids raw html into our template by
 * 1. reading the parsoid html and creating pages based on h1 elements
 * 2. putting the page object array into the template
 * @param res
 * @param req
 * @param body
 */
function mapIntoTemplate(res, req, body) {
    //parse the html and create a dom window for manipualtion via jquery
    var window = new JSDOM(body).window;
    // apply jquery to the window
    var $ = jqueryPackage(window);
    var pageCount = 0;
    var contents = [];
    var pages = [];
    var isFirstH1 = false;
    var that = this;
    $('body > *').each(function(index) {

        //split pages on every h1 after the first one
        if ($(this).is('h1') && isFirstH1) {
            //finishPage
            pages.push({page: pageCount, pageContent: contents});
            contents = [];
            pageCount += 1;
        }
        //put contents in
        contents.push($(this).prop('outerHTML'));

        //skip first h1
        if ($(this).is('h1') && !isFirstH1) {
            isFirstH1 = true;
        }
        //finish last page
        if (index === $('body > *').length - 1) {
            pages.push({page: pageCount, pageContent: contents});
        }

    });
    console.log('pages: ' + JSON.stringify(pages));
    //read tempalteFile
    fs.readFile('./template/template-empty_html.html', 'utf8', function(err, html) {

        var templateWindow = new JSDOM(html).window;
        var $template = jqueryPackage(templateWindow);
        //generate pages that equal to the length of the pages object array
        for (var i = 0; i < pages.length - 1; i++) {
            //find template, clone it, set id as page number and append to body
            $template('#template').clone().prop('id', i + 2).appendTo('body');
        }
        //change template property to first page number
        $template('#template').prop('id', 0);

        //set all titles
        $template('.title').each(function(index) {
            // console.log('setting title: ' + req.query.title);
            $template(this).text(req.query.title);
        });
        $template('.content').each(function(index, element) {
            // console.log("setting content : " + index + "  with content: " + pages[index].pageContent);
            $template(this).html(pages[index].pageContent);
        });
        //send mapped template to user
        res.send(templateWindow.document.documentElement.outerHTML);

        //TODO: run the html-pdf converter on mapped template
        //TODO: Spit out pdf file for download
        // res.sendFile('template/template-frame_html.html', {root: "./" })
    });
}

//var httpServer = http.createServer(app);
//var httpsServer = https.createServer(credentials, app);

//httpServer.listen(8080);
//httpsServer.listen(8443);
