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
	Queue, WalkAndDestroy, MachineCenter,
	InfiniteMachineCenter, Combine, Item, itemCollection, ItemCollection, BoxStack,
	GStickFigure, NStickFigure, GStore, Package, tioxColors
}
from '../modules/procsteps.js';

const theStage = {
	normalSpeed: .10, //.10 pixels per millisecond
	width: 1000,
	height: 300,

	person: {
		width: 40,
		height: 60
	}
};

{
	theStage.store = {
		left: 400,
		top: 80,
		stroke: 1
	};

	theStage.boxSpace = 20;
	theStage.boxSize = 16,
		theStage.boxesPerRow = 10;
	theStage.store.width = theStage.boxSpace * theStage.boxesPerRow;
	theStage.store.right = theStage.store.left + theStage.store.width;
	theStage.store.bot = theStage.store.top + theStage.store.width;
	theStage.pathLeft = -100;
	theStage.truckLeft = theStage.store.right;
	theStage.truckRight = 1000;
	theStage.truckTop = theStage.store.top - 2 * theStage.boxSpace;
	theStage.truckBot = theStage.store.bot - 5 * theStage.boxSpace
	theStage.pathRight = theStage.store.left - 20;
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
};


simu.framedelta = 200;
simu.framedeltaFor1X = 200;
simu.whichRule = 'methRop';


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
document.getElementById('ropupto').addEventListener('input', captureChangeInSliderS);

function switchOrderMethod(event) {
	let inputElem = event.target.closest('input');
	console.log('*** in INV Switch Order Method');
	if (!inputElem) return;
	if (event.isTrusted) {
		let id = event.target.id;
		let v = inputElem.value;
		let t = inputElem.type;
		// t should be "radio"
		simu.whichRule = v;
		pickInvSimulation(simu.whichRule)
		simu.reset();
	}
};

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

document.getElementById('sliderBigBox').addEventListener('input', captureChangeInSliderS);
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
	console.log('in Inv, change Slider ', id);
	switch (id) {

		case 'ar':
			theSimulation.arrivalRV.setRate(Number(v) / tioxTimeConv);
			updatePredInv();
			//            setExpected(theSimulation.quantityOrdered,
			//                        theSimulation.arrivalRV.rate,
			//                        theSimulation.arrivalRV.CV);
			break;

		case 'acv':
			theSimulation.arrivalRV.setCV(Number(v));
			break;
		case 'lt':
			theSimulation.leadtimeRV.setTime(Number(v) * tioxTimeConv);
			updatePredInv();
			break;
		case 'ltcv':
			theSimulation.leadtimeRV.setCV(Number(v));
			break;
		case 'quan':
			theSimulation.quantityOrdered = Number(v);
			updatePredInv();
			break;
		case 'rop':
			theSimulation.rop = Number(v);
			updatePredInv();
			break;
		case 'period':
			theSimulation.period = Number(v) * tioxTimeConv;
			updatePredInv();
			break;
		case 'upto':
			theSimulation.upto = Number(v);
			updatePredInv();
			break;
		case 'methRop':
		case 'methUpto':
			let temp = simu.whichRule;
			simu.whichRule = id;
			console.log('the rule switched from ', temp, ' to ', id);

			if (temp != simu.whichRule) {
				pickInvSimulation(simu.whichRule);
				simu.reset();
			}
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

function updatePredInv() {
	theSimulation.predInv = theSimulation.quantityOrdered / 2 +
		theSimulation.rop - theSimulation.arrivalRV.rate * theSimulation.leadtimeRV.mean;
}

simu.reset2 = function () {

	itemCollection.reset();
	theChart.reset();
	theProcessCollection.reset();

	itemCollection.moveDisplayAll(0); //display all at start.
	gSF = new GStickFigure(simu.context,
		theStage.person.height,
		theStage.boxSize);
	// schedule the initial Person to arrive and start the simulation/animation.
	theSimulation.supply.previous = null;
	theSimulation.creator.knockFromPrevious();
	//fudge to get animation started quickly
	let t = simu.heap.top().time - 1;
	simu.now = simu.frametime = Math.floor(t / simu.framedelta) * simu.framedelta;
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
	arrive: function (nSeatsUsed, person) {},

	leave: function (procTime, nSeatsUsed) {}
};
const animForStore = {
	walkingTime: (theStage.pathBot - theStage.pathTop) / theStage.normalSpeed,

	reset: function () {},
	start: function () {
		person.addPath({
			t: arrivalTime - this.walkingTime,
			x: theStage.pathRight,
			y: theStage.pathBot
		});
	}
}

const animForSeller = {
	start: function (person, pack, walkingTime) {
		person.addPath({ //walk to bot
			t: simu.now + walkingTime,
			x: theStage.pathRight,
			y: theStage.pathBot
		});
		const leftTime = walkingTime / 2;
		if (pack) {
			pack.addPath({
				t: simu.now + leftTime,
				x: theStage.pathRight + person.graphic.gSF.package.x,
				y: pack.cur.y
			});
			pack.addPath({ // move up to arm height in other time
				t: simu.now + walkingTime,
				x: theStage.pathRight + person.graphic.gSF.package.x,
				y: theStage.pathBot + person.graphic.gSF.package.y,
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
	walkingTime: (theStage.pathRight - theStage.pathLeft) / theStage.normalSpeed,

	start: function (person) {
		person.addPath({
			t: simu.now + this.walkingTime,
			x: theStage.pathLeft,
			y: theStage.pathBot
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
		this.supply = new Supplier(theStage.offStageEntry.x,
			theStage.offStageEntry.y);

		this.queue = new Queue("theQueue", -1,
			animForQueue.walkingTime,   
			animForQueue,
			null, null);

		this.walkOffStage = new WalkAndDestroy("walkOff", animForWalkOffStage, true);

		this.store = new RopStore(
			simu.backcontext, simu.context,
			theStage.store.left, theStage.store.top,
			theStage.boxSpace, theStage.boxSize, theStage.boxesPerRow);

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
		return new Person(this.x, this.y, 30, theStage.person.height);
	}
}; //end class Supplier

class RopStore extends GStore {
	constructor(backcontext, context, left, top,
		boxSpace, boxSize, boxesPerRow) {
		super(backcontext, context, left, top,
			boxSpace, boxSize, boxesPerRow);
		this.name = 'ropRetail'

		//stats for performance of store
		this.inv = null;
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

		this.invPosition = this.inv;
		updatePredInv();

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
			item.truck.graphic.truckCabWidth;

		let topOfInventory = this.store.bot - this.store.boxSpace *
			Math.ceil(this.inv / this.store.boxesPerRow);

		item.load.addPath({
			t: item.load.arrivalTime,
			x: theStage.store.left,
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
			load.graphic.packages[k].cur.x = this.left + point.x;
			load.graphic.packages[k].cur.y = this.bot + point.y;
			load.graphic.packages[k].graphic
				.moveTo(this.left + point.x, this.bot + point.y);
		}
		load.graphic.packages.forEach(p => {
			p.inBatch = false
		});
		this.packages.push(...load.graphic.packages);
		load.graphic.packages = [];
		load.destroy();
		this.inv += n;

		theChart.push(simu.now, this.inv,
			this.invPosition, theSimulation.predInv);
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
			this.inv--;
		}
		theChart.push(simu.now, this.inv,
			this.invPosition, theSimulation.predInv);
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
		const truck = new Truck(simu.context,
			theStage.boxSpace, 10);
		const truckLT = theSimulation.leadtimeRV.observe();
		const timeMoveDown1 = Math.min(2000, truckLT / 6);
		const timeMoveDown2 = Math.min(4000, truckLT / 3);
		const frac = timeMoveDown1 / (timeMoveDown1 + timeMoveDown2);


		const delta = truck.deltaPointFlatBed();
		const load = new LoadOfBoxes(simu.context,
			truck.cur.x + delta.dx, truck.cur.y + delta.dy, quantity, theStage.boxSpace, theStage.boxSize, 10);

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
			x: theStage.truckLeft,
			y: theStage.truckTop
		});
		truck.addPath({
			t: load.arrivalTime,
			x: theStage.truckLeft,
			y: theStage.truckBot
		});
		truck.addPath({
			t: load.arrivalTime + timeTravel,
			x: theStage.truckRight,
			y: theStage.truckBot
		});

		let point = truck.deltaPointFlatBed();
		let topOfInventory = this.store.bot - this.store.boxSpace *
			Math.ceil(this.inv / this.store.boxesPerRow);

		load.addPath({
			t: atDoorTime - 20,
			x: theStage.truckLeft + point.dx,
			y: Math.min(theStage.truckTop + point.dy,
				topOfInventory)
		});


		load.addPath({
			t: splitTime,
			x: theStage.truckLeft,
			y: Math.min(theStage.truckTop + point.dy +
				frac * (theStage.truckBot - theStage.truckTop),
				topOfInventory)
		});
	};

};

const pi2 = 2 * Math.PI;
class Truck extends Item {
	constructor(ctxTruck, boxSpace, bedLength = 10) {
		super(theStage.truckRight, theStage.truckTop);
		this.graphic = new FlatBed(ctxTruck, boxSpace, bedLength, );
	};
	deltaPointFlatBed() {
		return {
			dx: this.graphic.truckCabWidth,
			dy: this.graphic.truckHeight -
				0.75 * this.graphic.boxSpace
		}
	}
};
class FlatBed {
	constructor(context, boxSpace, bedLength) {
		this.ctx = context;
		this.boxSpace = boxSpace;
		this.truckHeight = this.boxSpace * 5;
		this.truckCabWidth = this.truckHeight / 2;
		this.truckBedWidth = bedLength * this.boxSpace;
		this.truckWidth = this.truckBedWidth + this.truckCabWidth;
		this.reverse = 0;
	};

	moveTo(x, y) {
		this.x = Math.floor(x);
		this.y = Math.floor(y);
	};
	setReverse() {
		this.reverse = this.truckCabWidth + this.truckBedWidth;
	}


	draw() {
		this.ctx.save();
		if (this.reverse) {
			this.ctx.translate(2 * (this.x) + this.reverse, 0);
			this.ctx.scale(-1, 1);
		};
		this.ctx.fillStyle = 'lightgrey';
		this.ctx.strokeStyle = 'black';
		this.ctx.lineWidth = 2;

		//body
		this.ctx.moveTo(this.x, this.y + this.truckHeight);
		this.ctx.lineTo(this.x + this.truckWidth, this.y + this.truckHeight);
		this.ctx.lineTo(this.x + this.truckWidth, this.y + this.truckHeight - 0.75 * this.boxSpace);
		this.ctx.lineTo(this.x + this.truckCabWidth, this.y + this.truckHeight - 0.75 * this.boxSpace);
		this.ctx.lineTo(this.x + this.truckCabWidth, this.y);
		this.ctx.lineTo(this.x + this.truckCabWidth / 2, this.y);
		this.ctx.lineTo(this.x, this.y + this.truckHeight / 2);
		this.ctx.lineTo(this.x, this.y + this.truckHeight);
		this.ctx.closePath();
		this.ctx.stroke();
		this.ctx.fill();

		//wheels  
		this.ctx.beginPath();
		this.ctx.arc(this.x + this.truckCabWidth / 2,
			this.y + this.truckHeight,
			this.boxSpace / 2, 0, pi2);
		this.ctx.stroke();
		this.ctx.fill();

		this.ctx.beginPath();
		this.ctx.arc(this.x + this.truckWidth - this.truckCabWidth / 2,
			this.y + this.truckHeight,
			this.boxSpace / 2, 0, pi2);
		this.ctx.stroke();
		this.ctx.fill();

		this.ctx.restore();
	};
	//	drawPackages(left, bot) {
	//		for (let i = 0; i < this.packages.length; i++) {
	//			this.ctx.fillStyle = this.packages[i].graphic.color;
	//			let point = this.boxStack.relCoord(i);
	//			this.ctx.fillRect(
	//				left + point.x, bot + point.y,
	//				this.boxSize, this.boxSize);
	//		}
	//	};
};

class LoadOfBoxes extends Item {
	constructor(context, left, bot, quantity,
		boxSpace, boxSize, bedlength) {
		super(left, bot);
		this.graphic = new DisplayBoxes(context, left, bot,
			quantity, boxSpace, boxSize, bedlength);
	};
};

class DisplayBoxes {
	constructor(ctxDB, left, bot, quantity,
		boxSpace, boxSize, bedlength) {
		this.ctxDB = ctxDB;
		this.left = left;
		this.bot = bot;
		this.boxSpace = boxSpace;
		this.boxSize = boxSize;
		this.bedlength = bedlength;
		this.packages = [];
		this.reverse = 0;

		for (let k = 0; k < quantity; k++) {
			let colorIndex = Math.floor(Math.random() * tioxColors.length);
			let pack = new Package(this.ctxDB,
				tioxColors[colorIndex], boxSize, 0, 0);
			this.packages.push(pack);
			pack.inBatch = true;
		}
		this.boxStack = new BoxStack(boxSpace, boxSize,
			bedlength, false);
	};
	moveTo(left, bot) {
		this.left = Math.floor(left);
		this.bot = Math.floor(bot);
	};
	setReverse() {
		this.reverse = this.boxSpace * this.bedlength;
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
				this.boxSize, this.boxSize);
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

//   TheChart variable is the interface to create
//   the charts using Chart.js

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
					label: 'on Hand and On Order',
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
				text: 'inventory',
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
		//        this.predictedInvValue = this.predictedInv();
	},
	reset: function () {
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
		this.graphScale = Math.max(this.graphScale, /* simu.frameSpeed*/ );
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
	push: function (t, inv, invPos, predInv) {

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
		this.chart.data.datasets[2].data.push({
			x: t,
			y: predInv
		});
		this.chart.update();
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
