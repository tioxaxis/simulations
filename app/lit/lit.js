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
	GammaRV, Heap, cbColors, Average, IRT, StageOnCanvas
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
	TioxGraph, GraphLine
}
from "../mod/graph.js";
import {
	genPlayResetBox, genArbSlider, genButton, addDiv,
      NumSlider, htmlNumSlider,
    ArbSlider, htmlArbSlider,
    genRange, 
     htmlCheckBox, CheckBox, 
    htmlRadioButton, RadioButton, 
    IntegerInput, 
    addKeyForIds, 
    LegendItem, match
}
from '../mod/genHTML.js';

class LittleGraph extends TioxGraph {
	constructor(){
		super(lit,'chartCanvaslit',40, {width:20, step:5}, d=>d.t,
             2000,600,false);
		this.predictedInvValue = null;
		this.setTitle('Inventory');
		const avgInv = new GraphLine(this, d => d.i, cbColors.blue,
					   false, true,  3, 10);
		const avgRT = new GraphLine(this, d => d.rt, cbColors.yellow,
					   false, true,  3, 10);
		const predInv = new GraphLine(this, d => d.p, cbColors.red,
					   true, false,  10, 0);
//		this.predictedInvValue = this.predictedInv();
         
        const d3 = document.getElementById('chartLegendlit');
        d3.append(avgInv.createLegend('avg. inventory'),
                  avgRT.createLegend('avg. flow time * avg. throughput'),
                  predInv.createLegend('predicted inventory')
                  );
        lit.usrInputs.set('leg0', 
            new LegendItem('leg0', avgInv, localUpdateFromUser, true));
        lit.usrInputs.set('leg1', 
            new LegendItem('leg1', avgRT, localUpdateFromUser, true));
        lit.usrInputs.set('leg2', 
            new LegendItem('leg2', predInv, localUpdateFromUser, false));
    };
	
	push (t, inv, rt){
		t /= tioxTimeConv;
		let p = {t: t, i: inv,
				 rt: rt,
				 p: this.predictedInvValue};
		this.drawOnePoint(p);
	};
	
	reset(){
		this.predictedInvValue = this.predictedInv();
        super.reset(this.predictedInvValue * 1.2);
	}
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
    updateForParamChange(){
        lit.graph.updatePredictedInv();
        irt = new IRT(lit.now, theSimulation.littlesBox.getNumberBusy());
        this.restartGraph(lit.now/tioxTimeConv);
    };
}

const anim = {};
var lit;
var gSF;
var irt;

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

anim.walkOffStageTime = 
    Math.abs(anim.person.path.exit - anim.person.path.right) / anim.stage.normalSpeed;

anim.pathway = {
	left: 0,
	top: anim.person.path.top - 2,
	fill: 'white',
	width: anim.stage.width,
	height: anim.person.height + 4
};

var totInv, totTime, totPeople, firstArr, lastArrDep, LBRFcount;

function litDefine(){
	document.getElementById('lit').omConcept = lit;
	lit.tioxTimeConv = tioxTimeConv;

    anim.stage.foreground = new StageOnCanvas('foregroundlit',
                                anim.stage.width, anim.stage.height);
    anim.stage.background = new StageOnCanvas('backgroundlit',
                                anim.stage.width, anim.stage.height);
    anim.stage.foreContext = anim.stage.foreground.context;
	anim.stage.backContext = anim.stage.background.context;
	lit.stage = anim.stage;
	
	gSF = new GStickFigure(anim.stage.foreContext,
			anim.person.height,0);
};



class LittlesLaw extends OmConcept{
    constructor(usrInputs){
        super('lit');
        this.usrInputs = usrInputs;
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
        irt = new IRT(lit.now, 0);
    };
    
    localUpdateFromSliders(...inpsChanged){
        for(let inp of inpsChanged){
            localUpdate(inp); 
        };
        if( match(inpsChanged,['ar','acv','st','scv'])) {
            lit.graph.updateForParamChange();
        }
    };
    redoStagesGraph(){
        this.stage.foreground.reset();
        this.stage.background.reset();
        this.graph.chart.reset();

        this.redrawBackground();
        this.graph.setupThenRedraw();
        this.clearRedrawStage(0,true);
    };
    
    redrawBackground() {
        const c = anim.stage.backContext;
        const b = anim.room;
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
};
function localUpdateFromUser(inp){
    lit.setOrReleaseCurrentLi(inp);
    localUpdate(inp);
    if( match([inp],['ar','acv','st','scv'])) {
            lit.graph.updateForParamChange();
        }
};
        
        
 function localUpdate(inp){
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

        case 'st':
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
        case 'leg0':
        case 'leg1':
        case 'leg2':
            break;
        default:
            console.log(' reached part for default');
            break;
    }
}

//  One variable for each process step or queue
//  that contains the functions to do the specific
//  animation for that process step

class LitQueue  extends Queue{
	constructor(){ 
        
        super(lit, 'queue', -1);
        this.walkingTime = (anim.person.path.entry - anim.person.path.left) / anim.stage.normalSpeed;
        this.loc = {x: anim.person.path.entry, y: anim.person.path.top};
    }
	push(person) /*   was called join... nInQueue, arrivalTime, person)*/ {
		if( !super.push(person, this.walkingTime) ) return false;
        const arrivalTime = this.omConcept.now + this.walkingTime;
        person.addPath({
			t: arrivalTime,
			x: this.loc.x,
			y: this.loc.y
		});
        return true;
	};
    arriveAnim(){};
    pullAnim(){};
};

class LitWalkOffStage extends WalkAndDestroy {
	constructor( ){
        super( lit,'walk off',false, anim.walkOffStageTime);
        this.loc = {x: anim.person.path.right, y: anim.person.path.top};
    };
    pushAnim (person) { 
		person.addPath({
			t: lit.now + anim.walkOffStageTime,
			x: this.loc.x,
			y: this.loc.y
		});
	}
};

class LitCreator extends MachineCenter {
	constructor(){
        super(lit, 'creator', 1, theSimulation.interarrivalRV);
    };
	startAnim (machine, theProcTime) { 
		machine.person.setDestWithProcTime(theProcTime,
			anim.person.path.left, anim.person.path.top);
	};
    finishAnim(machine){};
};

class LittlesBox extends InfiniteMachineCenter {
	constructor(){
        super(lit, 'LittlesBox', theSimulation.serviceRV);
        this.lastFinPerson = null;
    };
	startAnim (machine, theProcTime){
        let person = machine.person;
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
        
        
        person.arrivalTime = lit.now;
        irt.in(lit.now);
	};

	finishAnim (machine) {
        const person = machine.person;
		this.lastFinPerson = person;
		person.updateBadge = false;
        irt.out(lit.now,person.arrivalTime);
        lit.graph.push(lit.now,irt.avgI(),irt.avgRT());	
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
//		setBackground();

		// random variables
		const ar = lit.usrInputs.get('ar').get();
		const acv = lit.usrInputs.get('acv').get();
		theSimulation.interarrivalRV = new GammaRV(ar / tioxTimeConv, acv);
		const st = lit.usrInputs.get('st').get();
		const scv = lit.usrInputs.get('scv').get();
		theSimulation.serviceRV = new GammaRV(1 / st / tioxTimeConv, scv);

		//queues
		this.supply = new Supplier(anim.person.path.left, anim.person.path.top);
		this.queue = new LitQueue();
		lit.resetCollection.push(this.queue);
		this.walkOffStage = new LitWalkOffStage();
		lit.resetCollection.push(this.walkOffStage);

		// machine centers 
		this.creator = new LitCreator();
		lit.resetCollection.push(this.creator);
		this.littlesBox = new LittlesBox();
		lit.resetCollection.push(this.littlesBox);
		
        //link the components together
		this.creator.setPreviousNext(this.supply, this.queue);
        this.queue.setPreviousNext(this.creator, this.littlesBox);
        this.littlesBox.setPreviousNext(this.queue, this.walkOffStage);
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
	 
       
	//now put in the sliders with the play/reset box	
	let elem = document.getElementById('slidersWrapperlit');
	
    
    const arInput = genRange('arlit', '1', 1, 6, 1);
    elem.append(htmlNumSlider(arInput, 'Arrival Rate = ', '1', [1,2,3,4,5,6]) );
    usrInputs.set('ar', new NumSlider('ar',arInput,
                localUpdateFromUser, 1, 6, 1, 0, 1, 1) );
    
    const acvInput = genRange('acvlit', '0.0', 0, 2, .5);
    elem.append(htmlNumSlider(acvInput, 'Arrival CV = ', 0,['0.0','1.0','2.0']) );
    usrInputs.set('acv', new NumSlider('acv', acvInput,
                localUpdateFromUser, 0, 2, 0, 1, 2, 10) );
    
    
    const stInput = genRange('stlit', '6', 5, 25, 1);
    elem.append(htmlNumSlider(stInput, 'Service Time = ', 6, [5, 15, 25]) );
    usrInputs.set('st', new NumSlider('st',stInput,
                localUpdateFromUser, 5, 25, 6, 0, 2, 1) );
    
    const scvInput = genRange('scvlit', '0.0', 0, 2, .5);
    elem.append(htmlNumSlider(scvInput, 'Service CV = ', 0,['0.0','1.0','2.0']) );
    usrInputs.set('scv', new NumSlider('scv', scvInput,
                localUpdateFromUser, 0, 2, 0, 1, 2, 10) );

	elem.append(genPlayResetBox('lit') );
    usrInputs.set('reset', new CheckBox('reset', 'resetlit',
                localUpdateFromUser, false) );
    usrInputs.set('action', new RadioButton('action', 'actionlit', 
                localUpdateFromUser, ['none','play','pause'], 'none') );
    
    const speedInput = genRange('speedlit',0,0,5,1);
    elem.append(htmlArbSlider(speedInput, 'Speed = ', 0,
                            ["slow",' ',' ',' ',"fast",'∞']) );
    usrInputs.set('speed', new ArbSlider('speed', speedInput, 
                localUpdateFromUser, ["1x",'2x','5x','10x',"25x",'∞'],
				                [1,2,5,10,25,1000], 0) );
    
    
    const f = document.getElementById('scenariosMidlit');
	f.style = "min-height: 26vw";
    
    return usrInputs;
};

export function litStart() {
    let usrInputs = litHTML();
    lit = new LittlesLaw(usrInputs);
    litDefine();
    lit.graph = new LittleGraph();
    lit.setupScenarios();
    theSimulation.initialize();
	lit.reset();
	return lit;
};