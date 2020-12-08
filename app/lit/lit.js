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

const tioxTimeConv = 1000; //time are in milliseconds
import {
	GammaRV, Heap, cbColors
}
from '../mod/util.js';
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

import {
	TioxGraph
}
from "../mod/graph.js";
class LittleGraph extends TioxGraph {
	constructor(omConcept){
		super(omConcept,'chartCanvaslit',40, {width:20, step:5}, d=>d.t);
		this.predictedInvValue = null;
		this.setTitle('Inventory');
		this.setupLine(0, d => d.i, cbColors.blue,
					   false, true, 3, 10);
		this.setLegend(0, 'avg. inventory');
		this.setupLine(1, d => d.rt, cbColors.yellow,
					   false, true, 3, 10);
		this.setLegend(1,'avg. time * avg. rate');
		this.setupLine(2, d => d.p, cbColors.red,
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
		const v = document.getElementById('speedlit').value;
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
			t: (lit.now / tioxTimeConv),
			p: this.predictedInvValue
		});
	};
}

var lit;
var gSF;

const speeds = [{time:1,graph:1,anim:true},
				{time:2,graph:1,anim:true},
				{time:5,graph:2,anim:true},
				{time:10,graph:2,anim:true},
				{time:25,graph:5,anim:true},
			{time:1000,graph:20,anim:false}];

const anim = {};
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
};

var totInv, totTime, totPeople, firstArr, lastArrDep, LBRFcount;

function litDefine(){
	lit = new OmConcept('lit',littleEncodeURL,littleDecodeURL, localReset);
	document.getElementById('lit').omConcept = lit;
	
	document.getElementById('slidersWrapperlit')
	.addEventListener('input', captureChangeInSliderS);
	
	lit.tioxTimeConv = tioxTimeConv;
	lit.sliderTypes = {
		ar: 'range',
		acv: 'range',
		sr: 'range',
		scv: 'range',
		speed: 'range',
		action: 'radio',
		reset: 'checkbox'
	};
	lit.precision = {
		ar: 1,
		acv: 1,
		sr: 1,
		scv: 1,
		speed: 0
	};
	anim.stage.foreContext = document
		.getElementById('foregroundlit')
		.getContext('2d');
	anim.stage.backContext = document
		.getElementById('backgroundlit')
		.getContext('2d');
	lit.stage = anim.stage;
	
	gSF = new GStickFigure(anim.stage.foreContext,
			anim.person.height,0);
};

function localReset () {
	//	lit.itemCollection.reset();
	//	lit.graph.reset();
	//	theProcessCollection.reset();
		totInv = totTime = totPeople =  LBRFcount = 0;
		firstArr = lastArrDep = 3500;
		

		// schedule the initial Person to arrive and start the simulation/animation.
		theSimulation.supply.previous = null;
		theSimulation.creator.knockFromPrevious();

		//fudge to get animation started quickly
		let t = lit.heap.top().time - 1;
		lit.now = lit.frameNow = t;

	};

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

function littleDecodeURL(str){
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
function littleEncodeURL(row){
	const actionValue = {none: "N", play: "G", pause: "S"};
	return Number(row.ar).toFixed(1).padStart(4,'0')
		.concat(Number(row.acv).toFixed(1).padStart(4,'0'), 
		Number(row.sr).toFixed(1).padStart(4,'0'),
		Number(row.scv).toFixed(1).padStart(4,'0'),
		row.speed,
		actionValue[row.action] +
		(row.reset == "true" ? "T" : "F"),
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
			.toFixed(lit.precision[idShort]);
		document.getElementById(idShort + 'litDisplay')
			.innerHTML = v;
	}
	switch (idShort) {
		case 'ar':
			theSimulation.interarrivalRV
				.setRate(v / tioxTimeConv);
			lit.graph.updatePredictedInv();
			break;

		case 'acv':
			theSimulation.interarrivalRV.setCV(v);
			break;

		case 'sr':
			theSimulation.serviceRV.setTime(v * tioxTimeConv);
			lit.graph.updatePredictedInv();
			break;

		case 'scv':
			theSimulation.serviceRV.setCV(v);
			break;

		case 'speed':
			lit.adjustSpeed(idShort,v,speeds);
			break;
		case 'none':
		case 'play':
		case 'pause':
		case 'reset':
			break;
		default:
			console.log(' reached part for default');
			break;
	}
}

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

	reset: function(){},
    start: function (person) {
		person.addPath({
			t: lit.now +
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
				t: lit.now + theProcTime,
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
				t: lit.now + walkT * rx / w,
				x: rx + anim.person.path.entry,
				y: ry
			});
			person.addPath({
				t: lit.now + walkT * rx / w + theProcTime - walkT,
				x: rx + anim.person.path.entry,
				y: ry
			});
			person.addPath({
				t: lit.now + theProcTime,
				x: anim.person.path.exit,
				y: anim.person.path.top
			});
		}
		person.graphic.badgeDisplay(true);
		person.updateBadge = true;
		person.arrivalTime = lit.now;
	},

	finish: function (person) {
		animForLittlesBox.lastFinPerson = person;
		person.updateBadge = false;
	}
};

//var theProcessCollection = new ProcessCollection();

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
		let r = document.getElementById('arlit').value;
		let cv = document.getElementById('acvlit').value;
		theSimulation.interarrivalRV = new GammaRV(r / tioxTimeConv, cv);
		let t = document.getElementById('srlit').value;
		cv = document.getElementById('scvlit').value;
		theSimulation.serviceRV = new GammaRV(1 / t / tioxTimeConv, cv);

		lit.graph = new LittleGraph(lit);
		lit.resetCollection.push(lit.graph);
		//queues
		this.supply = new Supplier(anim.person.path.left, anim.person.path.top);


		this.queue = new Queue(lit,"theQueue", -1, animForQueue.walkingTime,   
			animForQueue,
			null, null);
		lit.resetCollection.push(this.queue);
		
		this.walkOffStage = new WalkAndDestroy(lit, "walkOff", animForWalkOffStage, true);
		lit.resetCollection.push(this.walkOffStage);


		// machine centers 
		this.creator = new MachineCenter(lit, "creator",
			1, theSimulation.interarrivalRV,
			this.supply, this.queue,
			animForCreator);
		lit.resetCollection.push(this.creator);

		this.LittlesBox = new InfiniteMachineCenter(lit, "LittlesBox",
			theSimulation.serviceRV,
			this.queue, this.walkOffStage,
			animForLittlesBox, LBRecordStart, LBRecordFinish);
		lit.resetCollection.push(this.LittlesBox);

		function LBRecordStart(person) {

			person.arrivalTime = lit.now;
			totInv += (lit.now - lastArrDep) *
				(theSimulation.LittlesBox.getNumberBusy());
			lastArrDep = lit.now;
			//            console.log(' LB start', person);
			//console.log('LB record start',lit.now,person);

		};

		function LBRecordFinish(person) {
			totInv += (lit.now - lastArrDep) *
				(theSimulation.LittlesBox.getNumberBusy());
			lastArrDep = lit.now;
			totPeople++;
			totTime += lit.now - person.arrivalTime;
			lit.graph.push(lit.now, 
					 totInv / (lit.now - firstArr),
					 totTime / (lit.now - firstArr) );
		};

		//link the queue to machine before and after
		this.queue.setPreviousNext(
			this.creator, this.LittlesBox);
	},
};

// SUPPLIER
class Supplier {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	};
	pull() {
		return new Person(lit, this.x, this.y);
	}
}; //end class Supplier

export class Person extends Item {
	constructor(omConcept, x, y = 60) {
		super(omConcept, x, y);
		this.graphic = new NStickFigure(gSF, x, y);
		this.updateBadge = false;
	};
	updatePosition() {
		if (this.updateBadge) {
			this.graphic.badgeSet(Math.round((lit.now - this.arrivalTime) / tioxTimeConv).toString())
		} else {
			this.graphic.badgeVisible = false;
		}
		super.updatePosition();
	}    
	moveDisplayWithPath(deltaSimT) {
		if (this.updateBadge) {
			this.graphic.badgeSet(Math.round((lit.now - this.arrivalTime) / tioxTimeConv).toString())
		}
		super.moveDisplayWithPath(deltaSimT);
	};
}; // end class Person

import {
	genSlider, genPlayResetBox, addDiv
}
from '../mod/genHTML.js'; 

function litHTML(){
	addDiv('lit','lit','whole')
	addDiv('lit', 'leftHandSideBox'+'lit',
			   'stageWrapper', 'statsWrapper',
			   'chartWrapper');
	 	 
	//stats line
	const d2 = document.getElementById('statsWrapperlit');
	d2.parentNode.removeChild(d2);
	 
	//now put in the sliders with the play/reset box	
	let elem = document.getElementById('slidersWrapperlit');
	elem.append(
		genSlider('arlit', 'Arrival Rate = ','1.0','',
				  1,1,6,1,[1,2,3,4,5,6]),
		genSlider('acvlit','Arrival CV = ','0.0','',
				  0,0,2,.5,['0.0','1.0','2.0']),
		genSlider('srlit','Service Time = ','5.0','',
				  5,5,25,1,[5,15,25] ), 
		genSlider('scvlit','Service CV = ','0.0','',
				  0,0,2,.5,['0.0','1.0','2.0']),
		genPlayResetBox('lit'),
		genSlider('speedlit','Speed = ','1','x', 0,0,5,1,
				  ["slow",' ',' ',' ',"fast "," full"])
	);
	
	const f = document.getElementById('scenariosMidlit');
	f.style = "min-height: 26vw";
};

export function litStart() {
	litHTML();
	litDefine();
	theSimulation.initialize();
	lit.reset();
	return lit;
};