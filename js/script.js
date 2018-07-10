$(window).on('load', function() {
    //remove all official tags
    $('.mw-default-size.mw-halign-right').remove();

    //do some splitting of rendered pages here
    let lastId = $('.page').last().attr('id');
    let splitPartCount = 0;
    let pageCount =1;
    for (let i = 0; i < lastId + 1; i++) {
        let pageId = i;
        splitPartCount = 0;
        //go through every page and grab content element and its children

        let contentElements = $('#' + i).children('.content').children();
        let element = $('#' + i).children('.content')[0];
        $('#'+pageId).find('.pageCount').text(pageCount);
        splitContent(pageId, element, contentElements);
        // contentElements.each(function(index, element) {
        //     console.log("childs height: " +  $(this).outerHeight(true)  + " height of page: " +  $('#' + i).outerHeight(true));
        //     if ( $(this)[0].outerHeight(true) > $('#' + i).outerHeight(true)) {
        //         console.log("is outside! "+'#' + i);
        //     }
        // });
        pageCount++;
    }
    // $('#template').clone().prop('id', j).appendTo('body');
    //remove template
    $('#template').remove();
    //send back to server
    $.ajax({
        type: "POST",
        url: '/renderedHTML',
        data: JSON.stringify({html:getPageHTML()}),
        success: handleData,
        contentType:"application/json; charset=utf-8",
    });
    function handleData(success) {
        // Create a new Blob object using the response data of the onload object
        //Create a link element, hide it, direct it towards the blob, and then 'click' it programatically
        let a = document.createElement("a");
        a.style = "display: none";
        a.href= "html-pdf/"+success.title+".pdf";
        document.body.appendChild(a);
        a.download = 'How To Be A Hero.pdf';
        //programatically click the link to trigger the download
        a.click();
    };
    //send new html to the nodejs
    function splitContent(pageNumber, element, contentElements) {

        for (let j = 0; j < contentElements.length; j++) {
            // let rect2= contentElements[j].getBoundingClientRect();
            // let rect1 = element.getBoundingClientRect();
            if (contentElements[j].offsetTop + contentElements[j].offsetHeight > element.offsetTop + element.offsetHeight) {
            // if (rect1.bottom < rect2.top || rect1.top > rect2.bottom) {
            // if(contentElements[j].scrollHeight > $(element).innerHeight()){

                //this item is semi visible, clone a new template and put everything there
                let splitContentId = splitPartCount === 0 ? pageNumber : pageNumber + "-" + splitPartCount;
                splitPartCount++;
                $('#template').clone().prop('id', pageNumber + "-" + splitPartCount).insertAfter($('#' + splitContentId));
                splitContentId = pageNumber + "-" + splitPartCount;
                //set title of cloned page
                $('#' + splitContentId).children('.title').text(element.parentElement.getElementsByClassName('title')[0].textContent);
                //set page count
                pageCount++;
                $('#'+splitContentId).find('.pageCount').text(pageCount);
                //starting with this element move everything to the cloned page
                if (j === 0) {
                    $('#' + splitContentId).children('.content').first().html($(element).children().slice(1));
                } else {
                    let position = j;
                    //if the element before is a h2 or h3 or h4 move it to next page as well
                    if (contentElements.length > j - 2 && j >= 2) {
                        if (contentElements[j - 2].tagName.toLowerCase() === "h2" || contentElements[j - 2].tagName.toLowerCase() === "h3" || contentElements[j - 2].tagName.toLowerCase() === "h4") {
                            position -= 2;
                        }
                    }
                    $('#' + splitContentId).children('.content').first().html($(element).children().slice(position));
                }

                //check if content would fit cloned page
                // $(element).children().slice(j).appendTo($('#'+splitContentId).children('.content'));

                splitContent(pageNumber, $('#' + splitContentId).children('.content')[0], $('#' + splitContentId).children('.content').children());
                break;
                //
                //element.children[j];
                //
            }

        }
    }
    function getPageHTML() {
        return "<html>" + $("html").html() + "</html>";
    }

});