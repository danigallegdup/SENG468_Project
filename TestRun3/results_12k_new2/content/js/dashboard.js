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

    var data = {"OkPercent": 92.96083333333333, "KoPercent": 7.039166666666667};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.09199166666666667, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.13370833333333335, 500, 1500, "23 Get Stock Portfolio Request"], "isController": false}, {"data": [0.029583333333333333, 500, 1500, "16 Get Stock Prices Request"], "isController": false}, {"data": [0.08570833333333333, 500, 1500, "14 Register Request"], "isController": false}, {"data": [0.4141666666666667, 500, 1500, "19 Place Stock Order Request"], "isController": false}, {"data": [0.018, 500, 1500, "20 Get Stock Transactions Request"], "isController": false}, {"data": [0.017166666666666667, 500, 1500, "17 Add Money Request"], "isController": false}, {"data": [0.012208333333333333, 500, 1500, "18 Get Wallet Balance Request"], "isController": false}, {"data": [0.07058333333333333, 500, 1500, "22 Get Wallet Balance Request"], "isController": false}, {"data": [0.10595833333333333, 500, 1500, "15 Login Request"], "isController": false}, {"data": [0.03283333333333333, 500, 1500, "21 Get Wallet Transactions Request"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 120000, 8447, 7.039166666666667, 10080.869058333381, 2, 62059, 4015.5, 12522.800000000003, 23193.95, 48465.61000000022, 699.765578531192, 301.5080996043409, 273.01617711321916], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["23 Get Stock Portfolio Request", 12000, 803, 6.691666666666666, 7351.400083333347, 2, 56358, 5791.5, 14658.699999999999, 18856.299999999985, 43845.93, 78.7773751378604, 27.45687066929586, 31.618653497715457], "isController": false}, {"data": ["16 Get Stock Prices Request", 12000, 727, 6.058333333333334, 14697.376750000032, 62, 58088, 11263.0, 36224.89999999996, 50995.95, 54910.979999999996, 102.0416840279254, 43.77113246073521, 40.65723347987653], "isController": false}, {"data": ["14 Register Request", 12000, 0, 0.0, 8648.914083333379, 6, 35617, 8413.0, 15813.8, 18033.749999999993, 22920.719999999994, 183.82916143264194, 47.21393501639143, 49.908270923971315], "isController": false}, {"data": ["19 Place Stock Order Request", 12000, 0, 0.0, 2357.902083333334, 4, 17879, 1367.0, 5883.799999999999, 8166.599999999991, 12010.98, 74.49390701918838, 60.23530762879687, 39.574888103943834], "isController": false}, {"data": ["20 Get Stock Transactions Request", 12000, 2261, 18.841666666666665, 12394.934166666679, 4, 60290, 10823.0, 19670.999999999996, 27724.599999999926, 51718.0, 74.53601331710105, 55.00329540407836, 30.134677259062336], "isController": false}, {"data": ["17 Add Money Request", 12000, 570, 4.75, 14213.406249999975, 47, 61998, 11098.5, 28495.199999999997, 49864.14999999989, 54757.0, 74.13585395236771, 19.30910789855744, 32.36203780928551], "isController": false}, {"data": ["18 Get Wallet Balance Request", 12000, 749, 6.241666666666666, 13432.695750000055, 2, 61868, 11079.0, 21613.5, 39573.69999999997, 52989.70999999999, 74.30616617335627, 20.493783341021956, 29.75149231550398], "isController": false}, {"data": ["22 Get Wallet Balance Request", 12000, 901, 7.508333333333334, 9236.89916666665, 2, 56714, 7842.0, 16849.9, 20982.09999999998, 49972.92, 76.82704311917796, 21.23806955048177, 30.76082781138961], "isController": false}, {"data": ["15 Login Request", 12000, 0, 0.0, 7190.291999999971, 9, 31421, 7087.5, 13364.0, 15367.0, 19232.989999999998, 184.58414729814953, 91.03026795465384, 46.53649057947886], "isController": false}, {"data": ["21 Get Wallet Transactions Request", 12000, 2436, 20.3, 11284.870249999949, 2, 62059, 9934.0, 19201.699999999997, 24347.85, 51121.96, 75.6625199402266, 31.92781007446453, 30.664009546087936], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["502/Bad Gateway", 34, 0.4025097667811057, 0.028333333333333332], "isController": false}, {"data": ["504/Gateway Time-out", 2185, 25.867171776962234, 1.8208333333333333], "isController": false}, {"data": ["Assertion failed", 6228, 73.73031845625665, 5.19], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 120000, 8447, "Assertion failed", 6228, "504/Gateway Time-out", 2185, "502/Bad Gateway", 34, "", "", "", ""], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["23 Get Stock Portfolio Request", 12000, 803, "Assertion failed", 715, "504/Gateway Time-out", 88, "", "", "", "", "", ""], "isController": false}, {"data": ["16 Get Stock Prices Request", 12000, 727, "504/Gateway Time-out", 727, "", "", "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": [], "isController": false}, {"data": ["20 Get Stock Transactions Request", 12000, 2261, "Assertion failed", 2048, "504/Gateway Time-out", 213, "", "", "", "", "", ""], "isController": false}, {"data": ["17 Add Money Request", 12000, 570, "504/Gateway Time-out", 536, "502/Bad Gateway", 34, "", "", "", "", "", ""], "isController": false}, {"data": ["18 Get Wallet Balance Request", 12000, 749, "Assertion failed", 424, "504/Gateway Time-out", 325, "", "", "", "", "", ""], "isController": false}, {"data": ["22 Get Wallet Balance Request", 12000, 901, "Assertion failed", 786, "504/Gateway Time-out", 115, "", "", "", "", "", ""], "isController": false}, {"data": [], "isController": false}, {"data": ["21 Get Wallet Transactions Request", 12000, 2436, "Assertion failed", 2255, "504/Gateway Time-out", 181, "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
