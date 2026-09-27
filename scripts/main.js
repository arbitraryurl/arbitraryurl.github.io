// The width tiers below must stay exhaustive and set the same properties in
// each branch: these are inline styles, so a width matching no branch keeps
// whatever the last resize applied.
function change(){
    var w = window.innerWidth;
    if (w>=1200){
        if (document.getElementById('test') !=null){
            document.getElementById("test").style.gridTemplateColumns = "9vw 9vw 9vw 9vw";
            document.getElementById("test").style.gridTemplateRows = "9vw 9vw 9vw 9vw"
            document.getElementById("test").style.gap = "3vw 4vw"
            document.getElementById("test").style.paddingTop = "8vh";
        }

        if (document.getElementById('proj_body_mobile') !=null){
            document.getElementById("proj_body_mobile").style.gridTemplateColumns = "12.5vw 50vw 37.5vw";
        }

        if (document.getElementById('text_module') !=null){
            document.getElementById("text_module").style.paddingLeft = "0px";
            document.getElementById("text_module").style.paddingBottom = "0vh";
        }

        if (document.getElementById('proj_content') !=null){
            document.getElementById("proj_content").style.overflowY = "scroll";
        }

        if (document.getElementById('grid') !=null){
            document.getElementById("grid").style.height = "calc(100vh + 100px)";
        }
    }
    if (w >= 800 && w <1200){
        if (document.getElementById('test') !=null){
            document.getElementById("test").style.gridTemplateColumns = "13.33vw 13.33vw 13.33vw";
            document.getElementById("test").style.gridTemplateRows = "13.33vw 13.33vw 13.33vw";
            document.getElementById("test").style.gap = "4vw 5vw"
            document.getElementById("test").style.paddingTop = "8vh";
        }

        if (document.getElementById('proj_body_mobile') !=null){
            document.getElementById("proj_body_mobile").style.gridTemplateColumns = "12.5vw 50vw 37.5vw";
        }

        if (document.getElementById('text_module') !=null){
            document.getElementById("text_module").style.paddingLeft = "0px";
            document.getElementById("text_module").style.paddingBottom = "0vh";
        }

        if (document.getElementById('proj_content') !=null){
            document.getElementById("proj_content").style.overflowY = "scroll";
        }

        if (document.getElementById('grid') !=null){
            document.getElementById("grid").style.height = "calc(100vh - 50px)";
        }

    }
    if (w < 800){
        if (document.getElementById('test') !=null){
            document.getElementById("test").style.gridTemplateColumns = "33vw 33vw";
            document.getElementById("test").style.gridTemplateRows = "33vw 33vw 33vw 33vw 33vw";
            document.getElementById("test").style.gap = "10vw";
            document.getElementById("test").style.paddingTop = "5vh";
        }

        if (document.getElementById('proj_body_mobile') !=null){
            document.getElementById("proj_body_mobile").style.gridTemplateColumns = "100vw";
        }

        if (document.getElementById('text_module') !=null){
            document.getElementById("text_module").style.paddingLeft = "20px";
            document.getElementById("text_module").style.paddingBottom = "7.5vh";
        }

        if (document.getElementById('proj_content') !=null){
            document.getElementById("proj_content").style.overflowY = "visible";
        }

        if (document.getElementById('grid') !=null){
            document.getElementById("grid").style.height = "calc(100vh - 50px)";
        }
    }
}

window.addEventListener('resize', change);
document.addEventListener("DOMContentLoaded", change);

const extracted_links = ["pages/grassland.html", "pages/teeth.html","pages/pollen.html",
    "pages/decay.html","pages/rng.html","pages/stop.html",
    "pages/amp.html","pages/reason.html"];

const title_list = ["Remanence of a Grassland",
    "I Often Dream Of My Teeth Falling Out",
    "Electrostatic Pollen",
    "DECAY",
    "43% Random",
    "I Can't Stop",
    "L94 Headphone Amp",
    "S. Podophyllum"];


//get links from the images
// const extracted_links = document.getElementById('test').getElementsByTagName('a');

//create new p1 elements for the header
const para = document.createElement("p1");

//get all of the 
const from_body = document.getElementsByClassName("image-item");

document.getElementById('head').prepend(para);
para.appendChild(document.createTextNode('['));

for (let i =0; i<title_list.length; i++){
    //extract the first letter from each image caption
    //const hyper = from_body[i].textContent.split(/\r?\n/)[3];
    // const nulls = hyper.search(/\S|$/);
    // const lowerC = hyper[nulls].toLowerCase();

    const lowerC = title_list[i][0].toLowerCase();


    //create an anchor
    const a = document.createElement('a');
    //add text to anchor
    const linkText = document.createTextNode(lowerC);
    a.appendChild(linkText);
    //extract page from path, then add link of image to anchor
    const ex = String(extracted_links[i]);

    //if we aren't on the index page, we need to correct the path 
    //by moving 1 directory up
    if (typeof on_index === 'undefined') {
        a.href = "../" + ex;}
    else{
        a.href = ex;}
    

    //add anchor to p1
    para.appendChild(a);

    if (i < title_list.length-1){
        para.appendChild(document.createTextNode(' / '));
    }

    if (i==title_list.length-1){
        para.appendChild(document.createTextNode(']'));
    }

    
}

const links = document.getElementById("head").getElementsByTagName('a');


for (let i = 0; i< links.length; i++){
    const location = links[i].getAttribute("href");
    
    //console.log(location);
    
    const pButton = document.querySelectorAll('[href*="' + String(location) +'"]');
    //console.log(String(location));

    // const pButton = document.querySelectorAll('[href*="blink.html"]');

    if (pButton.length > 0){
        for (let i = 0; i < pButton.length; i++) {

            pButton[i].addEventListener('mouseover', () => {
                for (let i =0; i<pButton.length; i++){
                    pButton[i].style.backgroundColor = '#ee0b0b';
                    pButton[i].style.color = '#ffffff';
                }
            });

            pButton[i].addEventListener('mouseout', () => {
                for (let i =0; i<pButton.length; i++){
                    pButton[i].style.backgroundColor = '#ffffff';
                    pButton[i].style.color = '#000000';
                }
            });

        }
    }
}


// On the project subpages the content scrolls inside a nested element, so the
// wheel only worked while hovering that element. Forward wheel events from
// anywhere on the page to whichever element is actually scrollable (the image
// column, or the project block as a whole — the grid makes this vary).
const proj_content = document.getElementById('proj_content');
const proj_body = document.getElementById('proj_body_mobile');
if (proj_content || proj_body) {
    const canScroll = (el) => el && el.scrollHeight > el.clientHeight + 1;

    window.addEventListener('wheel', (e) => {
        // Ctrl+wheel and trackpad pinch arrive as wheel events with ctrlKey
        // set; leave those to the browser so page zoom keeps working.
        if (e.ctrlKey) return;

        // Over the caption, prefer scrolling the block so long text stays
        // readable; everywhere else drive the image column.
        const overText = e.target.closest && e.target.closest('#text_module');
        let scroller = null;
        if (overText && canScroll(proj_body)) scroller = proj_body;
        else if (canScroll(proj_content)) scroller = proj_content;
        else if (canScroll(proj_body)) scroller = proj_body;
        if (!scroller) return; // nothing to scroll (e.g. mobile native scroll)

        // normalise line/page deltas to pixels so the feel matches native scroll
        const factor = e.deltaMode === 1 ? 16 : (e.deltaMode === 2 ? scroller.clientHeight : 1);
        scroller.scrollTop += e.deltaY * factor;
        e.preventDefault();
    }, { passive: false });
}


// const pButton = document.querySelectorAll('[href*="blink.html"]');

// for (let i = 0; i < pButton.length; i++) {

//     pButton[i].addEventListener('mouseover', () => {
//         pButton[0].style.backgroundColor = '#ff0000';
//         pButton[0].style.color = '#ffffff';
//         pButton[1].style.backgroundColor = '#ff0000';
//         pButton[1].style.color = '#ffffff';

//         console.log('yo');
//     });

//     pButton[i].addEventListener('mouseout', () => {
//         pButton[0].style.backgroundColor = '#ffffff';
//         pButton[0].style.color = '#000000';
//         pButton[1].style.backgroundColor = '#ffffff';
//         pButton[1].style.color = '#000000';
//         console.log('yo2');
//     });

// }