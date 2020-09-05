export const tioxGraph = {
	context: document.getElementById('chart').getContext('2d'),
	chart: null,
	xaxis: {
		min:null,
		max:null,
		timeWidth:null,
		timeShift:null,
		initTimeWidth: 10,
		initTimeShift: 7,
		scale:1,
	},
	yaxis: null,
	struc: {
		type: 'scatter',
		data: {
			datasets: [
				{ //*** Series #1
					showLine: true,
					lineTension: 0,
					pointRadius: 5,
					borderWidth: 3,
					fill: false,
					data: []
				},
				{ //*** Series #2
					showLine: true,
					lineTension: 0,
					pointRadius: 3,
					borderWidth: 3,
					fill: false,
					data: [],
				},
				{ //*** Series #3
					showLine: true,
					lineTension: 0,
					pointRadius: 0,
					borderWidth: 3,
					fill: false,
					data: [],
				}
			]
		},
		options: {
			animation: {
				duration: 0
			}, // general animation time
			hover: {
				animationDuration: 0
			}, // duration of animations when hovering an item
			responsiveAnimationDuration: 0, // animation duration after a resize
			maintainAspectRatio: false,
			responsive: true,
			layout: {
				padding: {
					left: 20,
					right: 60,
					top: 20,
					bottom: 20
				}
			},
			legend: {
				display: true,
				position: 'bottom',
				labels: {
					boxWidth: 20,
					padding: 5,
				}
			},
			title: {
				display: true,
				position: 'top',
			},
			scales: {
				xAxes: [{
					type: 'linear',
					position: 'bottom',
					gridLines: {
						color: 'rgba(0,0,0,.3)'
					},
					zeroLineColor: 'rgba(0,0,0,.3)',
				}],
				yAxes: [{
					type: 'linear',
					gridLines: {
						color: 'rgba(0,0,0,.3)'
					},
					zeroLineColor: 'rgba(0,0,0,.3)',
				}]
			}
		}
	},
setLabelColorVisible(k,label,color,visible){
	let ds = tioxGraph.struc.data.datasets;
	ds[k].label  = label;
	ds[k].pointBackgroundColor = color;
	ds[k].pointBorderColor = color;
	ds[k].borderColor = color;
	ds[k].hidden = !visible;
},
setup: function (){
		resizeChart();
		this.reset();
},
reset: function (){
	this.struc.data.datasets[0].data = [];
	this.struc.data.datasets[1].data = [];
	this.struc.data.datasets[2].data = [];
	this.xaxis.scale = 1;
	this.xaxis.timeWidth = this.xaxis.initTimeWidth;
	this.xaxis.timeShift = this.xaxis.initTimeShift;
	
	const xTicks = this.struc.options.scales.xAxes[0].ticks;
	xTicks.min = 0;
	xTicks.max = this.xaxis.initTimeWidth;
	xTicks.stepSize = this.xaxis.initTimeWidth - this.xaxis.initTimeShift;
	
	this.yaxis = new VerticalAxisValue();
	const yTicks = this.struc.options.scales.yAxes[0].ticks;
	yTicks.min = 0;
	yTicks.max = this.yaxis.current().max;
	yTicks.stepSize = this.yaxis.current().stepSize;
},
	updateXaxis: function(x){
		const xTicks = this.struc.options.scales.xAxes[0].ticks;
		if (x > xTicks.max) {
			xTicks.min += this.xaxis.timeShift;
			xTicks.max += this.xaxis.timeShift;
		}
	},
	updateXaxisScale: function(speed){
		this.xaxis.scale = Math.max(this.xaxis.scale, speed);
		this.xaxis.timeWidth = this.xaxis.initTimeWidth * this.xaxis.scale;
		this.xaxis.timeShift = this.xaxis.initTimeShift * this.xaxis.scale;
	},
	updateYaxis: function(y){
		const pair = this.yaxis.update(y);
		const yTicks = this.struc.options.scales.yAxes[0].ticks
		yTicks.max = pair.max;
		yTicks.stepSize = pair.stepSize;	
		},
continue: function (){
	let ticks = this.struc.options.scales.xAxes[0].ticks;
	ticks.max = Math.max(ticks.max, ticks.min + this.xaxis.timeWidth);
	ticks.stepSize = this.xaxis.timeWidth - this.xaxis.timeShift;

	let points = Math.max(1, Math.floor((11 - this.xaxis.scale) / 2));
	let ds = this.struc.data.datasets;
	ds[0].pointRadius = points;
	ds[0].borderWidth = points;
	ds[1].pointRadius = points;
	ds[1].borderWidth = points;
	ds[2].borderWidth = points;
	this.chart.update();
},
	
resizeChart: function() {
	const w = document.getElementById('canvasWrapper');
	const wW = w.clientWidth;
	const newFontSize = wW / 750 * 14;
	let g = tioxGraph.struc.options;
	g.title.fontSize = newFontSize;
	g.title.padding = 5;
	g.legend.labels.fontSize = newFontSize;
	g.legend.labels.padding = 10;

	tioxGraph.chart.update();
	//alert(' in resize and w,h = '+wW+'  new font size');
},

}

class VerticalAxisValue {
	constructor() {
		this.table = [
			{
				max: 1.0,
				stepSize: 0.2
			},
			{
				max: 1.5,
				stepSize: 0.5
			},
			{
				max: 2,
				stepSize: 0.5
			},
			{
				max: 3,
				stepSize: 1.0
			},
			{
				max: 4,
				stepSize: 1
			},
			{
				max: 5,
				stepSize: 1
			},
			{
				max: 6,
				stepSize: 2
			},
			{
				max: 8,
				stepSize: 2
			},
        ];
	};
	current (){
		return this.table[0];
	};
	update(y) {
		while (y > this.table[0].max) {
			this.table.push({
				max: this.table[0].max * 10,
				stepSize: this.table[0].stepSize * 10
			});
			this.table.shift();
		}
		return this.table[0];
	}
};

window.addEventListener('resize', tioxGraph.resizeChart);