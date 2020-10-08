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
const STD_ROLL = new URLSearchParams(window.location.search).get('roll');
const STD_NAME = new URLSearchParams(window.location.search).get('name');
const IS_RANK_GIVEN = new URLSearchParams(window.location.search).get('r');
const IS_BIO_2 = new URLSearchParams(window.location.search).get('b');

const OBJ_STORE_MAIN = `${DB_NAME}_${XM_NAME}_main`;
const OBJ_STORE_RANK = `${DB_NAME}_${XM_NAME}_rank`;
const DB_VERSION = 1;
const ROLL_SLICE = 10;
const GRAPH_BG_COLORS = ['#FFCD56', 'rgb(253, 111, 113)', '#36A2EB', '#48E98A', '#5A7BFA', '#FF9F40', '#9AD0F5', '#FF9F40', '#9AD0F5', '#FFCD56'];
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

        /**fetching from db */
        let { metaData } = await getDataByKey(db, OBJ_STORE_MAIN, 0),
            subjects = Object.values(metaData.sub_code_to_name)


        /** charts */

        /** ============================================= main chart starts =============================================== */
        let overview_main_chart = new Chart(document.getElementById('overview_main_canvas').getContext('2d'), {
            type: 'line',
            data: new function () {
                /* if the max_number of a sub is not 0, return the subname, else return null, filter the null values*/
                this.labels = Object.keys(metaData.all_sub).map(sub_name => metaData.all_sub[sub_name].max ? sub_name.underscrore_to_capitalize() : null).filter(e => e != null);
                /*array of objects 
                        return an obj forEach line (GRADES)
                        data => array (1 element forEach sub_name) (len=lenof labels)
                */
                this.datasets = GRADES.map(grade => ({
                    label: grade.underscrore_to_capitalize(),
                    data: this.labels.map(sub_name => metaData.all_sub[sub_name.to_camel_case()][grade]),
                    backgroundColor: 'rgba(89, 127, 255,0.1)',
                    borderColor: '#5A7BFA',
                    borderWidth: 1,
                    hidden: grade=='promoted' || grade=='f' || grade=='no_result', // promoted,f,no_result will be hidden by default
                    fill: 'origin' || GRADES.indexOf('f') // [TODO: fix it]
                }));
                // console.log(this.labels)
                // console.log(this.datasets)
            },
            options: {
                aspectRatio: 2,
                maintainAspectRatio: true, //default: true
                scales: {
                    yAxes: [{
                        scaleLabel: {
                            labelString: 'Total Students',
                            display: false,
                        },
                        ticks: {
                            beginAtZero: true,
                            suggestedMax: 100
                        }
                    }]
                }
            }
        });
        // elevent listener of subjects_grade_overview_checkbox
        document.getElementById('overview_main_checkbox').onchange = e => {
            // this change axis is defferent from the other one (not like the pie)
            // change datasets --> x-axis
            console.log("[CheckBox overview_main] :", e.target.checked);

            if (e.target.checked) {
                // step1: changing labels arr (x-axis)
                let new_labels = overview_main_chart.data.datasets.map(obj => obj.label).filter(e => e.toLowerCase() != 'promoted');
                // console.log(new_labels)
                // step2: changing main datasets for new data
                let new_datatsets = overview_main_chart.data.labels.map((label, i) => ({ //label=sub_name
                    label,
                    data: new_labels.map((e, i) => metaData.all_sub[label.to_camel_case()][e.to_camel_case()]),
                    backgroundColor: 'rgba(89, 127, 255, 0.1)',
                    borderColor: '#5A7BFA',
                    borderWidth: 1,
                    fill: 'origin'
                }))

                // updating chart
                overview_main_chart.data.labels = new_labels;
                overview_main_chart.data.datasets = new_datatsets;
                overview_main_chart.update();
                return;
            }
            // else do the same think while loading the page
            // [TODO] : create a function not to repeating same code
            
            // copied from above
            overview_main_chart.data = new function () {
                /* if the max_number of a sub is not 0, return the subname, else return null, filter the null values*/
                this.labels = Object.keys(metaData.all_sub).map(sub_name => metaData.all_sub[sub_name].max ? sub_name.underscrore_to_capitalize() : null).filter(e => e != null);
                /*array of objects 
                return an obj forEach line (GRADES)
                data => array (1 element forEach sub_name) (len=lenof labels)
                */
               this.datasets = GRADES.map(grade => ({
                   label: grade.underscrore_to_capitalize(),
                   data: this.labels.map(sub_name => metaData.all_sub[sub_name.to_camel_case()][grade]),
                   backgroundColor: 'rgba(89, 127, 255,0.1)',
                   borderColor: '#5A7BFA',
                   borderWidth: 1,
                   hidden: grade=='promoted' || grade=='f' || grade=='no_result', // promoted,f,no_result will be hidden by default
                    fill: 'origin' || GRADES.indexOf('f') // [TODO: fix it]
                }));
            }
            overview_main_chart.update();

        }
        /** ============================================= main chart ends ============================================= */
        /** ============================================= secondary chart starts ============================================= */
        let overview_secondary_chart = new Chart(document.getElementById('overview_secondary_canvas').getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: subjects.map(sub_name => sub_name.underscrore_to_capitalize()),
                datasets: [
                    {
                        data: Object.values(metaData.all_sub).map(obj => obj.failed),  // first time render failed (failed is selected in the html by default)
                        backgroundColor: GRAPH_BG_COLORS
                    },
                ]
            },
            options: {
                aspectRatio: 1.5,
                legend: {
                    position: 'right'
                }
            }
        });
        // select event event listener 
        document.getElementById('overview_secondary_select').addEventListener('change', e => {
            console.log('[SELECT overview_secondary] :', e.target.value);

            for (let i of GRADES) {

                if (e.target.value != i) continue;

                console.log('[Matched From GRADES]');
                overview_secondary_chart.data.datasets[0].data = Object.values(metaData.all_sub).map(obj => obj[e.target.value]);

            }
            for (let i of subjects) {

                if (e.target.value != i) continue;

                console.log('[Matched From Subjects]');
                overview_secondary_chart.data.datasets[0].data = GRADES.map(grade_name => (grade_name != 'failed' && grade_name != 'promoted') ? metaData.all_sub[e.target.value][grade_name] : null)
                overview_secondary_chart.data.datasets[1].data = GRADES.map(grade_name => (grade_name != 'failed' && grade_name != 'promoted') ? null : metaData.all_sub[e.target.value][grade_name]);

            }
            overview_secondary_chart.update();
        })

        // checkbox event listener
        document.getElementById('overview_secondary_checkbox').onchange = e => {
            let select_element = document.getElementById('overview_secondary_select');

            console.log("[CheckBox overview_secondary] :", e.target.checked);

            if (e.target.checked) {
                // step1: changing select options
                let change = "";
                subjects.forEach(el => {
                    change += `<option value="${el}" ${el.includes('bangla') ? 'selected' : ''}>${el.underscrore_to_capitalize()}</option>`
                })
                select_element.innerHTML = change;
                // console.log(change);
                // step2: changing chart label + data && updating
                overview_secondary_chart.data.labels = GRADES.map(e => e.underscrore_to_capitalize());
                let sub_name = select_element.options[select_element.selectedIndex].value;
                overview_secondary_chart.data.datasets = [
                    {
                        data: GRADES.map(e => (e != 'failed' && e != 'promoted') ? metaData.all_sub[sub_name][e] : null),
                        backgroundColor: GRAPH_BG_COLORS
                    },
                    {
                        data: GRADES.map(e => (e != 'failed' && e != 'promoted') ? null : metaData.all_sub[sub_name][e]),
                        backgroundColor: GRAPH_BG_COLORS
                    }
                ];
                overview_secondary_chart.update();
            } else {
                // step1: changing select options
                let change = "";
                GRADES.forEach(el => {
                    change += `<option value="${el}" ${el.includes('ailed') ? 'selected' : ''}>${el.underscrore_to_capitalize()}</option>` //`failed`
                })
                select_element.innerHTML = change;
                // console.log(change);

                // step2: changing chart label + data && updating

                overview_secondary_chart.data.labels = subjects.map(e => e.underscrore_to_capitalize());
                overview_secondary_chart.data.datasets = [{
                    data: Object.values(metaData.all_sub).map(obj => obj.failed), // 'failed' is selected 
                    backgroundColor: GRAPH_BG_COLORS
                }];
                overview_secondary_chart.update();
            }
        }
        /** ============================================= secondary chart ends ============================================= */

    } catch (error) {
        console.error(error);
    }
}
main();