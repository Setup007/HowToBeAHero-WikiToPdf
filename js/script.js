/**
 * @author Setup
 * @description This is the main part of the browser rendering and content splitting operations.
 * The template offered by the node js is processed here by splitting the overflowing content into extra pages,
 * setting the pageCounts and finally sending the new html back to the nodeJS.
 * The Response from the nodeJS is the filename of the generated pdf which is then automatically downloaded.
 *
 */
$(window).on('load', function() {
    //remove all official tags
    $('.mw-default-size.mw-halign-right').remove();

    //get current max "pageCount"
    let lastId = $('.page').last().attr('id');
    let splitPartCount = 0;
    let pageCount =1;
    for (let i = 0; i < lastId + 1; i++) {
        //set page count
        $('#'+pageId).find('.pageCount').text(pageCount);

        let pageId = i;
        splitPartCount = 0;
        //go through every page and grab content element and its children
        let contentElements = $('#' + i).children('.content').children();
        let element = $('#' + i).children('.content')[0];

        splitContent(pageId, element, contentElements);
        pageCount++;
    }
    //remove template
    $('#template').remove();
    //send *new* HTML back to server to generate a pdf
    $.ajax({
        type: "POST",
        url: '/renderedHTML',
        data: JSON.stringify({html:getPageHTML()}),
        success: handleData,
        contentType:"application/json; charset=utf-8",
    });
    function handleData(success) {
        //Create a link element, hide it, direct it towards the generated pdf, and then 'click' it programatically
        let a = document.createElement("a");
        a.style = "display: none";
        a.href= "html-pdf/"+success.title+".pdf";
        document.body.appendChild(a);
        a.download = 'How To Be A Hero.pdf';
        //programatically click the link to trigger the download
        a.click();
    };
    function splitContent(pageNumber, element, contentElements) {
        //iterate over each child of the content div
        for (let j = 0; j < contentElements.length; j++) {
            //check if content is overlapping the page
            if (contentElements[j].offsetTop + contentElements[j].offsetHeight > element.offsetTop + element.offsetHeight) {
                //generate new id for this new page
                let splitContentId = splitPartCount === 0 ? pageNumber : pageNumber + "-" + splitPartCount;
                splitPartCount++;
                //since this item is semi visible, clone a new template and put all the items starting whith this one there
                $('#template').clone().prop('id', pageNumber + "-" + splitPartCount).insertAfter($('#' + splitContentId));
                splitContentId = pageNumber + "-" + splitPartCount;
                //set title of cloned page
                $('#' + splitContentId).children('.title').text(element.parentElement.getElementsByClassName('title')[0].textContent);
                pageCount++;
                //set page count
                $('#'+splitContentId).find('.pageCount').text(pageCount);
                //starting with this element move everything to the cloned page
                if (j === 0) {
                    //if the first element is overlapping do NOT check again but leave it on this page and proceed with the next element (preventing "max call stack size reached")
                    $('#' + splitContentId).children('.content').first().html($(element).children().slice(1));
                } else {
                    let position = j;
                    //if the second to last element is a h2 or h3 or h4 move it to next page as well (to group headings with overflowing content)
                    if (contentElements.length > j - 2 && j >= 2) {
                        if (contentElements[j - 2].tagName.toLowerCase() === "h2" || contentElements[j - 2].tagName.toLowerCase() === "h3" || contentElements[j - 2].tagName.toLowerCase() === "h4") {
                            position -= 2;
                        }
                    }
                    $('#' + splitContentId).children('.content').first().html($(element).children().slice(position));
                }

                //check if content on the newly generated page fits or if it needs more splitting recursively
                splitContent(pageNumber, $('#' + splitContentId).children('.content')[0], $('#' + splitContentId).children('.content').children());
                break;
            }

        }
    }
    /*get full HTML from this page*/
    function getPageHTML() {
        return "<html>" + $("html").html() + "</html>";
    }
});