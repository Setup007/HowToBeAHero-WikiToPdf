# HowToBeAHero-WikiToPdf

This tool uses [Request](https://github.com/request/request) on [Parasoid](https://www.mediawiki.org/wiki/Parsoid) to fetch specific pages of the [How to be a Hero](https://howtobeahero.de/index.php?title=Hauptseite) Wiki, put them in a nice HTML-template and generate a PDF via [html-pdf](https://www.npmjs.com/package/html-pdf) for a printable version.

## Requirements

Ensure two executables can be found using the `path` environment variable:

* A python 2-installation
* A `git` executable

## Running the project

1. Open a command line inside your local copy of this repository
2. Run `npm install`
3. Copy over `/config.yaml` to `/node_modules/parsoid/config.yaml`
4. Run `node index.js`
5. You're now able to make web-requests to generate PDFs.

## Example
To generate a PDF containing "Begabungen", "Fähigkeiten", "Geistesblitzpunkte" and "Kategorie:Charaktererstellung" visit `http://localhost:3000/?title=Begabungen|F%C3%A4higkeiten|Geistesblitzpunkte|Kategorie:Charaktererstellung`.