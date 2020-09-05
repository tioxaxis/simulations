"use strict";
// declaration of Globals
const disappointed = {
	color: 'rgb(235, 230, 230)',
	border: 'rgb(31, 105, 245)'
};
const tioxTimeConv = 10000; //time are in milliseconds/10
import {
	GammaRV, UniformRV, DeterministicRV, Heap
}
from '../modules/utility.js';
import {
	animSetup
}
from '../modules/setup.js';
import {
	Queue, WalkAndDestroy, MachineCenter,
	InfiniteMachineCenter, Combine, Item, itemCollection, ItemCollection, BoxStack,
	GStickFigure, NStickFigure, GStore, Package, tioxColors
}
from '../modules/procsteps.js';

simu.whichRule = 'methRop';
animSetup();

simu.sliderTypes = {
	ar: 'range',
	acv: 'range',
	lt: 'range',
	ltcv: 'range',
	quan: 'range',
	rop: 'range',
	period: 'range',
	upto: 'range',
	speed: 'range',
	action: 'radio',
	which: 'radio',
	reset: 'checkbox'
};

simu.precision = {
	ar: 0,
	acv: 1,
	lt: 0,
	ltcv: 1,
	quan: 0,
	rop: 0,
	period: 0,
	upto: 0,
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


function pickInvSimulation(which) {
	let modelUpto = document.getElementById('modelUpto');
	let modelRop = document.getElementById('modelRop');

	switch (which) {
		case 'methRop':
			modelRop.style = 'display:flex';
			modelUpto.style = 'display:none';
			break;
		case 'methUpto':
			modelRop.style = 'display:none';
			modelUpto.style = 'display:flex';
			break;
		default:
			alert('picked inv simulation with ', which);
			debugger;
	}
};

document.getElementById('sliderBigBox')
	.addEventListener('input', captureChangeInSliderS);
const speeds = [1, 2, 5, 10, 15];

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
	//	console.log('in Inv, change Slider ', id);
	switch (id) {

		case 'ar':
			theSimulation.arrivalRV.setRate(Number(v) / tioxTimeConv);
			break;

		case 'acv':
			theSimulation.arrivalRV.setCV(Number(v));
			break;
		case 'lt':
			theSimulation.leadtimeRV.setTime(Number(v) * tioxTimeConv);
			break;
		case 'ltcv':
			theSimulation.leadtimeRV.setCV(Number(v));
			break;
		case 'quan':
			theSimulation.quantityOrdered = Number(v);
			break;
		case 'rop':
			theSimulation.rop = Number(v);
			break;
		case 'period':
			theSimulation.period = Number(v) * tioxTimeConv;
			break;
		case 'upto':
			theSimulation.upto = Number(v);
			break;
		case 'methRop':
		case 'methUpto':
			let temp = simu.whichRule;
			simu.whichRule = id;
			//			console.log('the rule switched from ', temp, ' to ', id);

			if (temp != simu.whichRule) {
				pickInvSimulation(simu.whichRule);
				simu.reset();
			}
			break;
		case 'speed':
			simu.frameSpeed = speeds[v];
			theChart.continue();
			itemCollection.updateForSpeed();
			document.getElementById(id + 'Display')
				.innerHTML = speeds[v];
			break;
		case 'none':
		case 'pause':
		case 'play':
		case 'reset':
			break;
		default:
			alert(' captureChangeInSliderS reached part for default');
			debugger;
			break;
	}
}



simu.reset2 = function () {
	itemCollection.reset();
	theChart.reset();
	theProcessCollection.reset();
	itemCollection.moveDisplayAll(0); //display all at start.
	gSF = new GStickFigure(anim.stage.foreContext,
		anim.person.height,
		anim.box.size);
	// schedule the initial Person to arrive and start the simulation/animation.
	theSimulation.supply.previous = null;
	theSimulation.creator.knockFromPrevious();
	//fudge to get animation started quickly
	let t = simu.heap.top().time - 1;
	simu.now = simu.frameNow = t;
	if (simu.whichRule == 'methUpto') {
		simu.heap.push({
			time: 0 + theSimulation.period,
			type: 'next order',
			proc: theSimulation.store.orderUpto
				.bind(theSimulation.store),
			item: null
		});
	}
};

//  One variable for each process step or queue
//  that contains the functions to do the specific
//  animation for that process step

const animForQueue = {
	walkingTime1: (anim.person.path.right - anim.person.path.left) / anim.stage.normalSpeed,
	walkingTime2: (anim.person.path.mid - anim.person.path.top) / anim.stage.normalSpeed,
	walkingTime: ((anim.person.path.right - anim.person.path.left) +
		(anim.person.path.mid - anim.person.path.top)) / anim.stage.normalSpeed,

	reset: function () {},

	join: function (qLength, arrivalTime, person) {
		person.addPath({
			t: arrivalTime - this.walkingTime2,
			x: anim.person.path.right,
			y: anim.person.path.top
		});
		person.addPath({
			t: arrivalTime,
			x: anim.person.path.right,
			y: anim.person.path.mid
		});
	},
	arrive: function (nSeatsUsed, person) {},

	leave: function (procTime, nSeatsUsed) {}
};
const animForStore = {
	walkingTime: (anim.person.path.bot - anim.person.path.top) / anim.stage.normalSpeed,
	reset: function () {},
	start: function () {
		person.addPath({
			t: arrivalTime - this.walkingTime,
			x: anim.person.path.right,
			y: anim.person.path.bot
		});
	}
}

const animForSeller = {
	start: function (person, pack, walkingTime) {
		person.addPath({ //walk to bot
			t: simu.now + walkingTime,
			x: anim.person.path.right,
			y: anim.person.path.bot
		});
		const leftTime = walkingTime / 2;
		if (pack) {
			pack.addPath({
				t: simu.now + leftTime,
				x: anim.person.path.right + person.graphic.gSF.package.x,
				y: pack.cur.y
			});
			pack.addPath({ // move up to arm height in other time
				t: simu.now + walkingTime,
				x: anim.person.path.right + person.graphic.gSF.package.x,
				y: anim.person.path.bot + person.graphic.gSF.package.y,
			});
		}
	},
	finish: function (person, pack) {
		if (pack) {
			person.graphic.packageVisible = true;
			person.graphic.packageColor = pack.graphic.color;
		} else {
			person.graphic.color = disappointed.color;
			person.graphic.bdaryColor = disappointed.border;
		}
	}
};

const animForWalkOffStage = {
	walkingTime: (anim.person.path.right - anim.person.path.left) / anim.stage.normalSpeed,

	start: function (person) {
		person.addPath({
			t: simu.now + this.walkingTime,
			x: anim.person.path.left,
			y: anim.person.path.bot
		});
	}
};

var theProcessCollection = new ProcessCollection();

const theSimulation = {
	arrivalRV: null,
	serviceRV: null,

	// the 5 process steps in the simulation
	supply: null,
	queue: null,
	walkOffStage: null,
	store: null,
	seller: null,


	// Q,R Model quantities
	quantityOrdered: null,
	rop: null,

	// order-up-to model quantities 
	period: null,
	upto: null,

	initialize: function () {
		pickInvSimulation(simu.whichRule);

		// random variables
		let ar = Number(document.getElementById('ar').value);
		let acv = Number(document.getElementById('acv').value);
		theSimulation.arrivalRV = new GammaRV(ar / tioxTimeConv, acv);
		theSimulation.serviceRV =
			new DeterministicRV(animForQueue.walkingTime2);
		let lt = Number(document.getElementById('lt').value);
		let ltcv = Number(document.getElementById('ltcv').value);
		theSimulation.leadtimeRV = new GammaRV(1 / (lt * tioxTimeConv), ltcv);

		theSimulation.quantityOrdered = Number(
			document.getElementById('quan').value);
		theSimulation.rop = Number(
			document.getElementById('rop').value);
		theSimulation.period = Number(
			document.getElementById('period').value) * tioxTimeConv;
		theSimulation.upto = Number(
			document.getElementById('upto').value);

		//queues
		this.supply = new Supplier(anim.person.path.left,
			anim.person.path.top);

		this.queue = new Queue("theQueue", -1,
			animForQueue.walkingTime,   
			animForQueue,
			null, null);

		this.walkOffStage = new WalkAndDestroy("walkOff", animForWalkOffStage, true);

		this.store = new RopStore(anim);

		//machine centers 
		this.creator = new MachineCenter("creator",
			1, theSimulation.arrivalRV,
			this.supply, this.queue,
			null);

		this.seller = new Combine('seller',
			theSimulation.serviceRV,
			this.queue, this.store, this.walkOffStage,
			animForSeller);


		//link the queue to machine before and after
		this.queue.setPreviousNext(
			this.creator, this.seller);

		// put all the process steps with visible people in theProcessCollection
		//        theProcessCollection.push(this.creator);
		theProcessCollection.push(this.creator);
		theProcessCollection.push(this.queue);
		theProcessCollection.push(this.seller);
		theProcessCollection.push(this.store);
		theProcessCollection.push(this.walkOffStage);
	}, //end of initialize
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

class RopStore extends GStore {
	constructor(anim) {
		super(anim);
		this.name = 'ropRetail'

		//stats for performance of store
		this.inv = null;
		this.invInDoor = null;
		this.invPosition = null;
		this.lostSales = null;
		this.nRounds = null;
		this.roundsWithEnough = null;
		this.packages = []; //the packages in the store.
	};
	reset() {
		// start with the store filled in the first round.
		super.reset();
		if (simu.whichRule == 'methRop')
			this.inv = theSimulation.quantityOrdered;
		else
			this.inv = theSimulation.upto;

		this.invInDoor = this.inv;
		this.invPosition = this.inv;

		for (let k = 0; k < this.inv; k++)
			this.addNew();
		this.lostSales = 0;
		this.nRounds = 1;
		this.roundsWithEnough = 1;
		this.stockOut = false;
	};
	truckAtDoor(item) {
		item.truck.graphic.setReverse();
		item.load.graphic.setReverse();
		item.load.cur.x -=
			anim.truck.cabWidth;
		const n = item.load.graphic.packages.length;
		
		let topOfInventory = anim.store.bot - anim.box.space *
			Math.ceil(this.invInDoor / anim.box.perRow);
		this.invInDoor += n;
		item.load.addPath({
			t: item.load.arrivalTime,
			x: anim.store.left,
			y: topOfInventory
		});
	};
	truckArrival(item) {
		// final steps after inventory almost in store.
		let load = item.load;
		let truck = item.truck;
		const n = load.graphic.packages.length;
		for (let k = 0; k < n; k++) {
			let point = this.boxStack.relCoord(this.inv + k);
			load.graphic.packages[k].cur.x = anim.store.left + point.x;
			load.graphic.packages[k].cur.y = anim.store.bot + point.y;
			load.graphic.packages[k].graphic
				.moveTo(this.left + point.x, anim.store.bot + point.y);
		}
		load.graphic.packages.forEach(p => {
			p.inBatch = false
		});
		this.packages.push(...load.graphic.packages);
		load.graphic.packages = [];
		load.destroy();
		this.inv += n;

		theChart.push(simu.now, this.inv,
			this.invPosition);
		// keep track stockouts by round
		this.nRounds++;
		if (!this.stockOut) this.roundsWithEnough++;
		this.stockOut = false;
	};
	truckDestroy(truck) { //event when truck is finally offStageRight
		truck.destroy();
	};
	pull() { //person arrived at queue, sell one unit.
		let pack = super.pull()
		if (pack == null) {
			this.stockout = true;
		} else {
			this.invPosition--;
			if (this.invPosition <= theSimulation.rop &&
				simu.whichRule == 'methRop') {
				this.orderQuan();
			}
			this.invInDoor--;
			this.inv--;
		}
		theChart.push(simu.now, this.inv,
			this.invPosition);
		return pack;
	};

	orderQuan() {
		this.createDelivery(theSimulation.quantityOrdered);
	};
	orderUpto() {
		simu.heap.push({
			time: simu.now + theSimulation.period,
			type: 'next order',
			proc: this.orderUpto.bind(this),
			item: null
		});
		let quantity = Math.max(0, theSimulation.upto - this.invPosition);
		if (quantity > 0) this.createDelivery(quantity);
	};

	createDelivery(quantity) {
		this.invPosition += quantity;
		const truck = new Truck(anim);
		const truckLT = theSimulation.leadtimeRV.observe();
		const timeMoveDown1 = Math.min(2000, truckLT / 6);
		const timeMoveDown2 = Math.min(4000, truckLT / 3);
		const frac = timeMoveDown1 / (timeMoveDown1 + timeMoveDown2);


		const delta = truck.deltaPointFlatBed();
		const load = new LoadOfBoxes(anim.stage.foreContext,
			truck.cur.x + delta.dx, truck.cur.y + delta.dy, quantity, anim.box);

		const timeTravel = truckLT - timeMoveDown1 - timeMoveDown2;
		const atDoorTime = simu.now + timeTravel;
		const splitTime = simu.now + timeTravel + timeMoveDown1;
		load.arrivalTime = simu.now + truckLT;

		simu.heap.push({
			time: atDoorTime,
			type: 'truck AtDoor',
			proc: this.truckAtDoor.bind(this),
			item: {
				truck: truck,
				load: load
			}
		});
		simu.heap.push({
			time: load.arrivalTime,
			type: 'truck arrival',
			proc: this.truckArrival.bind(this),
			item: {
				truck: truck,
				load: load
			}
		});
		simu.heap.push({
			time: load.arrivalTime + timeTravel,
			type: 'truck return',
			proc: this.truckDestroy.bind(this),
			item: truck
		});
		truck.addPath({
			t: atDoorTime - 20,
			x: anim.truck.path.left,
			y: anim.truck.path.top
		});
		truck.addPath({
			t: load.arrivalTime,
			x: anim.truck.path.left,
			y: anim.truck.path.bot
		});
		truck.addPath({
			t: load.arrivalTime + timeTravel,
			x: anim.truck.path.right,
			y: anim.truck.path.bot
		});

		let point = truck.deltaPointFlatBed();
		let topOfInventory = anim.store.bot - anim.box.space *
			Math.ceil(this.invInDoor / anim.box.perRow);

		load.addPath({
			t: atDoorTime - 20,
			x: anim.truck.path.left + point.dx,
			y: Math.min(anim.truck.path.top + point.dy,
				topOfInventory)
		});


		load.addPath({
			t: splitTime,
			x: anim.truck.path.left,
			y: Math.min(anim.truck.path.top + point.dy +
				frac * (anim.truck.path.bot - anim.truck.path.top),
				topOfInventory)
		});
	};
};

const pi2 = 2 * Math.PI;
class Truck extends Item {
	constructor(anim) {
		
		super(anim.truck.path.right, anim.truck.path.top);
		this.anim = anim;
		this.graphic = new FlatBed(anim);
	};
	deltaPointFlatBed() {
		return {
			dx: this.anim.truck.cabWidth,
			dy: this.anim.truck.height -
				0.75 * this.anim.box.space
		}
	}
};
class FlatBed {
	constructor(anim) {
		this.anim = anim;
		this.reverse = 0;
		
	};

	moveTo(x, y) {
		this.x = Math.floor(x);
		this.y = Math.floor(y);
	};
	setReverse() {
		this.reverse = this.anim.truck.cabWidth + this.anim.truck.bedWidth;
	}

	draw() {
		let c = this.anim.stage.foreContext;
		c.save();
		if (this.reverse) {
			c.translate(2 * (this.x) + this.reverse, 0);
			c.scale(-1, 1);
		};
		c.fillStyle = 'lightgrey';
		c.strokeStyle = 'black';
		c.lineWidth = 2;

		//body
		c.moveTo(this.x, this.y + this.anim.truck.height);
		c.lineTo(this.x + this.anim.truck.width, this.y + this.anim.truck.height);
		c.lineTo(this.x + this.anim.truck.width, this.y + this.anim.truck.height - 0.75 * this.anim.box.space);
		c.lineTo(this.x + this.anim.truck.cabWidth, this.y + this.anim.truck.height - 0.75 * this.anim.box.space);
		c.lineTo(this.x + this.anim.truck.cabWidth, this.y);
		c.lineTo(this.x + this.anim.truck.cabWidth / 2, this.y);
		c.lineTo(this.x, this.y + this.anim.truck.height / 2);
		c.lineTo(this.x, this.y + this.anim.truck.height);
		c.closePath();
		c.stroke();
		c.fill();

		//wheels  
		c.beginPath();
		c.arc(this.x + this.anim.truck.cabWidth / 2,
			this.y + this.anim.truck.height,
			this.anim.box.space / 2, 0, pi2);
		c.stroke();
		c.fill();

		c.beginPath();
		c.arc(this.x + this.anim.truck.width - this.anim.truck.cabWidth / 2,
			this.y + this.anim.truck.height,
			this.anim.box.space / 2, 0, pi2);
		c.stroke();
		c.fill();

		c.restore();
	};
};

class LoadOfBoxes extends Item {
	constructor(context, left, bot, quantity, box) {
		super(left, bot);
		this.graphic = new DisplayBoxes(context, left, bot,
			quantity, box);
	};
};

class DisplayBoxes {
	constructor(ctxDB, left, bot, quantity, box) {
		this.ctxDB = ctxDB;
		this.left = left;
		this.bot = bot;
		this.box = box;
		this.packages = [];
		this.reverse = 0;

		for (let k = 0; k < quantity; k++) {
			let colorIndex = Math.floor(Math.random() * tioxColors.length);
			let pack = new Package(this.ctxDB,
				tioxColors[colorIndex], box.size, 0, 0);
			this.packages.push(pack);
			pack.inBatch = true;
		}
		this.boxStack = new BoxStack(box, false);
	};
	moveTo(left, bot) {
		this.left = Math.floor(left);
		this.bot = Math.floor(bot);
	};
	setReverse() {
		this.reverse = this.box.space * this.box.perRow;
	}
	draw() {
		this.ctxDB.save();
		if (this.reverse) {
			this.ctxDB.translate(2 * (this.left) + this.reverse, 0);
			this.ctxDB.scale(-1, 1);
		};
		for (let i = 0; i < this.packages.length; i++) {
			this.ctxDB.fillStyle = this.packages[i].graphic.color;
			let point = this.boxStack.relCoord(i);
			this.ctxDB.fillRect(
				this.left + point.x,
				this.bot + point.y,
				this.box.size, this.box.size);
		};
		this.ctxDB.restore();
	};
};
var gSF;
export class Person extends Item {
	constructor(x, y, w = 30, h = 30) {
		super(x, y);
		this.width = w;
		this.graphic = new NStickFigure(gSF, x, y);
		this.updateBadge = false;
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

//   TheChart variable is the interface to create
//   the charts using Chart.js

export const theChart = {
	lastpredInv: null,
	lastinv: null,
	lastinvPos: null,
	canvas: null,
	ctx: null,
	chart: null,
	stuff: {
		type: 'scatter',
		data: {
			datasets: [
				{ //*** Series #1
					label: 'On Hand',
					pointBackgroundColor: 'rgb(26, 26, 185)',
					pointBorderColor: 'rgb(26, 26, 185)',
					showLine: true,
					lineTension: 0,
					pointRadius: 0,
					borderColor: 'rgb(26, 26, 185)',
					borderWidth: 3,
					fill: false,

					data: []
                },
				{ //*** Series #2
					label: 'On Hand and On Order',
					pointBackgroundColor: 'rgb(0,150,0)',
					pointBorderColor: 'rgb(0,150,0)',
					showLine: true,
					lineTension: 0,
					pointRadius: 0,
					borderColor: 'rgb(0,150,0)',
					borderWidth: 3,
					fill: false,

					data: [],
                },
				{ //*** Series #3
					label: 'Predicted On Hand',
					pointBackgroundColor: 'rgb(220, 0, 0)',
					pointBorderColor: 'rgb(220, 0, 0)',
					showLine: true,
					hidden: true,
					lineTension: 0,
					pointRadius: 0,
					borderColor: 'rgb(220, 0, 0)',
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
	},
	reset: function () {
		this.lastpredInv = this.computePredInv();
		this.lastinv = 0;
		this.lastinvPos = 0;
		this.stuff.data.datasets[0].data = [];
		this.stuff.data.datasets[1].data = [];
		this.stuff.data.datasets[2].data = [];
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
		//		this.graphScale = Math.max(this.graphScale /* simu.frameSpeed*/ );
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
	push: function (t, inv, invPos) {
		let predInv = this.computePredInv();
		t /= tioxTimeConv;
		if (t > this.graphMax) {
			this.graphMin += this.graphTimeShift;
			this.graphMax += this.graphTimeShift;
			this.chart.options.scales.xAxes[0].ticks.min = this.graphMin;
			this.chart.options.scales.xAxes[0].ticks.max = this.graphMax;
		}
		//        console.log( 'at chart ',t,inv,rt,pI);
		let bigger = Math.max(inv, invPos, predInv);
		if (bigger > this.yAxisScale.max) {
			this.yAxisScale = this.aVAxis.update(bigger);
			this.chart.options.scales.yAxes[0].ticks.max = this.yAxisScale.max;
			this.chart.options.scales.yAxes[0].ticks.stepSize = this.yAxisScale.stepSize;
		}
		if (this.lastinv != inv) {
			this.chart.data.datasets[0].data.push({
				x: t,
				y: this.lastinv
			});
			this.lastinv = inv;
		}
		this.chart.data.datasets[0].data.push({
			x: t,
			y: inv
		});
		if (this.lastinvPos != invPos) {
			this.chart.data.datasets[1].data.push({
				x: t,
				y: this.lastinvPos
			});
			this.lastinvPos = invPos;
		}
		this.chart.data.datasets[1].data.push({
			x: t,
			y: invPos
		});
		if (this.lastpredInv != predInv) {
//			console.log('not equal', t, predInv, this.lastpredInv);
			this.chart.data.datasets[2].data.push({
				x: t,
				y: this.lastpredInv
			});
			this.lastpredInv = predInv;
		}
//		console.log('either way', t, predInv, this.lastpredInv);
		this.chart.data.datasets[2].data.push({
			x: t,
			y: predInv
		});
		this.chart.update();
	},
	computePredInv: function () {
		let avgInv;
		if (simu.whichRule == 'methUpto') {
			avgInv = theSimulation.upto - theSimulation.arrivalRV.rate *
				(theSimulation.leadtimeRV.mean + theSimulation.period / 2);
		} else {
			avgInv = theSimulation.quantityOrdered / 2 +
				theSimulation.rop - theSimulation.arrivalRV.rate * theSimulation.leadtimeRV.mean;
		}
		return avgInv;
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
};
window.addEventListener('resize', resizeChart);
