/*
  eslint-disable no-plusplus, no-var, strict, vars-on-top, prefer-template,
  func-names, prefer-arrow-callback, no-loop-func
*/
/* global Chart, location, document, port, socketPath, parseInt, io */

'use strict';


Chart.defaults.font.size = 10;
Chart.defaults.animation.duration = 500;
Chart.defaults.elements.line.backgroundColor = 'rgba(0,0,0,0)';
Chart.defaults.elements.line.borderColor = 'rgba(0,0,0,0.9)';
Chart.defaults.elements.line.borderWidth = 2;

var socket = io(location.protocol + '//' + location.hostname + ':' + (port || location.port), {
    path: socketPath,
    transports: ["websocket"]
});
var defaultSpan = 0;
var spans = [];
var statusCodesColors = ['#75D701', '#47b8e0', '#ffc952', '#E53A40'];

var defaultDataset = {
    label: '',
    data: [],
    borderColor: 'rgb(75, 192, 192)',
    tension: 0.1,
    fill: false,
    pointRadius: 0,
};

var defaultOptions = {
    responsive: true,
    animation: false,
    interaction: {
      mode: 'nearest',
    },
    plugins: {
        legend: {
          display: true
        },
        tooltip: {
          enabled: true
        },
        zoom: {
            zoom: {
              wheel: {
                enabled: true,
              },
              pinch: {
                enabled: true
              },
              mode: 'xy',
            }
          }
    },
    scales: {
        x: {
          type: 'time',
          display: true,
          title: {
            display: true,
            text: 'Date'
          },
          ticks: {
            autoSkip: false,
            maxRotation: 0,
            major: {
              enabled: true
            },
            // color: function(context) {
            //   return context.tick && context.tick.major ? '#FF0000' : 'rgba(0,0,0,0.1)';
            // },
            font: function(context) {
              if (context.tick && context.tick.major) {
                return {
                  weight: 'bold',
                };
              }
            }
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'value'
          }
        }
      }
};

var createChart = function (ctx, dataset) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: dataset,
        },
        options: defaultOptions,
    });
};

var addTimestamp = function (point) {
    return point.timestamp;
};
var heightRatio = 1.5;

var cpuDataset = [Object.create(defaultDataset)];
var memDataset = [Object.create(defaultDataset)];
var loadDataset = [Object.create(defaultDataset)];
var heapDataset = [Object.create(defaultDataset)];
var eventLoopDataset = [Object.create(defaultDataset)];
var responseTimeDataset = [Object.create(defaultDataset)];
var rpsDataset = [Object.create(defaultDataset)];

var cpuStat = document.getElementById('cpuStat');
var memStat = document.getElementById('memStat');
var loadStat = document.getElementById('loadStat');
var heapStat = document.getElementById('heapStat');
var eventLoopStat = document.getElementById('eventLoopStat');
var responseTimeStat = document.getElementById('responseTimeStat');
var rpsStat = document.getElementById('rpsStat');

var cpuChartCtx = document.getElementById('cpuChart');
cpuChartCtx.height = cpuChartCtx.width * heightRatio;
var memChartCtx = document.getElementById('memChart');
memChartCtx.height = memChartCtx.width * heightRatio;
var loadChartCtx = document.getElementById('loadChart');
loadChartCtx.height = loadChartCtx.width * heightRatio;
var heapChartCtx = document.getElementById('heapChart');
heapChartCtx.height = heapChartCtx.width * heightRatio;
var eventLoopChartCtx = document.getElementById('eventLoopChart');
eventLoopChartCtx.height = eventLoopChartCtx.width * heightRatio;
var responseTimeChartCtx = document.getElementById('responseTimeChart');
responseTimeChartCtx.height = responseTimeChartCtx.width * heightRatio;
var rpsChartCtx = document.getElementById('rpsChart');
rpsChartCtx.height = rpsChartCtx.width * heightRatio;
var statusCodesChartCtx = document.getElementById('statusCodesChart');
statusCodesChartCtx.height = statusCodesChartCtx.width * heightRatio;

var cpuChart = createChart(cpuChartCtx, cpuDataset);
var memChart = createChart(memChartCtx, memDataset);
var heapChart = createChart(heapChartCtx, heapDataset);
var eventLoopChart = createChart(eventLoopChartCtx, eventLoopDataset);
var loadChart = createChart(loadChartCtx, loadDataset);
var responseTimeChart = createChart(responseTimeChartCtx, responseTimeDataset);
var rpsChart = createChart(rpsChartCtx, rpsDataset);
var statusCodesChart = new Chart(statusCodesChartCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            Object.create(defaultDataset),
            Object.create(defaultDataset),
            Object.create(defaultDataset),
            Object.create(defaultDataset),
        ],
    },
    options: defaultOptions,
});

statusCodesChart.data.datasets.forEach(function (dataset, index) {
    dataset.borderColor = statusCodesColors[index];
});

var charts = [
    cpuChart,
    memChart,
    loadChart,
    responseTimeChart,
    rpsChart,
    statusCodesChart,
    heapChart,
    eventLoopChart,
];

var onSpanChange = function (e) {
    e.target.classList.add('active');
    defaultSpan = parseInt(e.target.id, 10);

    var otherSpans = document.getElementsByTagName('button');

    for (var i = 0; i < otherSpans.length; i++) {
        if (otherSpans[i] !== e.target) otherSpans[i].classList.remove('active');
    }

    socket.emit('esm_change');
};


socket.on('esm_start', function (data) {

    document.getElementById("currenttime").textContent = new Date().toLocaleString();
    // Remove last element of Array because it contains malformed responses data.
    // To keep consistency we also remove os data.
    data[defaultSpan].responses.pop();
    data[defaultSpan].os.pop();

    var lastOsMetric = data[defaultSpan].os[data[defaultSpan].os.length - 1];

    cpuStat.textContent = '0.0%';
    if (lastOsMetric) {
        cpuStat.textContent = lastOsMetric.cpu.toFixed(1) + '%';
    }

    cpuChart.data.datasets[0].data = data[defaultSpan].os.map(function (point) {
        return point.cpu;
    });
    cpuChart.data.labels = data[defaultSpan].os.map(addTimestamp);
    cpuChart.data.datasets[0].label = "CPU Usage";

    memStat.textContent = '0.0MB';
    if (lastOsMetric) {
        memStat.textContent = lastOsMetric.memory.toFixed(1) + 'MB';
    }

    memChart.data.datasets[0].data = data[defaultSpan].os.map(function (point) {
        return point.memory;
    });
    memChart.data.labels = data[defaultSpan].os.map(addTimestamp);
    memChart.data.datasets[0].label = "Memory Usage";

    loadStat.textContent = '0.00';
    if (lastOsMetric) {
        loadStat.textContent = lastOsMetric.load[defaultSpan].toFixed(2);
    }

    loadChart.data.datasets[0].data = data[defaultSpan].os.map(function (point) {
        return point.load[0];
    });
    loadChart.data.labels = data[defaultSpan].os.map(addTimestamp);
    loadChart.data.datasets[0].label = "One Minute Load Avg";

    heapChart.data.datasets[0].data = data[defaultSpan].os.map(function (point) {
        return point.heap.used_heap_size / 1024 / 1024;
    });
    heapChart.data.labels = data[defaultSpan].os.map(addTimestamp);
    heapChart.data.datasets[0].label = "Heap Usage";

    eventLoopChart.data.datasets[0].data = data[defaultSpan].os.map(function (point) {
        if (point.loop) {
            return point.loop.sum;
        }
        return 0;
    });
    eventLoopChart.data.labels = data[defaultSpan].os.map(addTimestamp);
    eventLoopChart.data.datasets[0].label = "Spent in Event Loop";

    var lastResponseMetric = data[defaultSpan].responses[data[defaultSpan].responses.length - 1];

    responseTimeStat.textContent = '0.00ms';
    if (lastResponseMetric) {
        responseTimeStat.textContent = lastResponseMetric.mean.toFixed(2) + 'ms';
    }

    responseTimeChart.data.datasets[0].data = data[defaultSpan].responses.map(function (point) {
        return point.mean;
    });
    responseTimeChart.data.labels = data[defaultSpan].responses.map(addTimestamp);
    responseTimeChart.data.datasets[0].label = "Response Time"

    for (var i = 0; i < 4; i++) {
        statusCodesChart.data.datasets[i].data = data[defaultSpan].responses.map(function (point) {
            return point[i + 2];
        });
        statusCodesChart.data.datasets[i].label = (i + 2) + "xx";
    }
    statusCodesChart.data.labels = data[defaultSpan].responses.map(addTimestamp);

    if (data[defaultSpan].responses.length >= 2) {
        var deltaTime =
            lastResponseMetric.timestamp -
            data[defaultSpan].responses[data[defaultSpan].responses.length - 2].timestamp;

        if (deltaTime < 1) deltaTime = 1000;
        rpsStat.textContent = ((lastResponseMetric.count / deltaTime) * 1000).toFixed(2);
        rpsChart.data.datasets[0].data = data[defaultSpan].responses.map(function (point) {
            return (point.count / deltaTime) * 1000;
        });
        rpsChart.data.labels = data[defaultSpan].responses.map(addTimestamp);
        rpsChart.data.datasets[0].label = "Requests per Second"
    }

    charts.forEach(function (ch) {
        ch.update();
    });

    var spanControls = document.getElementById('span-controls');

    if (data.length !== spans.length) {
        data.forEach(function (span, index) {
            spans.push({
                retention: span.retention,
                interval: span.interval,
            });

            var spanNode = document.createElement('button');
            var textNode = document.createTextNode((span.retention * span.interval) / 60 + 'M'); // eslint-disable-line

            spanNode.appendChild(textNode);
            spanNode.setAttribute('id', index);
            spanNode.onclick = onSpanChange;
            spanControls.appendChild(spanNode);
        });
        document.getElementsByTagName('button')[0].classList.add('active');
    }
});

socket.on('esm_stats', function (data) {

    document.getElementById("currenttime").textContent = new Date().toLocaleString();

    if (
        data.retention === spans[defaultSpan].retention &&
        data.interval === spans[defaultSpan].interval
    ) {
        var os = data.os;
        var responses = data.responses;

        cpuStat.textContent = '0.0%';
        if (os) {
            cpuStat.textContent = os.cpu.toFixed(1) + '%';
            cpuChart.data.datasets[0].data.push(os.cpu);
            cpuChart.data.labels.push(os.timestamp);
        }

        memStat.textContent = '0.0MB';
        if (os) {
            memStat.textContent = os.memory.toFixed(1) + 'MB';
            memChart.data.datasets[0].data.push(os.memory);
            memChart.data.labels.push(os.timestamp);
        }

        loadStat.textContent = '0';
        if (os) {
            loadStat.textContent = os.load[0].toFixed(2);
            loadChart.data.datasets[0].data.push(os.load[0]);
            loadChart.data.labels.push(os.timestamp);
        }

        heapStat.textContent = '0';
        if (os) {
            heapStat.textContent = (os.heap.used_heap_size / 1024 / 1024).toFixed(1) + 'MB';
            heapChart.data.datasets[0].data.push(os.heap.used_heap_size / 1024 / 1024);
            heapChart.data.labels.push(os.timestamp);
        }

        eventLoopStat.textContent = '0';
        if (os && os.loop) {
            eventLoopStat.textContent = os.loop.sum.toFixed(2) + 'ms';
            eventLoopChart.data.datasets[0].data.push(os.loop.sum);
            eventLoopChart.data.labels.push(os.timestamp);
        }

        responseTimeStat.textContent = '0.00ms';
        if (responses) {
            responseTimeStat.textContent = responses.mean.toFixed(2) + 'ms';
            responseTimeChart.data.datasets[0].data.push(responses.mean);
            responseTimeChart.data.labels.push(responses.timestamp);
        }

        if (responses) {
            var deltaTime = responses.timestamp - rpsChart.data.labels[rpsChart.data.labels.length - 1];

            if (deltaTime < 1) deltaTime = 1000;
            rpsStat.textContent = ((responses.count / deltaTime) * 1000).toFixed(2);
            rpsChart.data.datasets[0].data.push((responses.count / deltaTime) * 1000);
            rpsChart.data.labels.push(responses.timestamp);
        }

        if (responses) {
            for (var i = 0; i < 4; i++) {
                statusCodesChart.data.datasets[i].data.push(data.responses[i + 2]);
            }
            statusCodesChart.data.labels.push(data.responses.timestamp);
        }

        charts.forEach(function (ch) {
            if (spans[defaultSpan].retention < ch.data.labels.length) {
                ch.data.datasets.forEach(function (dataset) {
                    dataset.data.shift();
                });

                ch.data.labels.shift();
            }
            ch.update();
        });
    }
});
