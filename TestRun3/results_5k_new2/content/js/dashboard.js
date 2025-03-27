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

    var data = {"OkPercent": 99.362, "KoPercent": 0.638};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.59768, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.574, 500, 1500, "23 Get Stock Portfolio Request"], "isController": false}, {"data": [0.3842, 500, 1500, "16 Get Stock Prices Request"], "isController": false}, {"data": [0.9009, 500, 1500, "14 Register Request"], "isController": false}, {"data": [0.9026, 500, 1500, "19 Place Stock Order Request"], "isController": false}, {"data": [0.4573, 500, 1500, "20 Get Stock Transactions Request"], "isController": false}, {"data": [0.3979, 500, 1500, "17 Add Money Request"], "isController": false}, {"data": [0.4262, 500, 1500, "18 Get Wallet Balance Request"], "isController": false}, {"data": [0.5344, 500, 1500, "22 Get Wallet Balance Request"], "isController": false}, {"data": [0.9147, 500, 1500, "15 Login Request"], "isController": false}, {"data": [0.4846, 500, 1500, "21 Get Wallet Transactions Request"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 50000, 319, 0.638, 1358.0551799999948, 2, 32484, 454.0, 3411.0, 8992.850000000002, 13430.590000000066, 674.5908606430199, 299.196580730818, 263.2099383676925], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["23 Get Stock Portfolio Request", 5000, 0, 0.0, 1482.2656, 2, 30248, 558.0, 3631.0, 5102.299999999994, 10968.779999999995, 78.05548183648938, 27.593832446102688, 31.328909213669075], "isController": false}, {"data": ["16 Get Stock Prices Request", 5000, 0, 0.0, 2114.5057999999967, 5, 30889, 1463.5, 4304.900000000001, 7108.699999999944, 11551.61999999997, 77.09862456053784, 34.257689624067105, 30.718983223339293], "isController": false}, {"data": ["14 Register Request", 5000, 0, 0.0, 287.7256000000002, 4, 3052, 149.0, 750.0, 1054.8999999999996, 1574.9899999999998, 110.20255229111106, 28.30397583258028, 29.93243378204139], "isController": false}, {"data": ["19 Place Stock Order Request", 5000, 0, 0.0, 290.26939999999956, 3, 2622, 154.5, 782.9000000000005, 1062.0, 1427.9199999999983, 77.12240868706812, 62.36069764930899, 40.97127961500494], "isController": false}, {"data": ["20 Get Stock Transactions Request", 5000, 158, 3.16, 1785.2675999999942, 3, 30288, 1118.5, 3848.0, 6035.0, 11239.879999999997, 77.15930309717442, 63.57227319022854, 31.19526511936544], "isController": false}, {"data": ["17 Add Money Request", 5000, 0, 0.0, 2062.231399999999, 4, 32484, 1418.0, 4185.400000000003, 6478.399999999994, 10837.829999999996, 77.11527190844875, 20.33312833523551, 33.662623577223236], "isController": false}, {"data": ["18 Get Wallet Balance Request", 5000, 0, 0.0, 1955.0983999999946, 2, 30906, 1304.5, 4054.9000000000005, 6248.249999999997, 10778.55999999999, 77.12240868706812, 21.464732886537515, 30.879089415720635], "isController": false}, {"data": ["22 Get Wallet Balance Request", 5000, 3, 0.06, 1628.787000000002, 2, 21685, 808.0, 3714.800000000001, 6033.449999999998, 11646.98, 77.52298556522008, 21.500560951478363, 31.03947664232445], "isController": false}, {"data": ["15 Login Request", 5000, 0, 0.0, 272.9520000000004, 3, 2507, 155.0, 694.9000000000005, 961.8999999999996, 1359.9299999999985, 110.48258794414001, 54.48604190604561, 27.866902316819868], "isController": false}, {"data": ["21 Get Wallet Transactions Request", 5000, 158, 3.16, 1701.4490000000005, 2, 29991, 1014.0, 3723.0, 5422.249999999994, 11299.939999999911, 77.17478545409644, 33.6126337053158, 31.276890589306664], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["Assertion failed", 319, 100.0, 0.638], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 50000, 319, "Assertion failed", 319, "", "", "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["20 Get Stock Transactions Request", 5000, 158, "Assertion failed", 158, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["22 Get Wallet Balance Request", 5000, 3, "Assertion failed", 3, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["21 Get Wallet Transactions Request", 5000, 158, "Assertion failed", 158, "", "", "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
