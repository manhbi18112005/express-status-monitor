'use strict';

(() => {
    // Constants and Configuration
    const CONFIG = {
        SCROLL_THROTTLE: 100,
        CHART_HEIGHT_RATIO: 1.5,
        STATUS_CODES_COLORS: ['#75D701', '#47b8e0', '#ffc952', '#E53A40'],
        COMMON_CLASSES: ['bg-white', 'dark:bg-slate-800', 'shadow-lg', 'p-0', 'relative', 'rounded-lg', 'overflow-hidden', 'm-2']
    };

    // Chart defaults configuration
    Chart.defaults.set({
        font: { size: 10 },
        animation: { duration: 500 },
        elements: {
            line: {
                backgroundColor: 'transparent',
                borderColor: 'rgba(0,0,0,0.9)',
                borderWidth: 2,
            },
        },
    });

    // Utility functions
    const utils = {
        throttle(func, limit) {
            let inThrottle;
            return function (...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        createDefaultDataset() {
            return {
                label: '',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false,
                pointRadius: 0,
            };
        },

        formatTimestamp(date) {
            return new Date(date).toLocaleString();
        }
    };

    // Chart configuration and options
    const chartOptions = {
        responsive: true,
        animation: false,
        interaction: { mode: 'nearest' },
        scales: {
            x: {
                type: 'time',
                display: true,
                title: { display: true, text: 'Date' },
                ticks: {
                    autoSkip: false,
                    maxRotation: 0,
                    major: { enabled: true },
                    font: context => context.tick?.major ? { weight: 'bold' } : undefined
                }
            },
            y: {
                display: true,
                title: { display: true, text: 'value' }
            }
        },
        plugins: {
            legend: { display: true },
            tooltip: { enabled: true },
            zoom: {
                pan: {
                    enabled: true,
                    mode: 'xy',
                    modifierKey: 'ctrl'
                },
                zoom: {
                    mode: 'xy',
                    wheel: { enabled: true },
                    drag: {
                        enabled: true,
                        backgroundColor: 'rgba(225,225,225,0.5)'
                    }
                }
            }
        }
    };

    // Chart configurations with display names
    const CHART_CONFIGS = {
        cpu: { id: 'cpu', keyName: 'CPU Usage', value: 'cpu' },
        mem: { id: 'mem', keyName: 'Memory Usage', value: 'memory' },
        load: { id: 'load', keyName: 'Load Average', value: 'load' },
        heap: { id: 'heap', keyName: 'Heap Usage', value: 'heap' },
        eventLoop: { id: 'eventLoop', keyName: 'Event Loop', value: 'loop' },
        responseTime: { id: 'responseTime', keyName: 'Response Time', value: 'mean' },
        rps: { id: 'rps', keyName: 'Requests/Second', value: 'count' },
        statusCodes: { id: 'statusCodes', keyName: 'Status Codes', datasets: 4 }
    };

    class ChartManager {
        constructor(containerId = 'container') {
            this.container = document.getElementById(containerId);
            this.charts = new Map();
            this.spans = [];
            this.defaultSpan = 0;

            this.createChartContainers();
            this.setupSocket();
            this.initializeCharts();
            this.setupEventListeners();
        }

        createChartContainers() {
            const fragment = document.createDocumentFragment();

            Object.values(CHART_CONFIGS).forEach(config => {
                const block = document.createElement('div');
                block.classList.add(...CONFIG.COMMON_CLASSES);
                Object.assign(block, {
                    id: `${config.id}Block`,
                    style: 'width: auto; height: auto; transform: translate(0px, 0px)'
                });
                block.dataset.x = '0';
                block.dataset.y = '0';
                block.innerHTML = this.createBlockHTML(config);
                fragment.appendChild(block);
            });

            this.container.appendChild(fragment);
        }

        createBlockHTML({ id, keyName }) {
            return `
            <div class="titlebar bg-gray-50 dark:bg-slate-700 flex items-center justify-between p-3 cursor-move">
                <div class="window-controls flex gap-2 ml-2">
                    <div class="w-3 h-3 rounded-full bg-red-500"></div>
                    <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div class="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="key-name font-medium text-lg">${keyName}</span>
                    <span class="value font-bold text-3xl" id="${id}Stat">--</span>
                </div>
                <div class="w-16"></div>
            </div>
            <div class="p-3">
                <div class="block-content centered-content">
                    <canvas class="responsive-canvas" id="${id}Chart"></canvas>
                </div>
            </div>`;
        }

        // Make blocks draggable
        setupDraggable() {
            Object.values(CHART_CONFIGS).forEach(config => {
                const block = document.getElementById(`${config.id}Block`);
                const titlebar = block.querySelector('.titlebar');

                let isDragging = false;
                let currentX;
                let currentY;
                let initialX;
                let initialY;
                let xOffset = parseInt(block.dataset.x) || 0;
                let yOffset = parseInt(block.dataset.y) || 0;

                const dragStart = (e) => {
                    initialX = e.clientX - xOffset;
                    initialY = e.clientY - yOffset;

                    if (e.target === titlebar) {
                        isDragging = true;
                    }
                };

                const dragEnd = () => {
                    isDragging = false;
                    block.dataset.x = xOffset;
                    block.dataset.y = yOffset;
                };

                const drag = (e) => {
                    if (isDragging) {
                        e.preventDefault();

                        currentX = e.clientX - initialX;
                        currentY = e.clientY - initialY;

                        xOffset = currentX;
                        yOffset = currentY;

                        block.style.transform = `translate(${currentX}px, ${currentY}px)`;
                    }
                };

                titlebar.addEventListener('mousedown', dragStart);
                document.addEventListener('mousemove', drag);
                document.addEventListener('mouseup', dragEnd);
            });
        }

        setupSocket() {
            this.socket = io(`${location.protocol}//${location.hostname}:${port || location.port}`, {
                path: socketPath,
                transports: ['websocket']
            });

            this.socket.on('esm_start', this.handleStart.bind(this));
            this.socket.on('esm_stats', this.handleStats.bind(this));
        }

        createChart(ctx, datasets) {
            const chart = new Chart(ctx, {
                type: 'line',
                data: { labels: [], datasets },
                options: chartOptions,
            });

            ctx.height = ctx.width * CONFIG.CHART_HEIGHT_RATIO;
            return chart;
        }

        initializeCharts() {
            for (const [id, config] of Object.entries(CHART_CONFIGS)) {
                const ctx = document.getElementById(`${id}Chart`);
                const datasets = Array(config.datasets || 1).fill().map(() => utils.createDefaultDataset());

                if (id === 'statusCodes') {
                    datasets.forEach((dataset, i) => {
                        dataset.borderColor = CONFIG.STATUS_CODES_COLORS[i];
                    });
                }

                this.charts.set(id, {
                    chart: this.createChart(ctx, datasets),
                    stat: document.getElementById(`${id}Stat`),
                    config
                });
            }

            // Setup draggable functionality after charts are initialized
            this.setupDraggable();
        }

        setupEventListeners() {
            const mainContent = document.getElementById('con_con');
            const header = document.getElementById('header');
            const topButton = document.getElementById('topButton');
            let lastScroll = 0;

            const handleScroll = utils.throttle(() => {
                const currentScroll = mainContent.scrollTop;
                header.style.transform = `translateY(${currentScroll <= 0 || currentScroll < lastScroll ? '0' : '-100%'})`;

                if (topButton) {
                    topButton.classList.toggle('button-visible', currentScroll > 200);
                    topButton.classList.toggle('button-hidden', currentScroll <= 200);
                }

                lastScroll = currentScroll;
            }, CONFIG.SCROLL_THROTTLE);

            mainContent.addEventListener('scroll', handleScroll, { passive: true });
            topButton?.addEventListener('click', () => {
                mainContent.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        updateChart(chartId, data, timestamp) {
            const chartData = this.charts.get(chartId);
            if (!chartData) return;

            const { chart, stat, config } = chartData;
            const value = this.getValue(data, config.value);

            if (value !== undefined) {
                if (stat) stat.textContent = this.formatValue(value, chartId);
                chart.data.datasets[0].data.push(value);
                chart.data.labels.push(timestamp);

                this.trimChartData(chart);
            }
        }

        getValue(data, path) {
            if (!path) return data;
            return path.split('.').reduce((obj, key) => obj?.[key], data);
        }

        formatValue(value, chartId) {
            const formatters = {
                cpu: v => v.toFixed(1) + '%',
                mem: v => v.toFixed(1) + 'MB',
                load: v => v[0].toFixed(2),
                heap: v => (v.used_heap_size / 1024 / 1024).toFixed(1) + 'MB',
                eventLoop: v => v.loop ? v.loop.sum : 0,
                responseTime: v => v.toFixed(2) + 'ms',
                rps: v => v.toFixed(2)
            };
            return formatters[chartId]?.(value) ?? value.toString();
        }

        trimChartData(chart) {
            const retention = this.spans[this.defaultSpan]?.retention;
            if (retention && chart.data.labels.length > retention) {
                chart.data.datasets.forEach(dataset => dataset.data.shift());
                chart.data.labels.shift();
            }
        }

        handleStart(data) {
            document.getElementById('currenttime').textContent = utils.formatTimestamp(Date.now());

            // Remove last incomplete datapoint
            data[this.defaultSpan].responses.pop();
            data[this.defaultSpan].os.pop();

            this.updateAllCharts(data[this.defaultSpan]);
            this.updateSpanControls(data);
        }

        handleStats(data) {
            if (data.retention !== this.spans[this.defaultSpan]?.retention ||
                data.interval !== this.spans[this.defaultSpan]?.interval) return;

            document.getElementById('currenttime').textContent = utils.formatTimestamp(Date.now());
            this.updateAllCharts(data);
        }

        updateAllCharts(data) {
            const timestamp = data.timestamp ?? Date.now();

            if (data.os) {
                ['cpu', 'mem', 'load', 'heap', 'eventLoop'].forEach(metric => {
                    this.updateChart(metric, data.os, timestamp);
                });
            }

            if (data.responses) {
                ['responseTime', 'rps'].forEach(metric => {
                    this.updateChart(metric, data.responses, timestamp);
                });

                // Update status codes
                const statusChart = this.charts.get('statusCodes').chart;
                for (let i = 0; i < 4; i++) {
                    statusChart.data.datasets[i].data.push(data.responses[i + 2]);
                    statusChart.data.datasets[i].label = `${i + 2}xx`;
                }
                statusChart.data.labels.push(timestamp);
                this.trimChartData(statusChart);
            }

            // Update all charts
            for (const { chart } of this.charts.values()) {
                chart.update();
            }
        }

        updateSpanControls(data) {
            const spanControls = document.getElementById('span-controls');
            if (data.length === this.spans.length) return;

            const fragment = document.createDocumentFragment();
            this.spans = data.map((span, index) => {
                const button = document.createElement('button');
                button.className = 'p-3 w-10 h-10 rounded-lg border border-gray-200 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-700 transition-all duration-200 ease-in-out flex items-center justify-center font-bold';
                button.textContent = `${(span.retention * span.interval) / 60}M`;
                button.id = index;
                button.onclick = (e) => {
                    document.querySelectorAll('#span-controls button').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                    this.defaultSpan = parseInt(e.target.id, 10);
                    this.socket.emit('esm_change');
                };
                fragment.appendChild(button);
                return { retention: span.retention, interval: span.interval };
            });

            spanControls.innerHTML = '';
            spanControls.appendChild(fragment);
            spanControls.querySelector('button').classList.add('active');
        }
    }

    // Initialize the application
    document.addEventListener('DOMContentLoaded', () => {
        new ChartManager();
    });
})();