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
const STD_ROLL = new URLSearchParams(window.location.search).get('r');
const STD_NAME = new URLSearchParams(window.location.search).get('name');
const IS_RANK_GIVEN = new URLSearchParams(window.location.search).get('s'); // serial
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
        let { metaData } = await getDataByKey(db, OBJ_STORE_MAIN, 0);

        /** update main ui (overview of full res) if std is not searching for specific roll **/
        if (!STD_ROLL) {
            updateMainUi(metaData);
            return;
        }

        /*else show secific res*/
        response = await getDataByKey(db, OBJ_STORE_MAIN, parseInt(STD_ROLL));
        let per_sub_fields = metaData.header_names.filter(e => e.toLowerCase().includes('ict')).map(e => e.split('_')[1].toUpperCase())
        let fields = ['Subject Code', 'Subject Name', ...per_sub_fields, 'Exam Highest']
        // console.log('h_names', metaData.header_names)
        console.log('fields', fields);
        console.log('response', response);

        let tableData = `<table style="background-color: white;border-collapse:collapse" border="1">
                <tbody>
                    <tr>
                        <td colspan="${fields.length}"><b>Exam Name: </b>20-Aug-2020 To 12-Sep-2020&nbsp;&nbsp;&nbsp;Year Final Exam (1st
                            Year&nbsp;&nbsp;&nbsp;HSC - Science&nbsp;&nbsp;&nbsp; Session :2019-2020)</td>
                    </tr>
                    <tr style="background-color: #59B899;color: #F4F5F8">
                        ${fields.map(e => `<td><b>${e}</b></td>`).join('')}
                    </tr>
                    ${Object.keys(metaData.sub_code_to_name).map(sub_code => `
                        <tr>
                            <td>${sub_code}</td>
                            <td>${metaData.sub_code_to_name[sub_code].underscrore_to_capitalize()}</td>
                            ${per_sub_fields.map(e => `<td>${response.res[metaData.header_names.indexOf(metaData.sub_code_to_name[sub_code] + '_' + e.to_camel_case())] || '0'}</td>`).join('')}
                            <td>${metaData.all_sub[metaData.sub_code_to_name[sub_code]].max}</td>

                        </tr>
                    `).join('')}
                    <tr style="background-color: #59B899;color: #F4F5F8">
                        <td colspan="2"><b>Total</b></td>
                        <td colspan="${fields.length-2}" style="text-align: right"><b>${response.res[23]}</b></td>
                    </tr>
                    <tr>
                        <td colspan="2">${response.res[metaData.header_names.indexOf('gpa') || metaData.header_names.indexOf('grade')]}</td>
                        <td colspan="${fields.length-2}" style="text-align:center;color:${response.res[metaData.header_names.indexOf('isPassed')].includes('ailed') ? 'red' : 'rgb(0, 188, 75)'}"><b>${response.res[27]}</b></td>
                    </tr>
                </tbody>
            </table>`;
        document.querySelector('#overview_main .canvas').innerHTML = tableData;
        document.querySelector('#overview_main .header').innerHTML = `<span>${response.name}</span><span>1201920010${response.roll}</span><button class="hover-expand v-s">RANK: ${response.rank}</button>`;
        // console.log(tableData)


        console.log('result :', response)


    } catch (error) {
        console.error(error);
    }
}
main();