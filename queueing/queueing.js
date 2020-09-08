'use strict';
import {
	GammaRV, Heap
}
from "../modules/utility.js";
import {
	animSetup
}
from '../modules/setup.js';
import {
	Queue, WalkAndDestroy, MachineCenter,
	InfiniteMachineCenter, Item, itemCollection, ItemCollection,
	GStickFigure, NStickFigure
}
from "../modules/procsteps.js";
const tioxTimeConv = 10000; //rates in tiox are k/10 seconds
anim.stage = {
	normalSpeed: .10, 
	width: 1000,
	height: 300
}
anim.stage.foreContext = document
		.getElementById('foreground')
		.getContext('2d');
	anim.stage.backContext = document
		.getElementById('background')
		.getContext('2d');

anim.person = {
	width: 40,
	height: 60,
	path: {
		left: -100,
		right: anim.stage.width * 1.1,
		headQueue: anim.stage.width * 0.7,
		scanner: anim.stage.width * 0.75,
		pastScanner: anim.stage.width * .75,
		top: 100,
	}
};
anim.scannerDelta = {
  	dx: 0,
	dy: anim.person.height * 1.8
};




// specific info for queueing needed by general routines
// in procsteps and rhs.
simu.sliderTypes = {
	ar: 'range',
	acv: 'range',
	sr: 'range',
	scv: 'range',
	speed: 'range',
	action: 'radio',
	reset: 'checkbox'
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

var qLenDisplay = null;

document.getElementById('sliderBigBox').addEventListener('input', captureChangeInSliderS);
const precision = {
	ar: 1,
	acv: 1,
	sr: 1,
	scv: 1,
	speed: 0
}
const speeds = [1, 2, 5, 10, 25];

function captureChangeInSliderS(event) {
	//    console.log('is event '+(event.isTrusted?'real':'scripted'));
	let inputElem = event.target.closest('input');
	if (!inputElem) return

	var id = inputElem.id;
	if (inputElem.type == 'range') {
		var v = Number(inputElem.value)
			.toFixed(precision[id]);
		document.getElementById(id + 'Display')
			.innerHTML = v;
	}
	switch (id) {
		case 'ar':
			theSimulation.interarrivalRV
				.setRate(v / tioxTimeConv);
			simu.heap.modify('finish/creator', simu.now, 
							 theSimulation.interarrivalRV);
			queueGraph.updatePredictedWait();
			break;

		case 'acv':
			theSimulation.interarrivalRV.setCV(v);
			simu.heap.modify('finish/creator', simu.now,
							 theSimulation.interarrivalRV);
			queueGraph.updatePredictedWait();

			break;

		case 'sr':
			theSimulation.serviceRV
				.setRate(v / tioxTimeConv);
			simu.heap.modify('finish/TSAagent', simu.now, 
							 theSimulation.serviceRV);
			queueGraph.updatePredictedWait();
			break;

		case 'scv':
			theSimulation.serviceRV.setCV(v);
			simu.heap.modify('finish/TSAagent', simu.now, 
							 theSimulation.serviceRV);
			queueGraph.updatePredictedWait();
			break;

		case 'speed':
			simu.frameSpeed = speeds[v];
			queueGraph.updateForSpeed();
			itemCollection.updateForSpeed();
			document.getElementById(id + 'Display')
				.innerHTML = speeds[v];
			break;

		default:
			console.log(' reached part for default');
			break;
	}
}

simu.reset2 = function () {
	itemCollection.reset();
	queueGraph.reset();
	theProcessCollection.reset();
	gSF = new GStickFigure(anim.stage.foreContext,
		anim.person.height);

	// schedule the initial Person to arrive and start the simulation/animation.
	theSimulation.supply.previous = null;
	theSimulation.creator.knockFromPrevious();

	//fudge to get animation started quickly
	let t = simu.heap.top().time - 1;
	simu.now = simu.frameNow = t;
	theSimulation.nInQueue = 0;
	document.getElementById('nInQueue').innerHTML = '';

};

//  One variable for each process step or queue
//  that contains the functions to do the specific
//  animation for that process step

const animForQueue = {
	delta: {dx: anim.person.width,
			dy: 0},
	dontOverlap: true,
	walkingTime: (anim.person.path.headQueue - anim.person.path.left) / anim.stage.normalSpeed,

	reset: function () {},

	join: function (nInQueue, arrivalTime, person) {
		let dist = nInQueue * animForQueue.delta.dx;
		let time = simu.now + dist / anim.stage.normalSpeed;
		person.addPath({
			t: time,
			x: person.cur.x,
			y: person.cur.y
		});
		person.addPath({
			t: arrivalTime,
			x: anim.person.path.headQueue - dist,
			y: anim.person.path.top
		});
		if (person.isThereOverlap()) {
			person.cur.y = person.ahead.cur.y - 10;
		}

	},

	arrive: function (nSeatsUsed, person) {
		theSimulation.nInQueue++;
		document.getElementById('nInQueue').innerHTML = 
			theSimulation.nInQueue ;
	},

	leave: function (procTime, nSeatsUsed) {

		theSimulation.nInQueue--;
		document.getElementById('nInQueue').innerHTML = 
			theSimulation.nInQueue ;
		
		for (let k = 0; k < theSimulation.queue.q.length; k++) {
			let p = theSimulation.queue.q[k];
			let time = simu.now + Math.min(animForQueue.delta.dx / anim.stage.normalSpeed, procTime);
			if (p.pathList.length == 0) {
				p.addPath({
					t: time,
					x: p.cur.x + animForQueue.delta.dx,
					y: p.cur.y + animForQueue.delta.dy
				});
			} else {
				let dest = p.pathList[p.pathList.length - 1];
				p.updatePathDelta(Math.max(time, dest.t),
					animForQueue.delta.dx, animForQueue.delta.dy)
			}
		}
	}
};

//function printPath(p, str){
//   
//    if(p.pathList.length == 0) 
//        console.log(str,'person',p.which,'no path****');
//    for ( let i = 0; i < p.pathList.length; i++ ) {
//        let pt = p.pathList[i];
//        console.log(str,'person',p.which, pt.t,pt.x,pt.y);
//    }
//};

const animForWalkOffStage = {
	walkingTime: Math.abs(anim.person.path.scanner - anim.person.path.right) / anim.stage.normalSpeed,

	

	start: function (person) {
		person.addPath({
			t: simu.now + 50 / anim.stage.normalSpeed,
			x: 800,
			y: 100
		});
		person.addPath({
			t: simu.now + this.walkingTime - 50 / anim.stage.normalSpeed,
			x: anim.person.path.right,
			y: anim.person.path.top
		});

		if (person.isThereOverlap()) {
			person.cur.y = person.ahead.cur.y - 10;
		}

	}
};

const animForCreator = {
	reset: function () {},
	start: function (theProcTime, person, m) {},
	finish: function () {},
};





const animForTSA = {
	dontOverlap: true,

	machLoc: null,
	lastFinPerson: null,

	reset: function (numMachines) {
		animForTSA.machLoc = [];
		animForTSA.lastFinPerson = null;
		let locX = anim.person.path.scanner;
		let locY = anim.person.path.top;
		let c = anim.stage.backContext;
	
		c.resetTransform();
		c.strokeStyle = 'blue';
		c.lineWidth = 5;
		c.beginPath();
		for (let k = 0; k < numMachines; k++) {
			c.strokeRect(locX - 28, locY - 15, 55, 100);
			animForTSA.machLoc[k] = {
				x: locX,
				y: locY
			};
			locX += anim.scannerDelta.dx;
			locY += anim.scannerDelta.dy;
		}
		c.closePath();
	},
	start: function (theProcTime, person, m) {
		person.setDestWithProcTime(theProcTime,
			animForTSA.machLoc[m].x, animForTSA.machLoc[m].y);
		//       person.setColor("purple");
		if (animForTSA.lastFinPerson &&
			animForTSA.lastFinPerson.pathList.length > 1) {
			let path = animForTSA.lastFinPerson.pathList[0];
			path.t = Math.min(path.t, simu.now + theProcTime);
		}
	},

	finish: function (person) {
		animForTSA.lastFinPerson = person;
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

		// random variables
		let r = document.getElementById('ar').value;
		let cv = document.getElementById('acv').value;
		theSimulation.interarrivalRV = new GammaRV(r / tioxTimeConv, cv);
		r = document.getElementById('sr').value;
		cv = document.getElementById('scv').value;
		theSimulation.serviceRV = new GammaRV(r / tioxTimeConv, cv);

		//queues
		this.supply = new Supplier(anim.person.path.left, anim.person.path.top);


		this.queue = new Queue("theQueue", -1, animForQueue.walkingTime,   
			animForQueue,
			recordQueueArrival, recordQueueLeave);

		// define the helper functions for theQueue
		function recordQueueArrival(person) {
			person.arrivalTime = simu.now;
		};

		function recordQueueLeave(person) {
			queueGraph.push(simu.now, simu.now - person.arrivalTime);
		};


		this.walkOffStage = new WalkAndDestroy("walkOff", animForWalkOffStage, true);


		// machine centers 
		this.creator = new MachineCenter("creator",
			1, theSimulation.interarrivalRV,
			this.supply, this.queue,
			animForCreator);

		this.TSAagent = new MachineCenter("TSAagent",
			1, theSimulation.serviceRV,
			this.queue, this.walkOffStage,
			animForTSA);

		//link the queue to machine before and after
		this.queue.setPreviousNext(
			this.creator, this.TSAagent);

		// put all the process steps with visible people in theProcessCollection
		theProcessCollection.push(this.creator);
		theProcessCollection.push(this.queue);
		theProcessCollection.push(this.TSAagent);
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
		return new Person(this.x, this.y,
			30, anim.person.height);
	}
}; //end class Supplier

var gSF;
export class Person extends Item {
	constructor(x, y = 100, w = 30, h = 30) {
		super(x, y);
		this.width = w;

		this.graphic = new NStickFigure(gSF, x, y);
		//simu.theCanvas.add(this.graphic.figure);
	};


	isThereOverlap() {
		// is 'p' graph above the 'a' graph in [0, p.count] ?
		let p = this;
		let a = this.ahead;
		if (!a) return false;
		let pPath = p.pathList[0];
		let aPath = a.pathList[0];
		if (!aPath) return false;
		//       console.log ( 'persons ',p.which,a.which, ' time ', pPath.t,pPath.x, aPath.t + a.width/aPath.speedX, aPath.x);
		return false;
//		return (pPath.t < aPath.t + a.width / aPath.speedX)
			//        if (  p.cur.x + p.width > a.cur.x ) return true;
			//        if ( pPath.deltaX <= aPath.deltaX ) return false;
			//        return (a.cur.x - p.width - p.cur.x)/(pPath.deltaX - aPath.deltaX) <= pPath.count;
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
	queueGraph.setupGraph();
	//reset first time to make sure it is ready to play.
	document.getElementById('resetButton').click();
};
document.addEventListener("DOMContentLoaded", initializeAll);

import {tioxGraph} from "../modules/graph.js";
const queueGraph ={
	predictedWait: function () {
			const sr = theSimulation.serviceRV.rate;
			const ir = theSimulation.interarrivalRV.rate;
			if (sr == 0) return Infinity;
			let rho = ir / sr;
			if (rho >= 1) return Infinity;
			const iCV = theSimulation.interarrivalRV.CV;
			const sCV = theSimulation.serviceRV.CV;
			let p = (rho / (1 - rho) / ir / tioxTimeConv) * (iCV * iCV + sCV * sCV) / 2;
			return p;
		},
	push: function (t, w) {
			t /= tioxTimeConv;
			w /= tioxTimeConv;
			this.total += w;
			this.count++;
			tioxGraph.updateXaxis(t);

			const pW = this.predictedWaitValue;
			if (w > tioxGraph.yaxis.current().max ) tioxGraph.updateYaxis(w);
			if (pW >= 0 && pW < Infinity) tioxGraph.updateYaxis(pW);
			let ds = tioxGraph.chart.data.datasets;
			ds[0].data.push({
				x: t,
				y: w
			});
			ds[1].data.push({
				x: t,
				y: this.total / this.count
			});
			if (pW >= 0 && pW < Infinity) {
				ds[2].data.push({
					x: t,
					y: pW
				})
			}
			tioxGraph.chart.update();
		},
	updatePredictedWait: function () {
		let pW = this.predictedWaitValue;
		let pDS = tioxGraph.chart.data.datasets[2];

		pDS.data.push({
			x: (simu.now - 1) / tioxTimeConv,
			y: pW
		});
		pW = this.predictedWait();
		pDS.data.push({
			x: (simu.now / tioxTimeConv),
			y: pW
		});
		pDS.label = 'predicted wait' + ((pW == Infinity) ? ' = ∞' : '');

		this.predictedWaitValue = pW;
		tioxGraph.chart.generateLegend();
		tioxGraph.chart.update();
	},
	setupGraph: function(){
		tioxGraph.setLabelColorVisible(0,'individual wait',
					'rgba(0,0,220,1)', true, 3);
		tioxGraph.setLabelColorVisible(1,'average wait',
					'rgba(0,150,0,1)', true, 3);
		tioxGraph.setLabelColorVisible(2,'predicted wait',
					'rgb(185, 26, 26)', true, 0);
		tioxGraph.struc.options.title.text = 'Waiting Time'
		this.predictedWaitValue = this.predictedWait();
		this.reset();
	},
	reset: function(){
		tioxGraph.reset(5,4, Math.max( this.predictedWaitValue * 1.5, 1.5) );
		this.updateForSpeed();
		this.total = 0;
		this.count = 0;
	},
	updateForSpeed: function(){
		tioxGraph.updateXaxisScale(simu.frameSpeed);
	}
}
