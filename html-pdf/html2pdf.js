var fs = require('fs');
var pdf = require('html-pdf');
var html = fs.readFileSync('../template/template-frame_html.html', 'utf8');
var options = { format: 'Letter' };

pdf.create(html, options).toFile('./test.pdf', function(err, res) {
  if (err) return console.log(err);
  console.log(res); // { filename: '/app/businesscard.pdf' }
});
