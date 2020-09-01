import {
	GammaRV, UniformRV, DeterministicRV, Heap
}
from '../modules/utility.js';
import {
	Queue, WalkAndDestroy, MachineCenter,
	InfiniteMachineCenter, Combine, Item, itemCollection, ItemCollection,
	GStickFigure, NStickFigure, GStore, tioxColors
}
from '../modules/procsteps.js';


const disappointed = {color: 'rgb(235, 230, 230)', 
					  border: 'rgb(31, 105, 245)'};
const tioxTimeConv = 1000; //time are in milliseconds
const theStage = {
	normalSpeed: .10, //.25 pixels per millisecond
	width: 1000,
	height: 300,

};

{
	theStage.boxSpace = 20;
	theStage.boxSize = 16;
	theStage.person = {
		width: 40,
		height: 3 * theStage.boxSpace
	};
	theStage.boxesPerRow = 10;
	theStage.store = {
		left: 720,
		top: 80,
		stroke: 1
	};


	theStage.pathLeft = -100;
	theStage.pathRight = 700;
	theStage.pathTop = theStage.store.top;
	theStage.pathBot = theStage.store.top + theStage.boxSpace * 7;
	theStage.pathMid = (theStage.pathTop + theStage.pathBot) / 2;
	theStage.offStageEntry = {
		x: theStage.pathLeft,
		y: theStage.pathTop
	};
	theStage.offStageExit = {
		x: theStage.pathLeft,
		y: theStage.pathBot
	};
	theStage.headQueue = {
		x: theStage.pathRight,
		y: theStage.pathBot
	};
//	const background = document.getElementById('theBackground');
//	theStage.background = {
//		context: background.getContext('2d')
//	};
};


simu.theStage = theStage;
simu.framedelta = 200;
simu.framedeltaFor1X = 200;
simu.sliderTypes = {
		dr: 'range',
		dcv: 'range',
		Cu: 'range',
		Co: 'range',
		quan: 'range',
		speed: 'range',
		action: 'radio',
		reset: 'checkbox'
	},
	simu.precision = {
		dr: 0,
		dcv: 1,
		Cu: 0,
		Co: 0,
		quan: 0,
		speed: 0
	};
simu.editMode = false;

class ProcessCollection {
	constructor() {
		this.processList = [];
	};

	push(aProcess) {
		this.processList.push(aProcess);
	};

	reset() {
		this.processList.forEach(aProcess => aProcess.reset());
	};
}; // end class processCollection

document.getElementById('sliderBigBox').addEventListener('input', captureChangeInSliderS);
const speeds = [1, 3, 10, 30];

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
		case 'dr':
			theSimulation.demandRV
				.setMean(Number(v));
			//        theChart.updatePredictedInv(); 
			setExpected(theSimulation.quantityOrdered,
				theSimulation.demandRV.mean,
				theSimulation.demandRV.variance);
			break;

		case 'dcv':
			theSimulation.demandRV.setVariance(Number(v));
			setExpected(theSimulation.quantityOrdered,
				theSimulation.demandRV.mean,
				theSimulation.demandRV.variance);
			break;

		case 'Cu':
			theSimulation.Cu = Number(v);
			setDesired(theSimulation.Cu, theSimulation.Co);
			break;

		case 'Co':
			theSimulation.Co = Number(v);
			setDesired(theSimulation.Cu, theSimulation.Co);
			break;

		case 'quan':
			theSimulation.quantityOrdered = Number(v);
			setExpected(theSimulation.quantityOrdered,
				theSimulation.demandRV.mean,
				theSimulation.demandRV.variance);
			break;

		case 'speed':
			simu.framedelta = simu.framedeltaFor1X *
				speeds[v];
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

function setDesired(under, over) {
	document.getElementById('desiredPerc').innerHTML =
		(100 * under / (under + over)).toFixed(2);
}

function setExpected(q, m, v) {
	let perc;
	// r.v has a range of [m(1-v)], m(1+v)] 
	// modQ finds the "q" in the range above.
	let modQ = Math.max(Math.min(q, m * (1 + v)), m * (1 - v));
	if (v != 0) perc = 100 * (modQ - m * (1 - v)) / (2 * m * v);
	else if (q < m) perc = 0;
	else perc = 100;

	document.getElementById('expectedPerc').innerHTML =
		(perc).toFixed(2);
}

function setActual(enough, total) {
	document.getElementById('actualPerc').innerHTML =
		(100 * enough / total).toFixed(2);
}


//var totInv, totTime, totPeople, lastArrDep, LBRFcount ;
simu.reset2 = function () {
	itemCollection.reset();
	theChart.reset();
	theProcessCollection.reset();
	//    totInv = totTime = totPeople = lastArrDep = LBRFcount = 0;
	gSF = new GStickFigure(simu.context,
		theStage.person.height, theStage.boxSize);
	setDesired(theSimulation.Cu, theSimulation.Co);
	setExpected(theSimulation.quantityOrdered,
		theSimulation.demandRV.mean,
		theSimulation.demandRV.variance);

	theSimulation.supply.previous = null;
	simu.heap.push({
		time: simu.now + 500,
		type: 'new cycle',
		proc: theSimulation.demand.cycle.bind(theSimulation.demand),
		item: null
	});

};

//  One variable for each process step or queue
//  that contains the functions to do the specific
//  animation for that process step

const animForQueue = {
	walkingTime1: (theStage.pathRight - theStage.offStageEntry.x) / theStage.normalSpeed,
	walkingTime2: (theStage.pathMid - theStage.pathTop) / theStage.normalSpeed,
	walkingTime: ((theStage.pathRight - theStage.offStageEntry.x) +
		(theStage.pathMid - theStage.pathTop)) / theStage.normalSpeed,

	reset: function () {},

	join: function (qLength, arrivalTime, person) {
		person.addPath({
			t: arrivalTime - this.walkingTime2,
			x: theStage.pathRight,
			y: theStage.pathTop
		});
		person.addPath({
			t: arrivalTime,
			x: theStage.pathRight,
			y: theStage.pathMid
		});
	},

	arrive: function (nSeatsUsed, person) {
		
	},

	leave: function (procTime, nSeatsUsed) {}
};

const animForWalkOffStage = {
	walkingTime: (theStage.pathRight - theStage.pathLeft) / theStage.normalSpeed,

	//    computeWalkingTime: function (){
	//         this.walkingTime = (theStage.pathRight - theStage.pathLeft) / theStage.normalSpeed;
	//        return this.walkingTime;
	//    },

	start: function (person) {
		person.addPath({
			t: simu.now +
				this.walkingTime,
			x: theStage.pathLeft,
			y: theStage.pathBot
		});
	}
};

const animForCreator = {
	loc: theStage.offStageEntry,
	reset: function () {},

	start: function (theProcTime, person, m) { // only 1 machine for creator m=1
		person.setDestWithProcTime(theProcTime,
			animForCreator.loc.x, animForCreator.loc.y);
	},

	finish: function () {},
};

//const animForNV = {
//	lastFinPerson: null,
//
//	reset: function () {},
//
//	start: function (theProcTime, person, m) {
//		person.arrivalTime = simu.now;
//		if (theSimulation.store.inventory() > 0) {
//			let pack = theSimulation.store.remove();
//			person.graphic.packageColor = pack.graphic.color;
//			person.graphic.packageVisible = true;
//		} else {
//			person.graphic.color = darkGrey; // dark grey
//		};
//	},
//
//	finish: function (person) {
//		animForNV.lastFinPerson = person;
//	}
//};
const animForNewsVendor = {
//	walkingTime: animForQueue.walkingTime2;
	start: function (person, pack, walkingTime){
		person.addPath({  //walk to bot
				t: simu.now + walkingTime,
				x: theStage.pathRight,
				y: theStage.pathBot
		});
		const leftTime = walkingTime / 2;
		const upTime = walkingTime / 2;

		if (pack) {
			pack.addPath({
				t: simu.now + leftTime,
				x: theStage.pathRight + person.graphic.gSF.package.x,
				y: pack.cur.y
			});
			pack.addPath({  // move up to arm height in other time
				t: simu.now + walkingTime,
				x: theStage.pathRight + person.graphic.gSF.package.x,
				y: theStage.pathBot + person.graphic.gSF.package.y,
			});
		}
	},
	finish: function (person,pack){
		if (pack) {
			person.graphic.packageVisible = true;
			person.graphic.packageColor = pack.graphic.color;
		} else {
			person.graphic.color = disappointed.color;
			person.graphic.bdaryColor = disappointed.border;
		}
	}
};


var theProcessCollection = new ProcessCollection();

const theSimulation = {
	//  the two random variables in the simulation
	demandRV: null,

	// the 5 process steps in the simulation
	supply: null,
	queue: null,
	walkOffStage: null,
	demand: null,
	newsVendor: null,
	Cu: null,
	Co: null,
	quantityOrdered: null,

	initialize: function () {
		// random variables
		let r = Number(document.getElementById('dr').value);
		let cv = Number(document.getElementById('dcv').value);
		theSimulation.demandRV = new UniformRV(r, cv);
		theSimulation.serviceRV = 
			new DeterministicRV(animForQueue.walkingTime2);
		theSimulation.Co = Number(document.getElementById('Co').value);
		theSimulation.Cu = Number(document.getElementById('Cu').value);
		theSimulation.quantityOrdered = Number(document.getElementById('quan').value);

		//queues
		this.supply = new Supplier(theStage.offStageEntry.x, theStage.offStageEntry.y);

		this.queue = new Queue("theQueue", -1, animForQueue.walkingTime,   
			animForQueue,
			null, null);
		
		this.store = new RetailStore(
			simu.backcontext, simu.context,
			theStage.store.left, theStage.store.top,
			theStage.boxSpace, theStage.boxSize, theStage.boxesPerRow);
		
		this.walkOffStage = new WalkAndDestroy("walkOff", animForWalkOffStage, true);

		this.demand = new DemandCreator(20000, theSimulation.demandRV);
		
		this.newsVendor = new Combine('newsVendor',
				theSimulation.serviceRV,
				this.queue, this.store, this.walkOffStage,
				animForNewsVendor);
		
//		this.newsVendor = new MachineCenter("newsVendor", 1,
//			theSimulation.serviceRV,
//			this.queue, this.walkOffStage,
//			animForNV, null, null);

		//link the queue to machine before and after
		this.queue.setPreviousNext(
			this.creator, this.newsVendor);
//       not sure I need this.		
//		this.store.setPreviousNext(
//			null, this.newsVendor);

		// put all the process steps with visible people in theProcessCollection
		theProcessCollection.push(this.demand);
		theProcessCollection.push(this.queue);
		theProcessCollection.push(this.store);
		theProcessCollection.push(this.newsVendor);
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
		return new Person(
			this.x, this.y,
			30, theStage.person.height);
	}
}; //end class Supplier

const peopleSpacing = 70;
class DemandCreator {
	constructor(cycleLength, demandRV) {
		this.cycleLength = cycleLength;
		this.timeToNV = ((theStage.pathRight - theStage.pathLeft) +
			(theStage.pathBot - theStage.pathTop)) / theStage.normalSpeed;
		this.demandRV = demandRV;
		this.totCost = null;
		this.nRounds = null;
		this.curDemand = null;
		this.enough = null;
		this.overageForDay = null;
		this.underageForDay = null;
		
	};

	reset() {
		this.totCost = 0
		this.nRounds = 0;
		this.enough = 0;
	};

	cycle() {
		theSimulation.store.emptyStore();
		this.curDemand = Math.floor(theSimulation.demandRV.observe());
		theSimulation.store.addBox(theSimulation.quantityOrdered);
//		this.store.packages.drawAll();
		this.nRounds++;
		let excess = theSimulation.quantityOrdered - this.curDemand;
		this.overageForDay = theSimulation.Co * Math.max(0, excess);
		this.underageForDay = theSimulation.Cu * Math.max(0, -excess);
		this.totCost += this.overageForDay + this.underageForDay;
		if (this.curDemand <= theSimulation.quantityOrdered)
			this.enough++;

		let t = simu.now;
		let deltaT = peopleSpacing / theStage.normalSpeed;

		for (let i = 0; i < this.curDemand; i++) {
			t += deltaT
			let person = theSimulation.supply.pull();
			simu.heap.push({
				time: t,
				type: 'create',
				proc: theSimulation.queue.push.bind(theSimulation.queue),
				item: person
			});
		}
		simu.heap.push({
			time: t + this.timeToNV,
			type: 'plot',
			proc: this.graph.bind(theSimulation.demand),
			item: null
		})
		simu.heap.push({
			time: t + this.cycleLength,
			type: 'new cycle',
			proc: this.cycle.bind(this),
			item: null
		});
	};
	graph() {
		theChart.push(this.nRounds, this.underageForDay, this.overageForDay, this.totCost / this.nRounds);
		setActual(this.enough, this.nRounds);

		theSimulation.store.makeAllGrey();
	}
};


class RetailStore extends GStore {
	constructor(ctxStore, ctxPack, left, top, boxSpace, boxSize, boxesPerRow) {
		super(ctxStore, ctxPack, left, top, boxSpace, boxSize, boxesPerRow);
	};
	addBox(n) {
		for (let i = 0; i < n; i++) {
			this.addNew()
		};
	};
};

var gSF;
export class Person extends Item {

	constructor( x, y = 60, w = 30, h = 30) {
		super( x, y);

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

	//    isThereOverlap() {
	//        // is 'p' graph above the 'a' graph in [0, p.count] ?
	//        let p = this;
	//        let a = this.ahead;
	//        if ( !a ) return false;
	//        let pPath = p.pathList[0];
	//        let aPath = a.pathList[0];
	//        
	//        if (  p.cur.x + p.width > a.cur.x ) return true;
	//        if ( pPath.deltaX <= aPath.deltaX ) return false;
	//        return (a.cur.x - p.width - p.cur.x)/(pPath.deltaX - aPath.deltaX) <= pPath.count;
	//    };

	setDestWithProcTime(procTime, x, y) {
		let distance = Math.max(Math.abs(this.cur.x - x),
			Math.abs(this.cur.y - y));
		let deltaTime = Math.min(distance / theStage.normalSpeed, procTime);
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
					label: 'underage',
					pointBackgroundColor: 'rgb(220, 0, 0)',
					pointBorderColor: 'rgb(220, 0, 0)',
					showLine: false,
					lineTension: 0,
					pointRadius: 5,
					borderColor: 'rgb(220, 0, 0)',
					borderWidth: 3,
					fill: false,

					data: []
                },
				{ //*** Series #2
					label: 'overage',
					pointBackgroundColor: 'rgba(0,150,0,1)',
					pointBorderColor: 'rgba(0,150,0,1)',
					showLine: false,
					lineTension: 0,
					pointRadius: 3,
					borderColor: 'rgba(0,150,0,1)',
					borderWidth: 3,
					fill: false,

					data: [],
                },
				{ //*** Series #3
					label: 'average cost',
					pointBackgroundColor: 'rgb(26, 26, 185)',
					pointBorderColor: 'rgb(26, 26, 185)',
					showLine: true,
					lineTension: 0,
					pointRadius: 0,
					borderColor: 'rgb(26, 26, 185)',
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
				text: '$ of cost per day',
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
	graphInitialTimeWidth: 20,
	graphInitialTimeShift: 15,
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
		//        this.predictedInvValue = this.predictedInv();
	},
	reset: function () {
		this.stuff.data.datasets[0].data = [];
		this.stuff.data.datasets[1].data = [];
		this.stuff.data.datasets[2].data = [];
		this.total = 0;
		this.count = 0;
		this.graphScale = 1;
		this.yAxisScale = {
			max: 100,
			stepSize: 20
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
		this.chart.data.datasets[0].pointRadius = points;
		this.chart.data.datasets[0].borderWidth = points;
		this.chart.data.datasets[1].pointRadius = points;
		this.chart.data.datasets[1].borderWidth = points;
		this.chart.data.datasets[2].borderWidth = points;
		this.chart.update();
	},
	push: function (n, under, over, avg) {


		if (n > this.graphMax) {
			this.graphMin += this.graphTimeShift;
			this.graphMax += this.graphTimeShift;
			this.chart.options.scales.xAxes[0].ticks.min = this.graphMin;
			this.chart.options.scales.xAxes[0].ticks.max = this.graphMax;
		}
		//        console.log( 'at chart ',t,inv,rt,pI);
		let bigger = Math.max(over, under);
		if (bigger > this.yAxisScale.max) {
			this.yAxisScale = this.aVAxis.update(bigger);
			this.chart.options.scales.yAxes[0].ticks.max = this.yAxisScale.max;
			this.chart.options.scales.yAxes[0].ticks.stepSize = this.yAxisScale.stepSize;
		}
		this.chart.data.datasets[0].data.push({
			x: n,
			y: under
		});
		this.chart.data.datasets[1].data.push({
			x: n,
			y: over
		});
		this.chart.data.datasets[2].data.push({
			x: n,
			y: avg
		});
		this.chart.update();
		// update graph with time, this.total/this.waits.length
	},

	//     updatePredictedInv: function(){
	//        this.chart.data.datasets[2].data.push(
	//            {x:(simu.now-1)/10000, y:theChart.predictedInvValue});
	//        theChart.predictedInvValue = theChart.predictedInv();
	//        this.chart.data.datasets[2].data.push(
	//            {x:(simu.now/10000), y:theChart.predictedInvValue});
	//        this.chart.update();
	//     },
	//     predictedInv: function (){
	////        return (theSimulation.serviceRV.mean)/(theSimulation.interarrivalRV.mean);
	//     }
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