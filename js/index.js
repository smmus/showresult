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
// ------------------------ some global funcs  -----------------------------
let firstBy=function(){function n(n){return n}function t(n){return"string"==typeof n?n.toLowerCase():n}function r(r,e){if(e="number"==typeof e?{direction:e}:e||{},"function"!=typeof r){var u=r;r=function(n){return n[u]?n[u]:""}}if(1===r.length){var i=r,o=e.ignoreCase?t:n;r=function(n,t){return o(i(n))<o(i(t))?-1:o(i(n))>o(i(t))?1:0}}return-1===e.direction?function(n,t){return-r(n,t)}:r}function e(n,t){return n=r(n,t),n.thenBy=u,n}function u(n,t){var u=this;return n=r(n,t),e(function(t,r){return u(t,r)||n(t,r)})}return e}();/*** Copyright 2013 Teun Duynstee Licensed under the Apache License, Version 2.0 ***/

function openDb(idb, db_name, db_version, onupgradeneeded_func, onsuccess_func) {
    // modifies global var
    console.log("[FUNC openDb]");
    let req = idb.open(db_name, db_version);

    req.onsuccess = onsuccess_func;

    req.onerror = function (evt) {
        console.log("[FUNC openDb: ERROR]");
        console.error(evt.target.errorCode);
    };

    req.onupgradeneeded = onupgradeneeded_func;
}

function getObjectStore(db, store_name, mode) {
    var tx = db.transaction([store_name], mode);
    tx.oncomplete = function(e){
        console.log('[TX CPM :',db.name,store_name,mode,']');
    }
    return tx.objectStore(store_name);
}

function createRankList(data, header_index){
    let rankList = data.split('\n').splice(1).map(line=>{
        let result = line.split(',');
        // [roll, total, optional, non-optional, name]
        return [
            parseInt(result[header_index.indexOf('student_roll')].slice(ROLL_SLICE)), 
            parseInt(result[header_index.indexOf('term_total')]),
            result[header_index.indexOf('optionalSub')] == 'biology' ? parseInt(result[header_index.indexOf('biology_1st_mcq')]) : parseInt(result[header_index.indexOf('higher_math_1st_mcq')]),
            result[header_index.indexOf('optionalSub')] == 'biology' ? parseInt(result[header_index.indexOf('higher_math_1st_mcq')]) : parseInt(result[header_index.indexOf('biology_1st_mcq')]),
            result[header_index.indexOf('student_name')],
            result[header_index.indexOf('isPassed')].toLowerCase().includes('failed') ? false : true
        ]
    })
    let sortingFunc = firstBy(function (arr1, arr2) { return arr1[1] - arr2[1]; }, -1)
        .thenBy(function (arr1, arr2) { return arr1[2] - arr2[2]; },)
        .thenBy(function (arr1, arr2) { return arr1[3] - arr2[3]; }, -1);
    //1. who has the higher marks (desc)
    //2. if marks same? who has low in optional_sub  (asc)
    //3. if both marks same? who has high in non_optional_sub (desc)
    
    rankList.sort(sortingFunc);

    console.log('[RANK LIST -]')
    console.log(rankList)

    let objStoreRank = getObjectStore(db, OBJ_STORE_RANK, 'readwrite');
    rankList.forEach((arr, index)=>{
        objStoreRank.add({
            rank: index+1,
            name : arr[4],
            roll : arr[0],
            total : arr[1], 
            isPassed : arr[5], //boolean
            data : arr.slice(2,4) //2 & 3rd index
        })
    })
    // todo: update the main list instead of creating new objStore.
}
// ------------------------ some global funcs ends -----------------------------
// ------------------------ main fetching starts ------------------------------
// for overview
// checking url-params
const DB_NAME = new URLSearchParams(window.location.search).get('in'); //institution
const XM_NAME = new URLSearchParams(window.location.search).get('xm');
const STD_ROLL = new URLSearchParams(window.location.search).get('roll');
const STD_NAME = new URLSearchParams(window.location.search).get('name');
const IS_RANK_GIVEN = new URLSearchParams(window.location.search).get('r');

const OBJ_STORE_MAIN = `${DB_NAME}_${XM_NAME}_main`;
const OBJ_STORE_RANK = `${DB_NAME}_${XM_NAME}_rank`;
const OBJ_STORE_INFO = `${DB_NAME}_${XM_NAME}_info`;
const DB_VERSION = 1;
const ROLL_SLICE = 10;

let db;

window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
if (!window.indexedDB) {
    console.log("Your browser doesn't support a stable version of IndexedDB.");
    document.body.innerHTML = `Use modern browsers like FireFox or Chrome.`
    //return;
}

openDb(window.indexedDB, DB_NAME, DB_VERSION, onupgradeneeded_func, onsuccess_func)

function onsuccess_func(event) {
    console.log("[FUNC openDb: DB onsuccess]");
    db = event.target.result;

    // checking if main objectStore is empty
    getObjectStore(db, OBJ_STORE_MAIN, 'readonly').count().onsuccess = function () {
        let rollCount = this.result;
        console.log('[OBJ_STORE_MAIN count()]', rollCount);

        if (rollCount == 0) {
            //if the objStore is empty => fetch data and store + calculate
            fetch(`data/${DB_NAME}_${XM_NAME}.csv`)
                .then(res => res.text())
                .then(data => {
                    // imp vars
                    let sub_code_to_name = {
                        '101': 'bangla_1st',
                        '107': 'eng_1st',
                        '178': 'biology_1st',
                        '179': 'biology_2nd',
                        '174': 'physics_1st',
                        '176': 'chemistry_1st',
                        '265': 'higher_math_1st',
                        '275': 'ict'
                    };
                    let metaData = {
                        total_examnee: 0,
                        failed_examnee: 0
                    };
                    for (let i in sub_code_to_name){
                        metaData[sub_code_to_name[i]] = {
                            highest:0, 
                            avg:0,
                            min:100,
                            a_plus:0,
                            a:0,
                            a_minus:0,
                            b:0,
                            c:0,
                            d:0,
                            f:0,
                            no_res:0
                        }
                    }

                    // getting header_names & indexs
                    let header_names = data.split('\n')[0].split(',');

                    let name_index =  header_names.indexOf('student_name');
                    let roll_index =  header_names.indexOf('student_roll');
                    let rank_index = header_names.indexOf('rank');
                    let pass_index = header_names.indexOf('isPassed');

                    // opening main_obj_store txn
                    let objStoreMain = getObjectStore(db, OBJ_STORE_MAIN, 'readwrite');
                    
                    // storing main data + calculating info
                    data.split('\n').splice(1).forEach(line => { // header row not needed so splice(1)
                        let result = line.split(',');
                        
                        let name = result[name_index];

                        if (name) metaData['total_examnee']++;
                        if (result[pass_index].includes('failed')) metaData['failed_examnee']++;

                        let obj = {
                            roll: parseInt(result[roll_index].slice(ROLL_SLICE)),
                            name: name,
                            res: result.map(e=> !parseInt(e) ? e : (e.includes('.') ? parseFloat(e) : parseInt(e)))
                        }
                        if (IS_RANK_GIVEN)
                            obj.rank = parseInt(result[rank_index]);
                        objStoreMain.add(obj);

                        result.forEach((element, index)=>{
                            for (let i in sub_code_to_name){
                                if(header_names[index].includes(sub_code_to_name[i])){
                                    if(header_names[index].includes('mcq') && element!=""){
                                        metaData[sub_code_to_name[i]]['highest'] = metaData[sub_code_to_name[i]]['highest'] < parseInt(element) ? parseInt(element) : metaData[sub_code_to_name[i]]['highest'];
                                        parseInt(element) && (metaData[sub_code_to_name[i]]['avg'] += parseInt(element));
                                        metaData[sub_code_to_name[i]]['min'] = metaData[sub_code_to_name[i]]['min'] > parseInt(element) ? parseInt(element) : metaData[sub_code_to_name[i]]['min'];
                                    }
                                    else if(header_names[index].includes('grade')){
                                        element.toLowerCase()=='a+' && metaData[sub_code_to_name[i]]['a_plus']++;
                                        element.toLowerCase()=='a' && metaData[sub_code_to_name[i]]['a']++; 
                                        element.toLowerCase()=='a-' && metaData[sub_code_to_name[i]]['a_minus']++;
                                        element.toLowerCase()=='b' && metaData[sub_code_to_name[i]]['b']++;
                                        element.toLowerCase()=='c' && metaData[sub_code_to_name[i]]['c']++;
                                        element.toLowerCase()=='d' && metaData[sub_code_to_name[i]]['d']++;
                                        element.toLowerCase()=='f' && metaData[sub_code_to_name[i]]['f']++;
                                        element=="" && metaData[sub_code_to_name[i]]['no_res']++;
                                    }
                                }
                            }
                        })
                    })
                    for (let i in metaData){
                        metaData[i].avg = (metaData[i].avg / (metaData.total_examnee - metaData[i].no_res)).toFixed(2); 
                    }

                    // opening info_obj_store txn for storing info
                    let objStoreInfo = getObjectStore(db, OBJ_STORE_INFO, 'readwrite');
                    objStoreInfo.add({info:'metaData', metaData});
                    objStoreInfo.add({info:'sub_code_to_name', sub_code_to_name});


                    // calculating rank
                    if(IS_RANK_GIVEN){
                        // rank is given in the file
                        console.log('[RANK OK]');
                    }else{
                        console.log('[RANK CALCULATING]');
                        createRankList(data, header_names);
                    }
                })
        }
        // if all data is in db -- show overview
        /*=========== global vars =============*/
        Chart.defaults.global.elements.line.tension = 0;
        Chart.defaults.global.elements.point.hitRadius = 2;

    }
}

function onupgradeneeded_func(event) {
    console.log("[FUNC openDb: onupgradeneeded]");

    let db = event.target.result;

    // creating main object
    let objStoreMain = db.createObjectStore(OBJ_STORE_MAIN, { keyPath: 'roll' });
    let objStoreRank = db.createObjectStore(OBJ_STORE_RANK, { keyPath: 'rank' });
    let objStoreInfo = db.createObjectStore(OBJ_STORE_INFO, { keyPath: 'info' });

    if (IS_RANK_GIVEN)
        objStoreMain.createIndex("rank", "rank", { unique: true });

    // delete previous data if version is higher

    // error while fetching and storing here : transaction is not active 
    // [ERROR] Uncaught (in promise) DOMException: Failed to execute 'add' on 'IDBObjectStore': The transaction is not active.
}

// checking index db if contains -- done
// fetching data -- done
// writing to indexdb -- done 
// calculating all fields -- done
// showing overviews
// for roll 
// for compare 

/* ------------  fetch and store data ------------ */
async function fetchAndStoreIDB(db, object_store_name, mode, fetch_url) {
    let obj_store = await getObjectStore(db, object_store_name, mode);
    let response = await fetch(fetch_url);
    let data = await response.text();
    data.split('\n').splice(1).forEach(line => { // header row not needed
        let result = line.split(',')
        obj_store.add({
            roll: result[1],
            name: result[0],
            result: result.splice(2) // 1st 2 items not needed.
        })
    })

}
/* ------------ indexDb functions------------ */
