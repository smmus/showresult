/*---------- EXPANDER MENU ----------*/
const showMenu = (toggleId, navbarId) => {
    const toggle = document.getElementById(toggleId),
        navbar = document.getElementById(navbarId);

    if (toggle && navbar) {
        toggle.addEventListener('click', () => {
            navbar.classList.toggle('expander');
            document.getElementById('main-container').classList.toggle('overlay');

            document.querySelectorAll('#navbar nav > div >  div+div > div .rotate').forEach(e => e.classList.remove("rotate"));
            document.querySelectorAll('#navbar nav > div >  div+div > div .showCollapse').forEach(e => e.classList.remove("showCollapse"));
        })
    }
}
showMenu('nav-toggle', 'navbar');

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
// ------------------------ global vars ends -----------------------------
const DB_NAME = new URLSearchParams(window.location.search).get('in'); //institution
const XM_NAME = new URLSearchParams(window.location.search).get('xm');
const STD_ROLLS = new URLSearchParams(window.location.search).get('roll') && new URLSearchParams(window.location.search).get('roll').split('-').map(e => parseInt(e)); // array of rolls(int)
console.log('STD_ROLLS', STD_ROLLS);
const STD_NAME = new URLSearchParams(window.location.search).get('name');
const IS_RANK_GIVEN = new URLSearchParams(window.location.search).get('s'); // serial
const IS_BIO_2 = new URLSearchParams(window.location.search).get('b');

const OBJ_STORE_MAIN = `${DB_NAME}_${XM_NAME}_main`;
const OBJ_STORE_RANK = `${DB_NAME}_${XM_NAME}_rank`;
const DB_VERSION = 1;
const MAIN_ROLL_DIGITS = parseInt(new URLSearchParams(window.location.search).get('mr'));
const GRAPH_BG_COLORS = ['#EF53504D', '#BA68C84D', '#64B5F64D', '#81C7844D', '#4DD0E14D', '#FFAB914D', '#FFB74D4D', '#B0BEC54D', '#9FA8DA4D', '#FFAB914D'];
const GRADES = ['a_plus', 'a', 'a_minus', 'b', 'c', 'd', 'f', 'no_result', 'promoted', 'failed'];
const SUB_CODE_TO_NAME = {
    '101': 'bangla_1st',
    '107': 'eng_1st',
    '178': 'biology_1st',
    '179': 'biology_2nd',
    '174': 'physics_1st',
    '176': 'chemistry_1st',
    '265': 'higher_math_1st',
    '275': 'ict'
};

let IS_CREATED = false;

Chart.defaults.global.elements.line.tension = 0;
Chart.defaults.global.elements.point.hitRadius = 2;
// ------------------------ main kaam starts ------------------------------
async function main() {
    let db;

    window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    if (!window.indexedDB) {
        console.log("[Your browser doesn't support a stable version of IndexedDB.]");
        document.body.innerHTML = `Your browser doesn't support a stable version of IndexedDB. Use modern browsers like FireFox or Chrome.`
        return;
    }

    try {
        db = await openiddb(DB_NAME, DB_VERSION);

        if (IS_CREATED) {
            /** will run if new obj_stores are created */
            /** fetch data from csv file and store them */

            let response = await fetch(`data/${DB_NAME}_${XM_NAME}.csv`);
            let data = await response.text();

            /**storing data in the iddb */
            await storeMainData(db, OBJ_STORE_MAIN, 'readwrite', data);

            /** getting header_names & indexs */
            let header_names = data.split('\n')[0].split(',');

            // calculating rank */
            if (IS_RANK_GIVEN) {
                // rank is given in the file */
                console.log('[RANK OK]');
            } else {
                console.log('[RANK CALCULATING]');
                await createRankList(db, OBJ_STORE_RANK, data, header_names);
            }
        }

        /**if all data is in db -- show overview */

        /** global event listener */
        search_compare_event_listener()

        /**fetching from db */
        let { metaData } = await getDataByKey(db, OBJ_STORE_MAIN, 0);

        /** update main ui (overview of full res) if std is not searching for specific roll **/
        if (!STD_ROLLS) {
            updateMainUi(metaData);
            return;
        }

        /* else show secific res if student passes only 1 roll */
        if (STD_ROLLS.length == 1) {
            response = await getDataByKey(db, OBJ_STORE_MAIN, parseInt(STD_ROLLS[0]));
            view_specific_result(metaData, response);
            return;
        }
        /* else show COMPARE result if student passes more than 1 roll */
        /*step 1: get all their result*/
        let all_students_results = [];
        for (let roll of STD_ROLLS) {
            response = await getDataByKey(db, OBJ_STORE_MAIN, parseInt(roll));
            all_students_results.push(response);
        }
        /*step 2: draw in the main graph */
        // removing last 2 child
        document.querySelector('#overview_main .header').lastElementChild.remove();
        document.querySelector('#overview_main .header').lastElementChild.remove();
        document.querySelector('#overview_secondary').lastElementChild.remove();
        document.querySelector('#overview_secondary .header').lastElementChild.remove();
        // editing text
        document.querySelector('#overview_main .header').lastElementChild.textContent = 'Mark Overview';
        document.querySelector('#overview_main .footer').lastElementChild.textContent = 'Show Line Graph' 
        document.querySelector('#overview_secondary .header').firstElementChild.textContent = 'Total Marks';

        let all_subjects_name = Object.keys(metaData.all_sub).map(sub_name => metaData.all_sub[sub_name].max ? sub_name.underscrore_to_capitalize() : null).filter(e => e != null);
        let overview_main_chart = new Chart(document.getElementById('overview_main_canvas').getContext('2d'), {
            type: 'bar',
            data: {
                /** labels are the subjects name */
                labels: all_subjects_name,
                /*array of objects 
                return an obj forEach line ([max, student_result, min, passmark(nofill)])
                data => array (1 element forEach sub_name) (len=lenof labels)
                */
                datasets: all_students_results.map((result, i) => ({
                    label: result.name,
                    data: all_subjects_name.map(sub_name => result.res[metaData.header_names.indexOf(sub_name.to_camel_case() + "_mcq")]),
                    backgroundColor: GRAPH_BG_COLORS[i],
                    borderColor: GRAPH_BG_COLORS[i].slice(0 ,GRAPH_BG_COLORS[i].length-2),
                    borderWidth: 1,
                    hidden: false, 
                    fill: false
                }))
            },
            options: {
                aspectRatio: 2,
                scales: {
                    yAxes: [{
                        scaleLabel: {
                            labelString: 'Total Number',
                            display: true,
                        },
                        ticks: {
                            beginAtZero: true,
                            suggestedMax: 100
                        }
                    }]
                }
            }
        });
        // checkbox event listenaer
        document.getElementById('overview_main_checkbox').onclick = e => {
            console.log('[CHECKBOX MAIN]:', e.target.checked)
            
            if (!e.target.checked) overview_main_chart.config.type = 'bar';
            else overview_main_chart.config.type = 'line';

            overview_main_chart.update();
            /** after some research I find out that --> `chart.type` wont work like `chart.data`. use `chart.confog.type` */
            // console.log('updated', overview_main_chart.type)
            // console.log('updated', overview_main_chart.config)
        }
        /*step 3: draw in the secondary graph */
        /* thsi graph shows per students total mark */
        let overview_secondary_chart = new Chart(document.getElementById('overview_secondary_canvas').getContext('2d'), {
            type: 'polarArea',
            data: {
                /** labels are the students name */
                labels: all_students_results.map(res=>res.name),
                /*array of objects 
                return an obj forEach line ([max, student_result, min, passmark(nofill)])
                data => array (1 element forEach sub_name) (len=lenof labels)
                */
                datasets: [{
                    data: all_students_results.map(res=>res.res[metaData.header_names.indexOf('term_total')]),
                    backgroundColor: GRAPH_BG_COLORS
                }]
            },
            options: {
                aspectRatio: 1.2,
                legend: {
                    position: 'right'
                }
            }
        });



        console.log('ALL RESULT', all_students_results);
        console.log('done');

    } catch (error) {
        console.error(error);
    }
}
main();