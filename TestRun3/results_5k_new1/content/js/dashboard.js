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

    var data = {"OkPercent": 74.144, "KoPercent": 25.856};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.45261, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.2722, 500, 1500, "23 Get Stock Portfolio Request"], "isController": false}, {"data": [0.1653, 500, 1500, "16 Get Stock Prices Request"], "isController": false}, {"data": [0.9261, 500, 1500, "14 Register Request"], "isController": false}, {"data": [0.937, 500, 1500, "19 Place Stock Order Request"], "isController": false}, {"data": [0.1699, 500, 1500, "20 Get Stock Transactions Request"], "isController": false}, {"data": [0.3321, 500, 1500, "17 Add Money Request"], "isController": false}, {"data": [0.3442, 500, 1500, "18 Get Wallet Balance Request"], "isController": false}, {"data": [0.2374, 500, 1500, "22 Get Wallet Balance Request"], "isController": false}, {"data": [0.9359, 500, 1500, "15 Login Request"], "isController": false}, {"data": [0.206, 500, 1500, "21 Get Wallet Transactions Request"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 50000, 12928, 25.856, 1707.6247200000132, 2, 19929, 520.5, 6122.0, 8630.0, 9760.980000000003, 734.7862506796773, 297.69310986340327, 285.8357263637633], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["23 Get Stock Portfolio Request", 5000, 2504, 50.08, 1802.8028000000004, 2, 13182, 644.0, 5277.0000000000055, 6795.799999999999, 9387.929999999998, 86.33341966675299, 27.775754338254337, 34.65140183890184], "isController": false}, {"data": ["16 Get Stock Prices Request", 5000, 2500, 50.0, 2672.557800000007, 4, 14603, 2007.5, 6060.700000000002, 8098.449999999998, 9501.919999999998, 85.40584859251162, 37.948887802336706, 34.02889279857885], "isController": false}, {"data": ["14 Register Request", 5000, 0, 0.0, 237.1872000000001, 4, 2159, 125.0, 619.9000000000005, 858.8999999999996, 1354.9899999999998, 110.84508291212201, 28.46900078700009, 30.106953381329255], "isController": false}, {"data": ["19 Place Stock Order Request", 5000, 0, 0.0, 237.69899999999953, 3, 2000, 160.0, 550.0, 699.0, 1076.9599999999991, 85.01232678738417, 67.78570783388592, 44.16656040125818], "isController": false}, {"data": ["20 Get Stock Transactions Request", 5000, 2701, 54.02, 2338.7322, 3, 13993, 1572.5, 5765.800000000001, 7785.199999999997, 9495.0, 85.0267834367826, 46.911734227531674, 34.37606283479296], "isController": false}, {"data": ["17 Add Money Request", 5000, 0, 0.0, 2669.8902000000026, 4, 15382, 2053.5, 6087.500000000003, 8115.649999999999, 9602.0, 84.99498529586755, 22.410787138558824, 37.10230315161406], "isController": false}, {"data": ["18 Get Wallet Balance Request", 5000, 0, 0.0, 2612.948600000003, 3, 13695, 2044.0, 6006.100000000005, 8020.649999999999, 9615.96, 85.01666326600014, 23.66186428790043, 34.03987494048834], "isController": false}, {"data": ["22 Get Wallet Balance Request", 5000, 2522, 50.44, 2046.1188000000095, 2, 19929, 1037.0, 5513.800000000001, 7163.099999999997, 9399.99, 85.60471168333105, 23.784098764295987, 34.27532401383372], "isController": false}, {"data": ["15 Login Request", 5000, 0, 0.0, 224.88799999999966, 3, 1985, 129.5, 555.0, 738.0, 1242.8799999999974, 110.08123995508686, 54.28811150128795, 27.765670752515355], "isController": false}, {"data": ["21 Get Wallet Transactions Request", 5000, 2701, 54.02, 2233.422600000002, 2, 14348, 1347.0, 5736.500000000003, 7899.699999999999, 9597.649999999992, 85.14261387824607, 31.19977916134525, 34.50603980417199], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["Assertion failed", 12928, 100.0, 25.856], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 50000, 12928, "Assertion failed", 12928, "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["23 Get Stock Portfolio Request", 5000, 2504, "Assertion failed", 2504, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["16 Get Stock Prices Request", 5000, 2500, "Assertion failed", 2500, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["20 Get Stock Transactions Request", 5000, 2701, "Assertion failed", 2701, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["22 Get Wallet Balance Request", 5000, 2522, "Assertion failed", 2522, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["21 Get Wallet Transactions Request", 5000, 2701, "Assertion failed", 2701, "", "", "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
