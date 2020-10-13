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
const linkCollapse = document.getElementsByClassName('collapse__link')
for (let i = 0; i < linkCollapse.length; i++) {
    linkCollapse[i].addEventListener('click', function () {
        const collapseMenu = this.nextElementSibling
        collapseMenu.classList.toggle('showCollapse')

        const rotate = collapseMenu.previousElementSibling
        rotate.classList.toggle('rotate')
    })
}
// ------------------------ nav functionality ends -----------------------------
// ================================= GLOBAL VARS  =================================
const DB_VERSION = 1;
const DB_NAME = new URLSearchParams(window.location.search).get('in'); //institution
const XM_NAME = new URLSearchParams(window.location.search).get('xm');
const SHOW_STUDENTS = new URLSearchParams(window.location.search).get('show_students');
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
        /**
         * only if u pass DB_NAME and XM_NAME it will run
         * if u visit 'result.html' without any query, it wont run (wont create 'null' db)
         */
        if (!DB_NAME || !XM_NAME) return;

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
                
                freinds_result_html += `<tr ${frnd_result.roll==response.roll && "style='background-color:#ffbebd;'"}><td>${frnd_result.rank}</td><td>${frnd_result.name.capitalize()}</td><td>${frnd_result.roll}</td><td>${frnd_result.total_mark}</td><td><button class="hover-expand v-s" data-roll=${frnd_result.roll}>Compare</button></td></tr>`;
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
                response = await getDataByKey(db, OBJ_STORE_MAIN, parseInt(roll));
                all_students_results.push(response);
            }
            console.log('ALL RESULT', all_students_results);
            view_compared_result(metaData, all_students_results);
            return;
        }

        if(SHOW_STUDENTS){
            /*step:1 make space in dom to display it */
            let main_conatiner = document.getElementById('main-container');
            main_conatiner.innerHTML = "";
            main_conatiner.style.display = 'flex';
            main_conatiner.style.flexDirection = 'column';
            main_conatiner.style.justifyContent = 'flex-start';
            main_conatiner.style.alignItems = 'center';

            let el_1 = `
            <div class='card' style='margin-bottom:.7em'>
                <p>Click on table HEADERS to sort all students by that field</p>
                <button class='hover-expand v-s' style='margin-top:.6em' onclick='location.reload(); return false;'>Reload All</button>
            </div>`
            let el_2 = 
            `<div class='card' style='margin-bottom:.7em'>
                <div class='header' style='margin-bottom:.7em'>
                    <p>Give a range of Roll (both inclusive)</p>
                </div>
                <div style='width:100%;display:flex;justify-content:space-between'>
                    <input type='number' placeholder='eg. 20'>
                    <input type='number' placeholder='eg. 120'>
                    <button class='hover-expand v-s' id='search_in_range'>Calculate</button>
                </div>
            </div>`

            /*step:2 show all students based on criteria*/
            if(SHOW_STUDENTS=='all'){
                /**show all students in table*/
                let table_data = await get_all_students_data_in_table(db, OBJ_STORE_MAIN,metaData.header_names);
                main_conatiner.innerHTML = `<div style='margin:auto;'>${el_2+el_1}<div class='card'><table id='all_students_table' border=1><tr><th>ROLL</th><th>RANK</th><th>NAME</th><th>TOTAL</th><th>PROMOTED</th></tr>${table_data}</table></div></div>`;
            }

            /*step 3: add_sorting_functionality_to_table*/
            add_sorting_functionality_to_table()

            /*step 4: adding event listener to the table */
            document.getElementById('all_students_table').onclick = e => {
                let roll = e.target.parentElement.firstElementChild.textContent
                console.log('[ROLL]:',roll);
                
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
                if(!val1 || !val2 || val1==val2){
                    console.log('[1 or both inputs are empty or equal]');
                    return;
                }

                /* step 3: making sure val2>val1 */
                if( val1 > val2 ){
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
                    if (parseInt(tr.firstChild.textContent) && (parseInt(tr.firstChild.textContent) < val1 || parseInt(tr.firstChild.textContent) > val2)){
                        tr.remove();
                        // console.log('[REMOVED]')
                    }
                })
                
            }

        }
        console.log('[done]');

    } catch (error) {
        console.error(error);
        console.dir(error.type);
        // console.dir(error.srcElement instanceof IDBOpenDBRequest);
        // console.dir(error.srcElement.error instanceof DOMException);

        if (error.srcElement instanceof IDBOpenDBRequest && error.srcElement.error instanceof DOMException){
            console.log('[ERROR: DOMException]');
            console.log(`[Failed to execute 'createObjectStore' on 'IDBDatabase']`);

            /**delte the database [BAD SOLUTION] it will create is again*/
            let res = await deleteDb(DB_NAME);
            res && window.location.reload();
        }
    }
}