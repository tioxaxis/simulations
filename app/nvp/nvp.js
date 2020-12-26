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
	GammaRV, UniformRV, DeterministicRV, Heap, cbColors, Average, IRT
}
from '../mod/util.js';
import {
	OmConcept
}
from '../mod/rhs.js';
import {
	Queue, WalkAndDestroy, MachineCenter,
	InfiniteMachineCenter, Combine, Item,
	GStickFigure, NStickFigure, GStore, tioxColors
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
    LegendItem
}
from '../mod/genHTML.js';

class NVGraph extends TioxGraph {
	constructor(){
		
		super(nvp,'chartCanvasnvp',40, {width:12, step:3}, d=>d.t);
		this.totalCost = 0;
		this.setTitle('$ of cost per day');
		
		const under = new GraphLine(this, d => d.u, cbColors.red,
					   false, true,  5, 16);
		const over = new GraphLine(this, d => d.o, cbColors.yellow,
					   false, true,  5, 16);
		const average = new GraphLine(this, d => d.a, cbColors.blue,
					   false, true,  8, 0);
        this.avgCost = new Average();
        
        const d4 = document.getElementById('chartLegendnvp');
        d4.append(under.createLegend('underage cost'),
                  over.createLegend('overage cost'),
                  average.createLegend('average cost')
                  );
        nvp.usrInputs.set('leg0', new LegendItem('leg0', under, localUpdateFromUser));
        nvp.usrInputs.set('leg1', new LegendItem('leg1', over, localUpdateFromUser));
        nvp.usrInputs.set('leg2', new LegendItem('leg2', average, localUpdateFromUser));
	};
	
	push (n, under, over){
		this.drawOnePoint(
            {t: n,
             u: under,
             o: over,
             a: this.avgCost.addItem(under + over)
            }
        );
	};
	reset(yMax){
        this.avgCost = new Average();
		super.reset(yMax);
		const v = document.getElementById('speednvp').value;
		const f = speeds[v].graph;
		this.updateForSpeed(f);
	}
	updateForSpeed (factor){
		this.scaleXaxis(factor);
	}
}
const anim = {};
var nvp;
var gSF;
var lastRound;

const disappointed = {
	color: 'rgb(235, 230, 230)',
	border: 'rgb(31, 105, 245)'
};
const tioxTimeConv = 1000; //time are in milliseconds

const speeds = [{time:1,graph:1,anim:true},
				{time:2,graph:1,anim:true},
				{time:5,graph:2,anim:true},
				{time:10,graph:2,anim:true},
				{time:25,graph:5,anim:true},
			{time:1000,graph:20,anim:false}];


anim.stage = {
	normalSpeed: 0.10, //.25 pixels per millisecond
	width: 1000,
	height: 300,
	
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

function nvpDefine(){
	
	document.getElementById('nvp').omConcept = nvp;
	
	anim.stage.foreContext = document
		.getElementById('foregroundnvp')
		.getContext('2d');
	anim.stage.backContext = document
		.getElementById('backgroundnvp')
		.getContext('2d');
	nvp.stage = anim.stage;
	gSF = new GStickFigure(anim.stage.foreContext,
			anim.person.height, anim.box.size);
	
	
	nvp.fullSpeedSim = function(){
				
		if (this.nRounds == this.graph.xInfo.max){
			this.graph.shiftXaxis2();
		} 
		lastRound = this.graph.xInfo.max;
		let theTop;
		while ((theTop = this.heap.top()) &&
				this.nRounds < lastRound) {
			const event = this.heap.pull();
			// event on heap is {time: ,proc: ,item: }
			this.now = event.time;
			event.proc(event.item);
		}
		this.frameNow = this.now;
		this.clearStageForeground();
	}
};

class NewsVendor extends OmConcept{
    constructor(usrInputs){
        super('nvp');
        this.usrInputs = usrInputs;
//        document.getElementById('slidersWrappernvp')
//			.addEventListener('input', this.captureUserUpdate.bind(this));
        this.setupScenarios();    
    };
    localReset () {
		
        document.getElementById('actualPercnvp').innerHTML ="00.00";
		let maxUnder = theSimulation.Cu * 
				((1 + theSimulation.demandRV.variance) * theSimulation.demandRV.mean  
				 - theSimulation.quantityOrdered + 1);
		let maxOver = theSimulation.Co * 
				(theSimulation.quantityOrdered - 
				(1 - theSimulation.demandRV.variance) * theSimulation.demandRV.mean + 1) ;
	
	
		nvp.totCost = 0;
		nvp.nRounds = 0;
		nvp.enough = 0;
		nvp.graph.reset(Math.max(maxUnder,maxOver));
		setDesired(theSimulation.Cu, theSimulation.Co);
		setExpected(theSimulation.quantityOrdered,
			theSimulation.demandRV.mean,
			theSimulation.demandRV.variance);

		theSimulation.supply.previous = null;
		nvp.heap.push({
			time: nvp.now + 500,
			type: 'new cycle',
			proc: theSimulation.demand.cycle.bind(theSimulation.demand),
			item: null
		});
		nvp.tioxTimeConv = tioxTimeConv;
		lastRound = 0;

    };
    localUpdateFromSliders(...inpsChanged){
        for(let inp of inpsChanged){
            localUpdate(inp); 
        };
    };
};
function localUpdateFromUser(inp){
    nvp.setOrReleaseCurrentLi(inp);
    localUpdate(inp);
};
        
        
 function localUpdate(inp){
    let v = inp.get();
    switch (inp.key){
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
            nvp.adjustSpeed(v,speeds);
            break;
        case 'action':
        case 'reset':
        case 'leg0':
        case 'leg1':
        case 'leg2':
            break;
        default:
            alert(' reached part for default id=',key);
            debugger;
            break;
    }
};

function setDesired(under, over) {
	document.getElementById('desiredPercnvp')
        .innerHTML = (100 * under / (under + over)).toFixed(2);
}

function setExpected(q, m, v) {
	let perc;
	// r.v has a range of [m(1-v)], m(1+v)] 
	// modQ finds the "q" in the range above.
	let modQ = Math.max(Math.min(q, m * (1 + v)), m * (1 - v));
	if (v != 0) perc = 100 * (modQ - m * (1 - v)) / (2 * m * v);
	else if (q < m) perc = 0;
	else perc = 100;
	document.getElementById('expectedPercnvp')
        .innerHTML = (perc).toFixed(2);
}

function setActual(enough, total) {
	document.getElementById('actualPercnvp')
        .innerHTML = (100 * enough / total).toFixed(2);
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
	arrive: function (nSeatsUsed, person) {	},
	leave: function (procTime, nSeatsUsed) {}
};

const animForWalkOffStage = {
	walkingTime: (anim.person.path.right - anim.person.path.left) / anim.stage.normalSpeed,

	reset: function(){},
    start: function (person) {
		person.addPath({
			t: nvp.now +
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
			t: nvp.now + walkingTime,
			x: anim.person.path.right,
			y: anim.person.path.bot
		});
		const leftTime = walkingTime / 2;
		const upTime = walkingTime / 2;

		if (pack) {
			pack.addPath({
				t: nvp.now + leftTime,
				x: anim.person.path.right + person.graphic.gSF.package.x,
				y: pack.cur.y
			});
			pack.addPath({ // move up to arm height in other time
				t: nvp.now + walkingTime,
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


const theSimulation = {
	//  the two random variables in the simulation
	demandRV: null,

	// the 5 process steps in the simulation
	supply: null,
	queue: null,
	walkOffStage: null,
	demand: null,
	newsVendor: null,
	
	//parameters from sliders
	Cu: null,
	Co: null,
	quantityOrdered: null,

	initialize: function () {
		// random variables
		const r = nvp.usrInputs.get('dr').get();
		const cv = nvp.usrInputs.get('dcv').get();
		theSimulation.demandRV = new UniformRV(r, cv);
		theSimulation.serviceRV =
			new DeterministicRV(animForQueue.walkingTime2);
		theSimulation.Co = Number(nvp.usrInputs.get('Co').get());
		theSimulation.Cu = Number(nvp.usrInputs.get('Cu').get());
		theSimulation.quantityOrdered = 
            nvp.usrInputs.get('quan').get();

		nvp.graph = new NVGraph();
		
		//queues
		this.supply = new Supplier(anim.person.path.left, anim.person.path.top);

		this.queue = new Queue(nvp, "theQueue", -1,
			animForQueue.walkingTime, animForQueue,
			null, null);
		nvp.resetCollection.push(this.queue);
		
		this.store = new RetailStore(nvp, anim);
		nvp.resetCollection.push(this.store);
		
		this.walkOffStage = new WalkAndDestroy(nvp, "walkOff", animForWalkOffStage, true);
		nvp.resetCollection.push(this.walkOffStage);

		this.demand = new DemandCreator(20000, theSimulation.demandRV);
		nvp.resetCollection.push(this.demand);

		this.newsVendor = new Combine(nvp,'newsVendor',
			theSimulation.serviceRV,
			this.queue, this.store, this.walkOffStage,
			animForNewsVendor);
		nvp.resetCollection.push(this.newsVendor);

		//link the queue to machine before and after
		this.queue.setPreviousNext(
			this.creator, this.newsVendor);
	},
};

// SUPPLIER
class Supplier {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	};
	pull() {
		return new Person(nvp,
			this.x, this.y);
	}
}; //end class Supplier

const peopleSpacing = 70;
class DemandCreator {
	constructor(cycleLength, demandRV) {
		this.cycleLength = cycleLength;
		this.timeToNV = ((anim.person.path.right - anim.person.path.left) +
			(anim.person.path.bot - anim.person.path.top)) / anim.stage.normalSpeed;
		this.demandRV = demandRV;
		
		this.curDemand = null;
		this.overageForDay = null;
		this.underageForDay = null;
	};

	reset() {};

	cycle() {
//		console.log('start of cycle', nvp.now)
		theSimulation.store.emptyStore();
		this.curDemand = Math.floor(theSimulation.demandRV.observe());
		theSimulation.store.addBox(theSimulation.quantityOrdered);
		//		this.store.packages.drawAll();
		nvp.nRounds++;
		let excess = theSimulation.quantityOrdered - this.curDemand;
		this.overageForDay = theSimulation.Co * Math.max(0, excess);
		this.underageForDay = theSimulation.Cu * Math.max(0, -excess);
		nvp.totCost += this.overageForDay + this.underageForDay;
		if (this.curDemand <= theSimulation.quantityOrdered)
			nvp.enough++;

		let t = nvp.now;
		let deltaT = peopleSpacing / anim.stage.normalSpeed;

		for (let i = 0; i < this.curDemand; i++) {
			t += deltaT
			let person = theSimulation.supply.pull();
			nvp.heap.push({
				time: t,
				type: 'create',
				proc: theSimulation.queue.push.bind(theSimulation.queue),
				item: person
			});
		}
		nvp.heap.push({
			time: t + this.timeToNV,
			type: 'plot',
			proc: this.graph.bind(theSimulation.demand),
			item: null
		})
		nvp.heap.push({
			time: t + this.cycleLength,
			type: 'new cycle',
			proc: this.cycle.bind(this),
			item: null
		});
	};
	graph() {
		nvp.graph.push(nvp.nRounds, this.underageForDay, this.overageForDay);
//		console.log(nvp.nRounds,nvp.now);
		setActual(nvp.enough, nvp.nRounds);

		theSimulation.store.makeAllGrey();
	}
};

class RetailStore extends GStore {
	constructor(omConcept, anim) {
		super(omConcept, anim);
		this.anim = anim;
	};
	addBox(n) {
		for (let i = 0; i < n; i++) {
			this.addNew()
		};
	};
};

export class Person extends Item {
	constructor(omConcept, x, y = 60) {
		super(omConcept, x, y);
		this.graphic = new NStickFigure(gSF, x, y);
	};
}; // end class Person



function nvpHTML(){	
	let usrInputs = new Map();
    
    addDiv('nvp','nvp','whole')
	addDiv('nvp', 'leftHandSideBox'+'nvp',
			   'stageWrapper', 'statsWrapper',
			   'chartWrapper');
	 
	//stats line
	const d = document.getElementById('statsWrappernvp');
	
	const d1 = document.createElement('div');
	d1.className ="statDisplay";
	const s1 = document.createElement('span');
	s1.id = 'expectedPercnvp';
	d1.append('Expected: ',s1,'%');
	
	const d2 = document.createElement('div');
	d2.className ="statDisplay";
	const s2 = document.createElement('span');
	s2.id = 'desiredPercnvp';
	d2.append('Desired: ',s2,'%');
	
	const d3 = document.createElement('div');
	d3.className ="statDisplay";
	const s3 = document.createElement('span');
	s3.id = 'actualPercnvp';
	d3.append('Actual: ',s3,'%');
	d.append(d1,d2,d3);
    
    	
	const empty = document.createElement('div');
	empty.className = "sliderBox"
	 
	//now put in the sliders with the play/reset box	
	let elem = document.getElementById('slidersWrappernvp');
	
    const drInput = genRange('drnvp', '5.0', 10, 50, 1);
    elem.append(htmlNumSlider(drInput, 'Demand Rate = ', '20', [10,20,30,40,50]) );
    usrInputs.set('dr', new NumSlider('dr',drInput,
                localUpdateFromUser, 1,2,1) );
    
    const dcvInput = genRange('dcvnvp', '0.0', 0, 2, .5);
    elem.append(htmlNumSlider(dcvInput, 'Demand Variability = ', '0.0',['0.0','1.0','2.0']) );
    usrInputs.set('dcv', new NumSlider('dcv', dcvInput,
                localUpdateFromUser, 1,2,10) );
    
	const cuInput = genRange('cunvp', '8', 0, 10, 1);
    elem.append( htmlNumSlider(cuInput, 'Underage Cost = ', '8', [0,2,4,6,8,10] )); 
	usrInputs.set('Cu', new NumSlider('Cu',cuInput, localUpdateFromUser, 0, 2, 1));
    
    const coInput = genRange('convp', '1', 0, 10, 1);
    elem.append( htmlNumSlider(coInput, 'Overage Cost = ', '1', [0,2,4,6,8,10] )); 
	usrInputs.set('Co', new NumSlider('Co',coInput, localUpdateFromUser, 0, 2, 1));
    
	const quanInput = genRange('quannvp', '20', 10, 50, 1);
    elem.append( htmlNumSlider(quanInput, 'Order Quantity = ', '20', [10,20,30,40,50] )); 
	usrInputs.set('quan', new NumSlider('quan',quanInput, localUpdateFromUser, 0, 2, 1));
    
	elem.append(empty, genPlayResetBox('nvp'));
    
	const speedInput = genRange('speednvp',0,0,5,1);
    elem.append(htmlArbSlider(speedInput, 'Speed = ', '1x',
                            ["slow",' ',' ',' ',"fast",'∞']) );
    usrInputs.set('speed', new ArbSlider('speed', speedInput, 
                localUpdateFromUser, ["1x",'2x','5x','10x',"25x",'∞'],
				                [1,2,5,10,25,1000]) );
    
    	
	const f = document.getElementById('scenariosMidnvp');
	f.style = "min-height: 21vw";
    
    return usrInputs;
};

export function nvpStart() {
    let usrInputs = nvpHTML();
    nvp = new NewsVendor(usrInputs);
    nvpDefine();
    theSimulation.initialize();
    nvp.reset();
	return nvp;
};
