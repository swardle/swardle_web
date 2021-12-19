let hamburgler = document.getElementById('hamburgler')
if(hamburgler) {
    hamburgler.addEventListener('click', checkNav);
}
window.addEventListener("keyup", function(e) {
    if (e.keyCode == 27) closeNav();
}, false);

function checkNav() {
    if (document.body.classList.contains('hamburgler-active')) {
        closeNav();
    } else {
        openNav();
    }
}

function closeNav() {
    document.body.classList.remove('hamburgler-active');
    var title = document.getElementById('page_title');
    if (title != null) {
        title.style.display = "block";
    }
}

function openNav() {
    document.body.classList.add('hamburgler-active');
    // when click hamburgler, hide page description, Seiko add this code
    var title = document.getElementById('page_title');
    if (title != null) {
        title.style.display = "none";
    }

}


// absoluteContainer_title will be one of
// ABOUT
// Blog 
// GET IN TOUCH
// PRESENTATION
function AddIndexHeaderFooter (absoluteContainer_title) {
    let overview = document.getElementById('indexheader');
    if (overview) {
        let str = `
    <div class="hamburgler-menu">
        <ul class="hamburgler-menu-list">
            <li><a class="animsition-link" href="index.html">HOME</a></li>
            <li><a class="animsition-link" href="blog.html">BLOG</a></li>
            <li><a class="animsition-link" href="about.html">ABOUT</a></li>
            <li><a class="animsition-link" href="contact.html">CONTACT</a></li>
            <li><a class="animsition-link" href="presentation.html">PRESENTATION</a></li>
        </ul>
    </div>
    <div id="hamburgler" class="hamburgler-icon-wrapper">
        <span class="hamburgler-icon"></span>
    </div>
    <a href="index.html"><img src="img/logo.png" class="logo"></a>
    <nav>
        <ul class="main_nav">
            <li><a class="animsition-link" href="index.html">HOME</a></li>
            <li><a class="animsition-link" href="blog.html">BLOG</a></li>
            <li><a class="animsition-link" href="about.html">ABOUT</a></li>
            <li><a class="animsition-link" href="contact.html">CONTACT</a></li>
            <li><a class="animsition-link" href="presentation.html">PRESENTATION</a></li>
        </ul>
    </nav>
`
        let absContain = `
    <div class="absoluteContainer">
    <div id="page_title">
        absoluteContainer_page_title
    </div>
    </div>
        `

        if(absoluteContainer_title != "") {
            absContain = absContain.replace("absoluteContainer_page_title", absoluteContainer_title)
        } else {
            absContain = ""
        }
        overview.innerHTML = str + absContain
    }

    overview = document.getElementById('indexfooter');
    if (overview) {
        let str = `
        <ul class="footer_nav">
        <li><a href="index.html">HOME</a></li>
        <li><a href="blog.html">BLOG</a></li>
        <li><a href="about.html">ABOUT</a></li>
        <li><a href="contact.html">CONTACT</a></li>
        <li><a href="presentation.html">PRESENTATION</a></li>
    </ul>
    <div class="social_media">
        <a href="https://twitter.com/scottrwardle"><i class="fa fa-twitter" aria-hidden="true"></i></a>
        <a href="https://www.linkedin.com/in/scottwardle"><i class="fa fa-linkedin" aria-hidden="true"></i></a>
    </div>
    <p>&copy; SCOTT WARDLE 2020</p>
`
        str = str.replace("absoluteContainer_page_title", absoluteContainer_title)
        overview.innerHTML = str
    }

}

