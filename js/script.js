$(document).ready(function() {
    //do some splitting of rendered pages here
    debugger;
    let lastId = $('.page').last().attr('id');
    let splitPartCount =0;
    for (let i = 0; i < lastId; i++) {
        let pageNumber = i;
        // splitPartCount =0;
        //go through every page and grab content element and its children

        let contentElements = $('#' + i).children('.content').children();
        let element = $('#' + i).children('.content')[0];

       splitContent(pageNumber, element, contentElements);
        // contentElements.each(function(index, element) {
        //     console.log("childs height: " +  $(this).outerHeight(true)  + " height of page: " +  $('#' + i).outerHeight(true));
        //     if ( $(this)[0].outerHeight(true) > $('#' + i).outerHeight(true)) {
        //         console.log("is outside! "+'#' + i);
        //     }
        // });
    }
    // $('#template').clone().prop('id', j).appendTo('body');
    //remove template
    $('#template').remove();
    //send new html to the nodejs
    function splitContent(pageNumber, element, contentElements){

        for (let j = 0; j < contentElements.length; j++) {
            if (contentElements[j].offsetTop + contentElements[j].offsetHeight > element.offsetTop + element.offsetHeight ||
                contentElements[j].offsetLeft + contentElements[j].offsetWidth > element.offsetLeft + element.offsetWidth) {

                //this item is semi visible, clone a new template and put everything there
                let splitContentId= splitPartCount === 0? pageNumber: pageNumber+"-"+splitPartCount;
                splitPartCount++;
                $('#template').clone().prop('id', pageNumber+"-"+splitPartCount).insertAfter($('#'+splitContentId));
                splitContentId= pageNumber+"-"+splitPartCount;
                //starting with this element move everything to the cloned page
                $('#'+splitContentId).children('.content').first().html($(element).children().slice(j));
                //check if content would fit cloned page
                // $(element).children().slice(j).appendTo($('#'+splitContentId).children('.content'));

                splitContent(pageNumber, $('#'+splitContentId).children('.content')[0], $('#'+splitContentId).children('.content').children());
                break;
                //
                //element.children[j];
                //
            }

        }
    }
});