let currentMetric = 'temperature';
const numberOfPoints = 25;
let limitsUpdateCounter = 0;

// Gráficos
let plotData = {
    pressure: Array(numberOfPoints).fill(0),
    temperature: Array(numberOfPoints).fill(0),
    humidity: Array(numberOfPoints).fill(0),
    categories: Array(numberOfPoints).fill(null).map((_, i) => {
        const d = new Date();
        d.setSeconds(d.getSeconds() - (numberOfPoints - i) * 5);
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    })
};

let sensors_limit_values = {
    temperature_min: 10,
    temperature_max: 40,
    humidity_min: 20,
    humidity_max: 60
};

let plotOptions = {
    series: [{
        name: 'Temperatura',
        data: plotData.temperature
    }],
    chart: {
        height: 350,
        type: 'area',
        toolbar: {
            tools: {
                download: false
            }
        },
        animations: {
            enabled: true,
            easing: 'linear',
            dynamicAnimation: {
                speed: 500
            }
        },
        fontFamily: 'Roboto Mono'
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    xaxis: {
        categories: plotData.categories,
        labels: {
            style: { colors: '#fafafa' }
        }
    },
    yaxis: {
        labels: {
            style: { colors: '#fafafa' },
            formatter: (val) => val.toFixed(1)
        }
    },
    tooltip: {
        enabled: true,
        theme: 'dark',
        x: {
            format: 'HH:mm:ss'
        },
    },
    grid: {
        borderColor: '#374151',
        strokeDashArray: 5,
    },
    colors: ['oklch(55.8% 0.288 302.321)']
};

// Inicializa a instância do gráfico
const chart = new ApexCharts(document.querySelector("#plots-card"), plotOptions);
chart.render();

// Atualiza os valores dos sensores e cards
function updateSensorInputs(values) {
    if (limitsUpdateCounter == 0) {
        document.getElementById('temperature-min').value = values.temperature_min;
        document.getElementById('temperature-max').value = values.temperature_max;
        document.getElementById('humidity-min').value = values.humidity_min;
        document.getElementById('humidity-max').value = values.humidity_max;
    }

    document.getElementById('temperature-limits-box').textContent = `MIN: ${values.temperature_min} ºC | MAX:  ${values.temperature_max} ºC`;
    document.getElementById('humidity-limits-box').textContent = `MIN: ${values.humidity_min}% | MAX: ${values.humidity_max}%`;
}

// Atualiza os dados da página
async function updateData() {
    try {
        let response = await fetch('/api/sensors/get-data');
        let data     = await response.json();

        let pressureValue    = data.pressure;
        let temperatureValue = data.temperature;
        let humidityValue    = data.humidity;
        let altitudeValue    = data.altitude;

        // Define os valores mínimos e máximos da temperatura e umidade
        sensors_limit_values.temperature_min = (data.temperature_min !== undefined) ? data.temperature_min : 10;
        sensors_limit_values.temperature_max = (data.temperature_max !== undefined) ? data.temperature_max : 40;
        sensors_limit_values.humidity_min    = (data.humidity_min !== undefined)    ? data.humidity_min    : 20;
        sensors_limit_values.humidity_max    = (data.humidity_max !== undefined)    ? data.humidity_max    : 60;

        updateSensorInputs(sensors_limit_values);

        limitsUpdateCounter++;

        // Atualiza os cards superiores
        document.getElementById('pressure-box').textContent    = `${Math.round(pressureValue)} hPa`;
        document.getElementById('temperature-box').textContent = `${Math.round(temperatureValue)} °C`;
        document.getElementById('humidity-box').textContent    = `${Math.round(humidityValue)}%`;
        document.getElementById('altitude-box').textContent    = `${Math.round(altitudeValue)} m`;

        if ((temperatureValue < sensors_limit_values.temperature_min || temperatureValue > sensors_limit_values.temperature_max) ||
           (humidityValue < sensors_limit_values.humidity_min || humidityValue > sensors_limit_values.humidity_max) 
           ){
            document.getElementById('alert-box').classList.remove('hidden');
            document.getElementById('alert-box-msg').textContent = 'A temperatura/umidade do local se encontra fora dos limites estabelecidos!';
        } else {
            document.getElementById('alert-box').classList.add('hidden');
        }

        // Atualiza o relógio mostrado
        const now = new Date();
        document.getElementById('timestamp-data').textContent = now.toLocaleTimeString('pt-BR');

        // Atualiza os gráficos
        plotData.pressure.push(pressureValue);
        plotData.temperature.push(temperatureValue);
        plotData.humidity.push(humidityValue);
        plotData.categories.push(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

        // Mantém o gráfico com 25 pontos
        if (plotData.temperature.length > numberOfPoints) {
             plotData.temperature.shift();
             plotData.humidity.shift();
             plotData.pressure.shift();
             plotData.categories.shift();
        }

        // Atualiza o gráfico com os novos dados da métrica ativa
        updateChartSeries();
    } catch(e) {
        console.error('Erro:', e);
    }
}

// Função para trocar a série de dados exibida no gráfico
function updateChartSeries() {
    let plotName = '';
    let data = [];
    let color = '';

    switch (currentMetric) {
        case 'humidity':
            seriesName = 'Umidade';
            data = plotData.humidity;
            color = 'oklch(50.5% 0.213 27.518)';
            break;
        case 'pressure':
            seriesName = 'Pressão';
            data = plotData.pressure;
            color = 'oklch(59.6% 0.145 163.225)';
            break;
        default:
            seriesName = 'Temperatura';
            data = plotData.temperature;
            color = 'oklch(55.8% 0.288 302.321)';
            break;
    }

    chart.updateOptions({
        xaxis: { categories: plotData.categories },
        colors: [color]
    });
    chart.updateSeries([{ name: seriesName, data: data }]);
}

// Seleção do gráfico mostrado
document.getElementById('plots-card-control').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        document.querySelectorAll('.plot-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentMetric = e.target.dataset.control;
        updateChartSeries();
    }
});

async function updateLimits(params) {
    // Cria a URL com os parâmetros GET
    const queryParams = new URLSearchParams({
        temperature_min: params.temperature_min,
        temperature_max: params.temperature_max,
        humidity_min: params.humidity_min,
        humidity_max: params.humidity_max
    });

    const url = `/api/sensors/limits/update?${queryParams.toString()}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.log("Erro ao salvar os limites!!!");

            throw new Error(`Erro ao enviar dados: ${response.status}`);
        }

        const data = await response.json();
        console.log("Dados enviados com sucesso!");

        sensors_limit_values.temperature_min = params.temperature_min;
        sensors_limit_values.temperature_max = params.temperature_max;
        sensors_limit_values.humidity_min    = params.humidity_min;
        sensors_limit_values.humidity_max    = params.humidity_max;

        updateSensorInputs(sensors_limit_values);
    } catch (error) {
        console.error("Erro na requisição:", error);
    }
}

async function updateOffsets(params) {
    // Cria a URL com os parâmetros GET
    const queryParams = new URLSearchParams({
        temperature_offset: params.temperature_offset,
        humidity_offset: params.humidity_offset,
        pressure_offset: params.pressure_offset
    });

    const url = `/api/sensors/offsets?${queryParams.toString()}`;

     try {
        const response = await fetch(url);

        if (!response.ok) {
            console.log("Erro ao salvar os offsets!!!");

            throw new Error(`Erro ao enviar dados: ${response.status}`);
        }

        const data = await response.json();
        console.log("Dados enviados com sucesso!");
    } catch (error) {
        console.error("Erro na requisição:", error);
    }
}

document.getElementById('btn-sensors-levels').addEventListener('click', function () {
    let sensors_limit_to_update = {
        temperature_min: document.getElementById('temperature-min').value,
        temperature_max: document.getElementById('temperature-max').value,
        humidity_min: document.getElementById('humidity-min').value,
        humidity_max: document.getElementById('humidity-max').value
    };

    updateLimits(sensors_limit_to_update);

    window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('btn-offset').addEventListener('click', function () {
    let sensors_offset = {
        temperature_offset: document.getElementById('temperature-offset').value,
        humidity_offset: document.getElementById('humidity-offset').value,
        pressure_offset: document.getElementById('pressure-offset').value
    };

    updateOffsets(sensors_offset);

    window.scrollTo({ top: 0, behavior: 'smooth' });
});


setInterval(updateData, 1000);
updateSensorInputs(sensors_limit_values);
updateData();
