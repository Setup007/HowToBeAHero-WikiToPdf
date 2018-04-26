/**
 * @author Setup
 * @description This is the main of the server, which will handle all parts of the communication and data processing.
 * Starting from a get Request from the browser, getting the Wiki HTML from Parsoid, embedding/mapping the Wiki HTML into a template,
 * running html-pdf to create a PDF and finally offering a download to the user.
 *
 * You can stack multiple parameters by splitting them with a | like so:
 * http://localhost:3000/?title=Begabungen|F%C3%A4higkeiten|Geistesblitzpunkte|Kategorie:Charaktererstellung
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
var pagesPerTitle = [];

app.get('/', function(req, res) {
    pagesPerTitle = [];
    //request to Parsoid
    var titles = req.query.title.split("|");
    console.log(titles);
    queryAllTitles(titles).then(function() {
        console.log("done Querying, adding pages into our template now...");
        var filledTemplate = addToTemplate(pagesPerTitle, titles);
        filledTemplate.then(function(data){
            // console.log("SENDING:"+data);
            res.send(data);
        });

    });

});

app.listen(3000, function() {
    console.log('Example app listening on port 3000!');
});

function queryAllTitles(titles) {
    const promises = [];
    for (var i = 0; i < titles.length; i++) {
        promises.push(new Promise((resolve, reject) => {
            const requestURL = "http://localhost:8000/localhost/v3/page/html/" + encodeURIComponent(titles[i]) + "?" + "body_only=true";
            request(requestURL, function(error, response, body) {
                if(!error) {
                    console.log(requestURL);
                    // console.log(error);
                    // console.log(response);
                    // console.log(body);
                    pagesPerTitle.push(createPages(body));
                    resolve(response);
                }else{
                    reject(error);
                }
            });
         }));
    }
    return Promise.all(promises);
};



/**
 * Does the mapping into template to embed Parsoids raw html into our template by
 * reading the parsoid html and creating pages based on h1 elements
 *
 * @param body
 */
function createPages(body) {
    //parse the html and create a dom window for manipualtion via jquery
    // console.log(body);
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
    console.log('pages: ' + pages.length);
    return pages;
}

/**
 * Puts the page object array into the template
 * @param pagesPerTitle
 * @param titles
 * @returns {boolean}
 */

function addToTemplate(pagesPerTitle, titles) {
    //read tempalteFile
    return new Promise((resolve, reject) => {
        fs.readFile('./template/template-empty_html.html', 'utf8', function(err, html) {

        var templateWindow = new JSDOM(html).window;
        var $template = jqueryPackage(templateWindow);
        console.log("reading template and iterating over: " + pagesPerTitle.length + " pages");
        var overallPageCount =0 ;

        //count the pages needed
        for (var i = 0; i < pagesPerTitle.length; i++) {
            console.log("title: "+ i + " pages:"+ pagesPerTitle[i].length);
            overallPageCount += pagesPerTitle[i].length;
        }

        //generate pages that equal to the overall page count
        for (var j = 0; j < overallPageCount; j++) {
            console.log("cloning");
            //find template, clone it, set id as page number and append to body
            $template('#template').clone().prop('id', j).appendTo('body');
        }
        //remove template that was cloned from
        $template('#template').remove();

        console.log("Counted overall "+ overallPageCount+" Pages for "+ pagesPerTitle.length + " titles.");
        for (var i = 0; i < pagesPerTitle.length; i++) {

            //set all titles of these pages
            for (var j = 0; j < pagesPerTitle[i].length; j++) {
                var pageCount = i + j;
                $template('#' + pageCount).children('.title').each(function(index) {
                    console.log('setting title: ' + titles[i]);
                    $template(this).text(titles[i]);
                });
            }
            //set content of the pages
            for (var j = 0; j < pagesPerTitle[i].length; j++) {
                var pageCount = i + j;
                $template('#' + pageCount).children('.content').html(pagesPerTitle[i][j] && pagesPerTitle[i][j].pageContent);

            }
        }
        //return mapped template
        resolve(templateWindow.document.documentElement.outerHTML);
        //TODO: run the html-pdf converter on mapped template
        //TODO: Spit out pdf file for download
        // res.sendFile('template/template-frame_html.html', {root: "./" })
    });
});
}

//var httpServer = http.createServer(app);
//var httpsServer = https.createServer(credentials, app);

//httpServer.listen(8080);
//httpsServer.listen(8443);
