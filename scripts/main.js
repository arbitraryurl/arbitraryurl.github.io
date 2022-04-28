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
	// sessionStorage["datas"] = JSON.stringify(datas);
	//
	// // Retrieve
	// var stored_datas = JSON.parse(sessionStorage["datas"]);
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
	sessionStorage.setItem("imnum", p);
	console.log(p);
}

//store div id to open on new page
function txt_store(t) {
	sessionStorage.setItem("nextopen", t);
	console.log(t)
}

var div_flag = sessionStorage.getItem("flag");
console.log(div_flag);

// Retrieve

console.log(stored_datas);

//if we have stored divs and we're not on the index page
if (div_flag != null && !(window.location.pathname === '/' || document.URL.includes("index.html")) ){
	var stored_datas = JSON.parse(sessionStorage["arr"]);
	var arr = stored_datas;
}
else if (div_flag == null && !(window.location.pathname === '/' || document.URL.includes("index.html"))){
	var arr = ["instant1"];
}
else{
	var arr = [];
}

console.log(arr);

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
	sessionStorage.setItem("flag", 1);
	console.log(arr);
}

//save array to local memory
function setSwitch(){
	sessionStorage["arr"] = JSON.stringify(arr);
}




//fetching local memory
var thatopen = sessionStorage.getItem("nextopen");
var slideIndex = parseInt(sessionStorage.getItem("imnum"));

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
var arrayLength = arr.length;
for (const btn of myButtons) {
	for (var i = 0; i<arrayLength; i++){
		divToOpen = arr[i];
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
