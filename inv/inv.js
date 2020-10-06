/*
	TioX a set of Animations for Operations Management
    Copyright (C) 2020  Gregory Dobson
	gregory.c.dobson@gmail.com

    GPL-3.0-or-later
	This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/		
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
	sliders, presets
}
from '../modules/rhs.js';
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
import {
	TioxGraph
}
from "../modules/graph.js";
class InvGraph extends TioxGraph {
	constructor(){
		super('chart',.3, {width:12, step:3}, d=>d.t);
		this.predictedInvValue = null;
		this.setTitle('Inventory');
		this.setupLine(0, d => d.i, 'rgba(0,0,220,1)',
					   true, true, 3, 0);
		this.setLegend(0, 'On Hand');
		this.setupLine(1, d => d.ip, 'rgba(0,150,0,1)',
					   true, true, 3, 0);
		this.setLegend(1,'On Hand and On Order');
		this.setupLine(2, d => d.p, 'rgb(185, 26, 26)',
					   true, false, 3, 0);
		this.setLegend(2,'Predicted On Hand Inventory');	
	};
	
	push (t, inv, invPosition){
		this.predictedInvValue = this.computePredInv();
		t /= tioxTimeConv;
		let p = {t: t, i: inv,
				 ip: invPosition,
				 p: this.predictedInvValue};
		this.drawOnePoint(p);
	};
	
	reset(){
		let maxI = ( simu.whichRule == 'methRop' ?
					 theSimulation.rop + theSimulation.quantityOrdered + 1:
					 theSimulation.upto+1 );
		super.reset(maxI);
		const v = document.getElementById('speed').value;
		const f = speeds[v].graph;
		this.updateForSpeed(f);
	};
	updateForSpeed (factor){
		this.scaleXaxis(factor);
	};
	computePredInv () {
		let avgInv;
		
		const P = theSimulation.period;
		const L = theSimulation.leadtimeRV.mean;
		const R = theSimulation.arrivalRV.rate;
		if (simu.whichRule == 'methUpto') {
			const U = theSimulation.upto;
			if ( U > R * (P + L) ){
				avgInv = U - R * (L + P/ 2);
			} else {
				const t = P - L + U / R;
				avgInv = R * t * t / (P * 8);
			}
		} else {  //methRop
			const Q = theSimulation.quantityOrdered;
			const SS = theSimulation.rop - R * L;
			if ( SS >= 0 ) {
				avgInv =  Q / 2 + SS;
			} else {
				avgInv = (Q / 2) * (Q / (Q - SS))
			}
		}
		return avgInv;
	};
}
let invGraph;

animSetup();

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
const speeds = [{time:1,graph:1,anim:true},
				{time:2,graph:1,anim:true},
				{time:5,graph:2,anim:true},
				{time:10,graph:2,anim:true},
				{time:25,graph:5,anim:true}];
//const speeds = [1, 2, 5, 10, 15];

function invDecodeURL(str){
	const actionValue = {N:"none", G:"play", S:"pause"};
	const resetValue = {T: true, F: false};
	const whichValue = {R: "methRop", U: "methUpto"}
	return( 
	{ar: str.substring(0,4),
	acv: str.substring(4,8),
	lt: str.substring(8,12),
	ltcv: str.substring(12,16),
	quan: str.substring(16,18),
	rop: str.substring(18,20),
	period: str.substring(20,22),
	upto: str.substring(22,24),
	 speed: str.substring(24,25),
	 action: actionValue[str.substring(25,26)],
	 which: whichValue[str.substring(26,27)],
	 reset: resetValue[str.substring(27,28)],
	 desc: str.substring(28)
	})
};
function invEncodeURL(preset){
	const actionValue = {none: "N", play: "G", pause: "S"};
	return Number(preset.ar).toFixed(1).padStart(4,'0')
	.concat(Number(preset.acv).toFixed(1).padStart(4,'0'), 
		Number(preset.lt).toFixed(1).padStart(4,'0'),
		Number(preset.ltcv).toFixed(1).padStart(4,'0'),
		preset.quan.padStart(2,'0'),
		preset.rop.padStart(2,'0'),
		preset.period.padStart(2,'0'),
		preset.upto.padStart(2,'0'),
		preset.speed,
		actionValue[preset.action],
		(preset.which == "methRop" ? "R" : "U"),
		(preset.reset == "true" ? "T" : "F" ),
		preset.desc);
}

function captureChangeInSliderS(event) {
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
			simu.frameSpeed = speeds[v].time;
			invGraph.updateForSpeed(speeds[v].graph);
			itemCollection.updateForSpeed();
			document.getElementById(id + 'Display')
				.innerHTML = speeds[v].time;
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
	invGraph.reset();
	
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
	document.getElementById('lostSales').innerHTML = '';
	document.getElementById('fillRate').innerHTML = '';
	document.getElementById('serviceLevel').innerHTML = '';
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
		
		invGraph = new InvGraph();

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
		this.totalDemand = null;
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
		this.totalDemand = 0;
		this.nRounds = 0;
		this.roundsWithEnough = 0;
		this.stockout = false;
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

		invGraph.push(simu.now, this.inv,
			this.invPosition);
		// keep track stockouts by round
		this.nRounds++;
		if (!this.stockout) this.roundsWithEnough++;
//		console.log( 'delivery', this.stockout, this.nRounds, this.roundsWithEnough);
		this.stockout = false;
		document.getElementById('serviceLevel').innerHTML =
			( 100*(this.roundsWithEnough/this.nRounds) ).toFixed(0);
	};
	truckDestroy(truck) { //event when truck is finally offStageRight
		truck.destroy();
	};
	pull() { //person arrived at queue, sell one unit.
		let pack = super.pull();
		this.totalDemand++;
		if (pack == null) {
			this.stockout = true;
			this.lostSales++;
		} else {
			this.invPosition--;
			if (this.invPosition <= theSimulation.rop &&
				simu.whichRule == 'methRop') {
				this.orderQuan();
			}
			this.invInDoor--;
			this.inv--;
		};
		document.getElementById('lostSales').innerHTML = this.lostSales;
		document.getElementById('fillRate').innerHTML =
			((1 - this.lostSales / this.totalDemand) * 100).toFixed(0);
		
		invGraph.push(simu.now, this.inv,
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
			y: anim.truck.path.top + point.dy,
				
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
		c.beginPath();
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
	};
//	moveDisplayWithPath(deltaSimT) {
//		if (this.updateBadge) {
//			this.graphic.badgeSet(Math.round((simu.now - this.arrivalTime) / tioxTimeConv).toString())
//		}
//		super.moveDisplayWithPath(deltaSimT);
//	};


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
	Math.seedrandom('this is a Simulation');
	sliders.initialize();
	presets.initialize(invEncodeURL,invDecodeURL);
	simu.initialize(); // the generic
	theSimulation.initialize(); // the specific to inv
	document.getElementById('resetButton').click();
};

document.addEventListener("DOMContentLoaded", initializeAll);