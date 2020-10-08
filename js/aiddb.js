/* global functions */
var firstBy = function () { function n(n) { return n } function t(n) { return "string" == typeof n ? n.toLowerCase() : n } function r(r, e) { if (e = "number" == typeof e ? { direction: e } : e || {}, "function" != typeof r) { var u = r; r = function (n) { return n[u] ? n[u] : "" } } if (1 === r.length) { var i = r, o = e.ignoreCase ? t : n; r = function (n, t) { return o(i(n)) < o(i(t)) ? -1 : o(i(n)) > o(i(t)) ? 1 : 0 } } return -1 === e.direction ? function (n, t) { return -r(n, t) } : r } function e(n, t) { return n = r(n, t), n.thenBy = u, n } function u(n, t) { var u = this; return n = r(n, t), e(function (t, r) { return u(t, r) || n(t, r) }) } return e }();/*** Copyright 2013 Teun Duynstee Licensed under the Apache License, Version 2.0 ***/

String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

String.prototype.underscrore_to_capitalize = function () {
    return this.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

String.prototype.to_camel_case = function () {
    return this.toLowerCase().split(' ').join('_');
}

async function createRankList(data, header_index) {
    let rankList = data.split('\n').splice(1).map(line => {

        let result = line.split(',');
        // [roll, total, optional, non-optional, name]
        return [
            parseInt(result[header_index.indexOf('student_roll')].slice(ROLL_SLICE)),
            parseInt(result[header_index.indexOf('term_total')]),
            result[header_index.indexOf('optionalSub')] == 'biology' ? parseInt(result[header_index.indexOf('biology_1st_mcq')]) : parseInt(result[header_index.indexOf('higher_math_1st_mcq')]),
            result[header_index.indexOf('optionalSub')] == 'biology' ? parseInt(result[header_index.indexOf('higher_math_1st_mcq')]) : parseInt(result[header_index.indexOf('biology_1st_mcq')]),
            result[header_index.indexOf('student_name')],
            result[header_index.indexOf('isPassed')].toLowerCase().includes('fail') ? false : true
        ]

    })

    let sortingFunc = firstBy(function (arr1, arr2) { return arr1[1] - arr2[1]; }, -1)
        .thenBy(function (arr1, arr2) { return arr1[2] - arr2[2]; },)
        .thenBy(function (arr1, arr2) { return arr1[3] - arr2[3]; }, -1);
    /*
    *1. who has the higher marks (desc)
    *2. if marks same? who has low in optional_sub  (asc)
    *3. if both marks same? who has high in non_optional_sub (desc)
    */

    /*sorting the main array*/
    rankList.sort(sortingFunc);

    console.log('[RANK LIST -]')
    console.log(rankList)

    let objStoreRank = await getObjectStore(db, OBJ_STORE_RANK, 'readwrite');
    rankList.forEach((arr, index) => {
        objStoreRank.add({
            rank: index + 1, // non-zero
            name: arr[4],
            roll: arr[0],
            total: arr[1],
            isPassed: arr[5], //boolean
            data: arr.slice(2, 4) //2 & 3rd index (optional, non-optional)
        })
    })
    // [TODO]: update the main list instead of creating new objStore.
}

/* async function for manupulating index db */
function openiddb(db_name, db_version) {
    /**
     * uses Global consts : OBJ_STORE_MAIN, OBJ_STORE_RANK, IS_RANK_GIVEN
     * modyfies Global vars : IS_CREATED
     */
    return new Promise(
        function (resolve, reject) {
            var dbRequest = indexedDB.open(db_name, db_version);

            dbRequest.onerror = function (event) {
                reject(Error(event));
            };

            dbRequest.onupgradeneeded = function (event) {
                // Objectstore does not exist. Create here
                console.log("[FUNC openDb: onupgradeneeded]");

                let db = event.target.result;

                // creating main object
                let objStoreMain = db.createObjectStore(OBJ_STORE_MAIN, { keyPath: 'roll' });
                let objStoreRank = db.createObjectStore(OBJ_STORE_RANK, { keyPath: 'rank' });

                if (IS_RANK_GIVEN)
                    objStoreMain.createIndex("rank", "rank", { unique: true });

                /** if new obj stores are created, then they must be empty , we need to fill this*/
                IS_CREATED = true;

                // [TODO] delete previous data if version is higher

            };

            dbRequest.onsuccess = function (event) {
                let database = event.target.result;
                resolve(database);
            };
        }
    );
}

function getObjectStore(db, store_name, mode) {

    let tx = db.transaction([store_name], mode);

    tx.oncomplete = function () {
        console.log('[TX CPM :', db.name, store_name, mode, ']');
    }

    res(tx.objectStore(store_name));

}

function storeMainData(db, store_name, mode, data) {
    return new Promise((res, rej) => {

        /** crating vars to store metaData */
        let metaData = {
            total_examnee: 0,
            failed_examnee: 0,
            all_sub: {},
            SUB_CODE_TO_NAME
        };
        for (let i in SUB_CODE_TO_NAME) {
            metaData.all_sub[SUB_CODE_TO_NAME[i]] = {
                max: 0,
                avg: 0,
                min: 100,
                a_plus: 0,
                a: 0,
                a_minus: 0,
                b: 0,
                c: 0,
                d: 0,
                f: 0,
                no_result: 0,
                promoted: 0,
                failed: 0,
            }
        }

        /* opening txn */
        let tx = db.transaction([store_name], mode);

        tx.oncomplete = function () {
            console.log('[TX CPM :', db.name, store_name, mode, ']');
            res(true);
        }
        tx.onerror = e => { rej(e) };
        let obj_store = tx.objectStore(store_name);

        // getting header_names & indexs
        let header_names = data.split('\n')[0].split(',');

        let name_index = header_names.indexOf('student_name');
        let roll_index = header_names.indexOf('student_roll');
        let rank_index = header_names.indexOf('rank');
        let pass_index = header_names.indexOf('isPassed');
        data.split('\n').splice(1).forEach(line => { // header row not needed so splice(1)
            let result = line.split(',');

            let name = result[name_index];

            if (name) metaData['total_examnee']++;

            if (result[pass_index].includes('ailed')) metaData['failed_examnee']++; // don't wannna .toLowerCase() :)

            let obj = {
                roll: parseInt(result[roll_index].slice(ROLL_SLICE)),
                name: name,
                res: result.map(e => !parseInt(e) ? e : (e.includes('.') ? parseFloat(e) : parseInt(e)))
            }
            if (IS_RANK_GIVEN)
                obj.rank = parseInt(result[rank_index]);

            obj_store.add(obj);

            result.forEach((element, index) => {
                for (let i in SUB_CODE_TO_NAME) {
                    if (header_names[index].includes(SUB_CODE_TO_NAME[i])) {
                        if (header_names[index].includes('mcq') && element != "") {
                            metaData.all_sub[SUB_CODE_TO_NAME[i]]['max'] = metaData.all_sub[SUB_CODE_TO_NAME[i]]['max'] < parseInt(element) ? parseInt(element) : metaData.all_sub[SUB_CODE_TO_NAME[i]]['max'];
                            parseInt(element) && (metaData.all_sub[SUB_CODE_TO_NAME[i]]['avg'] += parseInt(element));
                            metaData.all_sub[SUB_CODE_TO_NAME[i]]['min'] = metaData.all_sub[SUB_CODE_TO_NAME[i]]['min'] > parseInt(element) ? parseInt(element) : metaData.all_sub[SUB_CODE_TO_NAME[i]]['min'];
                        }
                        else if (header_names[index].includes('grade')) {
                            element.toLowerCase() == 'a+' && metaData.all_sub[SUB_CODE_TO_NAME[i]]['a_plus']++;
                            element.toLowerCase() == 'a' && metaData.all_sub[SUB_CODE_TO_NAME[i]]['a']++;
                            element.toLowerCase() == 'a-' && metaData.all_sub[SUB_CODE_TO_NAME[i]]['a_minus']++;
                            element.toLowerCase() == 'b' && metaData.all_sub[SUB_CODE_TO_NAME[i]]['b']++;
                            element.toLowerCase() == 'c' && metaData.all_sub[SUB_CODE_TO_NAME[i]]['c']++;
                            element.toLowerCase() == 'd' && metaData.all_sub[SUB_CODE_TO_NAME[i]]['d']++;
                            element.toLowerCase() == 'f' && metaData.all_sub[SUB_CODE_TO_NAME[i]]['f']++;
                            element == "" && metaData.all_sub[SUB_CODE_TO_NAME[i]]['no_result']++;
                        }
                    }
                }
            })
        })

        /* calculating avg */
        for (let i in metaData.all_sub) {
            metaData.all_sub[i].avg = (metaData.all_sub[i].avg / (metaData.total_examnee - metaData.all_sub[i].no_result)).toFixed(2);
            metaData.all_sub[i].promoted = metaData.total_examnee - metaData.all_sub[i].no_result - metaData.all_sub[i].f;
            metaData.all_sub[i].failed = metaData.all_sub[i].no_result + metaData.all_sub[i].f;
        }

        /* storing info {metaData} in the first place (roll=0) */
        obj_store.add({ roll: 0, rank: 0, metaData });
    })
}