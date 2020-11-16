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
	GammaRV, Heap, cbColors
}
from "../mod/util.js";
import {
	OmConcept
}
from '../mod/rhs.js';
import {
	Queue, WalkAndDestroy, MachineCenter,
	InfiniteMachineCenter, Item, 
	GStickFigure, NStickFigure
}
from "../mod/stepitem.js";


let fac ;
const anim = {};
var gSF;

const tioxTimeConv = 10000; //rates in tiox are k/10 seconds
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
				{time:25,graph:5,anim:true},
			   {time:1000,graph:20,anim:false}];

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
function facDefine(){
	fac = new OmConcept('fac', facEncodeURL, facDecodeURL, localReset);
	document.getElementById('fac').omConcept = fac;
	
	document.getElementById('slidersWrapperfac')
	.addEventListener('input', captureChangeInSliderS);
	
	fac.tioxTimeConv = tioxTimeConv;
	fac.sliderTypes = {
		ar: 'range',
		acv: 'range',
		sr: 'range',
		scv: 'range',
		speed: 'range',
		action: 'radio',
		leg0: 'legend',
		leg1: 'legend',
		leg2: 'legend',
		reset: 'checkbox'
	};


	anim.stage.foreContext = document
			.getElementById('foregroundfac')
			.getContext('2d');
	anim.stage.backContext = document
			.getElementById('backgroundfac')
			.getContext('2d');
	fac.stage = anim.stage;
	gSF = new GStickFigure(anim.stage.foreContext,
			anim.person.height);
};
function localReset () {
		
	// schedule the initial Person to arrive and start the simulation/animation.
	theSimulation.supply.previous = null;
	theSimulation.creator.knockFromPrevious();

	//fudge to get animation started quickly
	let t = fac.heap.top().time - 1;
	fac.now = fac.frameNow = t;
	theSimulation.nInQueue = 0;
	document.getElementById('nInQueue').innerHTML = '0';
};

function facDecodeURL(str){
	const actionValue = {N:"none", G:"play", S:"pause"};
	const boolValue = {T: 'true', F: 'false'};
	return( 
	{ar: str.substring(0,4),
	acv: str.substring(4,8),
	sr: str.substring(8,12),
	scv: str.substring(12,16),
	speed: str.substring(16,17),
	 action: actionValue[str.substring(17,18)],
	 reset: boolValue[str.substring(18,19)],
	 leg0:  boolValue[str.substring(19,20)],
	 leg1:  boolValue[str.substring(20,21)],
	 leg2:  boolValue[str.substring(21,22)],
	 desc: str.substring(22)
	})
};
function facEncodeURL(row){
	const actionValue = {none: "N", play: "G", pause: "S"};
	return Number(row.ar).toFixed(1).padStart(4,'0') 
	.concat(Number(row.acv).toFixed(1).padStart(4,'0'),
		Number(row.sr).toFixed(1).padStart(4,'0'),
		Number(row.scv).toFixed(1).padStart(4,'0'),
		row.speed,
		actionValue[row.action],
		(row.reset == "true" ? "T" : "F"),
		(row.leg0 == "true" ? "T" : "F"),
		(row.leg1 == "true" ? "T" : "F"),
		(row.leg2 == "true" ? "T" : "F"),
		row.desc);
}

function captureChangeInSliderS(event) {
	let inputElem = event.target.closest('input');
	if (!inputElem) return

	var idShort = inputElem.id.slice(0,-3) ;
	      //need to remove the concept name or
	if (inputElem.type == 'range') {
		var v = Number(inputElem.value)
			.toFixed(precision[idShort]);
		document.getElementById(idShort + 'facDisplay')
			.innerHTML = v;
	}
	switch (idShort) {
		case 'ar':
			theSimulation.interarrivalRV
				.setRate(v / tioxTimeConv);
			fac.heap.modify('finish/creator', fac.now, 
							 theSimulation.interarrivalRV);
			fac.graph.updatePredictedWait();
			break;

		case 'acv':
			theSimulation.interarrivalRV.setCV(v);
			fac.heap.modify('finish/creator', fac.now,
							 theSimulation.interarrivalRV);
			fac.graph.updatePredictedWait();

			break;

		case 'sr':
			theSimulation.serviceRV
				.setRate(v / tioxTimeConv);
			fac.heap.modify('finish/TSAagent', fac.now, 
							 theSimulation.serviceRV);
			fac.graph.updatePredictedWait();
			break;

		case 'scv':
			theSimulation.serviceRV.setCV(v);
			fac.heap.modify('finish/TSAagent', fac.now, 
							 theSimulation.serviceRV);
			fac.graph.updatePredictedWait();
			break;

		case 'speed':
			fac.adjustSpeed(idShort,v,speeds);
//			const oldFramespeed = fac.frameSpeed;
//			fac.frameSpeed = speeds[v].time;
//			fac.graph.updateForSpeed(speeds[v].graph);
//			fac.itemCollection.updateForSpeed();
//			document.getElementById(idShort + 'facDisplay')
//				.innerHTML = speeds[v].time;
//			if (oldFramespeed < 100 && fac.frameSpeed > 100 ){
//				if (fac.isRunning){
//					fac.pause();
//					fac.play();
//				}
//				fac.coverAnimation();
//			} else if (oldFramespeed > 100 
//					   && fac.frameSpeed < 100){
//				fac.uncoverAnimation();
//			}
			break;
		case 'none':
		case 'play':
		case 'pause':
		case 'reset':
			break;
		default:
			alert(' reached part for default, id=',idShort);
			console.log(' reached part for default, id=',idShort);
			break;
	}
}

//  One variable for each process step or queue
//  that contains the functions to do the specific
//  animation for that process step

const animForQueue = {
	
};

const animForWalkOffStage = {
	
};

const animForCreator = {
	reset: function () {},
	start: function (theProcTime, person, m) {},
	finish: function () {},
};

const animForTSA = {
	
};

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
		let r = document.getElementById('arfac').value;
		let cv = document.getElementById('acvfac').value;
		theSimulation.interarrivalRV = new GammaRV(r / tioxTimeConv, cv);
		r = document.getElementById('srfac').value;
		cv = document.getElementById('scvfac').value;
		theSimulation.serviceRV = new GammaRV(r / tioxTimeConv, cv);

		fac.graph = new QueueGraph(que);
		fac.resetCollection.push(fac.graph);
		
		//queues
		this.supply = new Supplier(anim.person.path.left, anim.person.path.top);


		this.queue = new Queue(que, "theQueue", -1,
			animForQueue.walkingTime, animForQueue,
			recordQueueArrival, recordQueueLeave);
		fac.resetCollection.push(this.queue);
		
		// define the helper functions for theQueue
		function recordQueueArrival(person) {
			person.arrivalTime = fac.now;
		};

		function recordQueueLeave(person) {
			fac.graph.push(fac.now, fac.now - person.arrivalTime);
		};


		this.walkOffStage = new WalkAndDestroy(que, "walkOff",
								animForWalkOffStage, true);
		fac.resetCollection.push(this.walkOffStage);

		// machine centers 
		this.creator = new MachineCenter(que, "creator",
			1, theSimulation.interarrivalRV,
			this.supply, this.queue,
			animForCreator);
		fac.resetCollection.push(this.creator);

		this.TSAagent = new MachineCenter(que, "TSAagent",
			1, theSimulation.serviceRV,
			this.queue, this.walkOffStage,
			animForTSA);
		fac.resetCollection.push(this.TSAagent);

		//link the queue to machine before and after
		this.queue.setPreviousNext(
			this.creator, this.TSAagent);
	},
};

// SUPPLIER
class Supplier {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	};
	pull() {
		return new Person(que, this.x, this.y);
	}
}; //end class Supplier


export class Card extends Item {
	constructor(omConcept, x, y = 100) {
		super(omConcept, x, y);
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
		return false;
//		return (pPath.t < aPath.t + a.width / aPath.speedX)
			//        if (  p.cur.x + p.width > a.cur.x ) return true;
			//        if ( pPath.deltaX <= aPath.deltaX ) return false;
			//        return (a.cur.x - p.width - p.cur.x)/(pPath.deltaX - aPath.deltaX) <= pPath.count;
	};
}; // end class Person

import {
	genPlayResetBox, genSlider, genButton, copyMainPage
}
from '../mod/genHTML.js';

function facHTML(){	
	copyMainPage('fac');
	 
	//stats line
	const d2 = document.getElementById('statsWrapperfac');
	const delem = document.createElement('div');
	const selem = document.createElement('span');
	 selem.id = 'throughput';
	 delem.append('Throughput: ',selem);
	 d2.append(delem);
	const d2elem = document.createElement('div');
	const s2elem = document.createElement('span');
	s2elem.id = 'flowtime';
	 d2elem.append('Flow time: ',selem);
	 d2.append(d2elem);
	 
	//now put in the sliders with the play/reset box	
	let elem = document.getElementById('slidersWrapperfac');
	elem.append(
//		genSlider('arfac','Arrival Rate = ','5.0','',
//				  5,0,10,.5,[0,2,4,6,8,10]),
//		genSlider('acvfac','Arrival CV = ','0.0','',
//				  0,0,2,.5,['0.0','1.0','2.0']),
//		genSlider('srfac','Service Rate = ','6.0','',
//				  6,0,10,.5,[0,2,4,6,8,10] ), 
//		genSlider('scvfac','Service CV = ','0.0','',
//				  0,0,2,.5,['0.0','1.0','2.0']),
		genButton('markfac','Mark'),
		genSlider('qlnfac','Queue Length','3','',
				 3,3,1000,6,[,'3','6','Infinite']),
		genPlayResetBox('fac'),
		genSlider('speedfac','Speed = ','1','x',
				  0,0,5,1,["slow",' ',' ',' ',"fast",'full'])
	);
	
	const f = document.getElementById('scenariosMidfac');
	f.style = "min-height: 26vw";
};

export function facStart() {
	facHTML();
	debugger;
	facDefine();
	theSimulation.initialize(); // the specific to queueing
	fac.reset();
	return fac;
};