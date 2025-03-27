/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 91.234, "KoPercent": 8.766};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.06712, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.14586666666666667, 500, 1500, "23 Get Stock Portfolio Request"], "isController": false}, {"data": [0.027033333333333333, 500, 1500, "16 Get Stock Prices Request"], "isController": false}, {"data": [0.0793, 500, 1500, "14 Register Request"], "isController": false}, {"data": [0.11593333333333333, 500, 1500, "19 Place Stock Order Request"], "isController": false}, {"data": [0.03283333333333333, 500, 1500, "20 Get Stock Transactions Request"], "isController": false}, {"data": [0.0192, 500, 1500, "17 Add Money Request"], "isController": false}, {"data": [0.029433333333333332, 500, 1500, "18 Get Wallet Balance Request"], "isController": false}, {"data": [0.08933333333333333, 500, 1500, "22 Get Wallet Balance Request"], "isController": false}, {"data": [0.08153333333333333, 500, 1500, "15 Login Request"], "isController": false}, {"data": [0.05073333333333333, 500, 1500, "21 Get Wallet Transactions Request"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 150000, 13149, 8.766, 13760.699280000219, 2, 80480, 3339.0, 6949.9000000000015, 9289.0, 16506.980000000003, 697.3306183927924, 300.03209627608015, 272.0676448471916], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["23 Get Stock Portfolio Request", 15000, 1502, 10.013333333333334, 8075.642199999948, 2, 75770, 4140.0, 23492.499999999993, 29112.0, 52875.019999999975, 75.98591727666472, 26.320700542666092, 30.49825390694258], "isController": false}, {"data": ["16 Get Stock Prices Request", 15000, 1446, 9.64, 19453.5802666667, 42, 79807, 15384.5, 51439.0, 56380.95, 69467.29999999999, 95.55357370365651, 40.11906373423366, 38.072127022550646], "isController": false}, {"data": ["14 Register Request", 15000, 0, 0.0, 8850.422866666673, 5, 29062, 8185.5, 17169.699999999997, 19563.949999999997, 23420.98, 174.4023811738443, 44.79279907101665, 47.35179067644871], "isController": false}, {"data": ["19 Place Stock Order Request", 15000, 0, 0.0, 10530.48906666668, 6, 37880, 6465.5, 27407.699999999997, 30253.949999999997, 33479.94, 77.226438213701, 62.44481527435979, 41.026545301028655], "isController": false}, {"data": ["20 Get Stock Transactions Request", 15000, 2415, 16.1, 15411.966666666753, 13, 78689, 11545.0, 30848.1, 42865.249999999985, 61909.63999999999, 73.36147153330366, 55.125147028615864, 29.659813686316127], "isController": false}, {"data": ["17 Add Money Request", 15000, 1505, 10.033333333333333, 21852.708533333243, 7, 79739, 17559.0, 51047.9, 55944.499999999985, 69085.51999999999, 86.76889971250571, 22.395442797964403, 37.876658370595756], "isController": false}, {"data": ["18 Get Wallet Balance Request", 15000, 2019, 13.46, 21947.42906666673, 6, 80480, 19599.5, 41780.399999999994, 54304.95, 68239.95999999999, 77.23478860838358, 21.115076053739966, 30.924085282653582], "isController": false}, {"data": ["22 Get Wallet Balance Request", 15000, 1570, 10.466666666666667, 10518.142333333359, 2, 77552, 5756.5, 27704.9, 31594.749999999993, 54956.829999999994, 74.60125628515584, 20.602496841880154, 29.869643629798727], "isController": false}, {"data": ["15 Login Request", 15000, 0, 0.0, 7281.318199999999, 10, 25978, 6438.5, 14585.9, 16340.949999999999, 20411.93, 162.12886001794226, 79.95612725494222, 40.875978852992354], "isController": false}, {"data": ["21 Get Wallet Transactions Request", 15000, 2692, 17.946666666666665, 13685.293599999959, 2, 78358, 8711.5, 30360.699999999997, 35576.799999999974, 61955.81, 74.00609810248363, 30.983308232931726, 29.992705773955773], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["504/Gateway Time-out", 4431, 33.69838010495095, 2.954], "isController": false}, {"data": ["502/Bad Gateway", 288, 2.190280629705681, 0.192], "isController": false}, {"data": ["Assertion failed", 8430, 64.11133926534337, 5.62], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 150000, 13149, "Assertion failed", 8430, "504/Gateway Time-out", 4431, "502/Bad Gateway", 288, "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["23 Get Stock Portfolio Request", 15000, 1502, "Assertion failed", 1386, "504/Gateway Time-out", 116, "", "", "", "", "", ""], "isController": false}, {"data": ["16 Get Stock Prices Request", 15000, 1446, "504/Gateway Time-out", 1446, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["20 Get Stock Transactions Request", 15000, 2415, "Assertion failed", 1993, "504/Gateway Time-out", 422, "", "", "", "", "", ""], "isController": false}, {"data": ["17 Add Money Request", 15000, 1505, "504/Gateway Time-out", 1217, "502/Bad Gateway", 288, "", "", "", "", "", ""], "isController": false}, {"data": ["18 Get Wallet Balance Request", 15000, 2019, "Assertion failed", 1232, "504/Gateway Time-out", 787, "", "", "", "", "", ""], "isController": false}, {"data": ["22 Get Wallet Balance Request", 15000, 1570, "Assertion failed", 1407, "504/Gateway Time-out", 163, "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["21 Get Wallet Transactions Request", 15000, 2692, "Assertion failed", 2412, "504/Gateway Time-out", 280, "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
