/* global functions */
var firstBy = function () { function n(n) { return n } function t(n) { return "string" == typeof n ? n.toLowerCase() : n } function r(r, e) { if (e = "number" == typeof e ? { direction: e } : e || {}, "function" != typeof r) { var u = r; r = function (n) { return n[u] ? n[u] : "" } } if (1 === r.length) { var i = r, o = e.ignoreCase ? t : n; r = function (n, t) { return o(i(n)) < o(i(t)) ? -1 : o(i(n)) > o(i(t)) ? 1 : 0 } } return -1 === e.direction ? function (n, t) { return -r(n, t) } : r } function e(n, t) { return n = r(n, t), n.thenBy = u, n } function u(n, t) { var u = this; return n = r(n, t), e(function (t, r) { return u(t, r) || n(t, r) }) } return e }();/*** Copyright 2013 Teun Duynstee Licensed under the Apache License, Version 2.0 ***/

String.prototype.capitalize = function () {
    return this.toLocaleLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

String.prototype.underscrore_to_capitalize = function () {
    return this.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

String.prototype.to_camel_case = function () {
    return this.toLowerCase().split(' ').join('_');
}

function createRankList(db, store_name, data, header_index) {
    /*
    * uses GLOBAL VAR => TOTAL_NUMBER_FIELD_NAME;
    */
    return new Promise((res, rej) => {
        /** [BREAKEPOINT] - [GOOD] */
        /** getting neccessary to sort array */
        let rankList = data.split('\n').splice(1).map(line => {
            let result = line.split(','); /**all fields are [STRING] */

            if (!result[header_index.indexOf('student_name')]) return; /*no name means no result*/

            /** finding student's optional subject, if not assuming its 'biology'*/
            let optionalSub = header_index.indexOf('optionalSub') != -1 ? result[header_index.indexOf('optionalSub')] : 'biology';
            let nonOptionalSub = optionalSub == 'biology' ? 'higher_math' : 'biology';

            console.log('optionalSub', optionalSub, 'nonOptionalSub', nonOptionalSub)
            /** caculating student's optional subjects' marks, **assuming they are [INTEGER]-string** */
            let optionalSubMark = header_index.filter(field_name => field_name.includes(optionalSub) && field_name.includes(TOTAL_NUMBER_FIELD_NAME)).map(field_name => parseInt(result[header_index.indexOf(field_name)])).reduce((a, c) => a + c);
            let nonOptionalSubMark = header_index.filter(field_name => field_name.includes(nonOptionalSub) && field_name.includes(TOTAL_NUMBER_FIELD_NAME)).map(field_name => parseInt(result[header_index.indexOf(field_name)])).reduce((a, c) => a + c);

            console.log('optionalSub', optionalSubMark, 'nonOptionalSub', nonOptionalSubMark)

            /**
             * rankList => Array of Arrays -> [roll(int), exam_total(int), optional(int), non-optional(int)]
             */
            return [
                parseInt(result[header_index.indexOf('student_roll')].slice(this.length - MAIN_ROLL_DIGITS)),
                parseInt(result[header_index.indexOf('exam_total') != -1 ? header_index.indexOf('exam_total') : header_index.indexOf('term_total')]),
                optionalSubMark,
                nonOptionalSubMark,
            ]

        })

        /**soriting function */
        let sortingFunc = firstBy(function (arr1, arr2) { return arr1[1] - arr2[1]; }, -1) /* desc ==> exam_total */
            .thenBy(function (arr1, arr2) { return arr1[2] - arr2[2]; }) /* asc ==> optional */
            .thenBy(function (arr1, arr2) { return arr1[3] - arr2[3]; }, -1); /* desc ==> nonOptional */
        /*
        *1. who has the higher marks (desc)
        *2. if marks same? who has the lower in optional_sub  (asc)
        *3. if both marks same? who has the higher in non_optional_sub (desc)
        */

        /*sorting the main array*/
        rankList.sort(sortingFunc);

        console.log('[RANK LIST -]');
        console.log(rankList);

        /**finding rank(index+1) from RankList by roll_number */
        function findRankByRoll(roll) {
            /** roll => interger */
            let currentIndex = 0
            while (currentIndex < rankList.length) {
                if (rankList[currentIndex][0] == roll) return ++currentIndex;
                currentIndex++;
            }
        }

        /** opening transaction for updating */
        let tx = db.transaction([store_name], 'readwrite');
        tx.oncomplete = function () {
            console.log('[TX CPM :', db.name, store_name, 'readwrite', ']');
            /** returning from promise */
            res(true);
        }
        tx.onerror = e => { rej(e) };
        let objectStore = tx.objectStore(store_name);

        objectStore.openCursor().onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.roll > 0) {
                    /** find the rank of the roll in rankList */
                    const updateData = cursor.value;

                    updateData.rank = findRankByRoll(updateData.roll);
                    const request = cursor.update(updateData);
                    request.onsuccess = function () {
                        // console.log('[UPDATED RANK]:', updateData.roll, updateData.rank);
                    };
                };

                cursor.continue();
            } else {
                console.log('Completed Updating');
                // res(true);
            }
        };
    })
}

/* ===============async function for manupulating index db ==================*/
function deleteDb(db_name) {
    return new Promise((resolve, reject) => {
        var req = indexedDB.deleteDatabase(db_name);
        req.onsuccess = function () {
            console.log("[DB DELETED successfully]:", db_name);
            resolve(true);
        };
        req.onerror = function () {
            console.log("[Couldn't delete database]:", db_name);
            reject();
        };
        req.onblocked = function () {
            console.log("[Couldn't delete database due to the operation being blocked]:", db_name);
            reject();
        };
    })
}
function openiddb(db_name = "", db_version = 1, obj_stores = []) {
    /**
     * modyfies Global vars : IS_CREATED
     */
    return new Promise(
        function (resolve, reject) {
            var dbRequest = indexedDB.open(db_name, db_version);

            dbRequest.onerror = function (event) {
                console.log('[ERROR on DB opening request.]')
                reject(event);
            };

            dbRequest.onupgradeneeded = function (event) {
                // Objectstore does not exist. Create here
                console.log("[FUNC openDb: onupgradeneeded]");

                let db = event.target.result;

                // creating  objectject stores for each passed obj_stores
                obj_stores.map(obj_store => {
                    let objStoreMain = db.createObjectStore(obj_store, { keyPath: 'roll' });
                    objStoreMain.createIndex("rank", "rank", { unique: true });
                })

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

function getDataByKey(db, store_name, key) {
    return new Promise((res, rej) => {
        let tx = db.transaction([store_name], 'readonly');
        tx.oncomplete = function () {
            console.log('[TX CPM :', db.name, store_name, 'readonly', ']');
        }
        tx.onerror = e => rej(e);
        let req = tx.objectStore(store_name).get(key);
        req.onsuccess = e => res(e.target.result);
    })
}

function getDataByIndexKey(db, store_name, index_name, key) {
    return new Promise((res, rej) => {
        let tx = db.transaction([store_name], 'readonly');
        tx.oncomplete = function () {
            console.log('[TX CPM :', db.name, store_name, 'readonly', ']');
        }
        tx.onerror = e => rej(e);
        let req = tx.objectStore(store_name).index(index_name).get(key);
        req.onsuccess = e => res(e.target.result);
    })
}

function getObjectCount(db, store_name) {
    return new Promise((res, rej) => {
        let tx = db.transaction([store_name], 'readonly');
        tx.oncomplete = function () {
            console.log('[TX CPM :', db.name, store_name, 'readonly', ']');
        }
        tx.onerror = e => rej(e);
        let req = tx.objectStore(store_name).count();
        req.onsuccess = e => res(e.target.result);
    })
}


function storeMainData(db, store_name, mode, data) {
    return new Promise((res, rej) => {
        /*global vars*/
        let IS_TOTAL_MARK_GIVEN = false;

        /** crating vars to store metaData */
        let metaData = {
            total_examnee: 0,
            failed_examnee: 0,
            all_sub: {},
            header_names: data.split('\n')[0].split(','),
            sub_code_to_name: {},
            failed_examnees: [] //array of rolls
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
        let rank_index = header_names.indexOf('rank') == -1 ? header_names.indexOf('rank\r') : header_names.indexOf('rank');
        /** if rank is the last field (so last element of the arr) it will be 'rank\r' chrome doesn't show it, firefox does. wasted 1h :( */
        let is_passed_index = header_names.indexOf('isPassed') != -1 ? header_names.indexOf('isPassed') : header_names.indexOf('isPassed\r');
        let total_mark_index = header_names.indexOf(XM_TOTAL_PRIORITY_LIST[0]) != -1 ? header_names.indexOf(XM_TOTAL_PRIORITY_LIST[0]) : header_names.indexOf(XM_TOTAL_PRIORITY_LIST[1]);
        if (total_mark_index != -1) IS_TOTAL_MARK_GIVEN = true;

        console.log('[IS_TOTAL_MARK_GIVEN]', IS_TOTAL_MARK_GIVEN);

        /**storing the main roll */
        let is_main_roll_stored = false;

        data.split('\n').splice(1).forEach(line => { // header row not needed so splice(1)
            let result = line.split(',');

            let name = result[name_index];
            if (!name) return; // no student exists

            let roll = parseInt(result[roll_index].slice(this.length - MAIN_ROLL_DIGITS));

            metaData['total_examnee']++;
            if (!is_main_roll_stored) metaData['main_roll'] = parseInt(result[roll_index]) - roll;

            if (result[is_passed_index].includes('ailed')) { // don't wannna 'Failed'.toLowerCase() :)
                metaData['failed_examnee']++;
                metaData['failed_examnees'].push(roll);
            }

            /* this obj will be added to indexdb */
            let student_result = {
                roll,
                name: name,
                rank: null,
                total_mark: IS_TOTAL_MARK_GIVEN ? parseInt(result[total_mark_index]) : 0,  /**if the total_number is given in the file ? add it : calculate it */
                res: result.map(e => !parseInt(e) ? e : (e.includes('.') ? parseFloat(e) : parseInt(e)))
                /** parseInt kora na gele bosao as it is, else check etate dot ase naki? thakle parseFloat nail pareInt */
            }

            /**if the rank is given in the file? add it : else we will calculate it later */
            if (IS_RANK_GIVEN)
                student_result.rank = parseInt(result[rank_index]);


            result.forEach((element, index) => {
                for (let i in SUB_CODE_TO_NAME) {
                    if (header_names[index].includes(SUB_CODE_TO_NAME[i])) {
                        if (header_names[index].includes(TOTAL_NUMBER_FIELD_NAME)) {
                            if (element == "" || element == "-") {
                                /* which students don't have xm_result */
                                metaData.all_sub[SUB_CODE_TO_NAME[i]]['no_result']++
                            } else {
                                /** update max, min avg */
                                metaData.all_sub[SUB_CODE_TO_NAME[i]]['max'] = metaData.all_sub[SUB_CODE_TO_NAME[i]]['max'] < parseInt(element) ? parseInt(element) : metaData.all_sub[SUB_CODE_TO_NAME[i]]['max'];
                                parseInt(element) && (metaData.all_sub[SUB_CODE_TO_NAME[i]]['avg'] += parseInt(element));
                                metaData.all_sub[SUB_CODE_TO_NAME[i]]['min'] = metaData.all_sub[SUB_CODE_TO_NAME[i]]['min'] > parseInt(element) ? parseInt(element) : metaData.all_sub[SUB_CODE_TO_NAME[i]]['min'];

                                /**calculating total_mark for this student if IS_TOTAL_MARK_GIVEN==false*/
                                if (!IS_TOTAL_MARK_GIVEN)
                                    student_result.total_mark += parseInt(element);
                            }

                        } else if (header_names[index].includes('grade')) {
                            /** update grades */
                            element.toLowerCase() == 'a+' && metaData.all_sub[SUB_CODE_TO_NAME[i]]['a_plus']++;
                            element.toLowerCase() == 'a' && metaData.all_sub[SUB_CODE_TO_NAME[i]]['a']++;
                            element.toLowerCase() == 'a-' && metaData.all_sub[SUB_CODE_TO_NAME[i]]['a_minus']++;
                            element.toLowerCase() == 'b' && metaData.all_sub[SUB_CODE_TO_NAME[i]]['b']++;
                            element.toLowerCase() == 'c' && metaData.all_sub[SUB_CODE_TO_NAME[i]]['c']++;
                            element.toLowerCase() == 'd' && metaData.all_sub[SUB_CODE_TO_NAME[i]]['d']++;
                            element.toLowerCase() == 'f' && metaData.all_sub[SUB_CODE_TO_NAME[i]]['f']++;

                        }
                    }
                }
            })

            /*adding each student's result to the obj_store*/
            obj_store.add(student_result);
        })

        /* deleting those subjets which were not included in that xm */
        for (let i in SUB_CODE_TO_NAME) {
            /** if max != 0 */
            if (metaData.all_sub[SUB_CODE_TO_NAME[i]].max) {
                metaData.sub_code_to_name[i] = SUB_CODE_TO_NAME[i];
                continue;
            }

            /** if max == 0 */
            console.log('[DELETED]', SUB_CODE_TO_NAME[i], metaData.all_sub[SUB_CODE_TO_NAME[i]]);
            delete metaData.all_sub[SUB_CODE_TO_NAME[i]];
        }

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
/**=================== search result func ================= */
function search_result(roll = null, name = null) {
    /**
     * roll ==> string || null
     * name ==> string || null
     */
    console.log('[SUBMIT]')
    if (!roll && !name) {
        throw Error('No Input');
    }

    if (roll && parseInt(roll) && parseInt(roll) > 0) {
        /**search via roll */
        if (!window.location.search.includes('roll=')) window.location.search = `${window.location.search.split('&').filter(e => !e.includes('show_students')).join('&')}&roll=${roll}`;
        else window.location.search = window.location.search.split('&').filter(e => !e.includes('show_students')).map(e => e.includes('roll=') ? `roll=${roll}` : e).join('&');
    }
    else {
        /**search via name */
    }
}
/**=================== compare result func ================= */
function compare_result(roll = null, name = null) {
    /**
     * roll : string --> single roll passed
     * roll : array --> multiple roll passed
     * roll : string || null
     * name : string || null
     */
    console.log('[COMPARE RSULT] :', roll)
    if (!roll && !name) {
        throw Error('No Input');
    }

    if (roll && typeof roll != "object" && parseInt(roll) && parseInt(roll) > 0) {
        /**search via roll */
        if (!window.location.search.includes('roll=')) window.location.search = `${window.location.search}&roll=${roll}`;
        else window.location.search = window.location.search.split('&').map(e => e.includes('roll=') ? e + "-" + roll : e).join('&');
        return;
    }

    if (roll) {
        /** here roll == array, no need to check */
        if (!window.location.search.includes('roll=')) window.location.search = `${window.location.search}&roll=${roll.join('-')}`;
        else window.location.search = window.location.search.split('&').map(e => e.includes('roll=') ? 'roll=' + roll.join('-') : e).join('&');
        return;

    }
    /**search via name */

}
/**=================== update main ui func ================= */
function updateMainUi(metaData) {
    /**
     * subjects vs all_subject_names
     * [all_subject_names] contains those subjects's where max_number > 0 && subjects' names are capitalized for title.
     * [subjects] just contains all the subject in metadata && not capitalized.
     */
    let subjects = Object.values(metaData.sub_code_to_name)
    let all_subject_names = Object.keys(metaData.all_sub).map(sub_name => metaData.all_sub[sub_name].max ? sub_name.underscrore_to_capitalize() : null).filter(e => e != null)
    /** charts */

    /** ============================================= main chart starts =============================================== */
    let overview_main_chart_data_before,
        overview_main_chart_data_after,
        overview_main_chart_data_mark_overview,
        overview_main_chart_config,
        overview_main_chart,
        overview_main_chart_context = document.getElementById('overview_main_canvas').getContext('2d');

    overview_main_chart_data_before = new function () {
        /* if the max_number of a sub is not 0, return the subname, else return null, filter the null values*/
        this.labels = all_subject_names;
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
            hidden: grade == 'promoted' || grade == 'f' || grade == 'no_result', // promoted,f,no_result will be hidden by default
            fill: 'origin' || GRADES.indexOf('f') // [TODO: fix it]
        }));
        // console.log(this.labels)
        // console.log(this.datasets)
    }
    overview_main_chart_data_after = new function () {
        this.labels = overview_main_chart_data_before.datasets.map(obj => obj.label).filter(e => e.toLowerCase() != 'promoted'),
            this.datasets = overview_main_chart_data_before.labels.map((label, i) => ({ //label=sub_name
                label,
                data: this.labels.map((e, i) => metaData.all_sub[label.to_camel_case()][e.to_camel_case()]),
                backgroundColor: 'rgba(89, 127, 255, 0.1)',
                borderColor: '#5A7BFA',
                borderWidth: 1,
                fill: 'origin'
            }))
    }

    overview_main_chart_data_mark_overview = new function () {
        /** [labels] => subject_names */
        this.labels = all_subject_names;

        /** [datasets] (simple) => max,min,avg,passmark for each subject_names */
        // [TODO: add passmark field]
        this.datasets = ['min', 'max', 'avg'].map(grade => ({
            label: grade.underscrore_to_capitalize(),
            data: all_subject_names.map(sub_name => metaData.all_sub[sub_name.to_camel_case()][grade]),
            backgroundColor: 'rgba(89, 127, 255,0.1)',
            borderColor: '#5A7BFA',
            borderWidth: 1,
            fill: grade != 'pass_mark' ? 'origin' : false
        }))
    }
    // console.log('before', overview_main_chart_data_before);
    // console.log('after', overview_main_chart_data_after);
    overview_main_chart_config = {
        type: 'line',
        data: overview_main_chart_data_before,
        options: {
            aspectRatio: IS_MEDIA_PHONE ? 1 : 2,
            maintainAspectRatio: true, //default: true
            scales: {
                yAxes: [{
                    scaleLabel: {
                        labelString: 'Total Students',
                        display: !IS_MEDIA_PHONE, //don't show in phone devices to expand chart drawing area
                    },
                    ticks: {
                        beginAtZero: true,
                        // suggestedMax: 100
                    }
                }]
            },
            animation: {
                animateRotate: true,
                animateScale: true
            }
        }
    }
    /** Drawing chart for the first time */
    overview_main_chart = new Chart(overview_main_chart_context, overview_main_chart_config);

    // console.log('[overview_main_chart]', overview_main_chart);

    // ======== elevent listener of subjects_grade_overview_checkbox
    document.getElementById('overview_main_checkbox').onchange = e => {
        console.log("[CheckBox overview_main] :", e.target.checked);

        let is_mark_overview = document.querySelector('#overview_main .header button').textContent.toLowerCase().includes('mark');

        /**step 1: destroy the previous chart */
        overview_main_chart.destroy();

        /**step 2: edit data based on criteria */
        if (is_mark_overview) {
            /**
             * if the button text includes 'mark', means user is in the grade_overview graph, so change the axis just
             * else he is in the mark_overview_graph,when we change the CGHART_TYPE to bar, not the axis
             */
            /** to the GRADE_OVERVIEW chart */
            overview_main_chart_config.type = 'line'; /** GRADE_OVERVIEW must ne 'line' */

            e.target.checked ?
                overview_main_chart_config.data = overview_main_chart_data_after :
                overview_main_chart_config.data = overview_main_chart_data_before;
        } else {
            /** to the MARK_OVERVIEW chart */
            overview_main_chart_config.data = overview_main_chart_data_mark_overview;

            e.target.checked ? /** just change the [TYPE] here */
                overview_main_chart_config.type = 'bar' :
                overview_main_chart_config.type = 'line';
        }

        /**step 3: draw the new graph */
        overview_main_chart = new Chart(overview_main_chart_context, overview_main_chart_config);
        //! [ERROR]: ANimation is not working while changing data -- [SOLVED] {destroying previous chart and creating it again based on new CONFIG}
    }
    /** mark overview  button event listener **/
    document.querySelector('#overview_main .header button').onclick = e => {
        let is_mark_overview = e.target.textContent.toLowerCase().includes('mark');
        e.target.textContent = is_mark_overview ? 'grade overview' : 'mark overview';

        overview_main_chart.destroy()
        if (is_mark_overview) {
            /** to the MARK_OVERVIEW chart */
            //overview_main_chart_config.type = 'bar'; /** GRADE_OVERVIEW is 'bar' for the 1rst time */ [PROBLEM, bar is croped in the canvas]
            overview_main_chart_config.data = overview_main_chart_data_mark_overview;
            overview_main_chart_config.options.scales.yAxes[0].scaleLabel.labelString = "Total Marks";

            /**changing the footer switch-name + title name*/
            document.querySelector('#overview_main .footer .switch-name').textContent = 'Show Bar Graph';
            document.querySelector('#overview_main .header p').textContent = 'Mark Overview';
        } else {
            /** to the GRADE_OVERVIEW chart */
            overview_main_chart_config.type = 'line'; /** GRADE_OVERVIEW must be 'line' */
            overview_main_chart_config.data = overview_main_chart_data_before;
            overview_main_chart_config.options.scales.yAxes[0].scaleLabel.labelString = "Total Students";

            /**changing the footer switch-name + title name*/
            document.querySelector('#overview_main .footer .switch input[type=checkbox]').checked = false;
            document.querySelector('#overview_main .footer .switch-name').textContent = 'Change Axis';
            document.querySelector('#overview_main .header p').textContent = 'Grade Overview';
        }
        overview_main_chart = new Chart(overview_main_chart_context, overview_main_chart_config);
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
    /*select event event listener */
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
                data: Object.values(metaData.all_sub).map(obj => obj.failed), // 'failed' is selected in the select_element 
                backgroundColor: GRAPH_BG_COLORS
            }];
            overview_secondary_chart.update();
        }
    }
    /** ============================================= secondary chart ends ============================================= */
    /** ============================================= overview_total chart starts ============================================= */
    let overview_total_chart = new Chart(document.getElementById('overview_total_canvas').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Promoted', 'Failed'],
            datasets: [
                {
                    data: [metaData.total_examnee - metaData.failed_examnee, metaData.failed_examnee],
                    backgroundColor: ['#4d7cff', '#FF4651']
                },
            ]
        },
        options: {
            aspectRatio: IS_MEDIA_PHONE ? 1.5 : 1,
            legend: {
                position: IS_MEDIA_PHONE ? 'right' : 'bottom'
            },
        }
    });
    document.getElementById('total_failed').innerText = 'Failed: ' + metaData.failed_examnee;
    /** ============================================= overview_total chart ends ============================================= */
    /** ============================================= removing one element on MOBILE DEVICES ============================================= */
    if (IS_MEDIA_PHONE)
        document.getElementById('extra').style.display = 'none';
}


function search_compare_event_listener() {

    let roll_element = document.getElementById('std_roll');
    let name_element = document.getElementById('std_name');
    let submit_btn_element = document.getElementById('search_result');
    let compare_btn_element = document.getElementById('compare_result');

    if (submit_btn_element) submit_btn_element.onclick = e => search_result(roll_element && roll_element.value, name_element && name_element.value);
    if (compare_btn_element) compare_btn_element.onclick = e => compare_result(roll_element && roll_element.value, name_element && name_element.value);

}

function view_specific_result(metaData, response, freinds_result_html) {

    /*assuming 'ict' has all fileld as other subs*/
    let per_sub_fields = metaData.header_names.filter(e => e.toLowerCase().includes('ict')).map(e => e.split('_').slice(1).join('_').toUpperCase())
    let fields = ['Subject Code', 'Subject Name', ...per_sub_fields, 'Exam Highest']
    // console.log('h_names', metaData.header_names)
    console.log('fields', fields);
    console.log('response', response);

    /**==============step 1: displaying result in table */
    let tableData = `<table style="background-color: white;border-collapse:collapse" border="1">
            <tbody>
                <tr>
                    <td colspan="${fields.length}"><b>Exam Name: </b>${XM_NAME_FROM_COLLEGE}</td>
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
                    <td colspan="${fields.length - 2}" style="text-align: right"><b>${response.total_mark}</b></td>
                </tr>
                <tr>
                    <td colspan="2">${response.res[metaData.header_names.indexOf('gpa') == -1 ? metaData.header_names.indexOf('grade') : metaData.header_names.indexOf('gpa')]}</td>
                    <td colspan="${fields.length - 2}" style="text-align:center;color:${response.res[metaData.header_names.indexOf('isPassed') != -1 ? metaData.header_names.indexOf('isPassed') : metaData.header_names.indexOf('isPassed\r')].includes('ailed') ? 'red' : 'rgb(0, 188, 75)'}"><b>${response.res[metaData.header_names.indexOf('isPassed') != -1 ? metaData.header_names.indexOf('isPassed') : metaData.header_names.indexOf('isPassed\r')]}</b></td>
                </tr>
            </tbody>
        </table>`;
    document.querySelector('#overview_main .canvas').innerHTML = tableData;
    document.querySelector('#overview_main .header').innerHTML = `<span>Name: ${response.name}</span><span>Roll: ${metaData.main_roll + response.roll}</span>`;
    document.querySelector('#overview_main .footer').innerHTML = `<button class="hover-expand v-s">RANK: ${response.rank + " (Out of " + metaData.total_examnee + ")"}</button>`;
    // console.log(tableData)

    /** displaying result in graph:  */

    /* if the max_number of a sub is not 0, return the subname, else return null, filter the null values*/
    let all_subjects_name = Object.keys(metaData.all_sub);
    let std_marks_per_sub = all_subjects_name.map(sub_name => response.res[metaData.header_names.indexOf(sub_name + "_" + TOTAL_NUMBER_FIELD_NAME)]);

    /**===========step:1 expanding area for line graph */
    document.getElementById('main-container').style.gridTemplateAreas = IS_MEDIA_PHONE ? '' :
        '"m m m m m m c c c c c c" "m m m m m m c c c c c c" "m m m m m m c c c c c c" "m m m m m m c c c c c c" "t t t t t a a a a a s s" "t t t t t a a a a a s s" "t t t t t a a a a a s s" "t t t t t a a a a a d d" "t t t t t a a a a a d d"';
    /**step:2 drawing line graph in that area */
    let overview_secondary_chart = new Chart(document.getElementById('overview_secondary_canvas').getContext('2d'), {
        type: 'line',
        data: {
            /** labels are the subjects name */
            labels: all_subjects_name.map(e => e.underscrore_to_capitalize()),
            /*array of objects 
            return an obj forEach line ([max, student_result, min, passmark(nofill)])
            data => array (1 element forEach sub_name) (len=lenof labels)
            */
            datasets: ['max', response.name, 'min'].map(grade => ({
                label: grade.underscrore_to_capitalize(),
                data: grade == response.name ? std_marks_per_sub : all_subjects_name.map(sub_name => metaData.all_sub[sub_name.to_camel_case()][grade]),
                backgroundColor: grade == 'min' ? 'rgba(253, 111, 113,.3)' : 'rgba(89, 127, 255,0.1)',
                borderColor: grade == 'min' ? 'rgb(253, 111, 113)' : '#5A7BFA',
                borderWidth: 1,
                hidden: grade == 'promoted' || grade == 'f' || grade == 'no_result', // promoted,f,no_result will be hidden by default
                fill: grade != 'max' && (grade == 'min' ? 'origin' : 2) // if grade=='max' then --> no fill, else fill to 'origin'
            }))
        },
        options: {
            aspectRatio: IS_MEDIA_PHONE ? 1 : 2,
            scales: {
                yAxes: [{
                    scaleLabel: {
                        labelString: 'Total Number',
                        display: !IS_MEDIA_PHONE,
                    },
                    ticks: {
                        beginAtZero: true,
                        // suggestedMax: 100
                    }
                }]
            }
        }
    });
    /**remove the select element of #overview_secondary header*/
    document.querySelector('#overview_secondary .header').lastElementChild.remove();
    /**remove the switch of #overview_secondary*/
    document.getElementById('overview_secondary').lastElementChild.remove();

    /**==========step:3 drawing palar graph for subjects total marks */
    new Chart(document.getElementById('overview_total_canvas').getContext('2d'), {
        type: 'polarArea',
        data: {
            /** labels are the subjects name */
            labels: all_subjects_name.map(e => e.underscrore_to_capitalize()),
            /*array of objects 
            return an obj forEach line ([max, student_result, min, passmark(nofill)])
            data => array (1 element forEach sub_name) (len=lenof labels)
            */
            datasets: [{
                data: std_marks_per_sub,
                backgroundColor: GRAPH_BG_COLORS
            }]
        },
        options: {
            aspectRatio: 1.5,
            legend: {
                position: 'right'
            }
        }
    });
    /** modify the textContent of #overview_total header */
    document.querySelector('#overview_total .header p').textContent = 'Total Mark Overview';

    /**==========step: 4 ; DOM manupulation*/
    // deleteing svg image
    document.querySelector('#search .img').remove();
    // deleteing toppers-list image
    document.getElementById('e').remove();
    // displaying near roll students
    document.querySelector('#extra .header').firstElementChild.textContent = 'Friends Around You';
    document.querySelector('#extra .canvas').remove()
    document.querySelector('#extra').appendChild(document.createElement('table'));
    document.querySelector('#extra table').innerHTML = freinds_result_html;
    // event handler for comparing
    document.querySelector('#extra table').onclick = e => {
        let roll = e.target.dataset.roll
        if (!roll) return; /** finding the button element */
        console.log('[compare with]', roll);
        compare_result(roll, null);
    }
    /** lessen the area of #search && add another card */
    /** AREA has been lessen by changing GRID-TEMPLATE-AREAS */
    // adding new elelment to the #main-container
    document.getElementById('developer').style.display = 'flex';
}

function view_compared_result(metaData, all_students_results) {

    /*==========step 1: editing dom and layout */
    // removing last  childs
    document.querySelector('#overview_main .header').lastElementChild.remove();
    document.querySelector('#overview_secondary').lastElementChild.remove();
    document.querySelector('#overview_secondary .header').lastElementChild.remove();
    // editing text
    document.querySelector('#overview_main .header').lastElementChild.textContent = 'Mark Overview';
    document.querySelector('#overview_main .footer').lastElementChild.textContent = 'Show Line Graph'
    document.querySelector('#overview_secondary .header').firstElementChild.textContent = 'Total Marks';
    // removing element
    document.getElementById('e').style.display = 'none';
    // layout
    document.getElementById('main-container').style.gridTemplateAreas = IS_MEDIA_PHONE ? '' :
        `"m m m m m m c c c c s s"
    "m m m m m m c c c c s s"
    "m m m m m m c c c c s s"
    "m m m m m m c c c c s s"
    "m m m m m m c c c c s s"
    "t t t t t t t t a a a a"
    "t t t t t t t t a a a a"
    "t t t t t t t t a a a a"
    "t t t t t t t t a a a a"`

    /*==============step 2: draw in the main graph */
    let all_subjects_name = Object.keys(metaData.all_sub)
    let overview_main_chart = new Chart(document.getElementById('overview_main_canvas').getContext('2d'), {
        type: 'bar',
        data: {
            /** labels are the subjects name */
            labels: all_subjects_name.map(e => e.underscrore_to_capitalize()),
            /*array of objects 
            return an obj forEach line ([max, student_result, min, passmark(nofill)])
            data => array (1 element forEach sub_name) (len=lenof labels)
            */
            datasets: all_students_results.map((result, i) => {
                let random_color = GRAPH_BG_COLORS[Math.floor(Math.random() * GRAPH_BG_COLORS.length)];
                return {
                    label: result.name,
                    data: all_subjects_name.map(sub_name => result.res[metaData.header_names.indexOf(sub_name.to_camel_case() + "_" + TOTAL_NUMBER_FIELD_NAME)]),
                    backgroundColor: random_color,
                    borderColor: random_color.slice(0, random_color.length - 2),
                    borderWidth: 1,
                    hidden: false,
                    fill: false
                }
            })
        },
        options: {
            aspectRatio: IS_MEDIA_PHONE ? 1 : 2,
            scales: {
                yAxes: [{
                    scaleLabel: {
                        labelString: 'Total Number',
                        display: !IS_MEDIA_PHONE,
                    },
                    ticks: {
                        beginAtZero: true,
                        // suggestedMax: 100
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
    /*==================step 3: draw in the secondary graph */
    /* this graph shows per students total mark */
    let overview_secondary_chart = new Chart(document.getElementById('overview_secondary_canvas').getContext('2d'), {
        type: 'polarArea',
        data: {
            /** labels are the students name */
            labels: all_students_results.map(res => res.name),
            /*array of objects 
            return an obj forEach line ([max, student_result, min, passmark(nofill)])
            data => array (1 element forEach sub_name) (len=lenof labels)
            */
            datasets: [{
                data: all_students_results.map(res => res.total_mark),
                backgroundColor: GRAPH_BG_COLORS
            }]
        },
        options: {
            aspectRatio: IS_MEDIA_PHONE ? 1 : 1.2,
            legend: {
                position: 'bottom'
            }
        }
    });
    /*==================step 3: draw the table */
    function drawTable(field_name) {
        let fields = ['Subject Code', 'Subject Name', field_name]
        let tableData = `<table style="background-color: white;border-collapse:collapse" border="1">
                <tbody>
                    <tr>
                        <td colspan=2></td>
                        ${all_students_results.map(result => `<td>${result.name.capitalize()}</td>`).join('')}
                    </tr>
                    <tr style="background-color: #59B899;color: #F4F5F8">
                        <td><b>${fields[0]}</b></td>
                        <td><b>${fields[1]}</b></td>
                        ${all_students_results.map(e => `<td><b>${fields[2].toUpperCase()}</b></td>`).join('')}
                    </tr>
                    ${Object.keys(metaData.sub_code_to_name).map(sub_code => `
                        <tr>
                            <td>${sub_code}</td>
                            <td>${metaData.sub_code_to_name[sub_code].underscrore_to_capitalize()}</td>
                            ${all_students_results.map(result => `<td>${result.res[metaData.header_names.indexOf(metaData.sub_code_to_name[sub_code] + '_' + fields[2])] || '0'}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
        document.querySelector('#overview_total .canvas').innerHTML = tableData;
        // console.log('tableData',tableData)
    }

    drawTable(TOTAL_NUMBER_FIELD_NAME);
    /** editing header */
    document.querySelector('#overview_total .header p').textContent = 'Compare';
    /** adding select element for changing */
    let per_sub_fields = metaData.header_names.filter(e => e.toLowerCase().includes('ict')).map(e => e.split('_').splice(1).join('_'))
    document.querySelector('#overview_total .header').innerHTML +=
        `<select>
        ${per_sub_fields.map(field_name => `<option value=${field_name} ${field_name == TOTAL_NUMBER_FIELD_NAME && 'selected'}>${field_name.toUpperCase()}</option>`)}
    </select>`
    // onchange event for select element
    document.querySelector('#overview_total .header select').onchange = e => {
        console.log(e.target.value)
        drawTable(e.target.value);
    }

    /**========== step 4: table for deleting from compare list*/
    /** editing header */
    document.querySelector('#extra .header p').textContent = 'Students';
    /** adding table */
    document.querySelector('#extra .canvas').innerHTML =
        `<table style="background-color: white;border-collapse:collapse" border="1">
            <thead>
                <tr>
                    <td>ROLL</td>
                    <td>NAME</td>
                    <td>RANK</td>
                    <td>REMOVE</td>
                </tr>
            </thead>
            <tbody>
                ${all_students_results.map(res => `
                <tr>
                    <td>${res.roll}</td>
                    <td>${res.name}</td>
                    <td>${res.rank}</td>
                    <td><button class='hover-expand v-s' data-remove=${res.roll}>remove</button></td>
                </tr>
                `).join('')}
            </tbody>
        </table>`;
    /** event listener for remove button */
    document.querySelector('#extra .canvas table').onclick = e => {
        let roll_to_removed = e.target.dataset.remove;
        if (!roll_to_removed) return;
        // console.log('roll_to_removed',roll_to_removed);
        /**remove from compare list */
        let new_rolls_to_compare = new URLSearchParams(window.location.search).get('roll').split('-').filter(e => e != roll_to_removed);
        // console.log('new_rolls_to_compare', new_rolls_to_compare);
        compare_result(new_rolls_to_compare, null);
    }

    /**adding one more empty div so that the table is placed in the middle instead of the end (flex design) */
    document.querySelector('#extra').appendChild(document.createElement('div'));

}

function view_failed_students_chart(failed_students_results) {
    let overview_total_failed_context = document.getElementById('overview_total_failed_canvas').getContext('2d'),
        overview_total_failed_config,
        overview_total_failed_chart;

    overview_total_failed_config = {
        type: 'line',
        data: {
            labels: failed_students_results.map(obj => obj.name.capitalize()),
            datasets: [{
                label: 'Total Marks',
                data: failed_students_results.map(obj => obj.total_mark),
                backgroundColor: 'rgba(89, 127, 255,0.1)',
                borderColor: '#5A7BFA',
                fill: 'origin'
            }]
        },
        options: {
            aspectRatio: 2.5,
            scales: {
                yAxes: [{
                    scaleLabel: {
                        labelString: 'Total Marks',
                        display: true,
                    },
                    ticks: {
                        beginAtZero: true,
                        suggestedMin: 100
                    }
                }]
            }
        }
    }
    overview_total_failed_chart = new Chart(overview_total_failed_context, overview_total_failed_config);
}

function view_topper_students_table(metaData, topper_list) {
    document.querySelector('#e .list-toppers').innerHTML =
        `<table style="border-collapse:collapse" border="1">
                <tr>
                    <td>Rank</td>
                    <td>Roll</td>
                    <td>Name</td>
                    <td>Total</td>
                </tr>
                ${topper_list.map(result => `
                <tr>
                    <td>${result.rank}</td>
                    <td>${result.roll}</td>
                    <td>${result.name}</td>
                    <td>${result.total_mark}</td>
                </tr>`).join('')}
            </table>`;
}

function set_TOTAL_NUMBER_FIELD_NAME(header_names) {
    /**
     * modifies GLOBAL VAR : XM_TOTAL_PRIORITY_LIST
     */
    /** finding which one is the TOTAL_NUMBER field for each subject *assuming 'ict' represents all subjects */
    let all_sub_field_names = header_names.filter(field_name => field_name.includes('ict'));
    XM_TOTAL_PRIORITY_LIST.forEach(e => {
        if (TOTAL_NUMBER_FIELD_NAME) return; /** if TOTAL_NUMBER_FIELD_NAME is already set -- n need to find */
        all_sub_field_names.every(field_name => {
            console.log(field_name)
            if (field_name.includes(e)) {
                TOTAL_NUMBER_FIELD_NAME = e;
                return false; /** it wont check for other field_name */
            };
            return true; /**will check for other_field_name */
        })
    });
    console.log('[TOTAL_NUMBER_FIELD_NAME]:', TOTAL_NUMBER_FIELD_NAME);
}

function get_all_students_data_in_table(db, store_name, header_names) {
    return new Promise((resolve, reject) => {
        let table_data = "";

        /*opening txn*/
        let tx = db.transaction([store_name], 'readwrite');
        tx.oncomplete = function () {
            console.log('[TX CPM :', db.name, store_name, 'readwrite', ']');

            /** returning from promise */
            resolve(table_data);
        }
        tx.onerror = e => { reject(e) };

        /** getting obj store */
        let objectStore = tx.objectStore(store_name);

        /* getting all documents */
        objectStore.openCursor().onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.roll > 0) {
                    /** find the rank of the roll in rankList */
                    const student_result = cursor.value;
                    table_data += `<tr><td>${student_result.roll}</td><td>${student_result.rank}</td><td>${student_result.name}</td><td>${student_result.total_mark}</td><td>${student_result.res[header_names.indexOf('isPassed') != -1 ? header_names.indexOf('isPassed') : header_names.indexOf('isPassed\r')]}</td></tr>`;

                };

                cursor.continue();
            } else {
                console.log('[ALL STUDENTS TABLE DATA]');
                // res(true);
            }
        };
    })
}

function add_sorting_functionality_to_table() {
    const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;

    const comparer = (idx, asc) => (a, b) => ((v1, v2) =>
        v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v1 - v2 : v1.toString().localeCompare(v2)
    )(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));

    // do the work...
    document.querySelectorAll('th').forEach(th => th.addEventListener('click', (() => {
        const table = th.closest('table');
        Array.from(table.querySelectorAll('tr:nth-child(n+2)'))
            .sort(comparer(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
            .forEach(tr => table.appendChild(tr));
    })));
}