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


const disappointed = {
	color: 'rgb(235, 230, 230)',
	border: 'rgb(31, 105, 245)'
};
const tioxTimeConv = 1000; //time are in milliseconds

anim.stage = {
	normalSpeed: 0.10, //.25 pixels per millisecond
	width: 1000,
	height: 300,
	foreContext: document
		.getElementById('foreground')
		.getContext('2d'),
	backContext: document
		.getElementById('background')
		.getContext('2d')
};
anim.box = {
	space: 20,
	size: 16,
	perRow: 10
}
anim.person = {
		width: 40,
		height: 3 * anim.box.space
};
anim.store = {
		left: 720,
		top: 80,
		stroke: 1,
	};
anim.store.height = anim.store.width = 
	anim.box.space * anim.box.perRow;
anim.store.right = anim.store.left + anim.store.width;
anim.store.bot = anim.store.top + anim.store.height;


anim.person.path = {
	left: -100,
	right: 700,
	top: anim.store.top,
	bot: anim.store.top + anim.box.space*7,
}
anim.person.path.mid = (anim.person.path.top + anim.person.path.bot) / 2;

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

class ProcessCollection extends Array {
	constructor() {
		super();
	};
	reset() {
		this.forEach(aProcess => aProcess.reset());
	};
}; // end class processCollection

document.getElementById('sliderBigBox')
	.addEventListener('input', captureChangeInSliderS);
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
			simu.frameSpeed = speeds[v];
			nvGraph.updateForSpeed();
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
	document.getElementById('actualPerc').innerHTML ="";
	itemCollection.reset();
	nvGraph.reset();
	theProcessCollection.reset();
	//    totInv = totTime = totPeople = lastArrDep = LBRFcount = 0;
	gSF = new GStickFigure(anim.stage.foreContext,
		anim.person.height, anim.box.size);
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

	arrive: function (nSeatsUsed, person) {

	},

	leave: function (procTime, nSeatsUsed) {}
};

const animForWalkOffStage = {
	walkingTime: (anim.person.path.right - anim.person.path.left) / anim.stage.normalSpeed,

	//    computeWalkingTime: function (){
	//         this.walkingTime = (anim.person.path.right - anim.person.path.left) / anim.stage.normalSpeed;
	//        return this.walkingTime;
	//    },

	start: function (person) {
		person.addPath({
			t: simu.now +
				this.walkingTime,
			x: anim.person.path.left,
			y: anim.person.path.bot
		});
	}
};

const animForCreator = {
	reset: function () {},

	start: function (theProcTime, person, m) { // only 1 machine for creator m=1
		person.setDestWithProcTime(theProcTime,
			anim.person.path.left, anim.person.path.top);
	},

	finish: function () {},
};

const animForNewsVendor = {
	//	walkingTime: animForQueue.walkingTime2;
	start: function (person, pack, walkingTime) {
		person.addPath({ //walk to bot
			t: simu.now + walkingTime,
			x: anim.person.path.right,
			y: anim.person.path.bot
		});
		const leftTime = walkingTime / 2;
		const upTime = walkingTime / 2;

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
		this.supply = new Supplier(anim.person.path.left, anim.person.path.top);

		this.queue = new Queue("theQueue", -1, animForQueue.walkingTime,   
			animForQueue,
			null, null);

		this.store = new RetailStore(anim);

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
			30, anim.person.height);
	}
}; //end class Supplier

const peopleSpacing = 70;
class DemandCreator {
	constructor(cycleLength, demandRV) {
		this.cycleLength = cycleLength;
		this.timeToNV = ((anim.person.path.right - anim.person.path.left) +
			(anim.person.path.bot - anim.person.path.top)) / anim.stage.normalSpeed;
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
		let deltaT = peopleSpacing / anim.stage.normalSpeed;

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
		nvGraph.push(this.nRounds, this.underageForDay, this.overageForDay, this.totCost / this.nRounds);
		setActual(this.enough, this.nRounds);

		theSimulation.store.makeAllGrey();
	}
};


class RetailStore extends GStore {
	constructor(anim) {
		super(anim);
		this.anim = anim;
	};
	addBox(n) {
		for (let i = 0; i < n; i++) {
			this.addNew()
		};
	};
};

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
	nvGraph.setupGraph();
	document.getElementById('resetButton').click();
};


document.addEventListener("DOMContentLoaded", initializeAll);


import {tioxGraph} from "../modules/graph.js";
const nvGraph ={
	push: function (n, under, over, avg) {
			tioxGraph.updateXaxis(n);
			let bigger = Math.max(over, under);
			tioxGraph.updateYaxis(bigger);
			let ds = tioxGraph.chart.data.datasets;
			ds[0].data.push({
				x: n,
				y: under
			});
			ds[1].data.push({
				x: n,
				y: over
			});
			ds[2].data.push({
				x: n,
				y: avg
			});
			tioxGraph.chart.update();
		},
	setupGraph: function(){
		tioxGraph.setLabelColorVisible(0,'underage', 'rgb(185, 26, 26)', true);
		tioxGraph.setLabelColorVisible(1,'overage',
									   'rgba(0,150,0,1)', true);
		tioxGraph.setLabelColorVisible(2,'average cost', 
									   'rgba(0,0,220,1)',true);
		tioxGraph.struc.options.title.text = '$ of cost per day'
		this.reset();	
	},
	reset: function(){
		let dif = theSimulation.demandRV.mean - theSimulation.quantityOrdered;
		let c1 = theSimulation.Cu * (Math.max(0,dif)+1);
		let c2 = theSimulation.Co * (Math.max(0,-dif)+1);
		tioxGraph.reset(12, 9, Math.max(c1,c2) );
		this.updateForSpeed();
	},
	updateForSpeed: function(){
	}
}

