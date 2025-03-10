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

    var data = {"OkPercent": 44.48, "KoPercent": 55.52};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.3594, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.0, 500, 1500, "23 Get Stock Portfolio Request"], "isController": false}, {"data": [0.0, 500, 1500, "16 Get Stock Prices Request"], "isController": false}, {"data": [0.9985, 500, 1500, "14 Register Request"], "isController": false}, {"data": [0.011, 500, 1500, "19 Place Stock Order Request"], "isController": false}, {"data": [0.0, 500, 1500, "20 Get Stock Transactions Request"], "isController": false}, {"data": [0.7815, 500, 1500, "17 Add Money Request"], "isController": false}, {"data": [0.804, 500, 1500, "18 Get Wallet Balance Request"], "isController": false}, {"data": [0.0, 500, 1500, "22 Get Wallet Balance Request"], "isController": false}, {"data": [0.999, 500, 1500, "15 Login Request"], "isController": false}, {"data": [0.0, 500, 1500, "21 Get Wallet Transactions Request"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 10000, 5552, 55.52, 2853.696600000001, 2, 60111, 48.5, 1316.8999999999996, 22168.59999999999, 60006.0, 124.49734198174869, 47.85182997475817, 48.26813011995319], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["23 Get Stock Portfolio Request", 1000, 1000, 100.0, 130.12299999999973, 2, 1774, 7.0, 504.0999999999998, 771.8499999999998, 1510.92, 13.261368307982018, 4.157128151232644, 5.30870445134404], "isController": false}, {"data": ["16 Get Stock Prices Request", 1000, 1000, 100.0, 439.78400000000016, 3, 1763, 303.5, 1247.9999999999998, 1443.7499999999995, 1601.96, 65.74621959237344, 18.74794543063774, 26.12648185815253], "isController": false}, {"data": ["14 Register Request", 1000, 0, 0.0, 48.992000000000004, 4, 607, 30.0, 104.89999999999998, 142.94999999999993, 312.6800000000003, 67.29927989770509, 18.862200518204457, 18.515911547715188], "isController": false}, {"data": ["19 Place Stock Order Request", 1000, 552, 55.2, 26478.57699999998, 6, 60111, 22165.0, 60006.0, 60011.0, 60034.94, 13.233289663477443, 7.486501010692499, 6.805219209443276], "isController": false}, {"data": ["20 Get Stock Transactions Request", 1000, 1000, 100.0, 148.31200000000007, 3, 1796, 9.0, 522.0, 779.8499999999998, 1541.8100000000002, 13.239246422093656, 8.86732144393841, 5.338635617048178], "isController": false}, {"data": ["17 Add Money Request", 1000, 0, 0.0, 486.05599999999964, 3, 1809, 374.0, 1270.9, 1472.85, 1668.98, 64.30041152263374, 18.461250964506174, 28.000882623617542], "isController": false}, {"data": ["18 Get Wallet Balance Request", 1000, 0, 0.0, 453.4559999999996, 3, 1804, 345.0, 1190.3999999999999, 1445.8999999999999, 1654.6600000000003, 63.552589768033044, 19.177490467111536, 25.37889507864633], "isController": false}, {"data": ["22 Get Wallet Balance Request", 1000, 1000, 100.0, 153.9670000000001, 2, 1762, 8.0, 561.2999999999998, 884.1999999999989, 1531.95, 13.247840601981876, 3.9976394004027345, 5.290351783987336], "isController": false}, {"data": ["15 Login Request", 1000, 0, 0.0, 51.14699999999997, 3, 578, 34.0, 113.0, 156.0, 283.94000000000005, 67.88405403570701, 34.98209823246894, 16.859641232774422], "isController": false}, {"data": ["21 Get Wallet Transactions Request", 1000, 1000, 100.0, 146.5519999999998, 2, 1830, 8.0, 520.9, 849.9499999999986, 1544.95, 13.244331426149609, 4.281126662163594, 5.35362002758132], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["400/Bad Request", 333, 5.997838616714698, 3.33], "isController": false}, {"data": ["504/Gateway Time-out", 219, 3.9445244956772334, 2.19], "isController": false}, {"data": ["Assertion failed", 5000, 90.05763688760807, 50.0], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 10000, 5552, "Assertion failed", 5000, "400/Bad Request", 333, "504/Gateway Time-out", 219, "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["23 Get Stock Portfolio Request", 1000, 1000, "Assertion failed", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["16 Get Stock Prices Request", 1000, 1000, "Assertion failed", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["19 Place Stock Order Request", 1000, 552, "400/Bad Request", 333, "504/Gateway Time-out", 219, "", "", "", "", "", ""], "isController": false}, {"data": ["20 Get Stock Transactions Request", 1000, 1000, "Assertion failed", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["22 Get Wallet Balance Request", 1000, 1000, "Assertion failed", 1000, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["21 Get Wallet Transactions Request", 1000, 1000, "Assertion failed", 1000, "", "", "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
