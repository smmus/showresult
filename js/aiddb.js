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
    return new Promise((res, rej) => {

        let rankList = data.split('\n').splice(1).map(line => {

            let result = line.split(',');
            // [roll, total, optional, non-optional, name]
            return [
                parseInt(result[header_index.indexOf('student_roll')].slice(this.length - MAIN_ROLL_DIGITS)),
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

        let tx = db.transaction([store_name], 'readwrite');
        tx.oncomplete = function () {
            console.log('[TX CPM :', db.name, store_name, mode, ']');
            res(true);
        }
        tx.onerror = e => { rej(e) };
        let objStoreRank = tx.objectStore(store_name);

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
    })
}

/* ===============async function for manupulating index db ==================*/
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


function storeMainData(db, store_name, mode, data) {
    return new Promise((res, rej) => {

        /** crating vars to store metaData */
        let metaData = {
            total_examnee: 0,
            failed_examnee: 0,
            all_sub: {},
            header_names: data.split('\n')[0].split(','),
            sub_code_to_name: SUB_CODE_TO_NAME,
            failed_examnees: [] //array of rolls
        };
        console.log(metaData.header_names)
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
        let pass_index = header_names.indexOf('isPassed');

        /**storing the main roll */
        let is_main_roll_stored = false;

        data.split('\n').splice(1).forEach(line => { // header row not needed so splice(1)
            let result = line.split(',');

            let name = result[name_index];
            if (!name) return; // no student exists

            let roll = parseInt(result[roll_index].slice(this.length - MAIN_ROLL_DIGITS));

            metaData['total_examnee']++;
            if (!is_main_roll_stored) metaData['main_roll'] = parseInt(result[roll_index]) - roll;

            if (result[pass_index].includes('ailed')) { // don't wannna 'Failed'.toLowerCase() :)
                metaData['failed_examnee']++;
                metaData['failed_examnees'].push(roll);
            }

            let obj = {
                roll,
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
/**=================== search result func ================= */
function search_result(roll, name) {
    console.log('[SUBMIT]')
    if (!roll && !name) {
        throw Error('No Input');
    }

    if (roll && parseInt(roll) && parseInt(roll) > 0) {
        /**search via roll */
        if (!window.location.search.includes('roll=')) window.location.search = `${window.location.search}&roll=${roll}`;
        else window.location.search = window.location.search.split('&').map(e => e.includes('roll=') ? `roll=${roll}` : e).join('&');
    }
    else {
        /**search via name */
    }
}
/**=================== compare result func ================= */
function compare_result(roll, name) {
    console.log('[SUBMIT]')
    if (!roll && !name) {
        throw Error('No Input');
    }

    if (roll && parseInt(roll) && parseInt(roll) > 0) {
        /**search via roll */
        if (!window.location.search.includes('roll=')) window.location.search = `${window.location.search}&roll=${roll}`;
        else window.location.search = window.location.search.split('&').map(e => e.includes('roll=') ? e + "-" + roll : e).join('&')
    }
    else {
        /**search via name */
    }
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
            aspectRatio: 2,
            maintainAspectRatio: true, //default: true
            scales: {
                yAxes: [{
                    scaleLabel: {
                        labelString: 'Total Students',
                        display: true,
                    },
                    ticks: {
                        beginAtZero: true,
                        suggestedMax: 100
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

    console.log('[overview_main_chart]', overview_main_chart);

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
            aspectRatio: 1.5,
            legend: {
                position: 'right'
            },
            layout: { padding: { top: 20 } }
        }
    });
    document.getElementById('total_failed').innerText += metaData.failed_examnee;
    /** ============================================= overview_total chart ends ============================================= */
}


function search_compare_event_listener() {

    let roll_element = document.getElementById('std_roll');
    let name_element = document.getElementById('std_name');
    let submit_btn_element = document.getElementById('search_result');
    let compare_btn_element = document.getElementById('compare_result');

    if (submit_btn_element) submit_btn_element.onclick = e => search_result(roll_element && roll_element.value, name_element && name_element.value);
    if (compare_btn_element) compare_btn_element.onclick = e => compare_result(roll_element && roll_element.value, name_element && name_element.value);

    /** ============================ update collge name ========================= */
    document.querySelector('.colg_name').textContent = (DB_NAME == 'rc') ? "RAJSHAHI COLLEGE" : "DHAKA COLLEGE";
}

function view_specific_result(metaData, response, freinds_result_html) {

    let per_sub_fields = metaData.header_names.filter(e => e.toLowerCase().includes('ict')).map(e => e.split('_')[1].toUpperCase())
    let fields = ['Subject Code', 'Subject Name', ...per_sub_fields, 'Exam Highest']
    // console.log('h_names', metaData.header_names)
    console.log('fields', fields);
    console.log('response', response);

    /** displaying result in table */
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
                    <td colspan="${fields.length - 2}" style="text-align: right"><b>${response.res[metaData.header_names.indexOf('term_total')]}</b></td>
                </tr>
                <tr>
                    <td colspan="2">${response.res[metaData.header_names.indexOf('gpa') == -1 ? metaData.header_names.indexOf('grade') : metaData.header_names.indexOf('gpa')]}</td>
                    <td colspan="${fields.length - 2}" style="text-align:center;color:${response.res[metaData.header_names.indexOf('isPassed')].includes('ailed') ? 'red' : 'rgb(0, 188, 75)'}"><b>${response.res[metaData.header_names.indexOf('isPassed')]}</b></td>
                </tr>
            </tbody>
        </table>`;
    document.querySelector('#overview_main .canvas').innerHTML = tableData;
    document.querySelector('#overview_main .header').innerHTML = `<span>Name: ${response.name}</span><span>Roll: ${metaData.main_roll + response.roll}</span>`;
    document.querySelector('#overview_main .footer').innerHTML = `<button class="hover-expand v-s">RANK: ${response.rank + " (Out of " + metaData.total_examnee + ")"}</button>`;
    // console.log(tableData)

    /** displaying result in graph:  */

    /* if the max_number of a sub is not 0, return the subname, else return null, filter the null values*/
    let all_subjects_name = Object.keys(metaData.all_sub).map(sub_name => metaData.all_sub[sub_name].max ? sub_name.underscrore_to_capitalize() : null).filter(e => e != null);
    let std_marks_per_sub = all_subjects_name.map(sub_name => response.res[metaData.header_names.indexOf(sub_name.to_camel_case() + "_mcq")]);

    /**step:1 expanding area for line graph */
    document.getElementById('main-container').style.gridTemplateAreas =
        '"m m m m m m c c c c c c" "m m m m m m c c c c c c" "m m m m m m c c c c c c" "m m m m m m c c c c c c" "t t t t t a a a a a s s" "t t t t t a a a a a s s" "t t t t t a a a a a s s" "t t t t t a a a a a s s" "t t t t t a a a a a s s"';
    /**step:2 drawing line graph in that area */
    let overview_secondary_chart = new Chart(document.getElementById('overview_secondary_canvas').getContext('2d'), {
        type: 'line',
        data: {
            /** labels are the subjects name */
            labels: all_subjects_name,
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
    /**step:3 drawing palar graph for subjects total marks */
    new Chart(document.getElementById('overview_total_canvas').getContext('2d'), {
        type: 'polarArea',
        data: {
            /** labels are the subjects name */
            labels: all_subjects_name,
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

    /**step: 4 ; DOM manupulation*/
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
        if(!roll) return; /** finding the button element */
        console.log('[compare with]', roll);
        compare_result(roll, null);
    }
}

function view_compared_result(metaData, all_students_results) {

    /*step 2: draw in the main graph */
    // removing last  childs
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
            datasets: all_students_results.map((result, i) => {
                let random_color = GRAPH_BG_COLORS[Math.floor(Math.random() * GRAPH_BG_COLORS.length)];
                return {
                    label: result.name,
                    data: all_subjects_name.map(sub_name => result.res[metaData.header_names.indexOf(sub_name.to_camel_case() + "_mcq")]),
                    backgroundColor: random_color,
                    borderColor: random_color.slice(0, random_color.length - 2),
                    borderWidth: 1,
                    hidden: false,
                    fill: false
                }
            })
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
            labels: all_students_results.map(res => res.name),
            /*array of objects 
            return an obj forEach line ([max, student_result, min, passmark(nofill)])
            data => array (1 element forEach sub_name) (len=lenof labels)
            */
            datasets: [{
                data: all_students_results.map(res => res.res[metaData.header_names.indexOf('term_total')]),
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
    overview_total_failed_chart = new Chart(overview_total_failed_context, overview_total_failed_config)
}