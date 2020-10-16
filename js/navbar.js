/*---------- EXPANDER MENU ----------*/
const showMenu = (navbarId, ...toggle_btn_selectors) => {
    let toggle_btns = toggle_btn_selectors.map(selector => document.querySelector(selector));
    let navbar = document.getElementById(navbarId);

    const onclick_event_listener = () => {
        // toggling padding first
        navbar.style.padding = navbar.style.padding ? '' : '1.5rem 1.5rem 2rem';

        navbar.classList.toggle('expander');
        document.getElementById('main-container').classList.toggle('overlay');

        document.querySelectorAll('#navbar nav > div >  div+div > div .rotate').forEach(e => e.classList.remove("rotate"));
        document.querySelectorAll('#navbar nav > div >  div+div > div .showCollapse').forEach(e => e.classList.remove("showCollapse"));
    }

    if (toggle_btns && navbar) {
        toggle_btns.forEach(element => { element.addEventListener('click', onclick_event_listener) });
    }
}
showMenu('navbar', '#nav-toggle', '.header-logo');

/*----------- LINK ACTIVE  ------------*/
const linkColor = document.querySelectorAll('.nav__link')
function colorLink() {
    linkColor.forEach(l => l.classList.remove('active'))
    this.classList.add('active')
}
linkColor.forEach(l => l.addEventListener('click', colorLink))


/*------------- COLLAPSE MENU  --------------*/
const linkCollapse = document.getElementsByClassName('nav__link')
for (let i = 0; i < linkCollapse.length; i++) {
    linkCollapse[i].addEventListener('click', function () {
        // const collapseMenu = this.nextElementSibling
        const collapseMenu = this.querySelector('ul')
        collapseMenu.classList.toggle('showCollapse')
        
        // const rotate = collapseMenu.previousElementSibling
        const rotate = this.querySelector('.collapse__link')
        rotate.classList.toggle('rotate')
    })
}