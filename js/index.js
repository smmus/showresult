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
// ------------------------ nav functionality ends ------------------------------
// ------------------------ main fetching starts ------------------------------
// for overview
// checking url-params
const DB_NAME = new URLSearchParams(window.location.search).get('in'); //institution
const XM_NAME = new URLSearchParams(window.location.search).get('xm');
const STD_ROLL = new URLSearchParams(window.location.search).get('roll');
const STD_NAME = new URLSearchParams(window.location.search).get('name');

const OBJ_STORE_MAIN = `${DB_NAME}_${XM_NAME}_main`;
const OBJ_STORE_RANK = `${DB_NAME}_${XM_NAME}_rank`;
const OBJ_STORE_INFO = `${DB_NAME}_${XM_NAME}_info`;
const DB_VERSION = 1;

let db;

window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
if (!window.indexedDB) {
    console.log("Your browser doesn't support a stable version of IndexedDB.");
    document.body.innerHTML = `Use modern browsers like FireFox or Chrome.`
    //return;
}

//fetching data first
let data = null;
fetch(`data/${DB_NAME}_${XM_NAME}.csv`)
    .then(res=>res.text())
    .then(text=> {data = text})

db = openDb(window.indexedDB, DB_NAME, DB_VERSION, async function(event){
    console.log("[FUNC openDb: onupgradeneeded]");

    let db = event.target.result;

    // creating main object
    let objStoreMain = db.createObjectStore(OBJ_STORE_MAIN, { keyPath: 'roll' });
    let objStoreRank = db.createObjectStore(OBJ_STORE_RANK, { keyPath: 'rank' });
    let objStoreInfo = db.createObjectStore(OBJ_STORE_INFO, { keyPath: 'info' });

    objStoreMain.add({roll:'123', any:false})

    data.split('\n').splice(1).forEach(line => { // header row not needed
        let result = line.split(',')
        objStoreMain.add({
            roll: parseInt(result[1]),
            name: result[0],
            result: result.splice(2) // 1st 2 items not needed.
        })
    })

    
    // [ERROR] Uncaught (in promise) DOMException: Failed to execute 'add' on 'IDBObjectStore': The transaction is not active.

    // adding data to main_objStore
    // fetchAndStoreIDB(db, OBJ_STORE_MAIN, 'readwrite', `data/${DB_NAME}_${XM_NAME}.csv`);
})
// checking index db if contains -- done
// fetching data -- done
// writing to indexdb -- done 
// calculating all fields
// showing overviews

// for roll 
// for compare 

/* ------------  fetch and store data ------------ */
async function fetchAndStoreIDB(db, object_store_name, mode, fetch_url){
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
function openDb(idb, db_name, db_version, onupgradeneeded_func) {
    // no modifies global var
    console.log("[FUNC openDb]");
    let req = idb.open(db_name, db_version);

    req.onsuccess = function (evt) {
        console.log("[FUNC openDb: DB opended]");
        return  evt.target.result;
    };

    req.onerror = function (evt) {
        console.log("[FUNC openDb: ERROR]");
        console.error(evt.target.errorCode);
        return null;
    };

    req.onupgradeneeded = onupgradeneeded_func;
}

function getObjectStore(db, store_name, mode) {
    var tx = db.transaction(store_name, mode);
    return tx.objectStore(store_name);
}
