var path = require('path');
var fs = require('fs');
var pdf = require('html-pdf');
var html = fs.readFileSync('../template/template-frame_html.html', 'utf8');
var options = {
    format: 'A4',
    timeout: '50000',
    base: 'file://' + path.resolve('./') + '/'
};
console.log('file://' + path.resolve('./') + '/');

pdf.create(html, options).toFile('./Test3.pdf', function(err, res) {
  if (err) return console.log(err);
  console.log(res); // { filename: '/app/businesscard.pdf' }
});
