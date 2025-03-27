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

    var data = {"OkPercent": 92.361, "KoPercent": 7.639};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.127275, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.1789, 500, 1500, "23 Get Stock Portfolio Request"], "isController": false}, {"data": [0.0501, 500, 1500, "16 Get Stock Prices Request"], "isController": false}, {"data": [0.1551, 500, 1500, "14 Register Request"], "isController": false}, {"data": [0.4489, 500, 1500, "19 Place Stock Order Request"], "isController": false}, {"data": [0.02775, 500, 1500, "20 Get Stock Transactions Request"], "isController": false}, {"data": [0.0347, 500, 1500, "17 Add Money Request"], "isController": false}, {"data": [0.02275, 500, 1500, "18 Get Wallet Balance Request"], "isController": false}, {"data": [0.11155, 500, 1500, "22 Get Wallet Balance Request"], "isController": false}, {"data": [0.18455, 500, 1500, "15 Login Request"], "isController": false}, {"data": [0.05845, 500, 1500, "21 Get Wallet Transactions Request"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 100000, 7639, 7.639, 7455.599509999996, 2, 55640, 5026.0, 11900.0, 20052.100000000057, 40569.00000000016, 678.2880010852608, 291.4528823000746, 264.63998539561146], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["23 Get Stock Portfolio Request", 10000, 1125, 11.25, 6073.070300000003, 2, 55488, 5523.0, 11589.599999999999, 14616.699999999993, 35802.56999999971, 74.60069975456369, 25.819717442855865, 29.94227304602117], "isController": false}, {"data": ["16 Get Stock Prices Request", 10000, 251, 2.51, 11981.562399999995, 8, 54392, 10419.5, 18929.0, 37351.29999999983, 51167.81999999999, 93.10206779692577, 40.77525073550633, 37.09535513783761], "isController": false}, {"data": ["14 Register Request", 10000, 0, 0.0, 4551.043599999999, 4, 17079, 4163.0, 9086.699999999999, 10489.949999999999, 12824.99, 174.8618591312863, 44.91080952297685, 47.4780343450549], "isController": false}, {"data": ["19 Place Stock Order Request", 10000, 0, 0.0, 1851.1120000000028, 3, 11823, 1244.0, 4449.9, 5837.849999999997, 7640.879999999997, 72.65593780651723, 58.74913721073855, 38.59846695971228], "isController": false}, {"data": ["20 Get Stock Transactions Request", 10000, 2196, 21.96, 9511.578500000012, 3, 55640, 8391.0, 14635.0, 19172.649999999994, 40595.92, 72.70982236990395, 52.53739102615373, 29.396353965957264], "isController": false}, {"data": ["17 Add Money Request", 10000, 230, 2.3, 10635.920699999975, 26, 55186, 8689.0, 17864.5, 28545.649999999972, 50644.95, 72.89373551237007, 19.12225492442742, 31.819823998075602], "isController": false}, {"data": ["18 Get Wallet Balance Request", 10000, 259, 2.59, 9868.653599999956, 4, 54392, 8412.0, 16104.499999999995, 21515.849999999977, 46854.73999999999, 72.50737762567341, 20.119352808210735, 29.031274244654394], "isController": false}, {"data": ["22 Get Wallet Balance Request", 10000, 1326, 13.26, 7451.308400000005, 2, 54668, 6748.5, 13139.8, 16536.799999999996, 36464.99999999998, 74.0280121998164, 20.511701862359715, 29.640122072192117], "isController": false}, {"data": ["15 Login Request", 10000, 0, 0.0, 3817.146900000001, 6, 15029, 3388.5, 7849.499999999998, 9013.799999999996, 10983.939999999999, 174.8037827538588, 86.20694364326044, 44.07506675319454], "isController": false}, {"data": ["21 Get Wallet Transactions Request", 10000, 2252, 22.52, 8814.598700000013, 2, 54760, 7780.0, 14491.199999999997, 18701.399999999987, 39434.63999999999, 73.11063832898324, 30.324407895217835, 29.6297997134063], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["502/Bad Gateway", 37, 0.4843565911768556, 0.037], "isController": false}, {"data": ["504/Gateway Time-out", 717, 9.386045293886635, 0.717], "isController": false}, {"data": ["Assertion failed", 6885, 90.12959811493651, 6.885], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 100000, 7639, "Assertion failed", 6885, "504/Gateway Time-out", 717, "502/Bad Gateway", 37, "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["23 Get Stock Portfolio Request", 10000, 1125, "Assertion failed", 1098, "504/Gateway Time-out", 27, "", "", "", "", "", ""], "isController": false}, {"data": ["16 Get Stock Prices Request", 10000, 251, "504/Gateway Time-out", 251, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["20 Get Stock Transactions Request", 10000, 2196, "Assertion failed", 2132, "504/Gateway Time-out", 64, "", "", "", "", "", ""], "isController": false}, {"data": ["17 Add Money Request", 10000, 230, "504/Gateway Time-out", 193, "502/Bad Gateway", 37, "", "", "", "", "", ""], "isController": false}, {"data": ["18 Get Wallet Balance Request", 10000, 259, "Assertion failed", 171, "504/Gateway Time-out", 88, "", "", "", "", "", ""], "isController": false}, {"data": ["22 Get Wallet Balance Request", 10000, 1326, "Assertion failed", 1288, "504/Gateway Time-out", 38, "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["21 Get Wallet Transactions Request", 10000, 2252, "Assertion failed", 2196, "504/Gateway Time-out", 56, "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
