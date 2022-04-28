//on index page
if (window.location.pathname === '/' || document.URL.includes("index.html")){
	console.log("INDEX")
	const myButtons = document.querySelectorAll("#here");
	for (const btn of myButtons) {
			btn.addEventListener('click', function() {
				this.classList.toggle("activeIdx");
				const to_open = btn.getAttribute("data-for");
				document.querySelector("#" + to_open).classList.toggle('open');
			})
		};
}

//On main page
else{
	console.log("MAIN")
	// var datas = ["1", "2", "3"];
	// localStorage["datas"] = JSON.stringify(datas);
	//
	// // Retrieve
	// var stored_datas = JSON.parse(localStorage["datas"]);
	// console.log(stored_datas);
	const myButtons = document.querySelectorAll("#here_instant");
	for (const btn of myButtons) {
			btn.addEventListener('click', function() {
				this.classList.toggle("activeIdx");
				const to_open = btn.getAttribute("data-for");
				document.querySelector("#" + to_open).classList.toggle('open');
			});
		};
}



//store slide number to present on new page
function store(p) {
	localStorage.setItem("imnum", p);
}

//store div id to open on new page
function txt_store(t) {
	localStorage.setItem("nextopen", t);
	console.log(t)
}

// Retrieve
var stored_datas = JSON.parse(localStorage["arr"]);
console.log(stored_datas);

//if we have stored divs and we're not on the index page
if (stored_datas && !(window.location.pathname === '/' || document.URL.includes("index.html")) ){
	var arr = stored_datas;
}
else{
	var arr = [];
}

//append div to be opened to array
function carryOn(d){
	if (!arr.includes(d)){
		arr.push(d);
	}

	else if (arr.includes(d)){
		const arr_ind = arr.indexOf(d);
		console.log(arr_ind);
		arr.splice(arr_ind, 1);
	}

	console.log(arr);
}

//save array to local memory
function setSwitch(){
	localStorage["arr"] = JSON.stringify(arr);
}




//fetching local memory
var thatopen = localStorage.getItem("nextopen");
var slideIndex = parseInt(localStorage.getItem("imnum"));

if (slideIndex){
	showArrow(slideIndex);

}

// //if a slide number is stored, show it; else set slide to 0
// if (slideIndex){
// 	showSlides(slideIndex);
// } else {
// 	slideIndex = 1;
// 	thatopen = "instant1"
// 	showSlides(slideIndex);
// }



//open div on new page (instant) using local memory
const myButtons = document.querySelectorAll("#here_instant");
console.log("HERE");
console.log(myButtons);
var arrayLength = stored_datas.length;
for (const btn of myButtons) {
	for (var i = 0; i<arrayLength; i++){
		divToOpen = stored_datas[i];
		console.log(divToOpen);
		if (btn.getAttribute("data-for") == divToOpen){
			btn.classList.toggle("activeIdx");
			document.querySelector('#' + divToOpen).classList.toggle('open');
		}
	}
}

if (thatopen == "about"){
	document.querySelector("#about").classList.toggle("activeIdx");
}

// if (thatopen == "contact"){
// 	document.querySelector("#contact").classList.toggle("activeIdx");
// }

function showArrow(n){
	var dots = document.getElementsByClassName("btn");
	for (i = 0; i < dots.length; i++) {
		dots[i].className = dots[i].className.replace(" active", "");
	}
	dots[slideIndex-1].className += " active";
}

// // Next/previous controls
// function plusSlides(n) {
//   slideIndex = slideIndex - n;
//   showSlides(slideIndex);
// }
//
// // Thumbnail image controls
// function currentSlide(n) {
//   showSlides(slideIndex = n);
// }
//
// function showSlides(n) {
//   var i;
//   var slides = document.getElementsByClassName("mySlides");
//   var dots = document.getElementsByClassName("btn");
//   var caps = document.getElementsByClassName("caption_inc");
//   // console.log(slideIndex);
//   if (n > slides.length) {slideIndex = 1}
//   if (n < 1) {slideIndex = slides.length}
//   for (i = 0; i < slides.length; i++) {
//       slides[i].style.display = "none";
//   }
//   for (i = 0; i < dots.length; i++) {
//       dots[i].className = dots[i].className.replace(" active", "");
//   }
//   for (i = 0; i < caps.length; i++) {
//       caps[i].className = caps[i].className.replace(" active_cap", "");
//   }
//   slides[slideIndex-1].style.display = "block";
//   dots[slideIndex-1].className += " active";
// 	if (slideIndex < caps.length){
//   caps[slideIndex-1].className += " active_cap";
// 	}
//
// }
