/*===== EXPANDER MENU  =====*/
const showMenu = (toggleId, navbarId, bodyId) => {
    const toggle = document.getElementById(toggleId),
        navbar = document.getElementById(navbarId),
        bodypadding = document.getElementById(bodyId)

    if (toggle && navbar) {
        toggle.addEventListener('click', () => {
            navbar.classList.toggle('expander')

            // bodypadding.classList.toggle('body-pd') --> code after thish wont execute if error

            document.querySelectorAll('#navbar nav > div >  div+div > div .rotate').forEach(e => e.classList.remove("rotate"));
            document.querySelectorAll('#navbar nav > div >  div+div > div .showCollapse').forEach(e => e.classList.remove("showCollapse"))

        })
    }
}
showMenu('nav-toggle', 'navbar', 'body-pd');

/*===== LINK ACTIVE  =====*/
const linkColor = document.querySelectorAll('.nav__link')
function colorLink() {
    linkColor.forEach(l => l.classList.remove('active'))
    this.classList.add('active')
}
linkColor.forEach(l => l.addEventListener('click', colorLink))


/*===== COLLAPSE MENU  =====*/
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
        ]
    })
    let sortingFunc = firstBy(function (arr1, arr2) { return arr1[1] - arr2[1]; }, -1)
        .thenBy(function (arr1, arr2) { return arr1[2] - arr2[2]; },)
        .thenBy(function (arr1, arr2) { return arr1[3] - arr2[3]; }, -1);
    //1. who has the highest mark (desc)
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
            data : arr.slice(2,4) //2 & 3rd index
        })
    })
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

async function onsuccess_func(event) {
    console.log("[FUNC openDb: DB onsuccess]");
    db = event.target.result;

    // checking if main objectStore is empty
    getObjectStore(db, OBJ_STORE_MAIN, 'readonly').count().onsuccess = function () {
        let rollCount = this.result;
        console.log('[OBJ_STORE_MAIN count()]', rollCount);
        if (rollCount == 0) {
            //fetch data
            fetch(`data/${DB_NAME}_${XM_NAME}.csv`)
                .then(res => res.text())
                .then(data => {

                    // getting header index
                    let header_index = data.split('\n')[0].split(',');

                    // storing main data
                    let objStoreMain = getObjectStore(db, OBJ_STORE_MAIN, 'readwrite');
                    data.split('\n').splice(1).forEach(line => { // header row not needed
                        let result = line.split(',')
                        objStoreMain.add({
                            roll: parseInt(result[1].slice(ROLL_SLICE)),
                            name: result[0],
                            result: result.splice(2) // 1st 2 items not needed.
                        })
                    })

                    // calculating rank
                    if(header_index.indexOf('rank')>=0 || IS_RANK_GIVEN){
                        // rank is given in the file
                        console.log('[RANK OK]');
                    }else{
                        console.log('[RANK CALCULATING]');
                        createRankList(data, header_index);
                    }

                })
        }
    }

}

function onupgradeneeded_func(event) {
    console.log("[FUNC openDb: onupgradeneeded]");

    let db = event.target.result;

    // creating main object
    let objStoreMain = db.createObjectStore(OBJ_STORE_MAIN, { keyPath: 'roll' });
    let objStoreRank = db.createObjectStore(OBJ_STORE_RANK, { keyPath: 'rank' });
    let objStoreInfo = db.createObjectStore(OBJ_STORE_INFO, { keyPath: 'info' });

    
    // error while fetching and storing here : transaction is not active 
    // [ERROR] Uncaught (in promise) DOMException: Failed to execute 'add' on 'IDBObjectStore': The transaction is not active.
}
// checking index db if contains -- done


// fetching data -- done
// writing to indexdb -- done 
// calculating all fields
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
