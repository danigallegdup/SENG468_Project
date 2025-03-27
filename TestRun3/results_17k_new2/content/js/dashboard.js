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

    var data = {"OkPercent": 49.6435294117647, "KoPercent": 50.3564705882353};
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
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.01673235294117647, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [6.470588235294118E-4, 500, 1500, "23 Get Stock Portfolio Request"], "isController": false}, {"data": [0.017411764705882352, 500, 1500, "16 Get Stock Prices Request"], "isController": false}, {"data": [0.05544117647058824, 500, 1500, "14 Register Request"], "isController": false}, {"data": [0.025264705882352943, 500, 1500, "19 Place Stock Order Request"], "isController": false}, {"data": [0.0042352941176470585, 500, 1500, "20 Get Stock Transactions Request"], "isController": false}, {"data": [0.013970588235294118, 500, 1500, "17 Add Money Request"], "isController": false}, {"data": [0.009088235294117647, 500, 1500, "18 Get Wallet Balance Request"], "isController": false}, {"data": [0.0010588235294117646, 500, 1500, "22 Get Wallet Balance Request"], "isController": false}, {"data": [0.03888235294117647, 500, 1500, "15 Login Request"], "isController": false}, {"data": [0.0013235294117647058, 500, 1500, "21 Get Wallet Transactions Request"], "isController": false}]}, function(index, item){
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
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 170000, 85606, 50.3564705882353, 32444.957505881936, 0, 310299, 0.0, 3.0, 11.0, 272.0, 303.8628113029816, 414.3532852597044, 55.542981687908764], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["23 Get Stock Portfolio Request", 17000, 16130, 94.88235294117646, 8068.488117647115, 0, 306428, 1.0, 168.39999999999782, 60409.84999999978, 292019.44000000006, 31.879981247069853, 74.29579817158931, 0.678165655766526], "isController": false}, {"data": ["16 Get Stock Prices Request", 17000, 961, 5.652941176470589, 44747.41682352949, 0, 305935, 24884.0, 103833.19999999998, 124274.0, 296059.0, 31.70571131763341, 15.179774078739268, 12.292763981519299], "isController": false}, {"data": ["14 Register Request", 17000, 14, 0.08235294117647059, 14458.87923529407, 7, 177532, 13356.0, 27609.9, 31166.749999999993, 41796.52000000008, 78.86179238937315, 20.25022962698372, 21.410550794532558], "isController": false}, {"data": ["19 Place Stock Order Request", 17000, 11395, 67.02941176470588, 36323.11076470603, 0, 308735, 241.0, 120969.7, 235413.69999999908, 299708.98, 31.01561545015517, 54.870105148637776, 5.451963653347589], "isController": false}, {"data": ["20 Get Stock Transactions Request", 17000, 14195, 83.5, 27152.941941176534, 0, 302138, 4.0, 107944.09999999999, 222669.4, 296367.82, 31.055560224038466, 65.16609344229877, 2.2866083400620383], "isController": false}, {"data": ["17 Add Money Request", 17000, 3831, 22.53529411764706, 71143.50764705885, 0, 310299, 43370.0, 148382.09999999998, 293358.5999999999, 300363.84, 31.01742631992833, 19.57442815326349, 10.764167679864583], "isController": false}, {"data": ["18 Get Wallet Balance Request", 17000, 8672, 51.01176470588236, 83388.85682352936, 0, 306580, 34932.5, 294153.8, 297228.9, 300791.95, 31.023879262361646, 36.7722968449171, 6.363548681257014], "isController": false}, {"data": ["22 Get Wallet Balance Request", 17000, 15525, 91.32352941176471, 12291.190941176537, 0, 306647, 1.0, 22744.399999999998, 97806.14999999998, 293785.62000000005, 31.48136488383376, 70.5514567249288, 1.1440749004170356], "isController": false}, {"data": ["15 Login Request", 17000, 14, 0.08235294117647059, 14059.194235294124, 24, 297849, 10075.0, 23798.8, 33226.14999999985, 93076.02000000063, 32.59289934929235, 16.07954812341589, 8.215221144619488], "isController": false}, {"data": ["21 Get Wallet Transactions Request", 17000, 14869, 87.46470588235294, 12815.988529411736, 0, 303202, 2.0, 31815.299999999996, 101688.49999999994, 233311.0400000011, 31.18344855923296, 67.10390442571094, 1.7915973159763814], "isController": false}]}, function(index, item){
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
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["400/Bad Request", 10, 0.011681424199238372, 0.0058823529411764705], "isController": false}, {"data": ["504/Gateway Time-out", 1294, 1.5115762913814452, 0.7611764705882353], "isController": false}, {"data": ["Non HTTP response code: java.io.InterruptedIOException/Non HTTP response message: Connection has been shut down", 1, 0.001168142419923837, 5.88235294117647E-4], "isController": false}, {"data": ["Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:4000 [localhost/127.0.0.1] failed: Connection refused", 59311, 69.2836950681027, 34.888823529411766], "isController": false}, {"data": ["Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: localhost:4000 failed to respond", 24165, 28.228161577459524, 14.214705882352941], "isController": false}, {"data": ["Non HTTP response code: java.net.SocketException/Non HTTP response message: Socket closed", 11, 0.012849566619162209, 0.006470588235294118], "isController": false}, {"data": ["408/Request Time-out", 126, 0.1471859449104035, 0.07411764705882352], "isController": false}, {"data": ["Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: The target server failed to respond", 169, 0.19741606896712846, 0.09941176470588235], "isController": false}, {"data": ["Assertion failed", 519, 0.6062659159404714, 0.3052941176470588], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 170000, 85606, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:4000 [localhost/127.0.0.1] failed: Connection refused", 59311, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: localhost:4000 failed to respond", 24165, "504/Gateway Time-out", 1294, "Assertion failed", 519, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: The target server failed to respond", 169], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["23 Get Stock Portfolio Request", 17000, 16130, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:4000 [localhost/127.0.0.1] failed: Connection refused", 14282, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: localhost:4000 failed to respond", 1810, "504/Gateway Time-out", 31, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: The target server failed to respond", 7, "", ""], "isController": false}, {"data": ["16 Get Stock Prices Request", 17000, 961, "504/Gateway Time-out", 498, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: localhost:4000 failed to respond", 439, "400/Bad Request", 10, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: The target server failed to respond", 10, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:4000 [localhost/127.0.0.1] failed: Connection refused", 3], "isController": false}, {"data": ["14 Register Request", 17000, 14, "504/Gateway Time-out", 14, "", "", "", "", "", "", "", ""], "isController": false}, {"data": ["19 Place Stock Order Request", 17000, 11395, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: localhost:4000 failed to respond", 5963, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:4000 [localhost/127.0.0.1] failed: Connection refused", 5393, "408/Request Time-out", 19, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: The target server failed to respond", 17, "Non HTTP response code: java.net.SocketException/Non HTTP response message: Socket closed", 2], "isController": false}, {"data": ["20 Get Stock Transactions Request", 17000, 14195, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:4000 [localhost/127.0.0.1] failed: Connection refused", 10846, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: localhost:4000 failed to respond", 3058, "Assertion failed", 179, "504/Gateway Time-out", 112, "", ""], "isController": false}, {"data": ["17 Add Money Request", 17000, 3831, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: localhost:4000 failed to respond", 3110, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:4000 [localhost/127.0.0.1] failed: Connection refused", 306, "504/Gateway Time-out", 296, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: The target server failed to respond", 60, "408/Request Time-out", 50], "isController": false}, {"data": ["18 Get Wallet Balance Request", 17000, 8672, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: localhost:4000 failed to respond", 6126, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:4000 [localhost/127.0.0.1] failed: Connection refused", 2108, "504/Gateway Time-out", 206, "Assertion failed", 124, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: The target server failed to respond", 56], "isController": false}, {"data": ["22 Get Wallet Balance Request", 17000, 15525, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:4000 [localhost/127.0.0.1] failed: Connection refused", 13583, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: localhost:4000 failed to respond", 1859, "504/Gateway Time-out", 66, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: The target server failed to respond", 15, "408/Request Time-out", 2], "isController": false}, {"data": ["15 Login Request", 17000, 14, "504/Gateway Time-out", 10, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: localhost:4000 failed to respond", 4, "", "", "", "", "", ""], "isController": false}, {"data": ["21 Get Wallet Transactions Request", 17000, 14869, "Non HTTP response code: org.apache.http.conn.HttpHostConnectException/Non HTTP response message: Connect to localhost:4000 [localhost/127.0.0.1] failed: Connection refused", 12790, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: localhost:4000 failed to respond", 1796, "Assertion failed", 216, "504/Gateway Time-out", 60, "Non HTTP response code: org.apache.http.NoHttpResponseException/Non HTTP response message: The target server failed to respond", 4], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
