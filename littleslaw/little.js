"use strict";
// declaration of Globals

const tioxTimeConv = 1000; //time are in milliseconds
import {
	GammaRV, Heap
}
from '../modules/utility.js';
//    from './modules/utility.js';
import {
	Queue, WalkAndDestroy, MachineCenter,
	InfiniteMachineCenter, Item, itemCollection, ItemCollection,
	GStickFigure, NStickFigure
}
from '../modules/procsteps.js';

anim.stage = {
	normalSpeed: .10, 
	width: 1000,
	height: 300
}

anim.person = {
	width: 40,
	height: 60,
	path: {
		left: -100,
		right: anim.stage.width * 1.1,
	}
}
anim.stage.foreContext = document
		.getElementById('foreground')
		.getContext('2d');
	anim.stage.backContext = document
		.getElementById('background')
		.getContext('2d');
	
anim.room = {
		left: 150,
		top: 25,
		width: 700,
		height: 250,
		fill: 'white',
		stroke: 'blue',
		strokeWidth: 3,		
}
anim.person.path.entry = anim.room.left;
anim.person.path.exit = anim.room.left+ anim.room.width;
anim.person.path.top = (anim.room.height - anim.person.height)/ 
						2 + anim.room.top;

anim.pathway = {
	left: 0,
	top: anim.person.path.top - 2,
	fill: 'white',
	width: anim.stage.width,
	height: anim.person.height + 4
}



simu.sliderTypes = {
		ar: 'range',
		acv: 'range',
		sr: 'range',
		scv: 'range',
		speed: 'range',
		action: 'radio',
		reset: 'checkbox'
	},
	simu.precision = {
		ar: 1,
		acv: 1,
		sr: 1,
		scv: 1,
		speed: 0
	};
simu.editMode = false;

class ProcessCollection extends Array {
	constructor() {
		super();
	};
	reset() {
		this.forEach(aProcess => aProcess.reset());
	};
}; // end class processCollection

//var qLenDisplay= null;

function setBackground() {
	const c = anim.stage.backContext;
	const b = anim.room;
	c.resetTransform();
	c.strokeStyle = b.stroke;
	c.lineWidth = b.strokeWidth;
	c.beginPath();
	c.strokeRect(150, b.top, b.width, b.height);
	c.closePath();
	c.fillStyle = 'white';
	c.beginPath();
	c.fillRect(anim.pathway.left, anim.pathway.top, 
			   anim.pathway.width, anim.pathway.height);
	c.closePath();
};

document.getElementById('sliderBigBox').addEventListener('input', captureChangeInSliderS);
const speeds = [1, 2, 5, 10, 25];

function captureChangeInSliderS(event) {
	//    console.log('is event '+(event.isTrusted?'real':'scripted'));
	let inputElem = event.target.closest('input');
	if (!inputElem) return

	var id = inputElem.id;
	if (inputElem.type == 'range') {
		var v = Number(inputElem.value)
			.toFixed(simu.precision[id]);
		document.getElementById(id + 'Display')
			.innerHTML = v;
	}
	switch (id) {
		case 'ar':
			theSimulation.interarrivalRV
				.setRate(v / tioxTimeConv);
			theChart.updatePredictedInv();
			break;

		case 'acv':
			theSimulation.interarrivalRV.setCV(v);
			break;

		case 'sr':
			theSimulation.serviceRV.setTime(v * tioxTimeConv);
			theChart.updatePredictedInv();
			break;

		case 'scv':
			theSimulation.serviceRV.setCV(v);
			break;

		case 'speed':
			simu.frameSpeed = speeds[v];
			theChart.continue();
			itemCollection.updateForSpeed();
			document.getElementById(id + 'Display')
				.innerHTML = speeds[v];
			break;

		default:
			console.log(' reached part for default');
			break;
	}
}


var totInv, totTime, totPeople, lastArrDep, LBRFcount;
simu.reset2 = function () {
	itemCollection.reset();
	theChart.reset();
	theProcessCollection.reset();
	totInv = totTime = totPeople = lastArrDep = LBRFcount = 0;
	gSF = new GStickFigure(anim.stage.foreContext,
		anim.person.height,
		0);



	// schedule the initial Person to arrive and start the simulation/animation.
	theSimulation.supply.previous = null;
	theSimulation.creator.knockFromPrevious();

	//fudge to get animation started quickly
	let t = simu.heap.top().time - 1;
	simu.now = simu.frameNow = t;

};

//  One variable for each process step or queue
//  that contains the functions to do the specific
//  animation for that process step

const animForQueue = {
	loc: {x: anim.person.path.entry, y: anim.person.path.top},
	walkingTime: (anim.person.path.entry - anim.person.path.left) / anim.stage.normalSpeed,

	reset: function () {},

	join: function (nInQueue, arrivalTime, person) {
		person.addPath({
			t: arrivalTime,
			x: animForQueue.loc.x,
			y: animForQueue.loc.y
		});
	},

	arrive: function (nSeatsUsed, person) {},

	leave: function (procTime, nSeatsUsed) {}
};

const animForWalkOffStage = {
	loc: {x: anim.person.path.right, y: anim.person.path.top},
	walkingTime: Math.abs(anim.person.path.exit - anim.person.path.right) / anim.stage.normalSpeed,


	start: function (person) {
		person.addPath({
			t: simu.now +
				theSimulation.walkOffStage.walkingTime,
			x: this.loc.x,
			y: this.loc.y
		});
	}
};

const animForCreator = {
	dontOverlap: false,

	reset: function () {},

	start: function (theProcTime, person, m) { // only 1 machine for creator m=1
		person.setDestWithProcTime(theProcTime,
			anim.person.path.left, anim.person.path.top);
	},

	finish: function () {},

};

const animForLittlesBox = {
	lastFinPerson: null,

	reset: function () {},

	start: function (theProcTime, person, m) {
		let walkT = 5 * tioxTimeConv;
		if (theProcTime < walkT + 3 * tioxTimeConv) {
			person.addPath({
				t: simu.now + theProcTime,
				x: anim.person.path.exit,
				y: anim.person.path.top
			});
		} else {
			walkT = Math.min(walkT, theProcTime);
			let rx = Math.random() * 0.8 * anim.room.width +
				anim.room.width * 0.05;
			let ry = Math.random() * (anim.room.height -
				anim.person.height) + anim.room.top;
			let w = anim.room.width;
			person.addPath({
				t: simu.now + walkT * rx / w,
				x: rx + anim.person.path.entry,
				y: ry
			});
			person.addPath({
				t: simu.now + walkT * rx / w + theProcTime - walkT,
				x: rx + anim.person.path.entry,
				y: ry
			});
			person.addPath({
				t: simu.now + theProcTime,
				x: anim.person.path.exit,
				y: anim.person.path.top
			});
		}
		person.graphic.badgeDisplay(true);
		person.updateBadge = true;
		person.arrivalTime = simu.now;
	},

	finish: function (person) {
		animForLittlesBox.lastFinPerson = person;
		person.updateBadge = false;
	}
};


var theProcessCollection = new ProcessCollection();

const theSimulation = {
	//  the two random variables in the simulation
	interarrivalRV: null,
	serviceRV: null,

	// the 5 process steps in the simulation
	supply: null,
	queue: null,
	walkOffStage: null,
	creator: null,
	TSAagent: null,

	initialize: function () {
		setBackground();

		// random variables
		let r = document.getElementById('ar').value;
		let cv = document.getElementById('acv').value;
		theSimulation.interarrivalRV = new GammaRV(r / tioxTimeConv, cv);
		let t = document.getElementById('sr').value;
		cv = document.getElementById('scv').value;
		theSimulation.serviceRV = new GammaRV(1 / t / tioxTimeConv, cv);

		//queues
		this.supply = new Supplier(anim.person.path.left, anim.person.path.top);


		this.queue = new Queue("theQueue", -1, animForQueue.walkingTime,   
			animForQueue,
			null, null);

		this.walkOffStage = new WalkAndDestroy("walkOff", animForWalkOffStage, true);


		// machine centers 
		this.creator = new MachineCenter("creator",
			1, theSimulation.interarrivalRV,
			this.supply, this.queue,
			animForCreator);

		this.LittlesBox = new InfiniteMachineCenter("LittlesBox",
			theSimulation.serviceRV,
			this.queue, this.walkOffStage,
			animForLittlesBox, LBRecordStart, LBRecordFinish);

		function LBRecordStart(person) {

			person.arrivalTime = simu.now;
			totInv += (simu.now - lastArrDep) *
				(theSimulation.LittlesBox.getNumberBusy());
			lastArrDep = simu.now;
			//            console.log(' LB start', person);
			//console.log('LB record start',simu.now,person);

		};

		function LBRecordFinish(person) {
			totInv += (simu.now - lastArrDep) *
				(theSimulation.LittlesBox.getNumberBusy());
			lastArrDep = simu.now;
			totPeople++;
			totTime += simu.now - person.arrivalTime;
			LBRFcount = (LBRFcount + 1) % (simu.frameSpeed * 5);
			if (!LBRFcount) {
				theChart.push(simu.now, totInv / simu.now, totTime / simu.now);
				console.log('in LBRF tot people ', totPeople)
			};



			//console.log('LB record start',simu.now,person);
		};


		//link the queue to machine before and after
		this.queue.setPreviousNext(
			this.creator, this.LittlesBox);

		// put all the process steps with visible people in theProcessCollection
		theProcessCollection.push(this.creator);
		theProcessCollection.push(this.queue);
		theProcessCollection.push(this.LittlesBox);
		theProcessCollection.push(this.walkOffStage);
	},
};

// SUPPLIER
class Supplier {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	};
	pull() {
		return new Person(this.x, this.y, 30, anim.person.height);
	}
}; //end class Supplier


var gSF;
export class Person extends Item {

	constructor(x, y = 60, w = 30, h = 30) {
		super(x, y);

		this.width = w;

		this.graphic = new NStickFigure(gSF, x, y);
		this.updateBadge = false;
		//        simu.theCanvas.add(this.graphic.figure);
	};


	moveDisplayWithPath(deltaSimT) {
		if (this.updateBadge) {
			this.graphic.badgeSet(Math.round((simu.now - this.arrivalTime) / tioxTimeConv).toString())
		}
		super.moveDisplayWithPath(deltaSimT);
	};


	setDestWithProcTime(procTime, x, y) {
		let distance = Math.max(Math.abs(this.cur.x - x),
			Math.abs(this.cur.y - y));
		let deltaTime = Math.min(distance / anim.stage.normalSpeed, procTime);
		this.addPath({
			t: simu.now + deltaTime,
			x: x,
			y: y
		});
	};

}; // end class Person


function initializeAll() {
	Math.seedrandom('this is the Queueing Simulation');
	simu.initialize(); // the generic
	theSimulation.initialize(); // the specific to queueing
	//reset first time to make sure it is ready to play.
	theChart.initialize();
	document.getElementById('resetButton').click();
};
document.addEventListener("DOMContentLoaded", initializeAll);


//   TheChart variable is the interface to create the charts using Chart.js

export const theChart = {
	predictedInvValue: null,
	canvas: null,
	ctx: null,
	chart: null,
	stuff: {
		type: 'scatter',
		data: {
			datasets: [
				{ //*** Series #1
					label: 'avg. inventory',
					pointBackgroundColor: 'rgba(0,0,220,1)',
					pointBorderColor: 'rgba(0,0,220,1)',
					showLine: true,
					lineTension: 0,
					pointRadius: 5,
					borderColor: 'rgba(0,0,220,1)',
					borderWidth: 3,
					fill: false,

					data: []
                },
				{ //*** Series #2
					label: 'avg. rate * avg. time',
					pointBackgroundColor: 'rgba(0,150,0,1)',
					pointBorderColor: 'rgba(0,150,0,1)',
					showLine: true,
					lineTension: 0,
					pointRadius: 3,
					borderColor: 'rgba(0,150,0,1)',
					borderWidth: 3,
					fill: false,

					data: [],
                },
				{ //*** Series #3
					label: 'predicted inventory',
					pointBackgroundColor: 'rgb(185, 26, 26)',
					pointBorderColor: 'rgba(185, 26, 26)',
					showLine: true,
					hidden: true,
					lineTension: 0,
					pointRadius: 0,
					borderColor: 'rgba(185, 26, 26)',
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
			pointBackgroundColor: 'rgba(255,0,0,1)',
			//showLiness: true,
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
					//fontSize: 14,
					padding: 20
				}
			},
			title: {
				display: true,
				position: 'top',
				text: 'Inventory',
				//fontSize: 20,
			},
			scales: {
				xAxes: [{
					type: 'linear',
					position: 'bottom',
					gridLines: {
						color: 'rgba(0,0,0,.3)'
					},
					zeroLineColor: 'rgba(0,0,0,.3)',
					//ticks:{ fontSize: 14,}
                }],
				yAxes: [{
					type: 'linear',
					gridLines: {
						color: 'rgba(0,0,0,.3)'
					},
					zeroLineColor: 'rgba(0,0,0,.3)',
					//ticks:{ fontSize: 14,}
                }]
			}
		}

	},
	total: null,
	count: null,
	graphInitialTimeWidth: 40,
	graphInitialTimeShift: 30,
	graphTimeWidth: null,
	graphTimeShift: null,
	graphMin: null,
	graphMax: null,
	graphScale: null,
	yAxisScale: null,
	initialize: function () {
		this.canvas = document.getElementById('chart')
		this.ctx = this.canvas.getContext('2d');
		this.chart = new Chart(this.ctx, this.stuff);
		resizeChart();
		this.reset();
		this.predictedInvValue = this.predictedInv();
	},
	reset: function () {
		this.stuff.data.datasets[0].data = [];
		this.stuff.data.datasets[1].data = [];
		this.stuff.data.datasets[2].data = [];
		this.total = 0;
		this.count = 0;
		this.graphScale = 1;
		this.yAxisScale = {
			max: 1,
			stepSize: .2
		};
		this.aVAxis = new VerticalAxisValue();
		this.graphMin = 0;
		this.graphMax = this.graphInitialTimeWidth;
		this.chart.options.scales.yAxes[0].ticks.min = 0;
		this.chart.options.scales.yAxes[0].ticks.max = this.yAxisScale.max;
		this.chart.options.scales.yAxes[0].ticks.stepSize = this.yAxisScale.stepSize;
		this.continue();
	},
	continue: function () {
		this.graphScale = Math.max(this.graphScale, simu.frameSpeed);
		this.graphTimeWidth = this.graphInitialTimeWidth * this.graphScale;
		this.graphTimeShift = this.graphInitialTimeShift * this.graphScale;
		this.graphMax = Math.max(this.graphMax, this.graphMin + this.graphTimeWidth);
		this.chart.options.scales.xAxes[0].ticks.min = this.graphMin;
		this.chart.options.scales.xAxes[0].ticks.max = this.graphMax;
		this.chart.options.scales.xAxes[0].ticks.stepSize = this.graphTimeWidth - this.graphTimeShift;
		var points = Math.max(1, Math.floor((11 - this.graphScale) / 4));
		this.chart.data.datasets[0].pointRadius = 0;
		this.chart.data.datasets[0].borderWidth = points;
		this.chart.data.datasets[1].pointRadius = 0;
		this.chart.data.datasets[1].borderWidth = points;
		this.chart.data.datasets[2].borderWidth = points;
		this.chart.update();
	},
	push: function (t, inv, rt) {

		t /= tioxTimeConv;

		if (t > this.graphMax) {
			this.graphMin += this.graphTimeShift;
			this.graphMax += this.graphTimeShift;
			this.chart.options.scales.xAxes[0].ticks.min = this.graphMin;
			this.chart.options.scales.xAxes[0].ticks.max = this.graphMax;
		}
		//        console.log( 'at chart ',t,inv,rt,pI);
		if (inv > this.yAxisScale.max ||
			(theChart.predictedInvValue > this.yAxisScale.max)) {
			this.yAxisScale = this.aVAxis.update(inv);
			this.yAxisScale = this.aVAxis.update(theChart.predictedInvValue * 2);
			this.chart.options.scales.yAxes[0].ticks.max = this.yAxisScale.max;
			this.chart.options.scales.yAxes[0].ticks.stepSize = this.yAxisScale.stepSize;
		}
		this.chart.data.datasets[0].data.push({
			x: t,
			y: inv
		});
		this.chart.data.datasets[1].data.push({
			x: t,
			y: rt
		});
		this.chart.data.datasets[2].data.push({
			x: t,
			y: theChart.predictedInvValue
		});
		this.chart.update();
		// update graph with time, this.total/this.waits.length
	},

	updatePredictedInv: function () {
		this.chart.data.datasets[2].data.push({
			x: (simu.now - 1) / 10000,
			y: theChart.predictedInvValue
		});
		theChart.predictedInvValue = theChart.predictedInv();
		this.chart.data.datasets[2].data.push({
			x: (simu.now / 10000),
			y: theChart.predictedInvValue
		});
		this.chart.update();
	},
	predictedInv: function () {
		return (theSimulation.serviceRV.mean) / (theSimulation.interarrivalRV.mean);
	}
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

function resizeChart() {
	const w = document.getElementById('canvasWrapper');
	const wW = w.clientWidth;
	const newFontSize = wW / 750 * 14;
	theChart.chart.options.title.fontSize = newFontSize;
	theChart.chart.options.title.padding = 5;
	theChart.chart.options.legend.labels.fontSize = newFontSize;
	theChart.chart.options.legend.labels.padding = 10;

	theChart.chart.update();
	//alert(' in resize and w,h = '+wW+'  new font size');
};
window.addEventListener('resize', resizeChart);
