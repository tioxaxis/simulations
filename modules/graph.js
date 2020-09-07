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
			events: [],
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
					right: 40,
					top: 10,
					bottom: 0,
				}
			},
			legend: {
				display: true,
				position: 'bottom',
				labels: {
					boxWidth: 25,
					padding: 5,
					
					
				}
			},
			title: {
				display: true,
				position: 'top',
				lineHeight: 1,
				fontSize: 18,
				padding: 10,
			},
			scales: {
				xAxes: [{
					ticks: {
						fontSize: 10,
					},
					type: 'linear',
					position: 'bottom',
					gridLines: {
						color: 'rgba(0,0,0,.3)'
					},
					zeroLineColor: 'rgba(0,0,0,.3)',
				}],
				yAxes: [{
					ticks:{
						fontSize: 10
					},
					type: 'linear',
					gridLines: {
						color: 'rgba(0,0,0,.3)'
					},
					zeroLineColor: 'rgba(0,0,0,.3)',
				}]
			}
		}
	},
setLabelColorVisible(k,label,color,visible, ptRadius = 3){
	let ds = tioxGraph.struc.data.datasets;
	ds[k].label  = label;
	ds[k].pointBackgroundColor = color;
	ds[k].pointBorderColor = color;
	ds[k].borderColor = color;
	ds[k].hidden = !visible;
	ds[k].pointRadius = ptRadius;
},
setup: function (){
		resizeChart();
		this.reset();
},
reset: function (timeWidth, timeShift, maxY){
	this.chart = new Chart(this.context, this.struc);
	this.struc.data.datasets[0].data = [];
	this.struc.data.datasets[1].data = [];
	this.struc.data.datasets[2].data = [];
	this.xaxis.scale = 1;
	this.xaxis.initTimeWidth = timeWidth;
	this.xaxis.initTimeShift = timeShift;
	this.xaxis.timeWidth = timeWidth;
	this.xaxis.timeShift = timeShift;
	
	const xTicks = this.struc.options.scales.xAxes[0].ticks;
	xTicks.min = 0;
	xTicks.max = this.xaxis.initTimeWidth;
	xTicks.stepSize = this.xaxis.initTimeWidth - this.xaxis.initTimeShift;
	
//	ticks.max = Math.max(ticks.max, ticks.min + this.xaxis.timeWidth);
//	ticks.stepSize = this.xaxis.timeWidth - this.xaxis.timeShift;
//	
	this.yaxis = new VerticalAxisValue();
	const yTicks = this.struc.options.scales.yAxes[0].ticks;
	yTicks.min = 0;
	yTicks.max = this.yaxis.current().max;
	yTicks.stepSize = this.yaxis.current().stepSize;
	this.updateYaxis(maxY);
	this.resizeChart();
	this.chart.update();
},
	updateXaxis: function(x){
		const xTicks = this.struc.options.scales.xAxes[0].ticks;
		if (x <= xTicks.max) return false
		xTicks.min += this.xaxis.timeShift;
		xTicks.max += this.xaxis.timeShift;
		this.removeOldData(xTicks.min);
		this.chart.update();
		return true;	
	},
	removeOldData: function(time){
		let ds = this.struc.data.datasets;
		for (let i = 0; i < 3; i++) {
			let k = ds[i].data.findIndex( elem => elem.x >= time );
			ds[i].data.splice(0,k-1);
		};
	},
	updateXaxisScale: function(speed){
		this.xaxis.scale = Math.max(this.xaxis.scale, speed);
		this.xaxis.timeWidth = this.xaxis.initTimeWidth * this.xaxis.scale;
		this.xaxis.timeShift = this.xaxis.initTimeShift * this.xaxis.scale;
		
		let ticks = this.struc.options.scales.xAxes[0].ticks;
		ticks.max = Math.max(ticks.max, ticks.min + this.xaxis.timeWidth);
		ticks.stepSize = this.xaxis.timeWidth - this.xaxis.timeShift;

		let points = Math.max(1, Math.floor((11 - this.xaxis.scale) / 2));
		let ds = this.struc.data.datasets;
		for (let i = 0; i < 3; i++) {
			if (ds[i].pointRadius > 0) {
				ds[i].pointRadius = points;
				ds[i].borderWidth = points;
			}
		};
		this.chart.update();
	},
	updateYaxis: function(y){
		if( y <= this.yaxis.current().max) return false
		const pair = this.yaxis.update(y);
		const yTicks = this.struc.options.scales.yAxes[0].ticks
		yTicks.max = pair.max;
		yTicks.stepSize = pair.stepSize;
		return true;
	},
	
resizeChart: function() {
	const w = document.getElementById('canvasWrapper');
	const wW = w.clientWidth;
	const newFontSize = Math.floor(wW / 750 * 14);
	console.log(' New Font Size for Chart', newFontSize);
	let g = tioxGraph.struc.options;
	g.layout.padding = { 
		left: Math.floor(newFontSize),
		right: Math.floor(newFontSize*3),
		top: Math.floor(newFontSize),
		bottom: Math.floor(newFontSize)};
	g.title.fontSize = newFontSize;
	g.title.padding = newFontSize;
	g.title.lineHeight = newFontSize/28;
	g.legend.labels.fontSize = newFontSize;
	g.legend.labels.boxWidth = newFontSize;
	g.legend.labels.padding = 10;
	g.scales.xAxes[0].ticks.fontSize = newFontSize;
	g.scales.yAxes[0].ticks.fontSize = newFontSize;
	g.scales.xAxes[0].ticks.minor.fontSize = newFontSize;
   	g.scales.yAxes[0].ticks.minor.fontSize = newFontSize;
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