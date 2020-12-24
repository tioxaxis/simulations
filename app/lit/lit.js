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
	GammaRV, Heap, cbColors, Average
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
import {
	genPlayResetBox, genSlider, genArbSlider, genButton, addDiv,
      NumSlider, htmlNumSlider,
    ArbSlider, htmlArbSlider,
    genRange, 
    genCheckBox, htmlCheckBox, CheckBox, 
    htmlRadioButton, RadioButton, 
    IntegerInput, 
    addKeyForIds, 
    LegendItem, LegendDomElem
}
from '../mod/genHTML.js';

class LittleGraph extends TioxGraph {
	constructor(omConcept){
		super(omConcept,'chartCanvaslit',40, {width:20, step:5}, d=>d.t);
		this.predictedInvValue = null;
		this.setTitle('Inventory');
		this.setupLine(0, d => d.i, cbColors.blue,
					   false, true, true, 3, 10);
//		this.setLegend(0, 'avg. inventory');
		this.setupLine(1, d => d.rt, cbColors.yellow,
					   false, true, true, 3, 10);
//		this.setLegend(1,'avg. time * avg. rate');
		this.setupLine(2, d => d.p, cbColors.red,
					   true, false, false, 10, 0);
//		this.setLegend(2,'predicted inventory');	
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
        this.averageInventory = new Average();
        this.averageRateTime = new Average();
        
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

const anim = {};
var lit;
var gSF;

const tioxTimeConv = 1000; //time are in milliseconds

const speeds = [{time:1,graph:1,anim:true},
				{time:2,graph:1,anim:true},
				{time:5,graph:2,anim:true},
				{time:10,graph:2,anim:true},
				{time:25,graph:5,anim:true},
			{time:1000,graph:20,anim:false}];


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

function litDefineUsrInputs(){
    let usrInputs = new Map();
    usrInputs.set('ar', new NumSlider('arlit',
                null, 1,1,6,1,1,1) );
    usrInputs.set('acv', new NumSlider('acvlit',
                null, 1,0,2,.5,2,10) );
    usrInputs.set('sr', new NumSlider('srlit',
                null, 1,5,25,1,2,1) );
    usrInputs.set('scv', new NumSlider('scvlit',
                null, 1,0,2,.5,2,10) );
    usrInputs.set('leg0', new LegendItem('leg0lit'));
    usrInputs.set('leg1', new LegendItem('leg1lit'));
    usrInputs.set('leg2', new LegendItem('leg2lit'));
    
    usrInputs.set('speed', new ArbSlider('speedlit',
                null, ['1x','2x','5x','10x','25x','∞'],
				                [1,2,5,10,25,1000]) );
    usrInputs.set('action', new RadioButton('actionlit',
                null, ['none','play','pause']) );
    usrInputs.set('reset', new CheckBox('resetlit',
                null) );
    return usrInputs;
};

function litDefine(){
	document.getElementById('lit').omConcept = lit;
	
	lit.tioxTimeConv = tioxTimeConv;

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
class LittlesLaw extends OmConcept{
    constructor(usrInputs){
        super('lit');
        this.usrInputs = usrInputs;
        document.getElementById('slidersWrapperlit')
			.addEventListener('input', this.captureUserUpdate.bind(this));
        this.setupScenarios();    
    }
    
    localReset () {
		totInv = totTime = totPeople =  LBRFcount = 0;
		firstArr = lastArrDep = 3500;
        // schedule the initial Person to arrive and start the simulation/animation.
        theSimulation.supply.previous = null;
        theSimulation.creator.knockFromPrevious();

        //fudge to get animation started quickly
        let t = lit.heap.top().time - 1;
        lit.now = lit.frameNow = t;
    };
    
    localUpdate = localUpdate;
};

function localUpdate(...inpsChanged){
        for(let inp of inpsChanged){
            let v = inp.get();
            switch (inp.key){
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
                    lit.adjustSpeed(v,speeds);
                    break;
                case 'action':
                case 'reset':
                    break;
                case 'leg0':
                    lit.graph.lineInfo[0].visible = (v == "true");
                    lit.graph.setupThenRedraw();
                    break;
                case 'leg1':
                    lit.graph.lineInfo[1].visible = (v == "true");
                    lit.graph.setupThenRedraw();
                    break;
                case 'leg2':
                    lit.graph.lineInfo[2].visible = (v == "true");
                    lit.graph.setupThenRedraw();
                    break;
                default:
                    console.log(' reached part for default');
                    break;
                }
        }

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
		const ar = lit.usrInputs.get('ar').get();
		const acv = lit.usrInputs.get('acv').get();
		theSimulation.interarrivalRV = new GammaRV(ar / tioxTimeConv, acv);
		const st = lit.usrInputs.get('sr').get();
		const scv = lit.usrInputs.get('scv').get();
		theSimulation.serviceRV = new GammaRV(1 / st / tioxTimeConv, scv);

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


function litHTML(){
    let usrInputs = new Map();
    
	addDiv('lit','lit','whole')
	addDiv('lit', 'leftHandSideBox'+'lit',
			   'stageWrapper', 'statsWrapper',
			   'chartWrapper');
	 	 
	//stats line
	const d2 = document.getElementById('statsWrapperlit');
	d2.parentNode.removeChild(d2);
	 
    //add legend for the chart
    
    const leg0Input = new LegendDomElem('leg0lit', false, cbColors.blue);
    const leg1Input = new LegendDomElem('leg1lit', false, cbColors.yellow);
    /*global needed by graph to set name to predicted wait - infty*/ 
    const leg2Input = new LegendDomElem('leg2lit', false, cbColors.red);
    const d3 = document.getElementById('chartLegendlit');
    d3.append(leg0Input.createHTML('avg. inventory'),
              leg1Input.createHTML('avg time * ave rate'),
              leg2Input.createHTML('predicted inventory')
              );
    usrInputs.set('leg0', new LegendItem('leg0', leg0Input, localUpdate));
    usrInputs.set('leg1', new LegendItem('leg1', leg1Input, localUpdate));
    usrInputs.set('leg2', new LegendItem('leg2', leg2Input, localUpdate));
    
	//now put in the sliders with the play/reset box	
	let elem = document.getElementById('slidersWrapperlit');
	
    
    const arInput = genRange('arlit', '1.0', 1, 6, 1);
    elem.append(htmlNumSlider(arInput, 'Arrival Rate = ', '1.0', [1,2,3,4,5,6]) );
    usrInputs.set('ar', new NumSlider('ar',arInput,
                localUpdate, 1, 3, 10) );
    
    const acvInput = genRange('acvlit', '0.0', 0, 2, .5);
    elem.append(htmlNumSlider(acvInput, 'Arrival CV = ', 0,['0.0','1.0','2.0']) );
    usrInputs.set('acv', new NumSlider('acv', acvInput,
                localUpdate, 1, 2, 10) );
    
    
    const srInput = genRange('srlit', '6.0', 0, 10, .1);
    elem.append(htmlNumSlider(srInput, 'Service Rate = ', 5, [5, 15, 25]) );
    usrInputs.set('sr', new NumSlider('sr',srInput,
                localUpdate, 1, 3, 10) );
    
    const scvInput = genRange('scvlit', '0.0', 0, 2, .5);
    elem.append(htmlNumSlider(scvInput, 'Service CV = ', 0,['0.0','1.0','2.0']) );
    usrInputs.set('scv', new NumSlider('scv', scvInput,
                localUpdate, 1, 2, 10) );

	elem.append(genPlayResetBox('lit') );
    usrInputs.set('reset', new CheckBox('reset', 'resetlit',
                localUpdate) );
    usrInputs.set('action', new RadioButton('action', 'actionlit', 
                localUpdate, ['none','play','pause']) );
    
    const speedInput = genRange('speedlit',0,0,5,1);
    elem.append(htmlArbSlider(speedInput, 'Speed = ', 0,
                            ["slow",' ',' ',' ',"fast",'∞']) );
    usrInputs.set('speed', new ArbSlider('speed', speedInput, 
                localUpdate, ["1x",'2x','5x','10x',"25x",'∞'],
				                [1,2,5,10,25,1000]) );
    
    
    const f = document.getElementById('scenariosMidlit');
	f.style = "min-height: 26vw";
    
    return usrInputs;
};

export function litStart() {
    let usrInputs = litHTML();
    lit = new LittlesLaw(usrInputs);
    litDefine();
    theSimulation.initialize();
    
    //computeStageTimes();
	lit.reset();
	return lit;
};