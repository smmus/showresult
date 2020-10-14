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
// ------------------------ nav functionality ends -----------------------------
// ================================= GLOBAL VARS  =================================
const DB_VERSION = 1;
const DB_NAME = new URLSearchParams(window.location.search).get('in'); //institution
const XM_NAME = new URLSearchParams(window.location.search).get('xm');
const SHOW_STUDENTS = new URLSearchParams(window.location.search).get('show_students');
const SEARCHED_NAME = new URLSearchParams(window.location.search).get('searched_name');
const STD_ROLLS = new URLSearchParams(window.location.search).get('roll') && new URLSearchParams(window.location.search).get('roll').split('-').map(e => parseInt(e)); // array of rolls(int)
// const STD_NAME = new URLSearchParams(window.location.search).get('name');

// ========= derived globals ==========
let IS_RANK_GIVEN,
    MAIN_ROLL_DIGITS,
    OBJ_STORE_MAIN,
    XM_NAME_FROM_COLLEGE,
    OBJ_STORES = []; /** the stores under that db */

if (DB_NAME && XM_NAME) {
    IS_RANK_GIVEN = document.querySelector(`a[data-db=${DB_NAME}]`).dataset.is_rank_given ? true : false;
    MAIN_ROLL_DIGITS = document.querySelector(`meta[db=${DB_NAME}]`).dataset.main_roll_digits && parseInt(document.querySelector('meta[db=rc]').dataset.main_roll_digits);
    OBJ_STORE_MAIN = `${DB_NAME}_${XM_NAME}_main`;
    document.querySelectorAll(`a[data-db=${DB_NAME}]`).forEach(e => {

        OBJ_STORES.push(`${DB_NAME}_${e.dataset.xm}_main`);

        if (e.href.includes(`in=${DB_NAME}&xm=${XM_NAME}`)) XM_NAME_FROM_COLLEGE = e.dataset.xm_name || e.textContent;
    });
}

// =========== consts ==================
const SHOW_TOPPERS = 10;
const GRAPH_BG_COLORS = ['#EF53504D', '#BA68C84D', '#64B5F64D', '#81C7844D', '#4DD0E14D', '#FFAB914D', '#FFB74D4D', '#B0BEC54D', '#9FA8DA4D', '#FFAB914D'];
const GRADES = ['a_plus', 'a', 'a_minus', 'b', 'c', 'd', 'f', 'no_result', 'promoted', 'failed'];
const XM_TOTAL_PRIORITY_LIST = ['exam_total', 'term_total', 'mcq']; /*which field will reprent xm_total for each subject eg. SUBNAME_exam_total */
const SUB_CODE_TO_NAME = {
    '101': 'bangla_1st',
    '102': 'bangla_2nd',
    '107': 'eng_1st',
    '108': 'eng_2nd',
    '178': 'biology_1st',
    '179': 'biology_2nd',
    '174': 'physics_1st',
    '175': 'physics_2nd',
    '176': 'chemistry_1st',
    '177': 'chemistry_2nd',
    '265': 'higher_math_1st',
    '266': 'higher_math_2nd',
    '275': 'ict'
};
let TOTAL_NUMBER_FIELD_NAME = "";
// ============== secondary vars =============
let IS_CREATED = false;
let db;

/** displaying college name */
document.querySelector('.colg_name').textContent = DB_NAME && document.querySelector(`meta[db=${DB_NAME}]`).dataset.in;

// ------------------------ FOR MEDIA QUERIES  ------------------------------
const MEDIA_PHONE_WIDTH = '640px';
const MEDIA_TABLET_WIDTH = '768px';
const MEDIA_DESKTOP = '1024px';

const IS_MEDIA_PHONE = window.matchMedia(`(max-width: ${MEDIA_PHONE_WIDTH})`).matches;
const IS_MEDIA_TABLET = window.matchMedia(`(max-width: ${MEDIA_TABLET_WIDTH})`).matches;
const IS_MEDIA_DESKTOP = window.matchMedia(`(max-width: ${MEDIA_DESKTOP})`).matches;
// console.log(window.matchMedia(`(max-width: ${MEDIA_PHONE_WIDTH})`))

// ========================= checking if all are expected =========================
console.log('[DB_VERSION]', DB_VERSION);
console.log('[XM_NAME]', XM_NAME);
console.log('[DB_NAME]', DB_NAME);
console.log('[STD_ROLLS]', STD_ROLLS);
console.log('[SHOW_STUDENTS]', SHOW_STUDENTS);
console.log('[SEARCHED_NAME]', SEARCHED_NAME);
console.log('[IS_RANK_GIVEN]', IS_RANK_GIVEN);
console.log('[MAIN_ROLL_DIGITS]', MAIN_ROLL_DIGITS);
console.log('[OBJ_STORE_MAIN]', OBJ_STORE_MAIN);
console.log('[OBJ_STORES]', OBJ_STORES);
console.log('[XM_NAME_FROM_COLLEGE]', XM_NAME_FROM_COLLEGE);

// ------------------------------ CHARTJS GLOBAL SET ------------------------------
Chart.defaults.global.elements.line.tension = 0;
Chart.defaults.global.elements.point.hitRadius = 5;

// ------------------------ FUNCTION MAIN STARTS ------------------------------
main();
async function main() {

    /** getting browser index-db */
    window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    if (!window.indexedDB) {
        console.log("[Your browser doesn't support a stable version of IndexedDB.]");
        document.body.innerHTML = `Your browser doesn't support a stable version of IndexedDB. Use modern browsers like FireFox or Chrome.`
        return;
    }

    try {
        if (!DB_NAME || !XM_NAME) {
            /*if no vars are passed --> show the main home page */
            document.querySelector('header .search-area').style.display = 'none';
            let main_conatiner = document.getElementById('main-container');
            main_conatiner.innerHTML = "";
            main_conatiner.style.display = 'flex';
            main_conatiner.style.flexDirection = 'column';
            main_conatiner.style.justifyContent = 'flex-start';
            main_conatiner.style.alignItems = 'center';
            main_conatiner.style.minHeight = '100vh';
            
            let main_div = document.createElement('div');
            main_div.style.margin = '0 auto';
            // main_div.style.width = '80%';
            main_div.id = 'main-div';
            main_conatiner.appendChild(main_div);

            main_div.innerHTML = 
            `<div class='card'>
                <div class='header'>
                    <p>View Your Result in a Different way</p>
                </div>
                <div class='img' style='display:block'>
                    <svg id="afc98551-3d88-4acb-87ed-36f06011ac7a" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" width="821.67627" height="579.00958" viewBox="0 0 821.67627 579.00958"><path d="M371.238,218.49521h-52.3999a19.01722,19.01722,0,0,0-19,19v56.81c-.66992-.04-1.33985-.1-2-.18a66.99888,66.99888,0,1,1,73.10009-77.63C371.0481,217.15518,371.1482,217.82523,371.238,218.49521Z" transform="translate(-189.16186 -160.49521)" fill="#f2f2f2"/><path d="M989.83814,216.49521h-671a21.023,21.023,0,0,0-21,21v354a21.023,21.023,0,0,0,21,21h671a21.023,21.023,0,0,0,21-21v-354A21.023,21.023,0,0,0,989.83814,216.49521Zm19,375a19.01722,19.01722,0,0,1-19,19h-671a19.01722,19.01722,0,0,1-19-19v-354a19.01722,19.01722,0,0,1,19-19h671a19.01722,19.01722,0,0,1,19,19Z" transform="translate(-189.16186 -160.49521)" fill="#3f3d56"/><path d="M956.83814,273.86484h-605a1,1,0,0,1,0-2h605a1,1,0,0,1,0,2Z" transform="translate(-189.16186 -160.49521)" fill="#3f3d56"/><path d="M522.83814,569.49521a1,1,0,0,1-1-1v-329a1,1,0,1,1,2,0v329A1.00005,1.00005,0,0,1,522.83814,569.49521Z" transform="translate(-189.16186 -160.49521)" fill="#3f3d56"/><path d="M673.83814,569.49521a1,1,0,0,1-1-1v-329a1,1,0,1,1,2,0v329A1.00005,1.00005,0,0,1,673.83814,569.49521Z" transform="translate(-189.16186 -160.49521)" fill="#3f3d56"/><path d="M824.83814,569.49521a1,1,0,0,1-1-1v-329a1,1,0,1,1,2,0v329A1.00005,1.00005,0,0,1,824.83814,569.49521Z" transform="translate(-189.16186 -160.49521)" fill="#3f3d56"/><path d="M425.75379,377.08261h-36.54a4.505,4.505,0,0,1-4.5-4.5V329.463a4.505,4.505,0,0,1,4.5-4.5h36.54a4.505,4.505,0,0,1,4.5,4.5v43.11963A4.505,4.505,0,0,1,425.75379,377.08261Z" transform="translate(-189.16186 -160.49521)" fill="#f9a826"/><path d="M477.75379,500.08261h-36.54a4.505,4.505,0,0,1-4.5-4.5V452.463a4.505,4.505,0,0,1,4.5-4.5h36.54a4.505,4.505,0,0,1,4.5,4.5v43.11963A4.505,4.505,0,0,1,477.75379,500.08261Z" transform="translate(-189.16186 -160.49521)" fill="#f9a826"/><path d="M595.75391,403.08261h-36.54a4.50508,4.50508,0,0,1-4.5-4.5V355.463a4.50508,4.50508,0,0,1,4.5-4.5h36.54a4.50508,4.50508,0,0,1,4.5,4.5v43.11963A4.50508,4.50508,0,0,1,595.75391,403.08261Z" transform="translate(-189.16186 -160.49521)" fill="#f9a826"/><path d="M748.75391,356.08261h-36.54a4.50508,4.50508,0,0,1-4.5-4.5V308.463a4.50508,4.50508,0,0,1,4.5-4.5h36.54a4.50508,4.50508,0,0,1,4.5,4.5v43.11963A4.50508,4.50508,0,0,1,748.75391,356.08261Z" transform="translate(-189.16186 -160.49521)" fill="#f9a826"/><path d="M889.75391,356.08261h-36.54a4.50508,4.50508,0,0,1-4.5-4.5V308.463a4.50508,4.50508,0,0,1,4.5-4.5h36.54a4.50508,4.50508,0,0,1,4.5,4.5v43.11963A4.50508,4.50508,0,0,1,889.75391,356.08261Z" transform="translate(-189.16186 -160.49521)" fill="#f9a826"/><path d="M954.75391,368.08261h-36.54a4.50508,4.50508,0,0,1-4.5-4.5V320.463a4.50508,4.50508,0,0,1,4.5-4.5h36.54a4.50508,4.50508,0,0,1,4.5,4.5v43.11963A4.50508,4.50508,0,0,1,954.75391,368.08261Z" transform="translate(-189.16186 -160.49521)" fill="#e6e6e6"/><path d="M925.75391,445.08261h-36.54a4.50508,4.50508,0,0,1-4.5-4.5V397.463a4.50508,4.50508,0,0,1,4.5-4.5h36.54a4.50508,4.50508,0,0,1,4.5,4.5v43.11963A4.50508,4.50508,0,0,1,925.75391,445.08261Z" transform="translate(-189.16186 -160.49521)" fill="#e6e6e6"/><path d="M801.75391,429.08261h-36.54a4.50508,4.50508,0,0,1-4.5-4.5V381.463a4.50508,4.50508,0,0,1,4.5-4.5h36.54a4.50508,4.50508,0,0,1,4.5,4.5v43.11963A4.50508,4.50508,0,0,1,801.75391,429.08261Z" transform="translate(-189.16186 -160.49521)" fill="#ff6584"/><path d="M730.75391,445.08261h-36.54a4.50508,4.50508,0,0,1-4.5-4.5V397.463a4.50508,4.50508,0,0,1,4.5-4.5h36.54a4.50508,4.50508,0,0,1,4.5,4.5v43.11963A4.50508,4.50508,0,0,1,730.75391,445.08261Z" transform="translate(-189.16186 -160.49521)" fill="#e6e6e6"/><path d="M577.75391,513.08261h-36.54a4.50508,4.50508,0,0,1-4.5-4.5V465.463a4.50508,4.50508,0,0,1,4.5-4.5h36.54a4.50508,4.50508,0,0,1,4.5,4.5v43.11963A4.50508,4.50508,0,0,1,577.75391,513.08261Z" transform="translate(-189.16186 -160.49521)" fill="#e6e6e6"/><path d="M392.75379,456.08261h-36.54a4.505,4.505,0,0,1-4.5-4.5V408.463a4.505,4.505,0,0,1,4.5-4.5h36.54a4.505,4.505,0,0,1,4.5,4.5v43.11963A4.505,4.505,0,0,1,392.75379,456.08261Z" transform="translate(-189.16186 -160.49521)" fill="#ff6584"/><path d="M495.75379,377.08261h-36.54a4.505,4.505,0,0,1-4.5-4.5V329.463a4.505,4.505,0,0,1,4.5-4.5h36.54a4.505,4.505,0,0,1,4.5,4.5v43.11963A4.505,4.505,0,0,1,495.75379,377.08261Z" transform="translate(-189.16186 -160.49521)" fill="#e6e6e6"/><path d="M465.83814,257.49521h-57a4,4,0,0,1,0-8h57a4,4,0,0,1,0,8Z" transform="translate(-189.16186 -160.49521)" fill="#ccc"/><path d="M626.83814,257.49521h-57a4,4,0,0,1,0-8h57a4,4,0,0,1,0,8Z" transform="translate(-189.16186 -160.49521)" fill="#ccc"/><path d="M777.83814,257.49521h-57a4,4,0,0,1,0-8h57a4,4,0,0,1,0,8Z" transform="translate(-189.16186 -160.49521)" fill="#ccc"/><path d="M918.83814,257.49521h-57a4,4,0,0,1,0-8h57a4,4,0,0,1,0,8Z" transform="translate(-189.16186 -160.49521)" fill="#ccc"/><path d="M338.17107,550.38656A10.05577,10.05577,0,0,1,329.471,537.6561L303.83814,513.795l13.55277-3.43814,25.20573,20.44382a10.11027,10.11027,0,0,1-4.42557,19.58585Z" transform="translate(-189.16186 -160.49521)" fill="#ffb8b8"/><polygon points="184.404 566.253 196.664 566.253 202.496 518.965 184.402 518.965 184.404 566.253" fill="#ffb8b8"/><path d="M370.93892,723.24476h38.53073a0,0,0,0,1,0,0v14.88687a0,0,0,0,1,0,0H385.82577a14.88686,14.88686,0,0,1-14.88686-14.88686v0A0,0,0,0,1,370.93892,723.24476Z" transform="translate(591.28005 1300.86337) rotate(179.99738)" fill="#2f2e41"/><polygon points="100.345 557.401 112.193 560.555 129.994 516.359 112.509 511.705 100.345 557.401" fill="#ffb8b8"/><path d="M285.30672,718.54064h38.53073a0,0,0,0,1,0,0v14.88687a0,0,0,0,1,0,0H300.19358a14.88686,14.88686,0,0,1-14.88686-14.88686v0A0,0,0,0,1,285.30672,718.54064Z" transform="matrix(-0.96635, -0.25722, 0.25722, -0.96635, 222.9961, 1345.38778)" fill="#2f2e41"/><path d="M389.12281,717.795H370.41553a4.72981,4.72981,0,0,1-4.72607-4.293L354.333,595.5704a3.74767,3.74767,0,0,0-7.321-.71484L314.03858,705.05478a4.74216,4.74216,0,0,1-5.7,3.24609l-17.40308-4.35156a4.74747,4.74747,0,0,1-3.44727-5.78711c.28418-1.11035,28.41065-111.02832,28.65625-112.1582,6.37281-46.96778,13.99707-59.55371,18.093-66.31445.33911-.55958.65064-1.07422.93115-1.56055.35108-.6084,2.51245-6.64453,3.88355-10.56445a4.79,4.79,0,0,1,2.43506-2.97754c17.21069-8.80176,37.34741-2.709,43.10913-.63184a4.6821,4.6821,0,0,1,2.33813,1.81543c17.28467,26.07129,8.80225,177.49121,6.92627,207.581A4.75127,4.75127,0,0,1,389.12281,717.795Z" transform="translate(-189.16186 -160.49521)" fill="#2f2e41"/><circle cx="151.68415" cy="234.02423" r="24.56103" fill="#ffb8b8"/><path d="M338.24365,512.3331l-.17651-.1709c-.33105-.32031-33.05566-32.37988-28.82056-62.02441,1.81128-12.67969,12.07032-20.78125,29.66773-23.43067a27.13473,27.13473,0,0,1,29.99976,19.1211l17.3999,59.48437Z" transform="translate(-189.16186 -160.49521)" fill="#ccc"/><path d="M321.49463,535.13583l-23.31836-23.17089a13.13671,13.13671,0,0,1-3.47973-12.39161l11.28857-45.91894A10.35411,10.35411,0,0,1,319.165,446.254a10.41072,10.41072,0,0,1,6.80908,12.79394L314.0896,499.44443l19.21826,20.63672Z" transform="translate(-189.16186 -160.49521)" fill="#ccc"/><path d="M446.56619,456.05763a10.05577,10.05577,0,0,1-14.88374,4.02868L400.553,476.22078l1.37589-13.70578,27.59693-17.07886a10.11028,10.11028,0,0,1,17.04041,10.62149Z" transform="translate(-189.16186 -160.49521)" fill="#ffb8b8"/><path d="M428.283,466.25982l-30.34625,13.11355a12.80885,12.80885,0,0,1-12.477-1.33846l-38.58893-27.64906A10.355,10.355,0,0,1,344.89728,435.4a10.41025,10.41025,0,0,1,14.40861-1.568l33.08845,26.042,26.30022-10.17517Z" transform="translate(-189.16186 -160.49521)" fill="#ccc"/><path d="M344.91778,402.38974c3.03-3.79642,8.69082-4.00051,12.85285-6.50478,5.45181-3.28033,7.70574-10.61077,5.94888-16.726s-6.93808-10.881-12.8784-13.16029-12.5494-2.30748-18.81589-1.20568c-9.33021,1.64048-18.51612,5.99512-24.20655,13.56895s-7.13858,18.66583-1.98149,26.61243c2.37026,3.65236,6.02921,6.66714,6.97549,10.91712,1.2423,5.57954-2.6714,10.96083-6.86421,14.846-4.77673,4.42628-10.257,8.1334-14.44192,13.12294s-6.97564,11.80621-5.066,18.03215c1.6,5.21635,6.25591,9.05948,11.36143,10.98408s10.66607,2.2027,16.12124,2.30939c5.29718.10361,10.92363-.02522,15.386-2.88141,4.77715-3.05764,7.32781-8.8583,7.51626-14.52705s-1.70587-11.22252-4.24464-16.2945c-1.51323-3.02314-3.27267-5.95256-4.27818-9.18027s-1.1797-6.89016.43058-9.86274c1.69267-3.12465,5.1171-5.009,8.6041-5.69419.18117-.0356.37286-.06739.57335-.0957a7.39847,7.39847,0,0,0,6.33328-8.62766C343.8467,405.80819,343.881,403.68869,344.91778,402.38974Z" transform="translate(-189.16186 -160.49521)" fill="#2f2e41"/><polygon points="483.229 567.3 470.969 567.3 465.137 520.012 483.231 520.013 483.229 567.3" fill="#a0616a"/><path d="M462.212,563.79684h23.64386a0,0,0,0,1,0,0v14.88687a0,0,0,0,1,0,0H447.32509a0,0,0,0,1,0,0v0A14.88687,14.88687,0,0,1,462.212,563.79684Z" fill="#2f2e41"/><polygon points="572.184 553.413 561.033 558.506 536.079 517.917 552.538 510.399 572.184 553.413" fill="#a0616a"/><path d="M743.47033,716.96167h23.64388a0,0,0,0,1,0,0v14.88687a0,0,0,0,1,0,0H728.58348a0,0,0,0,1,0,0v0A14.88685,14.88685,0,0,1,743.47033,716.96167Z" transform="translate(-422.52781 215.68843) rotate(-24.54855)" fill="#2f2e41"/><path d="M725.64338,568.3522a10.05579,10.05579,0,0,0,.80112-15.39851l14.4116-32.69992-18.30864,3.10281-10.87858,30.57671a10.11028,10.11028,0,0,0,13.9745,14.41891Z" transform="translate(-189.16186 -160.49521)" fill="#a0616a"/><path d="M671.6094,715.32658H659.89748a4.51686,4.51686,0,0,1-4.48828-4.17383l-6.387-170.5586a4.49977,4.49977,0,0,1,4.92529-4.80468l67.73487,7.19336a4.5013,4.5013,0,0,1,4.06225,4.39355l1.41943,75.23535a3.49205,3.49205,0,0,0,.23389,1.19336l27.78516,72.05274a4.49892,4.49892,0,0,1-2.64307,5.84082l-11.86841,4.373a4.50108,4.50108,0,0,1-5.55737-2.16406l-34.13257-66.36914a4.475,4.475,0,0,1-.4043-1.14258l-5.83081-28.09375a3.49992,3.49992,0,0,0-6.904.3125L676.08034,711.33829A4.499,4.499,0,0,1,671.6094,715.32658Z" transform="translate(-189.16186 -160.49521)" fill="#2f2e41"/><circle cx="488.27943" cy="222.17782" r="24.56103" fill="#a0616a"/><path d="M694.28491,556.18955a87.66432,87.66432,0,0,1-46.8728-14.19825l-.239-.165.02466-.28955,9.395-109.416a15.4205,15.4205,0,0,1,14.59887-14.06153c12.176-.55957,28.531.146,37.28589,6.66651,13.23071,9.85449,19.60767,24.69385,17.49561,40.7124-4.38013,33.21875.58178,78.0293,1.16186,83.0293l.042.36035-.32959.15137A77.26611,77.26611,0,0,1,694.28491,556.18955Z" transform="translate(-189.16186 -160.49521)" fill="#f9a826"/><path d="M727.02173,548.65292a5.007,5.007,0,0,1-3.68066-1.62207l-5.37256-5.86132a5.02581,5.02581,0,0,1-1.10913-4.79493l12.25073-41.46386-18.63989-39.14356a8.8323,8.8323,0,0,1-.60376-5.87939,8.809,8.809,0,0,1,16.31323-2.084l25.29468,41.042a11.95092,11.95092,0,0,1,.72,11.19824l-20.60986,45.665a4.98754,4.98754,0,0,1-3.76636,2.87988A5.05373,5.05373,0,0,1,727.02173,548.65292Z" transform="translate(-189.16186 -160.49521)" fill="#f9a826"/><path d="M553.89965,469.44778a10.05577,10.05577,0,0,0,14.99854-3.57767l35.438,4.59612L596.192,453.77776l-32.404-1.806a10.11028,10.11028,0,0,0-9.88836,17.476Z" transform="translate(-189.16186 -160.49521)" fill="#a0616a"/><path d="M632.01123,478.5621a13.42535,13.42535,0,0,1-1.84472-.12744l-55.751-7.73242a5.54112,5.54112,0,0,1-4.25073-3.11133,5.65746,5.65746,0,0,1-.31787-.8291h-.00025a5.56408,5.56408,0,0,1,.575-4.43164l4.61353-7.64893a5.58411,5.58411,0,0,1,4.75586-2.686h.00757l48.59594.05566,36.29395-32.51709a9.86788,9.86788,0,0,1,6.10718-2.49951,9.83491,9.83491,0,0,1,7.37256,16.81543L641.95313,474.128A13.364,13.364,0,0,1,632.01123,478.5621Z" transform="translate(-189.16186 -160.49521)" fill="#f9a826"/><path d="M680.2335,404.52319c2.2445-5.19457,4.14379-12.11253-.16123-15.78514-2.49712-2.13029-6.09385-2.13469-9.36546-2.39972-9.21732-.74668-18.70553-4.98771-23.21077-13.06356s-1.98923-20.08442,6.51023-23.728c5.72923-2.456,12.29743-.78291,18.29443.91767l18.0058,5.10593c5.35006,1.51712,10.96737,3.19025,14.819,7.20149,6.14268,6.39729,5.6835,17.21166.80459,24.618s-12.22635,15.13079-20.63767,17.94281Z" transform="translate(-189.16186 -160.49521)" fill="#2f2e41"/><path d="M928.64656,739.50479h-738.294a1.19069,1.19069,0,1,1,0-2.38137h738.294a1.19069,1.19069,0,1,1,0,2.38137Z" transform="translate(-189.16186 -160.49521)" fill="#3f3d56"/></svg>
                </div>
                <div class='footer'>
                    <p>Click the left-hand-side navigation pannel and select your college exam.</p>
                </div>
            </div>
            <div class='card' style='margin-top:1em'>
                <div class='header'>
                    <p>Developer</p>
                </div>
                <div class='body'>
                    <h4>MUSH</h4>
                </div>
                <div class="dev-icons">
                <a class="dev-icon" href="https://github.com/smmus" target="_blank">
                    <svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg"
                        xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="35.318px" height="35.318px"
                        viewBox="0 0 35.318 35.318" style="enable-background:new 0 0 35.318 35.318;"
                        xml:space="preserve">
                        <g>
                            <path
                                d="M23.71,34.689c-0.172,0.062-0.345,0.137-0.522,0.168c-0.678,0.121-1.112-0.229-1.116-0.922
                                c-0.009-1.287-0.009-2.572,0.012-3.859c0.022-1.48-0.012-2.941-1.139-4.162c0.67-0.12,1.266-0.204,1.849-0.338
                                c3.862-0.887,5.868-3.323,6.124-7.366c0.131-2.058-0.236-3.946-1.604-5.567c-0.099-0.114-0.104-0.373-0.057-0.539
                                c0.364-1.34,0.258-2.649-0.166-3.959c-0.105-0.327-0.279-0.428-0.602-0.407c-1.134,0.063-2.173,0.461-3.089,1.073
                                c-0.883,0.593-1.705,0.722-2.754,0.482c-2.31-0.521-4.635-0.369-6.94,0.165c-0.261,0.062-0.612-0.021-0.851-0.161
                                c-1.082-0.634-2.164-1.25-3.412-1.496c-0.965-0.188-1.049-0.14-1.305,0.793C7.816,9.77,7.784,10.947,8.113,12.13
                                c0.047,0.172-0.002,0.448-0.117,0.575c-2.557,2.853-1.631,8.244,0.092,10.309c1.34,1.604,3.12,2.326,5.096,2.701
                                c0.345,0.064,0.688,0.113,1.033,0.173c-0.296,0.77-0.562,1.497-0.863,2.212c-0.059,0.138-0.246,0.254-0.399,0.312
                                c-1.938,0.752-3.604,0.199-4.713-1.56c-0.593-0.938-1.354-1.639-2.488-1.842c-0.036-0.007-0.073-0.026-0.106-0.021
                                c-0.305,0.08-0.607,0.164-0.911,0.246c0.171,0.238,0.292,0.558,0.521,0.701c0.961,0.608,1.586,1.475,1.999,2.498
                                c0.649,1.604,1.909,2.319,3.546,2.459c0.799,0.065,1.606,0.01,2.481,0.01c0,0.996,0.036,2.133-0.015,3.265
                                c-0.026,0.61-0.639,0.854-1.373,0.604c-1.947-0.666-3.752-1.621-5.311-2.963C0.956,26.96-1.214,20.83,0.657,13.655
                                C2.522,6.503,7.383,2.116,14.651,0.739C24.708-1.163,34.235,6.161,35.233,16.37C36.021,24.418,31.284,31.949,23.71,34.689z
                                M14.229,25.85c-0.006,0.014-0.01,0.024-0.016,0.038c0.018,0.003,0.036,0.006,0.055,0.009
                                C14.282,25.898,14.294,25.923,14.229,25.85z M9.679,29.031c0.157,0.097,0.307,0.22,0.477,0.273c0.062,0.02,0.177-0.121,0.38-0.271
                                c-0.282-0.107-0.448-0.201-0.623-0.225C9.845,28.8,9.757,28.953,9.679,29.031z M11.112,29.277c0.023,0.105,0.232,0.236,0.355,0.234
                                c0.119-0.002,0.235-0.16,0.354-0.25c-0.108-0.099-0.216-0.195-0.548-0.494C11.201,28.975,11.082,29.143,11.112,29.277z
                                M12.87,28.854c-0.148,0.035-0.273,0.172-0.408,0.266c0.079,0.1,0.158,0.193,0.285,0.35c0.175-0.16,0.294-0.271,0.414-0.379
                                C13.061,29.004,12.944,28.836,12.87,28.854z M8.512,28.261c0.082,0.155,0.209,0.289,0.381,0.508
                                c0.115-0.188,0.24-0.332,0.218-0.361c-0.109-0.143-0.257-0.26-0.403-0.367C8.698,28.033,8.495,28.227,8.512,28.261z" />
                        </g>
                    </svg>
                </a>
                <a class="dev-icon" onclick="alert('Sorry, Not set yet!!')">
                    <svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg"
                        xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512"
                        style="enable-background:new 0 0 512 512;" xml:space="preserve">
                        <g>
                            <g>
                                <path d="M448,0H64C28.704,0,0,28.704,0,64v384c0,35.296,28.704,64,64,64h192V336h-64v-80h64v-64c0-53.024,42.976-96,96-96h64v80
			                    h-32c-17.664,0-32-1.664-32,16v64h80l-32,80h-48v176h96c35.296,0,64-28.704,64-64V64C512,28.704,483.296,0,448,0z" />
                            </g>
                        </g>
                    </svg>
                </a>
                <a class="dev-icon" onclick="alert('Sorry, Not set yet!!')">
                    <svg height="512pt" viewBox="0 0 512 512" width="512pt" xmlns="http://www.w3.org/2000/svg"><path d="m256 0c-141.363281 0-256 114.636719-256 256s114.636719 256 256 256 256-114.636719 256-256-114.636719-256-256-256zm-74.390625 387h-62.347656v-187.574219h62.347656zm-31.171875-213.1875h-.40625c-20.921875 0-34.453125-14.402344-34.453125-32.402344 0-18.40625 13.945313-32.410156 35.273437-32.410156 21.328126 0 34.453126 14.003906 34.859376 32.410156 0 18-13.53125 32.402344-35.273438 32.402344zm255.984375 213.1875h-62.339844v-100.347656c0-25.21875-9.027343-42.417969-31.585937-42.417969-17.222656 0-27.480469 11.601563-31.988282 22.800781-1.648437 4.007813-2.050781 9.609375-2.050781 15.214844v104.75h-62.34375s.816407-169.976562 0-187.574219h62.34375v26.558594c8.285157-12.78125 23.109375-30.960937 56.1875-30.960937 41.019531 0 71.777344 26.808593 71.777344 84.421874zm0 0"/></svg>
                </a>
            </div>
            </div>`
            
            /*at last*/
            console.log('[done]');
            return;
        };

        /**
         * only if u pass DB_NAME and XM_NAME it will run
         * if u visit 'result.html' without any query, it wont run (wont create 'null' db)
         */

        db = await openiddb(DB_NAME, DB_VERSION, OBJ_STORES);

        let response;
        response = await getObjectCount(db, OBJ_STORE_MAIN);
        console.log('[getObjectCount]', response);

        if (IS_CREATED || !response) {
            /** will run if new obj_stores are created */
            /** fetch data from csv file and store them */

            response = await fetch(`data/${DB_NAME}_${XM_NAME}.csv`);
            let data = await response.text();

            /** getting header_names & indexs */
            let header_names = data.split('\n')[0].split(',');

            /*modifies global var */
            set_TOTAL_NUMBER_FIELD_NAME(header_names);

            /**storing data in the iddb */
            await storeMainData(db, OBJ_STORE_MAIN, 'readwrite', data);

            /* calculating rank if not given in the file */
            if (IS_RANK_GIVEN) {
                // rank is given in the file */
                console.log('[RANK OK]');
            } else {
                console.log('[RANK CALCULATING]');
                await createRankList(db, OBJ_STORE_MAIN, data, header_names);
            }
        }

        /**=======if all data is in db -- show overview ========*/

        /** global event listener */
        search_compare_event_listener();

        /**fetching from db */
        let { metaData } = await getDataByKey(db, OBJ_STORE_MAIN, 0);

        /*modifies global var if its not yet done*/
        TOTAL_NUMBER_FIELD_NAME || set_TOTAL_NUMBER_FIELD_NAME(metaData.header_names);

        /** update main ui (overview of full res) if std is not searching for specific roll **/
        if (!STD_ROLLS && !SHOW_STUDENTS) {
            updateMainUi(metaData);

            /** ========showing failed students======== */
            /**step 1 : getting their result */
            let failed_students_results = [];
            for (let roll of metaData.failed_examnees) {
                response = await getDataByKey(db, OBJ_STORE_MAIN, roll);
                failed_students_results.push({
                    roll,
                    name: response.name,
                    rank: response.rank,
                    total_mark: response.total_mark
                });
            }
            console.log('[failed_students_results]', failed_students_results);
            /**step 2 : drawing graph */
            view_failed_students_chart(failed_students_results)

            /** =========showing top students======== */
            /**step 1: get their results & display them*/
            let topper_list = [];
            for (let i = 1; i <= SHOW_TOPPERS; i++) {
                let response = await getDataByIndexKey(db, OBJ_STORE_MAIN, 'rank', i);
                topper_list.push(response);
            }
            view_topper_students_table(metaData, topper_list);
            console.log('[topper_list]', topper_list);
            return;
        }

        /* else show secific res if student passes only 1 roll */
        if (STD_ROLLS && STD_ROLLS.length == 1) {
            response = await getDataByKey(db, OBJ_STORE_MAIN, parseInt(STD_ROLLS[0]));

            /** calculating the friend result */
            let freinds_result_html = '<tr style="font-weight:500"><td>RANK</td><td>NAME</td><td>ROLL</td><td>TOTAL</td><td>COMPARE</td></tr>',
                total_std_to_show = 15,
                search_roll = STD_ROLLS[0] - parseInt(total_std_to_show / 2);
            while (total_std_to_show > 0) {
                search_roll++;
                if (search_roll < 1) continue;

                let frnd_result = await getDataByKey(db, OBJ_STORE_MAIN, search_roll);
                if (!frnd_result) continue;

                freinds_result_html += `<tr ${frnd_result.roll == response.roll && "style='background-color:#ffbebd;'"}><td>${frnd_result.rank}</td><td>${frnd_result.name.capitalize()}</td><td>${frnd_result.roll}</td><td>${frnd_result.total_mark}</td><td><button class="hover-expand v-s" data-roll=${frnd_result.roll}>Compare</button></td></tr>`;
                total_std_to_show--;
            }

            /** calling the main function */
            view_specific_result(metaData, response, freinds_result_html);
            return;
        }
        /* else show COMPARE result if student passes more than 1 roll */
        if (STD_ROLLS && STD_ROLLS.length > 1) {
            let all_students_results = [];
            for (let roll of STD_ROLLS) {
                response =  await getDataByKey(db, OBJ_STORE_MAIN, parseInt(roll));
                all_students_results.push(response);
            }
            console.log('ALL RESULT', all_students_results);
            view_compared_result(metaData, all_students_results);
            return;
        }

        if (SHOW_STUDENTS) {
            /*step:1 make space in dom to display it */
            let main_conatiner = document.getElementById('main-container');
            main_conatiner.innerHTML = "";
            main_conatiner.style.display = 'flex';
            main_conatiner.style.flexDirection = 'column';
            main_conatiner.style.justifyContent = 'flex-start';
            main_conatiner.style.alignItems = 'center';
            main_conatiner.style.maxWidth= '100vw';

            let el_1 = `
            <div class='card' style='margin-bottom:.7em'>
                <p>Click on table HEADERS to sort all students by that field.</p>
                <p>Click on Student's Row to display his/her full result.</p>
                <div style='display:flex;justify-content:space-between;margin-top:1em'>
                    <button style='width:49%' class='hover-expand v-s' style='margin-top:.6em' onclick='location.search="?in=${DB_NAME}&xm=${XM_NAME}&show_students=all"; return false;'>Reload All</button>
                    <input id='all_students_table-search_btn' style='width:49%' type='text' placeholder='Search by Name'>
                </div>
            </div>`;

            let el_dev = `
            <div class='card' style='margin-bottom:.7em;flex-direction:row'>
                <span>Developer :</span>
                <span>MUSH</span>
            </div>`;

            let el_2 =
                `<div class='card' style='margin-bottom:.7em'>
                <div class='header' style='margin-bottom:.7em'>
                    <p>Give a range of Roll (both inclusive)</p>
                </div>
                <div style='width:100%;display:flex;justify-content:space-between'>
                    <input type='number' placeholder='eg. 20'  style='width:30%'>
                    <input type='number' placeholder='eg. 120' style='width:30%'>
                    <button class='hover-expand v-s' id='search_in_range' style='width:30%'>Calculate</button>
                </div>
            </div>`;

            /*step:2 show all students based on criteria*/

            /**show all students in table*/
            let table_data = "";
            if(SEARCHED_NAME)
                table_data = await get_all_students_data_in_table(db, OBJ_STORE_MAIN, metaData.header_names, v => v.toLowerCase().includes(SEARCHED_NAME));
            else table_data = await get_all_students_data_in_table(db, OBJ_STORE_MAIN, metaData.header_names, v => v);
            main_conatiner.innerHTML = `<div id='all_students_table-div' style='margin:auto;'>${el_dev + el_2 + el_1}<div class='card'><table id='all_students_table' border=1><tr><th>ROLL</th><th>RANK</th><th>NAME</th><th>TOTAL</th><th>PROMOTED</th></tr>${table_data}</table></div></div>`;


            /*step 3: add_sorting_functionality_to_table*/
            add_sorting_functionality_to_table()

            /*step 4: adding event listener to the table */
            document.getElementById('all_students_table').onclick = e => {
                let roll = e.target.parentElement.firstElementChild.textContent
                console.log('[ROLL]:', roll);

                /** search only if the roll can be paresed into integer */
                parseInt(roll) && search_result(roll);
            }

            /*step 5: adding event listener to the button */
            document.getElementById('search_in_range').onclick = e => {
                console.log('[search_in_range btn clicked]');

                /* step 1: getting values */
                let input_elements = e.target.parentElement.querySelectorAll('input[type=number]');
                let val1 = input_elements[0].value && parseInt(input_elements[0].value),
                    val2 = input_elements[1].value && parseInt(input_elements[1].value);

                /* step 2: checking if values exist */
                if (!val1 || !val2 || val1 == val2) {
                    console.log('[1 or both inputs are empty or equal]');
                    return;
                }

                /* step 3: making sure val2>val1 */
                if (val1 > val2) {
                    /*just swap them*/
                    let temp = val1;
                    val1 = val2;
                    val2 = temp;

                    console.log('[SWAPED]');
                }
                console.log('[val1]', val1);
                console.log('[val2]', val2);

                /* step 3: removing unnecessary [tr]s */
                //window.location.search = window.location.search.split('&').map(e => e.includes('show_students') ? `show_students=${parseInt(val1)}-${parseInt(val2)}` : e).join('&');
                document.querySelectorAll('#all_students_table tr').forEach(tr => {
                    // console.log(tr.firstChild.textContent);
                    if (parseInt(tr.firstChild.textContent) && (parseInt(tr.firstChild.textContent) < val1 || parseInt(tr.firstChild.textContent) > val2)) {
                        tr.remove();
                        // console.log('[REMOVED]')
                    }
                })

            }
            /**step 6: adding event listener to the input */
            let all_rows = document.querySelectorAll('#all_students_table tr');
            document.getElementById('all_students_table-search_btn').onkeyup = event => {
                console.log('[KEYUP Event]', event.target.value);

                all_rows.forEach(row=>{
                    if(!row.querySelectorAll('td')[2]) return;
                    // console.log(row)
                    if(!row.querySelectorAll('td')[2].textContent.toLowerCase().includes(event.target.value))
                        row.style.display = 'none';
                    else row.style.display = '';
                })

            }
            return;
        }

    } catch (error) {
        console.error(error);
        console.dir(error.type);
        // console.dir(error.srcElement instanceof IDBOpenDBRequest);
        // console.dir(error.srcElement.error instanceof DOMException);

        if (error.srcElement instanceof IDBOpenDBRequest && error.srcElement.error instanceof DOMException) {
            console.log('[ERROR: DOMException]');
            console.log(`[Failed to execute 'createObjectStore' on 'IDBDatabase']`);

            /**delte the database [BAD SOLUTION] it will create is again*/
            let res = await deleteDb(DB_NAME);
            res && window.location.reload();
        }
    }
}