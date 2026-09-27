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

//create new p1 element for the header: a 90s webring bar. The works form the
//ring — prev/next step to the neighbouring work and wrap around at the ends,
//random jumps to any other work
const para = document.createElement("p1");
document.getElementById('head').prepend(para);

//if we aren't on the index page, we need to correct the paths
//by moving 1 directory up
const up = (typeof on_index === 'undefined') ? "../" : "";

//this page's place in the ring; the index and about pages sit outside it
//(-1), so from there next is the newest work and prev the oldest
const page_name = (p) => p.split('/').pop().replace(/\.html$/, '');
const here = extracted_links.findIndex(l => page_name(l) === page_name(window.location.pathname));
const n = extracted_links.length;
const prev = here < 0 ? n - 1 : (here - 1 + n) % n;
const next = here < 0 ? 0 : (here + 1) % n;
let pick = Math.floor(Math.random() * (here < 0 ? n : n - 1));
if (here >= 0 && pick >= here) pick++;   //any work but this one

const ring = [["[<< prev]", prev, title_list[prev]],
              ["[random]", pick, ""],        //no tooltip: keep it a surprise
              ["[next >>]", next, title_list[next]]];

const ring_links = ring.map(([label, i, tip], k) => {
    //spaced like [About]&nbsp;&nbsp;[Home], and kept on one line
    if (k > 0) para.appendChild(document.createTextNode('\u00a0\u00a0'));
    const a = document.createElement('a');
    a.appendChild(document.createTextNode(label));
    a.href = up + extracted_links[i];
    if (tip) a.title = tip;
    para.appendChild(a);
    return a;
});

//[random] draws again every time the pointer moves onto it, never landing on
//this page or where it just was, so each hover shows a new destination; on
//the index, the tile it lands on lights up (hover colours are in style.css)
const random_link = ring_links[1];
let lit_tile = null;

function light_random(on){
    if (lit_tile) lit_tile.classList.remove('lit');
    lit_tile = on ? document.querySelector('#test > a[href="' + extracted_links[pick] + '"]') : null;
    if (lit_tile) lit_tile.classList.add('lit');
}

random_link.addEventListener('mouseenter', () => {
    let i;
    do { i = Math.floor(Math.random() * n); } while (i === here || i === pick);
    pick = i;
    random_link.href = up + extracted_links[pick];
    light_random(true);
});
random_link.addEventListener('mouseleave', () => light_random(false));

//coming back to the page after following [random] never fires mouseleave
window.addEventListener('pageshow', () => light_random(false));


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