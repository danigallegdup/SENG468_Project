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

    var data = {"OkPercent": 58.0, "KoPercent": 42.0};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.5454, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.4775, 500, 1500, "23 Get Stock Portfolio Request"], "isController": false}, {"data": [0.459, 500, 1500, "16 Get Stock Prices Request"], "isController": false}, {"data": [0.9985, 500, 1500, "14 Register Request"], "isController": false}, {"data": [0.006, 500, 1500, "19 Place Stock Order Request"], "isController": false}, {"data": [0.0745, 500, 1500, "20 Get Stock Transactions Request"], "isController": false}, {"data": [0.935, 500, 1500, "17 Add Money Request"], "isController": false}, {"data": [0.948, 500, 1500, "18 Get Wallet Balance Request"], "isController": false}, {"data": [0.4795, 500, 1500, "22 Get Wallet Balance Request"], "isController": false}, {"data": [0.9995, 500, 1500, "15 Login Request"], "isController": false}, {"data": [0.0765, 500, 1500, "21 Get Wallet Transactions Request"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 10000, 4200, 42.0, 5481.5405999999975, 2, 60068, 22.0, 1343.2999999999975, 60004.0, 60014.0, 125.4673659381195, 51.476772951902085, 48.77077024023864], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["23 Get Stock Portfolio Request", 1000, 520, 52.0, 23.060000000000002, 2, 938, 8.0, 26.0, 49.0, 522.8100000000002, 13.472549680026944, 4.633820309868643, 5.393243200572583], "isController": false}, {"data": ["16 Get Stock Prices Request", 1000, 500, 50.0, 242.19299999999998, 3, 1444, 131.0, 624.8, 797.7999999999997, 1331.6300000000003, 66.77350427350427, 31.234871627938034, 26.53470813718616], "isController": false}, {"data": ["14 Register Request", 1000, 0, 0.0, 37.65500000000002, 4, 576, 24.0, 77.0, 109.89999999999986, 272.83000000000015, 66.28662335940608, 18.578379789208537, 18.23730145084847], "isController": false}, {"data": ["19 Place Stock Order Request", 1000, 814, 81.4, 54041.804000000026, 495, 60068, 60004.0, 60014.0, 60021.0, 60051.0, 13.344186605105486, 4.995625608828514, 6.99684962519516], "isController": false}, {"data": ["20 Get Stock Transactions Request", 1000, 923, 92.3, 22.867000000000015, 3, 820, 10.0, 27.0, 44.94999999999993, 417.95000000000005, 13.43435971841582, 11.313042832097372, 5.417313720007791], "isController": false}, {"data": ["17 Add Money Request", 1000, 0, 0.0, 199.41300000000018, 4, 1408, 90.0, 538.9, 733.5999999999995, 1118.5900000000004, 66.86279753944906, 19.196936012302757, 29.116724161707676], "isController": false}, {"data": ["18 Get Wallet Balance Request", 1000, 0, 0.0, 177.96699999999998, 3, 1378, 68.5, 517.9, 675.8499999999998, 1230.8500000000001, 66.9254450542096, 20.195275900147237, 26.72580070020747], "isController": false}, {"data": ["22 Get Wallet Balance Request", 1000, 520, 52.0, 17.191000000000038, 2, 621, 8.0, 23.0, 39.94999999999993, 317.94000000000005, 13.472912708998559, 4.059241239238511, 5.3802313846449215], "isController": false}, {"data": ["15 Login Request", 1000, 0, 0.0, 36.01600000000003, 3, 621, 25.0, 71.0, 94.0, 187.98000000000002, 66.8002672010688, 34.423599803774216, 16.590472611890448], "isController": false}, {"data": ["21 Get Wallet Transactions Request", 1000, 923, 92.3, 17.240000000000002, 2, 751, 8.0, 21.0, 39.94999999999993, 275.74000000000024, 13.455328310010765, 5.2323356768030145, 5.438909130281217], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["504/Gateway Time-out", 814, 19.38095238095238, 8.14], "isController": false}, {"data": ["Assertion failed", 3386, 80.61904761904762, 33.86], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 10000, 4200, "Assertion failed", 3386, "504/Gateway Time-out", 814, "", "", "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["23 Get Stock Portfolio Request", 1000, 520, "Assertion failed", 520, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["16 Get Stock Prices Request", 1000, 500, "Assertion failed", 500, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["19 Place Stock Order Request", 1000, 814, "504/Gateway Time-out", 814, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["20 Get Stock Transactions Request", 1000, 923, "Assertion failed", 923, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["22 Get Wallet Balance Request", 1000, 520, "Assertion failed", 520, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["21 Get Wallet Transactions Request", 1000, 923, "Assertion failed", 923, "", "", "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
