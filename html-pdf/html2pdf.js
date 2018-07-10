var path = require('path');
var fs = require('fs');
var pdf = require('html-pdf');
var html = fs.readFileSync('../template/template-frame_html.html', 'utf8');
var options = {
    width: "210mm",
    height: "297mm",
    timeout: '50000',
    base: 'file://' + path.resolve('./') + '/'
};

pdf.create(html, options).toFile('./Example-PDF.pdf', function(err, res) {
  if (err) return console.log(err);
  console.log(res); // { filename: '/app/businesscard.pdf' }
});
