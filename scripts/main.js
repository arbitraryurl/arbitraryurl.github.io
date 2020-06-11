// var coll = document.getElementsByClassName("collapsible");
// var i;

// for (i = 0; i < coll.length; i++) {
  // coll[i].addEventListener("click", function() {
    // this.classList.toggle("activeMain");
    // var content = this.nextElementSibling;
	// console.log(content.style.maxHeight);
    // if (content.style.maxHeight){
      // content.style.maxHeight = null;
    // } else {
      // content.style.maxHeight = content.scrollHeight + "px";
    // }
  // });
// }

if ( document.URL.includes("instant.html") ) {
	document.querySelector('#here').addEventListener('click', function() {
		this.classList.toggle("activeMain")
		document.querySelector('#first').classList.toggle('collapsed');
	});
	
	document.querySelector('#here2').addEventListener('click', function() {
		this.classList.toggle("activeIdx")
		document.querySelector('#second').classList.toggle('open');
	});
}

else {
	document.querySelector('#here').addEventListener('click', function() {
		this.classList.toggle("activeIdx")
		document.querySelector('#first').classList.toggle('open');
	});
	
	document.querySelector('#here2').addEventListener('click', function() {
		this.classList.toggle("activeIdx")
		document.querySelector('#second').classList.toggle('open');
	});
	
	document.querySelector('#here3').addEventListener('click', function() {
		this.classList.toggle("activeIdx")
		document.querySelector('#third').classList.toggle('open');
	});
	
	document.querySelector('#here4').addEventListener('click', function() {
		this.classList.toggle("activeIdx")
		document.querySelector('#fourth').classList.toggle('open');
	});
}

function store(p) {
	localStorage.setItem("imnum", p);
}

var slideIndex = localStorage.getItem("imnum");;
showSlides(slideIndex);
console.log(slideIndex);

// Next/previous controls
function plusSlides(n) {
  showSlides(slideIndex += n);
}

// Thumbnail image controls
function currentSlide(n) {
  showSlides(slideIndex = n);
}

function showSlides(n) {
  var i;
  var slides = document.getElementsByClassName("mySlides");
  var dots = document.getElementsByClassName("btn");
  var caps = document.getElementsByClassName("caption_inc");
  if (n > slides.length) {slideIndex = 1}
  if (n < 1) {slideIndex = slides.length}
  for (i = 0; i < slides.length; i++) {
      slides[i].style.display = "none";
  }
  for (i = 0; i < dots.length; i++) {
      dots[i].className = dots[i].className.replace(" active", "");
  }
  for (i = 0; i < caps.length; i++) {
      caps[i].className = caps[i].className.replace(" active_cap", "");
  }
  slides[slideIndex-1].style.display = "block";
  dots[slideIndex-1].className += " active";
  caps[slideIndex-1].className += " active_cap";
} 





// // Get the container element
// var btnContainer = document.getElementById("sidebuttons");

// // Get all buttons with class="btn" inside the container
// var btns = btnContainer.getElementsByClassName("btn");

// // Loop through the buttons and add the active class to the current/clicked button
// for (var i = 0; i < btns.length; i++) {
  // btns[i].addEventListener("click", function() {
    // var current = document.getElementsByClassName("active");
    // current[0].className = current[0].className.replace(" active", "");
    // this.className += " active";
  // });
// } 