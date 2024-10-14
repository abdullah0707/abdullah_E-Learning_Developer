

/* Please ❤ this if you like it! */


(function ($) {
   "use strict";

   //Page cursors

   document.getElementsByTagName("body")[0].addEventListener("mousemove", function (n) {
      t.style.left = n.clientX + "px",
         t.style.top = n.clientY + "px",
         e.style.left = n.clientX + "px",
         e.style.top = n.clientY + "px",
         i.style.left = n.clientX + "px",
         i.style.top = n.clientY + "px"
   });
   var t = document.getElementById("cursor"),
      e = document.getElementById("cursor2"),
      i = document.getElementById("cursor3");
   function n(t) {
      e.classList.add("hover"), i.classList.add("hover")
   }
   function s(t) {
      e.classList.remove("hover"), i.classList.remove("hover")
   }
   s();
   for (var r = document.querySelectorAll(".hover-target"), a = r.length - 1; a >= 0; a--) {
      o(r[a])
   }
   function o(t) {
      t.addEventListener("mouseover", n), t.addEventListener("mouseout", s)
   }


   //About page

   $(".about-text").on('click', function () {
      $("body").addClass("about-on");
   });
   $(".about-close").on('click', function () {
      $("body").removeClass("about-on");
   });


   //Contact page

   $(".contact-text").on('click', function () {
      $("body").addClass("contact-on");
   });
   $(".contact-btn").on('click', function () {
      $("body").removeClass("about-on");
      $("body").addClass("contact-on");
   });
   $(".contact-close").on('click', function () {
      $("body").removeClass("contact-on");
   });


   //Wildlife portfolio page

   $(".wildlife").on('click', function () {
      $("body").addClass("wildlife-on");
   });
   $(".wildlife-close").on('click', function () {
      $("body").removeClass("wildlife-on");
   });

})(jQuery);

particlesJS("particles-js", {
   "particles": {
      "number": {
         "value": 33,
         "density": {
            "enable": true,
            "value_area": 1420.4657549380909
         }
      },
      "color": {
         "value": "#ffffff"
      },
      "shape": {
         "type": "triangle",
         "stroke": {
            "width": 0,
            "color": "#000000"
         },
         "polygon": {
            "nb_sides": 5
         },
         "image": {
            "src": "img/github.svg",
            "width": 100,
            "height": 100
         }
      },
      "opacity": {
         "value": 0.06313181133058181,
         "random": false,
         "anim": {
            "enable": false,
            "speed": 1,
            "opacity_min": 0.1,
            "sync": false
         }
      },
      "size": {
         "value": 11.83721462448409,
         "random": true,
         "anim": {
            "enable": false,
            "speed": 40,
            "size_min": 0.1,
            "sync": false
         }
      },
      "line_linked": {
         "enable": true,
         "distance": 150,
         "color": "#ffffff",
         "opacity": 0.4,
         "width": 1
      },
      "move": {
         "enable": true,
         "speed": 6,
         "direction": "none",
         "random": false,
         "straight": false,
         "out_mode": "out",
         "bounce": false,
         "attract": {
            "enable": false,
            "rotateX": 600,
            "rotateY": 1200
         }
      }
   },
   "interactivity": {
      "detect_on": "canvas",
      "events": {
         "onhover": {
            "enable": true,
            "mode": "repulse"
         },
         "onclick": {
            "enable": true,
            "mode": "push"
         },
         "resize": true
      },
      "modes": {
         "grab": {
            "distance": 400,
            "line_linked": {
               "opacity": 1
            }
         },
         "bubble": {
            "distance": 400,
            "size": 40,
            "duration": 2,
            "opacity": 8,
            "speed": 3
         },
         "repulse": {
            "distance": 200,
            "duration": 0.4
         },
         "push": {
            "particles_nb": 4
         },
         "remove": {
            "particles_nb": 2
         }
      }
   },
   "retina_detect": true
});