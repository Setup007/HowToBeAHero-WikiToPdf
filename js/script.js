$(document).ready(function() {
    //do some splitting of rendered pages here
    debugger;
    let lastId = $('.page').last().attr('id');

    for (let i = 0; i < lastId; i++) {
        let splitContentId = '#' + i;
        //go through every page and grab content element and its children

        let contentElements = $('#' + i).children('.content').children();
        let element = $('#' + i).children('.content')[0];

        for (let j = 0; j < contentElements.length; j++) {
            if (contentElements[j].offsetTop + contentElements[j].offsetHeight > element.offsetTop + element.offsetHeight ||
                contentElements[j].offsetLeft + contentElements[j].offsetWidth > element.offsetLeft + element.offsetWidth) {
                //this item is semi visible, clone a new template and put everything there

                $('#template').clone().prop('id', i+"-"+j).insertAfter($(splitContentId));
                splitContentId='#'+i+"-"+j;
                //starting with this element move everything to the cloned page
                $(splitContentId).children('.content').html($(element).children().slice(j));
                return;
                //check if content would fit cloned page
                //element.children[j];
                //
            }

        }
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
});