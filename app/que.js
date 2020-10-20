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

import {
	GammaRV, Heap
}
from "./util.js";
import {
	OmConcept
}
from './rhs.js';
import {
	Queue, WalkAndDestroy, MachineCenter,
	InfiniteMachineCenter, Item, 
	GStickFigure, NStickFigure
}
from "./stepitem.js";
import {
	TioxGraph
}
from "./graph.js";
class QueueGraph extends TioxGraph {
	constructor(omConcept){	
		super(omConcept, .3, {width:10, step:2}, d=>d.t);
		this.setTitle('Waiting Time');
		this.setupLine(0, d => d.i, 'rgba(0,0,220,1)',
					   false, true, 5, 10);
		this.setLegend(0, 'individual wait');
		this.setupLine(1, d => d.a, 'rgba(0,150,0,1)',
					   false, true, 5, 10);
		this.setLegend(1,'average wait');
		this.setupLine(2, d => d.p, 'rgb(185, 26, 26)',
					   true, false, 10, 0);
		this.setLegend(2,'predicted wait');	
		this.predictedWaitValue = this.predictedWait();
	};
	
	push (t,w){
		t /= tioxTimeConv;
		w /= tioxTimeConv;
//		console.log('pushing for graph',t,w);
		this.total += w;
		this.count++;
		let pW = this.predictedWaitValue == Infinity ? null : this.predictedWaitValue;
		let p = {t: t, i: w,
				 a: this.total/this.count,
				 p: pW};
		this.drawOnePoint(p);
	};
	reset(){
		this.total = 0;
		this.count = 0;
		let yMax = (this.predictedWaitValue == Infinity)?
			1.5: Math.max(1.5,this.predictedWaitValue * 1.1);
		super.reset(yMax);
		
		const v = document.getElementById('speedque').value;
		const f = speeds[v].graph;
		this.updateForSpeed(f);
	}
	updateForSpeed (factor){
		this.scaleXaxis(factor);
//		console.log('in graph update for speed',factor)
	};
	predictedWait () {
			const sr = theSimulation.serviceRV.rate;
			const ir = theSimulation.interarrivalRV.rate;
			const iCV = theSimulation.interarrivalRV.CV;
			const sCV = theSimulation.serviceRV.CV;
			if (sr == 0) return Infinity;
			let rho = ir / sr;
			if (rho >= 1) return Infinity;
			let pW = (rho / (1 - rho) / ir / tioxTimeConv) 
					* (iCV * iCV + sCV * sCV) / 2;
			return pW;
		};
	updatePredictedWait () {
		let pW = this.predictedWait();
		this.drawOnePoint({
			t: (que.now / tioxTimeConv),
			p: (pW == Infinity)?null:pW
		});
		this.setLegend(2,'predicted wait' +
					   ((pW == Infinity) ? ' = ∞' : ''));

		this.predictedWaitValue = pW;
	};
}
const anim = {};
let queueGraph;

const tioxTimeConv = 10000; //rates in tiox are k/10 seconds

var que ;

const precision = {
	ar: 1,
	acv: 1,
	sr: 1,
	scv: 1,
	speed: 0
}
const speeds = [{time:1,graph:1,anim:true},
				{time:2,graph:1,anim:true},
				{time:5,graph:2,anim:true},
				{time:10,graph:2,anim:true},
				{time:25,graph:5,anim:true}];

anim.stage = {
	normalSpeed: .050, 
	width: 1000,
	height: 300
};
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
function queDefine(){
	que = new OmConcept('que', queueEncodeURL, queueDecodeURL,queueReset);
	
que.sliderTypes = {
	ar: 'range',
	acv: 'range',
	sr: 'range',
	scv: 'range',
	speed: 'range',
	action: 'radio',
	reset: 'checkbox'
};
	
	document.getElementById('slidersWrapperque')
	.addEventListener('input', captureChangeInSliderS);

anim.stage.foreContext = document
		.getElementById('foregroundque')
		.getContext('2d');
anim.stage.backContext = document
		.getElementById('backgroundque')
		.getContext('2d');
	que.stage = anim.stage;



// specific info for queueing needed by general routines
// in procsteps and rhs.

};
class ProcessCollection extends Array {
	constructor() {
		super();
	};
	reset() {
		this.forEach(aProcess => aProcess.reset());
	};
}; // end class processCollection


 
// old version = [1, 2, 5, 10, 25];

function queueDecodeURL(str){
	const actionValue = {N:"none", G:"play", S:"pause"};
	const resetValue = {T: true, F: false};
	return( 
	{ar: str.substring(0,4),
	acv: str.substring(4,8),
	sr: str.substring(8,12),
	scv: str.substring(12,16),
	speed: str.substring(16,17),
	 action: actionValue[str.substring(17,18)],
	 reset: resetValue[str.substring(18,19)],
	 desc: str.substring(19)
	})
};
function queueEncodeURL(preset){
	const actionValue = {none: "N", play: "G", pause: "S"};
	return Number(preset.ar).toFixed(1).padStart(4,'0') 
	.concat(Number(preset.acv).toFixed(1).padStart(4,'0'),
		Number(preset.sr).toFixed(1).padStart(4,'0'),
		Number(preset.scv).toFixed(1).padStart(4,'0'),
		preset.speed,
		actionValue[preset.action],
		(preset.reset == "true" ? "T" : "F"),
		preset.desc);
}

function captureChangeInSliderS(event) {
	let inputElem = event.target.closest('input');
	if (!inputElem) return

	var id = inputElem.id.slice(0,-3) ;
	      //need to remove the concept name or
	if (inputElem.type == 'range') {
		var v = Number(inputElem.value)
			.toFixed(precision[id]);
		document.getElementById(id + 'queDisplay')
			.innerHTML = v;
	}
	switch (id) {
		case 'ar':
			theSimulation.interarrivalRV
				.setRate(v / tioxTimeConv);
			que.heap.modify('finish/creator', que.now, 
							 theSimulation.interarrivalRV);
			queueGraph.updatePredictedWait();
			break;

		case 'acv':
			theSimulation.interarrivalRV.setCV(v);
			que.heap.modify('finish/creator', que.now,
							 theSimulation.interarrivalRV);
			queueGraph.updatePredictedWait();

			break;

		case 'sr':
			theSimulation.serviceRV
				.setRate(v / tioxTimeConv);
			que.heap.modify('finish/TSAagent', que.now, 
							 theSimulation.serviceRV);
			queueGraph.updatePredictedWait();
			break;

		case 'scv':
			theSimulation.serviceRV.setCV(v);
			que.heap.modify('finish/TSAagent', que.now, 
							 theSimulation.serviceRV);
			queueGraph.updatePredictedWait();
			break;

		case 'speed':
			que.frameSpeed = speeds[v].time;
			queueGraph.updateForSpeed(speeds[v].graph);
			que.itemCollection.updateForSpeed();
			document.getElementById(id + 'queDisplay')
				.innerHTML = speeds[v].time;
			break;
		case 'none':
		case 'play':
		case 'pause':
		case 'reset':
			break;
		default:
			alert(' reached part for default, id=',id);
			console.log(' reached part for default, id=',id);
			break;
	}
}

function queueReset () {
	que.itemCollection.reset();
	queueGraph.reset();
	theProcessCollection.reset();
	gSF = new GStickFigure(anim.stage.foreContext,
		anim.person.height);

	// schedule the initial Person to arrive and start the simulation/animation.
	theSimulation.supply.previous = null;
	theSimulation.creator.knockFromPrevious();

	//fudge to get animation started quickly
	let t = que.heap.top().time - 1;
	que.now = que.frameNow = t;
	theSimulation.nInQueue = 0;
	document.getElementById('nInQueue').innerHTML = '0';

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
		let guessInQueue = Math.max( 0, Math.floor(
			nInQueue - this.walkingTime / theSimulation.serviceRV.mean));
		let dist = nInQueue * animForQueue.delta.dx;
		let time = que.now + dist / anim.stage.normalSpeed;
		// simply move person back appropriate amount.
		person.cur.x -= guessInQueue * animForQueue.delta.dx;
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
			let time = que.now + Math.min(animForQueue.delta.dx / anim.stage.normalSpeed, procTime);
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
	walkingTime: Math.abs(anim.person.path.scanner 
		- anim.person.path.right) / anim.stage.normalSpeed,

	start: function (person) {
		person.addPath({
			t: que.now + 50 / anim.stage.normalSpeed,
			x: 800,
			y: 100
		});
		person.addPath({
			t: que.now + this.walkingTime - 50 / anim.stage.normalSpeed,
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
			path.t = Math.min(path.t, que.now + theProcTime);
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
		let r = document.getElementById('arque').value;
		let cv = document.getElementById('acvque').value;
		theSimulation.interarrivalRV = new GammaRV(r / tioxTimeConv, cv);
		r = document.getElementById('srque').value;
		cv = document.getElementById('scvque').value;
		theSimulation.serviceRV = new GammaRV(r / tioxTimeConv, cv);

		queueGraph = new QueueGraph(que);
		//queues
		this.supply = new Supplier(anim.person.path.left, anim.person.path.top);


		this.queue = new Queue(que, "theQueue", -1,
			animForQueue.walkingTime, animForQueue,
			recordQueueArrival, recordQueueLeave);

		// define the helper functions for theQueue
		function recordQueueArrival(person) {
			person.arrivalTime = que.now;
		};

		function recordQueueLeave(person) {
			queueGraph.push(que.now, que.now - person.arrivalTime);
		};


		this.walkOffStage = new WalkAndDestroy(que, "walkOff",
								animForWalkOffStage, true);


		// machine centers 
		this.creator = new MachineCenter(que, "creator",
			1, theSimulation.interarrivalRV,
			this.supply, this.queue,
			animForCreator);

		this.TSAagent = new MachineCenter(que, "TSAagent",
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
		return new Person(que, this.x, this.y,
			30, anim.person.height);
	}
}; //end class Supplier

var gSF;
export class Person extends Item {
	constructor(omConcept, x, y = 100, w = 30, h = 30) {
		super(omConcept, x, y);
		this.width = w;
		this.graphic = new NStickFigure(gSF, x, y);
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
			t: que.now + deltaTime,
			x: x,
			y: y
		});
	};
}; // end class Person

export function queStart() {
	queDefine();
	Math.seedrandom('this is the Queueing Simulation');
	theSimulation.initialize(); // the specific to queueing
	que.reset();
};
//document.addEventListener("DOMContentLoaded", initializeAll);