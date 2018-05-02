/**
 * @author Setup
 * @description This is the main of the server, which will handle all parts of the communication and data processing.
 * Starting from a get Request from the browser, getting the Wiki HTML from Parsoid, embedding/mapping the Wiki HTML into a template,
 * running html-pdf to create a PDF and finally offering a download to the user.
 *
 * You can stack multiple parameters by splitting them with a | like so:
 * http://localhost:3000/?title=Begabungen|F%C3%A4higkeiten|Geistesblitzpunkte|Kategorie:Charaktererstellung
 */
const express = require('express');
//TODO https
const path = require('path');
const fs = require('fs');
const pdf = require('html-pdf');
const options = {
    width: "210mm",
    height: "297mm",
    timeout: '50000',
    base: 'http://localhost:3000'
};
//var http = require('http');
//var https = require('https');
//var privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
//var certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
//var credentials = {key: privateKey, cert: certificate};
const request = require("request");
const app = express();
//start up parsoid server
const execFile = require('child_process').execFile;
const child = execFile('startParsoid.cmd');
const jqueryPackage = require("jquery");
const jsDOM = require("jsdom");
const {JSDOM} = jsDOM;
app.use("/template", express.static(__dirname + '/template'));
let pagesPerTitle = [];

app.get('/', function(req, res) {
    pagesPerTitle = [];
    //request to Parsoid
    let titles = req.query.title.split("|");
    console.log(titles);
    queryAllTitles(titles).then(function() {
        console.log("done Querying, adding pages into our template now...");
        let filledTemplate = addToTemplate(pagesPerTitle, titles);
        filledTemplate.then(function(data) {
            let pdfTitle = Date.now();
            pdf.create(data, options).toFile("./html-pdf/"+pdfTitle+".pdf", function(err, response) {
                if (err) return console.log(err);
                console.log("SENDING PDF :"+"./html-pdf/"+pdfTitle+".pdf");
                res.sendFile("./html-pdf/"+pdfTitle+".pdf", {root: "./"});
            });
            //uncomment these lines to send raw HTML
            // console.log("SENDING:"+data);
            // res.send(data);
        });

    });

});

app.listen(3000, function() {
    console.log('Example app listening on port 3000!');
});

function queryAllTitles(titles) {
    let promises = [];
    for (let i = 0; i < titles.length; i++) {
        promises.push(new Promise((resolve, reject) => {
            const requestURL = "http://localhost:8000/localhost/v3/page/html/" + encodeURIComponent(titles[i]) + "?" + "body_only=true";
            request(requestURL, function(error, response, body) {
                if (!error) {
                    console.log(requestURL);
                    // console.log(error);
                    // console.log(response);
                    // console.log(body);
                    pagesPerTitle.push(createPages(body));
                    resolve(response);
                } else {
                    reject(error);
                }
            });
        }));
    }
    return Promise.all(promises);
}


/**
 * Does the mapping into template to embed Parsoids raw html into our template by
 * reading the parsoid html and creating pages based on h1 elements
 *
 * @param body
 */
function createPages(body) {
    //parse the html and create a dom window for manipualtion via jquery
    // console.log(body);
    const window = new JSDOM(body).window;
    // apply jquery to the window
    const $ = jqueryPackage(window);
    let pageCount = 0;
    let contents = [];
    let pages = [];
    let isFirstH1 = false;
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
            if (!err) {
                const templateWindow = new JSDOM(html).window;
                let $template = jqueryPackage(templateWindow);
                console.log("reading template and iterating over: " + pagesPerTitle.length + " pages");
                let overallPageCount = 0;

                //count the pages needed
                for (let i = 0; i < pagesPerTitle.length; i++) {
                    console.log("title: " + i + " pages:" + pagesPerTitle[i].length);
                    overallPageCount += pagesPerTitle[i].length;
                }

                //generate pages that equal to the overall page count
                for (let j = 0; j < overallPageCount; j++) {
                    console.log("cloning");
                    //find template, clone it, set id as page number and append to body
                    $template('#template').clone().prop('id', j).appendTo('body');
                }
                //remove template that was cloned from
                $template('#template').remove();

                console.log("Counted overall " + overallPageCount + " Pages for " + pagesPerTitle.length + " titles.");
                for (let i = 0; i < pagesPerTitle.length; i++) {
                    //TODO mapping required here, titles can be in different order than pages
                    //set all titles of these pages
                    for (let j = 0; j < pagesPerTitle[i].length; j++) {
                        let pageCount = i + j;
                        $template('#' + pageCount).children('.title').each(function() {
                            console.log('setting title: ' + titles[i]);
                            $template(this).text(titles[i]);
                        });
                    }
                    //set content of the pages
                    for (let j = 0; j < pagesPerTitle[i].length; j++) {
                        let pageCount = i + j;
                        $template('#' + pageCount).children('.content').html(pagesPerTitle[i][j] && pagesPerTitle[i][j].pageContent);

                    }
                }
                //return mapped template
                resolve(templateWindow.document.documentElement.outerHTML);
            } else {
                reject(err);
            }
        });
    });
}

//var httpServer = http.createServer(app);
//var httpsServer = https.createServer(credentials, app);

//httpServer.listen(8080);
//httpsServer.listen(8443);
