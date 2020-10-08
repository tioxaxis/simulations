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

const tioxTimeConv = 1000; //time are in milliseconds
import {
	GammaRV, Heap
}
from '../modules/utility.js';
import {
	sliders, presets
}
from '../modules/rhs.js';
import {
	Queue, WalkAndDestroy, MachineCenter,
	InfiniteMachineCenter, Item, itemCollection, ItemCollection,
	GStickFigure, NStickFigure
}
from '../modules/procsteps.js';

import {
	TioxGraph
}
from "../modules/graph.js";
class LittleGraph extends TioxGraph {
	constructor(){
		super('chart',.3, {width:20, step:5}, d=>d.t);
		this.predictedInvValue = null;
		this.setTitle('Inventory');
		this.setupLine(0, d => d.i, 'rgba(0,0,220,1)',
					   false, true, 3, 10);
		this.setLegend(0, 'avg. inventory');
		this.setupLine(1, d => d.rt, 'rgba(0,150,0,1)',
					   false, true, 3, 10);
		this.setLegend(1,'avg. time * avg. rate');
		this.setupLine(2, d => d.p, 'rgb(185, 26, 26)',
					   true, false, 10, 0);
		this.setLegend(2,'predicted inventory');	
		this.predictedInvValue = this.predictedInv();
	};
	
	push (t, inv, rt){
		t /= tioxTimeConv;
		let p = {t: t, i: inv,
				 rt: rt,
				 p: this.predictedInvValue};
		this.drawOnePoint(p);
	};
	
	reset(){
		super.reset(this.predictedInvValue * 1.2);
		const v = document.getElementById('speed').value;
		const f = speeds[v].graph;
		this.updateForSpeed(f);
	}
	updateForSpeed (factor){
		this.scaleXaxis(factor);
	};
	predictedInv() {
		return (theSimulation.serviceRV.mean) / 
			(theSimulation.interarrivalRV.mean);
	};
	updatePredictedInv () {
		this.predictedInvValue = this.predictedInv();
		this.drawOnePoint({
			t: (simu.now / tioxTimeConv),
			p: this.predictedInvValue
		});
	};
}
let littleGraph;

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

document.getElementById('sliderBigBox')
	.addEventListener('input', captureChangeInSliderS);
const speeds = [{time:1,graph:1,anim:true},
				{time:2,graph:1,anim:true},
				{time:5,graph:2,anim:true},
				{time:10,graph:2,anim:true},
				{time:25,graph:5,anim:true}];

function littleDecodeURL(str){
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
function littleEncodeURL(preset){
	const actionValue = {none: "N", play: "G", pause: "S"};
	return Number(preset.ar).toFixed(1).padStart(4,'0')
		.concat(Number(preset.acv).toFixed(1).padStart(4,'0'), 
		Number(preset.sr).toFixed(1).padStart(4,'0'),
		Number(preset.scv).toFixed(1).padStart(4,'0'),
		preset.speed,
		actionValue[preset.action] +
		(preset.reset == "true" ? "T" : "F"),
		preset.desc);
}

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
			littleGraph.updatePredictedInv();
			break;

		case 'acv':
			theSimulation.interarrivalRV.setCV(v);
			break;

		case 'sr':
			theSimulation.serviceRV.setTime(v * tioxTimeConv);
			littleGraph.updatePredictedInv();
			break;

		case 'scv':
			theSimulation.serviceRV.setCV(v);
			break;

		case 'speed':
			simu.frameSpeed = speeds[v].time;
			littleGraph.updateForSpeed(speeds[v].graph);
			itemCollection.updateForSpeed();
			document.getElementById(id + 'Display')
				.innerHTML = speeds[v].time;
			break;

		default:
			console.log(' reached part for default');
			break;
	}
}



var totInv, totTime, totPeople, firstArr, lastArrDep, LBRFcount;
simu.reset2 = function () {
	itemCollection.reset();
	littleGraph.reset();
	theProcessCollection.reset();
	totInv = totTime = totPeople =  LBRFcount = 0;
	firstArr = lastArrDep = 3500;
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

		littleGraph = new LittleGraph();
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
//			LBRFcount = (LBRFcount + 1) % simu.frameSpeed;
//			if (!LBRFcount) {
				littleGraph.push(simu.now, 
								 totInv / (simu.now - firstArr),
								 totTime / (simu.now - firstArr) );
//			};
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
	Math.seedrandom('this is a Simulation');
	sliders.initialize();
	presets.initialize(littleEncodeURL,littleDecodeURL);
	simu.initialize(); // the generic
	theSimulation.initialize(); // the specific to queueing
	//reset first time to make sure it is ready to play.
	document.getElementById('resetButton').click();
};
document.addEventListener("DOMContentLoaded", initializeAll);