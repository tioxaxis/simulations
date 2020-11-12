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

// declaration of Globals
const disappointed = {
	color: 'rgb(235, 230, 230)',
	border: 'rgb(31, 105, 245)'
};
const extraLineColor = 'rgba(138, 84, 171,.5)';
const tioxTimeConv = 10000; //time are in milliseconds/10
import {
	GammaRV, UniformRV, DeterministicRV, Heap
}
from '../mod/util.js';
import {
	displayToggle, OmConcept
}
from '../mod/rhs.js';

import {
	Queue, WalkAndDestroy, MachineCenter,
	InfiniteMachineCenter, Combine, Item, BoxStack,
	GStickFigure, NStickFigure, GStore, Package, tioxColors
}
from "../mod/stepitem.js";
import {
	TioxGraph
}
from "../mod/graph.js";
class InvGraph extends TioxGraph {
	constructor(omConcept){
		super(omConcept,.3, {width:24, step:6}, d=>d.t);
		this.predictedInvValue = null;
		this.setTitle('Inventory');
		this.setupLine(0, d => d.i, 'rgba(0,0,220,1)',
					   true, true, 3, 0);
		this.setLegend(0, 'On Hand');
		this.setupLine(1, d => d.ip, 'rgba(0,150,0,1)',
					   true, true, 3, 0);
		this.setLegend(1,'On Hand and On Order');
		this.setupLine(2, d => d.p, 'rgb(185, 26, 26)',
					   true, false, 10, 0);
		this.setLegend(2,'Predicted On Hand Inventory');
		if( inv.whichRule == 'methRop'){
			const rop = document.getElementById('ropinv');
			this.resetRopLine(Number(rop.value));
		} else {
			const period = document.getElementById('periodinv');
			this.resetPeriodLines(Number(period.value));
		}
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
		let maxI;
		if ( inv.whichRule == 'methRop' ){
			maxI = theSimulation.rop + theSimulation.quantityOrdered + 1;
		} else {
			maxI = theSimulation.upto+1;
		};
		super.reset(maxI);
		const v = document.getElementById('speedinv').value;
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
		if (inv.whichRule == 'methUpto') {
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
	
		
	resetRopLine(y){
		this.setExtraLines(extraLineColor,{min:y},null);
	}
	resetPeriodLines(x){
		this.setExtraLines(extraLineColor,null, {min:x,step:x});
	}
}
const anim = {};
var inv;
var gSF;

function animSetup(){
	anim.stage = { 
	normalSpeed: .10, //.10 pixels per millisecond
	width: 1000,
	height: 300
	};
	anim.person =  {
			width: 40,
			height: 60
	};

	anim.box = {space: 20, size: 16, perRow: 10};
	anim.store = {
			left: 400,
			top: 80,
			stroke: 1,
			width: anim.box.space * anim.box.perRow,
	};
	anim.store.height = anim.store.width;
	anim.store.right = anim.store.left + anim.store.width;
	anim.store.bot = anim.store.top + anim.store.width;

	anim.person.path = {
		left: -100,
		right: anim.store.left - 20,
		top: anim.store.top,
		bot: anim.store.top + anim.box.space * 7,
		mid: anim.store.top + anim.box.space * 3.5,
	};
	anim.truck = {
		height: anim.box.space *5,
		
		bedWidth: anim.box.perRow * anim.box.space,
		
		path:{
			left: anim.store.right,
			right: 1000,
			top: anim.store.top - 2 * anim.box.space,
			bot: anim.store.bot - 5 * anim.box.space,
		}
	};
	anim.truck.cabWidth = anim.truck.height/2;
	anim.truck.width = anim.truck.bedWidth + anim.truck.cabWidth;


};

animSetup();


function invDefine(){
	inv = new OmConcept('inv', invEncodeURL, invDecodeURL, localReset);
	document.getElementById('inv').omConcept = inv;

	document.getElementById('slidersWrapperinv')
	.addEventListener('input', captureChangeInSliderS);
	document.getElementById('ropuptoinv')
	.addEventListener('input', captureChangeInSliderS);
	
	inv.whichRule = 'methRop';

	inv.sliderTypes = {
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

	inv.precision = {
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
	anim.stage.foreContext = document
		.getElementById('foregroundinv')
		.getContext('2d');
	anim.stage.backContext = document
		.getElementById('backgroundinv')
		.getContext('2d');
	inv.stage = anim.stage;
	gSF = new GStickFigure(anim.stage.foreContext,
			anim.person.height, anim.box.size);
	
	inv.tioxTimeConv = tioxTimeConv;
};

function localReset () {
	pickInvSimulation(inv.whichRule);
	inv.itemCollection.moveDisplayAll(0); 
	
	// schedule the initial Person to arrive and start the simulation/animation.
	theSimulation.supply.previous = null;
	theSimulation.creator.knockFromPrevious();
	
	//fudge to get animation started quickly
	let t = inv.heap.top().time - 1;
	inv.now = inv.frameNow = t;
	if (inv.whichRule == 'methUpto') {
		inv.heap.push({
			time: 0 + theSimulation.period,
			type: 'next order',
			proc: theSimulation.store.orderUpto
				.bind(theSimulation.store),
			item: null
		});
	}
	document.getElementById('lostSales').innerHTML = '0';
	document.getElementById('fillRate').innerHTML = '100';
	document.getElementById('serviceLevel').innerHTML = '100';
};

function pickInvSimulation(which) {
	switch (which) {
		case 'methRop':
			displayToggle(['rop1','rop2'], ['upto1','upto2']);
			break;
		case 'methUpto':
			displayToggle(['upto1','upto2'], ['rop1','rop2']);
			break;
		default:
			alert('picked inv simulation with ', which);
			debugger;
	}
};

const speeds = [{time:1,graph:1,anim:true},
				{time:2,graph:1,anim:true},
				{time:5,graph:2,anim:true},
				{time:10,graph:2,anim:true},
				{time:25,graph:5,anim:true},
			   {time:1000,graph:10,anim:false}];

function invDecodeURL(str){
	const actionValue = {N:"none", G:"play", S:"pause"};
	const boolValue = {T: "true", F: "false"};
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
	 reset: boolValue[str.substring(27,28)],
	 leg0:  boolValue[str.substring(28,29)],
	 leg1:  boolValue[str.substring(29,30)],
	 leg2:  boolValue[str.substring(30,31)],
	 desc: str.substring(31)
	})
};
function invEncodeURL(row){
	const actionValue = {none: "N", play: "G", pause: "S"};
	return Number(row.ar).toFixed(1).padStart(4,'0')
	.concat(Number(row.acv).toFixed(1).padStart(4,'0'), 
		Number(row.lt).toFixed(1).padStart(4,'0'),
		Number(row.ltcv).toFixed(1).padStart(4,'0'),
		row.quan.padStart(2,'0'),
		row.rop.padStart(2,'0'),
		row.period.padStart(2,'0'),
		row.upto.padStart(2,'0'),
		row.speed,
		actionValue[row.action],
		(row.which == "methRop" ? "R" : "U"),
		(row.reset == "true" ? "T" : "F" ),
		(row.leg0 == "true" ? "T" : "F"),
		(row.leg1 == "true" ? "T" : "F"),
		(row.leg2 == "true" ? "T" : "F"),	
		row.desc);
}

function captureChangeInSliderS(event) {
	let inputElem = event.target.closest('input');
	if (!inputElem) return

	var idShort = inputElem.id.slice(0,-3);
	if (inputElem.type == 'range') {
		var v = Number(inputElem.value)
			.toFixed(inv.precision[idShort]);
		document.getElementById(idShort + 'invDisplay')
			.innerHTML = v;
	}
	switch (idShort) {
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
			if( inv.whichRule == 'methRop'){
				inv.graph.resetRopLine(Number(v));
				inv.graph.setupThenRedraw();
			}
			break;
		case 'period':
			theSimulation.period = Number(v) * tioxTimeConv;
			if( inv.whichRule == 'methUpto'){
				inv.graph.resetPeriodLines(Number(v));
				inv.graph.setupThenRedraw();
			}
			break;
		case 'upto':
			theSimulation.upto = Number(v);
			break;
		case 'methRop':
		case 'methUpto':
			if( inv.whichRule == idShort )break
			inv.whichRule = idShort;
			if( inv.whichRule == 'methRop'){
				const rop = document.getElementById('ropinv');
				inv.graph.resetRopLine(Number(rop.value));
			} else {
				const period = document.getElementById('periodinv');
				inv.graph.resetPeriodLines(Number(period.value));
			}
			pickInvSimulation(inv.whichRule);
			inv.reset();
			
			break;
		case 'speed':
			inv.adjustSpeed(idShort,v,speeds);
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
			t: inv.now + walkingTime,
			x: anim.person.path.right,
			y: anim.person.path.bot
		});
		const leftTime = walkingTime / 2;
		if (pack) {
			pack.addPath({
				t: inv.now + leftTime,
				x: anim.person.path.right + person.graphic.gSF.package.x,
				y: pack.cur.y
			});
			pack.addPath({ // move up to arm height in other time
				t: inv.now + walkingTime,
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
			t: inv.now + this.walkingTime,
			x: anim.person.path.left,
			y: anim.person.path.bot
		});
	}
};

//var theProcessCollection = new ProcessCollection();

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
		// random variables
		let ar = Number(document.getElementById('arinv').value);
		let acv = Number(document.getElementById('acvinv').value);
		theSimulation.arrivalRV = new GammaRV(ar / tioxTimeConv, acv);
		theSimulation.serviceRV =
			new DeterministicRV(animForQueue.walkingTime2);
		let lt = Number(document.getElementById('ltinv').value);
		let ltcv = Number(document.getElementById('ltcvinv').value);
		theSimulation.leadtimeRV = new GammaRV(1 / (lt * tioxTimeConv), ltcv);
		
		inv.graph = new InvGraph(inv);
		inv.resetCollection.push(inv.graph);
		
		theSimulation.quantityOrdered = Number(
			document.getElementById('quaninv').value);
		theSimulation.rop = Number(
			document.getElementById('ropinv').value);
		theSimulation.period = Number(
			document.getElementById('periodinv').value) * tioxTimeConv;
		theSimulation.upto = Number(
			document.getElementById('uptoinv').value);

		//queues
		this.supply = new Supplier(anim.person.path.left,
			anim.person.path.top);

		this.queue = new Queue(inv,"theQueue", -1,
			animForQueue.walkingTime,   
			animForQueue,
			null, null);
		inv.resetCollection.push(this.queue);

		this.walkOffStage = new WalkAndDestroy(inv, "walkOff", animForWalkOffStage, true);
		inv.resetCollection.push(this.walkOffStage);

		this.store = new RopStore(inv,anim);
		inv.resetCollection.push(this.store);

		//machine centers 
		this.creator = new MachineCenter(inv,"creator",
			1, theSimulation.arrivalRV,
			this.supply, this.queue,
			null);
		inv.resetCollection.push(this.creator);

		this.seller = new Combine(inv,'seller',
			theSimulation.serviceRV,
			this.queue, this.store, this.walkOffStage,
			animForSeller);
		inv.resetCollection.push(this.seller);

		//link the queue to machine before and after
		this.queue.setPreviousNext(
			this.creator, this.seller);
	}, //end of initialize
};


// SUPPLIER
class Supplier {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	};
	pull() {
		return new Person(inv, this.x, this.y		);
	}
}; //end class Supplier

class RopStore extends GStore {
	constructor(omConcept,anim) {
		super(omConcept,anim);
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
		if (inv.whichRule == 'methRop')
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

		inv.graph.push(inv.now, this.inv,
			this.invPosition);
		// keep track stockouts by round
		this.nRounds++;
		if (!this.stockout) this.roundsWithEnough++;
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
				inv.whichRule == 'methRop') {
				this.orderQuan();
			}
			this.invInDoor--;
			this.inv--;
		};
		document.getElementById('lostSales').innerHTML = this.lostSales;
		document.getElementById('fillRate').innerHTML =
			((1 - this.lostSales / this.totalDemand) * 100).toFixed(0);
		
		inv.graph.push(inv.now, this.inv,
			this.invPosition);
		return pack;
	};

	orderQuan() {
		this.createDelivery(theSimulation.quantityOrdered);
	};
	orderUpto() {
		inv.heap.push({
			time: inv.now + theSimulation.period,
			type: 'next order',
			proc: this.orderUpto.bind(this),
			item: null
		});
		let quantity = Math.max(0, theSimulation.upto - this.invPosition);
		if (quantity > 0) this.createDelivery(quantity);
	};

	createDelivery(quantity) {
//		console.log('at create a delivery:', inv.now);
		this.invPosition += quantity;
		inv.graph.push(inv.now, this.inv,
			this.invPosition);
		const truck = new Truck(inv, anim);
		const truckLT = theSimulation.leadtimeRV.observe();
		const timeMoveDown1 = Math.min(2000, truckLT / 6);
		const timeMoveDown2 = Math.min(4000, truckLT / 3);
		const frac = timeMoveDown1 / (timeMoveDown1 + timeMoveDown2);


		const delta = truck.deltaPointFlatBed();
		const load = new LoadOfBoxes(inv, anim.stage.foreContext,
			truck.cur.x + delta.dx, truck.cur.y + delta.dy, quantity, anim.box);

		const timeTravel = truckLT - timeMoveDown1 - timeMoveDown2;
		const atDoorTime = inv.now + timeTravel;
		const splitTime = inv.now + timeTravel + timeMoveDown1;
		load.arrivalTime = inv.now + truckLT;

		inv.heap.push({
			time: atDoorTime,
			type: 'truck AtDoor',
			proc: this.truckAtDoor.bind(this),
			item: {
				truck: truck,
				load: load
			}
		});
		inv.heap.push({
			time: load.arrivalTime+1,  //just ensures truck arrives after pull.
			type: 'truck arrival',
			proc: this.truckArrival.bind(this),
			item: {
				truck: truck,
				load: load
			}
		});
		inv.heap.push({
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
	constructor(omConcept,anim) {
		
		super(omConcept,anim.truck.path.right, anim.truck.path.top);
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
	constructor(omConcept, context, left, bot, quantity, box) {
		super(omConcept, left, bot);
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
			let pack = new Package(inv, this.ctxDB,
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

export class Person extends Item {
	constructor(omConcept, x, y) {
		super(omConcept, x, y);
		this.graphic = new NStickFigure(gSF, x, y);
	};	
}; // end class Person

import {
	genRadio, genPlayResetBox, 
	genSlider, copyMainPage, hideNode
}
from '../mod/genHTML.js';

function invHTML(){	
	copyMainPage('inv');
	 
	//stats line
	const d = document.getElementById('statsWrapperinv');
	
	const d1 = document.createElement('div');
	d1.className ="statDisplay";
	const s1 = document.createElement('span');
	s1.id = 'lostSales'
	d1.append('Lost Sales: ',s1);
	
	const d2 = document.createElement('div');
	d2.className ="statDisplay";
	const s2 = document.createElement('span');
	s2.id = 'fillRate'
	d2.append('Fill Rate: ',s2,'%');
	
	const d3 = document.createElement('div');
	d3.className ="statDisplay";
	const s3 = document.createElement('span');
	s3.id = 'serviceLevel'
	d3.append('Service Level: ',s3,'%');
	d.append(d1,d2,d3);
	
	 
	
	
	
	//method radio boxes at top of rhs
	const e1 = document.createElement('label');
	e1.append('Rule for Orders:');
	const e2 = genRadio('whichinv','Reorder Point','methRopinv','methRop',true);
	const e3 = genRadio('whichinv','Order up to','methUptoinv','methUpto',false);
	
	const ewhich = document.createElement('div');
	ewhich.className = 'ropupto rowAroundCenter';
	ewhich.id = 'ropuptoinv';
	ewhich.append(e1,e2,e3);
	
	let elem = document.getElementById('slidersWrapperinv');
	elem.parentNode.prepend(ewhich);
	
	//now put in the sliders with the play/reset box	
	const rop1 = genSlider('quaninv','Order Quantity = ','24','',
				  24,10,50,1,[10,20,30,40,50]);
	rop1.id = 'rop1';
	const rop2 = genSlider('ropinv','Reorder Point = ','10','',
				  10,5,85,1,[5,25,45,65,85])
	rop2.id = 'rop2';
	const upto1 = genSlider('periodinv','Period = ','3','',
				  3,2,8,1,[2,5,8]);
	upto1.id = 'upto1';
	const upto2 = genSlider('uptoinv','Up to Quantity = ','36','',
				  36,10,90,1,[10,30,50,70,90]);
	upto2.id = 'upto2';
	
	
	elem.append(
		genSlider('arinv','Arrival Rate = ','5','',
				  5,1,9,1,[1,3,5,7,9]),
		genSlider('acvinv','Arrival CV = ','0.0','',
				  0,0,2,.5,['0.0','1.0','2.0']),
		genSlider('ltinv','Lead Time = ','3','',
				  3,2,8,1,[2,5,8] ), 
		genSlider('ltcvinv','Lead Time CV = ','0','',
				  0,0,2,.5,['0.0','1.0','2.0']),
		rop1, rop2,
		hideNode(upto1), hideNode(upto2),
		genPlayResetBox('inv'),
		genSlider('speedinv','Speed = ','1','x',
				  0,0,5,1,["slow",' ',' ',' ',"fast ",' full'])
	);
	
	
	const f = document.getElementById('scenariosMidinv');
	f.style = "max-height: 18vw";
};

export function invStart() {
	invHTML();
	invDefine();
	theSimulation.initialize(); // the specific to inv
	inv.reset();
	return inv;
};
