/**
 * @author Setup
 * @description This is the main part of the server, which will handle all parts of the communication and data processing.
 * Starting from a get Request from the browser, getting the Wiki HTML from Parsoid, embedding/mapping the Wiki HTML into a template,
 * offering the template to the browser for rendering, splitting the overflowing content into extra pages (done by the script.js),
 * receiving the new HTML from the browser (sending is done by the script.js),
 * running html-pdf to create a PDF and FINALLY offering a download to the user.
 *
 * You can stack multiple parameters by splitting them with a | like so:
 * http://localhost:3000/?title=Begabungen|F%C3%A4higkeiten|Geistesblitzpunkte|Kategorie:Charaktererstellung|Kampf|Begriffskl%C3%A4rung
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

const childProcess = require('child_process');
const parsoidProcess = childProcess.fork("./bin/server.js",
    {
        "cwd": "./node_modules/parsoid"
    }
);
// listen for errors as they may prevent the exit event from firing
parsoidProcess.on('error', function (err)
{
    console.error("Error running parsoid subscript:");
    console.error(err);
});

// execute the callback once the process has finished running
parsoidProcess.on('exit', function (exitCode)
{
    if (exitCode > 0)
    {
        console.error("parsoid subscript exited with error code %d - ensure all processes are terminated gracefully", exitCode);
        process.exit(exitCode);
    }
    else
    {
        console.log("parsoid subscript exited successfully");
    }
});

const jqueryPackage = require("jquery");
const jsDOM = require("jsdom");
const {JSDOM} = jsDOM;
app.use("/template", express.static(__dirname + '/template'));
app.use("/js", express.static(__dirname + '/js'));
app.use('/html-pdf', express.static(__dirname + '/html-pdf'));
app.use(express.json({limit: '50mb', extended: true}));       // to support JSON-encoded bodies
let pagesPerTitle = [];

app.get('/', function(req, res) {
    let debug = req.query.debug;
    pagesPerTitle = [];
    //request to Parsoid
    let titles = req.query.title.split("|");

    console.log(titles);
    queryAllTitles(titles).then(function() {
        console.log("done Querying, adding pages into our template now...");
        let filledTemplate = addToTemplate(pagesPerTitle, titles);
        filledTemplate.then(function(data) {
            let pdfTitle = Date.now();
            // if (!!debug) {
                // console.log("SENDING:"+data);
                res.send(data);
            // } else {
            //     pdf.create(data, options).toFile("./html-pdf/" + pdfTitle + ".pdf", function(err, response) {
            //         if (err) return console.log(err);
            //         console.log("SENDING PDF :" + "./html-pdf/" + pdfTitle + ".pdf");
            //         res.sendFile("./html-pdf/" + pdfTitle + ".pdf", {root: "./"});
            //     });
            // }


        }).catch((error) => {
            console.error(error)
        });

    }).catch((error) => {
        console.error(error)
    });

});
/**
 * Accepts the rendered HTML with the split pages and generates a pdf
 */
app.post('/renderedHTML',function(req,res){
    let pdfTitle = Date.now();
    //html is in here: req.body
    console.log(req.body.html);
    pdf.create(req.body.html , options).toFile("./html-pdf/" + pdfTitle + ".pdf", function(err, response) {
        if (err) return console.log(err);
        console.log("SENDING PDF :" + "./html-pdf/" + pdfTitle + ".pdf");
        res.status(200).send({title: pdfTitle});
    });
});


app.listen(3000, function() {
    console.log('Example app listening on port 3000!');
});

function queryAllTitles(titles) {
    let promises = [];
    for (let i = 0; i < titles.length; i++) {
        promises.push(new Promise((resolve, reject) => {
            const requestURL = "http://localhost:8000/localhost/v3/page/html/" + encodeURIComponent(titles[i]) + "?" + "body_only=true&i=" + i;
            request(requestURL, function(error, response, body) {
                if (!error) {
                    console.log(requestURL);
                    // console.log(error);
                    // console.log(response);
                    // console.log(body);
                    let titleNumber = requestURL.slice(-1);
                    pagesPerTitle.push(createPages(body, titles[titleNumber]));
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
function createPages(body, title) {
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
            pages.push({page: pageCount, pageContent: contents, pageTitle: title});
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
            pages.push({page: pageCount, pageContent: contents, pageTitle: title});
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
                    overallPageCount += pagesPerTitle[i].length;
                }

                //generate pages that equal to the overall page count
                for (let j = 0; j < overallPageCount; j++) {
                    console.log("cloning template");
                    //find template, clone it, set id as page number and append to body
                    $template('#template').clone().prop('id', j).appendTo('body');
                }
                console.log("Counted overall " + overallPageCount + " Pages for " + pagesPerTitle.length + " titles.");
                let pageCount = 0;
                //reorder the titles
                for (let x = 0; x < titles.length; x++) {
                    let title = titles[x];
                    console.log("ordering for title: " + title);
                    for (let i = 0; i < pagesPerTitle.length; i++) {
                        //set content and title of the pages
                        for (let j = 0; j < pagesPerTitle[i].length; j++) {
                            if(title!==pagesPerTitle[i][j].pageTitle){
                                console.log("skipping: "+title+" !== "+pagesPerTitle[i][j].pageTitle);
                                continue;
                            }
                            $template('#' + pageCount).children('.title').each(function() {
                                console.log('setting title: ' + pagesPerTitle[i][j].pageTitle);
                                $template(this).text(pagesPerTitle[i][j].pageTitle);
                            });
                            $template('#' + pageCount).children('.content').html(pagesPerTitle[i][j] && pagesPerTitle[i][j].pageContent);
                            pageCount++;
                        }
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
