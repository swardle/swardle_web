overview = document.getElementById('blog_overview');
if(overview) { 
    overview.innerHTML = `
<article class="blog_list">
    <header>
    <h2>Moving to Silicon Valley</h2>
    <p>
        <time datetime="2020-07-25">July 25, 2020</time>
    </p>
    <img src="img/sfscott.jpg" class="blog_img">
</header>
<p>How and why I moved to Silicon Valley
    <p>
        <a href="blog6.html" class="button_read_more">READ MORE</a>
</article>

<article class="blog_list">
    <header>
    <h2>Debuggers and constexpr</h2>
    <p>
        <time datetime="2019-02-10">Feb 10, 2019</time>
    </p>
    <img src="img/24.jpg" class="blog_img">
</header>
<p>A way to debug constexpr functions or other functions that have been 100% removed from the EXE
    <p>
        <a href="blog5.html" class="button_read_more">READ MORE</a>
</article>

<article class="blog_list blog_list_second">
<header>
    <h2>Science at C++NOW</h2>
    <p>
        <time datetime="2018-06-10">June 10, 2018</time>
    </p>
    <img src="img/23.png" class="blog_img">
</header>
<p>I have been told the place to see the science of C++ happening is <a href="https://cppnow.org/">C++Now</a>. The best and the brightest in the C++ community try to push the language forward.
    <p>
        <a href="blog4.html" class="button_read_more">READ MORE</a>
</article>
<article class="blog_list blog_list_second">
<header>
    <h2>BELATED REVIEW OF CPPCON 2017</h2>
    <p>
        <time datetime="2017-12-30">Dec 30, 2017</time>
    </p>
    <img src="img/21.jpg" class="blog_img">
</header>
<p>This year I did my 2nd CPPCON presentation this last September. It was a topic that is getting more and more important, packages and modules but I will talk about that later. You can see my presentation <a href="presentation.html">here</a>.
    For now it is January and most people have done their CPPCON write up months ago so lets do that first.
    <p>
        <a href="blog3.html" class="button_read_more">READ MORE</a>
</article>
<article class="blog_list blog_list_second">
<header>
    <h2>Waiting for genus</h2>
    <p>
        <time datetime="2017-09-10">Sep 10, 2017</time>
    </p>
    <img src="img/19.jpg" class="blog_img">
</header>
<p>I hate when I am stuck on some problem. I am very stubborn when it comes to fixing some problem. I’d often just power though problems. Just keep trying ideas even if I know most of them will not work hoping I would just stumble on
    to the solution (or often stumble on to the real problem).</p>
<p>However this powering though often does not work. Sometimes you are just waiting for genus.</p>
<a href="blog2.html" class="button_read_more">READ MORE</a>
</article>
<article class="blog_list blog_list_second">
<header>
    <h2>My start in programming</h2>
    <p>
        <time datetime="2017-02-14">Sep 1, 2017</time>
    </p>
    <img src="img/2.jpg" class="blog_img">
</header>
<p>This first blog post is about me and my start in programming. I have never been one to write a lot. Those who know me know why I am very dyslexic so it takes a long time. But my wife Seiko is learning web design so I figured I could
    help by learning some Javascript by writing some games. I will go into these things on different days. </p>
<a href="blog1.html" class="button_read_more">READ MORE</a>
</article>
`
}

titles = document.getElementById('list_blog_title');
if (titles) {
    titles.innerHTML = `
    <li><i class="fa fa-pencil" aria-hidden="true"></i>&nbsp;<a href="blog6.html">Moving to Silicon Valley</a>
    </li>
    <br>
    <li><i class="fa fa-pencil" aria-hidden="true"></i>&nbsp;<a href="blog5.html">Debuggers and constexpr</a>
    </li>
    <br>
    <li><i class="fa fa-pencil" aria-hidden="true"></i>&nbsp;<a href="blog4.html">Science at C++NOW</a>
    </li>
    <br>
    <li><i class="fa fa-pencil" aria-hidden="true"></i>&nbsp;<a href="blog3.html">Belated review of CPPCON</a>
    </li>
    <br>
    <li><i class="fa fa-pencil" aria-hidden="true"></i>&nbsp;<a href="blog2.html">Waiting for genus</a>
    </li>
    <br>
    <li><i class="fa fa-pencil" aria-hidden="true"></i>&nbsp;<a href="blog1.html">My start in programming</a>
    </li>
    `
}

