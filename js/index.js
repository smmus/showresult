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
        if(!STD_ROLL){
            updateMainUi(metaData);
            return;
        }

        /*else show secific res*/
        response = await getDataByKey(db, OBJ_STORE_MAIN, parseInt(STD_ROLL));
        let fields = metaData.header_names.filter(e=> e.toLowerCase().includes('ict')).map(e=>e.split('_')[1].toUpperCase())
        // console.log('h_names', metaData.header_names)
        console.log('fields', fields)
        console.log('response', response)

        document.querySelector('#overview_main .canvas').innerHTML = `
        <div style="width:100%" class='chart'>
        <table style="background-color: white;" border="1">
                <tbody>
                    <tr>
                        <td colspan="7"><b>Name: </b>${result[0]}</td>
                        <td colspan="4"><b>Class Roll: </b>${result[1]}</td>
                    </tr>
                    <tr>
                        <td colspan="11"><b>Exam Name: </b>20-Aug-2020 To 12-Sep-2020&nbsp;&nbsp;&nbsp;Year Final Exam (1st
                            Year&nbsp;&nbsp;&nbsp;HSC - Science&nbsp;&nbsp;&nbsp; Session :2019-2020)</td>
                    </tr>
                    <tr style="background-color: #59B899;color: #F4F5F8">
                        <td style="width: 95px"><b>Subject Code</b></td>
                        <td><b>Subject Name</b></td>
                        <td style="width: 20px"><b>CQ</b></td>
                        <td style="width: 20px"><b>MCQ</b></td>
                        <td style="width: 45px"><b>Practical</b></td>
                        <td style="width: 80px"><b>Term Total</b></td>
                        <td style="width: 65px"><b>CT Total</b></td>
                        <td style="width: 80px"><b>Exam Total</b></td>
                        <td style="width: 40px"><b>Grade</b></td>
                        <td style="width: 40px"><b>GP</b></td>
                        <td style="width: 95px"><b>Exam Highest</b></td>
                    </tr>
                    <tr>
                        <td>101</td>
                        <td>Bangla 1st paper</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[2]}</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[2]}</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[2]}</td>
                        <td style="text-align: right">${result[3]}</td>
                        <td style="text-align: right">${result[4]}</td>
                        <td style="text-align: right">92</td>
                    </tr>
                    <tr>
                        <td>107</td>
                        <td>English 1st paper</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[5]}</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[5]}</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[5]}</td>
                        <td style="text-align: right">${result[6]}</td>
                        <td style="text-align: right">${result[7]}</td>
                        <td style="text-align: right">90</td>
                    </tr>
                    <tr>
                        <td>178</td>
                        <td>Biology 1st paper ${result[77] == 'biology' ? '(4th Subject)' : ''}</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[8]}</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[8]}</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[8]}</td>
                        <td style="text-align: right">${result[9]}</td>
                        <td style="text-align: right">${result[10]}</td>
                        <td style="text-align: right">90</td>
                    </tr>
                    <tr>
                        <td>174</td>
                        <td>Physics 1st paper</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[11]}</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[11]}</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[11]}</td>
                        <td style="text-align: right">${result[12]}</td>
                        <td style="text-align: right">${result[13]}</td>
                        <td style="text-align: right">90</td>
                    </tr>
                    <tr>
                        <td>176</td>
                        <td>Chemistry 1st paper</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[14]}</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[14]}</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[14]}</td>
                        <td style="text-align: right">${result[15]}</td>
                        <td style="text-align: right">${result[16]}</td>
                        <td style="text-align: right">92</td>
                    </tr>
                    <tr>
                        <td>265</td>
                        <td>Higher Math 1st paper ${result[77] != 'biology' ? '(4th Subject)' : ''}</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[17]}</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[17]}</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[17]}</td>
                        <td style="text-align: right">${result[18]}</td>
                        <td style="text-align: right">${result[19]}</td>
                        <td style="text-align: right">96</td>
                    </tr>
                    <tr>
                        <td>275</td>
                        <td>ICT</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[20]}</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[20]}</td>
                        <td style="text-align: right">0</td>
                        <td style="text-align: right">${result[20]}</td>
                        <td style="text-align: right">${result[21]}</td>
                        <td style="text-align: right">${result[22]}</td>
                        <td style="text-align: right">98</td>
                    </tr>
                    <tr style="background-color: #59B899;color: #F4F5F8">
                        <td colspan="5"><b>Total</b></td>
                        <td style="text-align: right"><b>${result[23]}</b></td>
                        <td style="text-align: right"><b>0</b></td>
                        <td style="text-align: right"><b>${result[23]}</b></td>
                        <td style="text-align: right"><b></b></td>
                        <td style="text-align: right"><b></b></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td colspan="2">${result[25]}</td>
                        <td colspan="4" ${result[27]=='Failed' ? 'style="color:red"' : ''}>${result[27]}</td>
                        <td colspan="5">Rank : ${result[28]} (304 examinees)</td>
                    </tr>
                </tbody>
            </table></div>
            <div style="width:100%" class="chart">
                    <p>Overview</p>
                    <canvas id="student_mark_overview"></canvas>
            </div>`

        
        console.log('result :',response)
        

    } catch (error) {
        console.error(error);
    }
}
main();