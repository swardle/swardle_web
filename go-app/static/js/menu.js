document.getElementById('hamburgler').addEventListener('click', checkNav);
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