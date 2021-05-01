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
	GammaRV, UniformRV, DiscreteUniformRV, DeterministicRV, 
    Heap, cbColors, Average, IRT, StageOnCanvas, computeKeyIndex
}
from '../mod/util.js';
import {
	OmConcept
}
from '../mod/rhs.js';
import {
	Queue, WalkAndDestroy, MachineCenter,
	InfiniteMachineCenter, Combine, Item, Person,
	GStickFigure, NStickFigure, GStore, tioxColors
}
from "../mod/stepitem.js";
import {
	TioxGraph, GraphLine
}
from "../mod/graph.js";
// import {
// 	genPlayResetBox, genArbSlider, genButton, addDiv,
//       NumSlider, htmlNumSlider,
//     ArbSlider, htmlArbSlider,
//     genRange, 
//      htmlCheckBox, CheckBox, 
//     htmlRadioButton, RadioButton, 
//     IntegerInput, 
//     addKeyForIds, 
//     LegendItem, match, Description
// }
// from '../mod/genHTML.js';

import {
	NumParam, ArbParam, BoolParam, Description, match,
	NumSlider, ArbSlider, Checkbox, RadioButtons,
	LegendButton, addDiv, addKeyForIds, genPlayResetBox
}
	from '../mod/params.js';

class NVGraph extends TioxGraph {
	constructor(){
		super(nvp,'chartCanvasnvp',40, {width:12, step:3}, d=>d.t,
             2000,600,false);
		this.totalCost = 0;
		this.setTitle('$ of cost per day','chartTitle');
		
		const under = new GraphLine(this, d => d.u,
                        {color: cbColors.red, vertical: false,
                         visible: nvp.usrInputs.get('leg0'), continuous: false,
                         lineWidth: 5, dotSize: 16, right: false});
		const over = new GraphLine(this, d => d.o,
                        {color: cbColors.yellow, vertical: false,
							visible: nvp.usrInputs.get('leg1'), continuous: false,
                         lineWidth: 5, dotSize: 16, right: false});
		const average = new GraphLine(this, d => d.a,
                        {color: cbColors.blue, vertical: false,
							visible: nvp.usrInputs.get('leg2'), continuous: false,
                         lineWidth: 8, dotSize: 0, right: false});
                
		const d3 = document.getElementById('chartLegendnvp');
		d3.append('  ',
			nvp.usrInputs.get('leg0').create(cbColors.red, 'underage cost', 'nvp'),
			nvp.usrInputs.get('leg1').create(cbColors.yellow, 'overage cost', 'nvp'),
			nvp.usrInputs.get('leg2').create(cbColors.blue, 'average cost', 'nvp'),
			'  ');
			
			
		// 	const d4 = document.getElementById('chartLegendnvp');
        // d4.append('  ',under.createLegend('leg0','underage cost'),
        //           over.createLegend('leg1','overage cost'),
        //           average.createLegend('leg2','average cost'),'  '
        //           );
        // nvp.usrInputs.set('leg0', 
        //     new LegendItem('leg0', under, localUpdateFromUser, true));
        // nvp.usrInputs.set('leg1',
        //     new LegendItem('leg1', over, localUpdateFromUser, true));
        // nvp.usrInputs.set('leg2', 
        //     new LegendItem('leg2', average, localUpdateFromUser, true));
	};
	
	push (n, under, over){
		this.drawOnePoint(
            {t: n,
             u: under,
             o: over,
             a: nvp.avgCost.addItem(under + over)
            }
        );
	};
	reset(yMax){
        nvp.avgCost = new Average();
		super.reset(yMax);

	}
    updateForParamChange(){
        if( nvp.inCycle ) nvp.afterNextPointRestartGraph = true;
        else resetAvgsRestartGraph();
    };
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
	top: anim.store.top + anim.person.height/2,
	bot: anim.store.top + anim.person.height/2  + anim.box.space*7,
}
anim.person.path.mid = (anim.person.path.top + anim.person.path.bot) / 2;
anim.walkingTime1 = (anim.person.path.right - anim.person.path.left) / 
                            anim.stage.normalSpeed;
anim.walkingTime2 = (anim.person.path.mid - anim.person.path.top) / 
                            anim.stage.normalSpeed;
anim.walkingTime = ((anim.person.path.right - anim.person.path.left) +
		            (anim.person.path.mid - anim.person.path.top)) /
                            anim.stage.normalSpeed;

function nvpDefine(){
	document.getElementById('nvp').omConcept = nvp;
	
	anim.stage.foreground = new StageOnCanvas('foregroundnvp',
                                anim.stage.width, anim.stage.height);
    anim.stage.background = new StageOnCanvas('backgroundnvp',
                                anim.stage.width, anim.stage.height);
    anim.stage.foreContext = anim.stage.foreground.context;
	anim.stage.backContext = anim.stage.background.context;
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
        this.itemCollection.updatePositionAll();
        this.clearRedrawStage(0,true);
	}
};

class NewsVendor extends OmConcept{
    constructor(usrInputs){
        super('nvp');
        this.usrInputs = usrInputs;
        this.keyNames = ['dr','dcv','Cu','Co','quan',
                         'speed','action','reset',
                         'leg0','leg1','leg2','desc'];
        this.keyIndex = computeKeyIndex(this.keyNames);
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
		nvp.fracEnough = new Average();
		nvp.graph.reset(Math.max(maxUnder,maxOver));
		setDesired(theSimulation.Cu, theSimulation.Co);
		setDemandRVandExpected(theSimulation.quantityOrdered,
                               Number(nvp.usrInputs.get('dr').get()),
                               Number(nvp.usrInputs.get('dcv').get()));

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
        if( match(inpsChanged,['dr','dcv','Cu','Co','quan'])){
           nvp.graph.updateForParamChange();
        };
    };
    redoStagesGraph(){
        this.stage.foreground.reset();
        this.stage.background.reset();
        this.graph.chart.reset();

        this.redrawBackground();
        this.graph.setupThenRedraw();
        this.clearRedrawStage(0,true);
    };
    clearStageForeground(){
        this.stage.foreground.clear();
    };
    redrawBackground() {
        theSimulation.store.drawStore();
    };
};



document.getElementById('nvp')
    .addEventListener('localUpdate',localUpdateFromUser);
function localUpdateFromUser(event){
    const inp = nvp.usrInputs.get(event.detail.key);
    console.log('in LOCAL UPDATE ',inp.key,inp.get());
    nvp.setOrReleaseCurrentLi(inp);
    localUpdate(inp);
    if( match([inp],['dr','dcv','Cu','Co','quan'])) {
            nvp.graph.updateForParamChange();
        }
};

// helper function for localUpdate.
 function setDemandRVandExpected(q, dr, dcv){
     const low = Math.floor(dr * (1 - dcv));
     const high = Math.ceil(dr * (1 + dcv));
     theSimulation.demandRV.setParams(low, high);
     setExpected(q, low, high);
 }      
        
 function localUpdate(inp){
    switch (inp.key){
        case 'dr':
            setDemandRVandExpected(
                theSimulation.quantityOrdered,
                inp,getNumber(), nvp.usrInputs.get('dcv').getNumber());
         break;

        case 'dcv':
            setDemandRVandExpected(
                theSimulation.quantityOrdered,
                nvp.usrInputs.get('dr').getNumber(), inp.getNumber());
            break;

        case 'Cu':
            theSimulation.Cu = inp.getNumber();
            setDesired(theSimulation.Cu, theSimulation.Co);
            break;

        case 'Co':
			theSimulation.Co = inp.getNumber();
            setDesired(theSimulation.Cu, theSimulation.Co);
            break;

        case 'quan':
			theSimulation.quantityOrdered = inp.getNumber();
            setDemandRVandExpected(
                theSimulation.quantityOrdered,
                nvp.usrInputs.get('dr').getNumber(), 
                nvp.usrInputs.get('dcv').getNumber()  );
            break;


        case 'speed':
            nvp.adjustSpeed(inp.getIndex());
            break;
        case 'action':
        case 'reset':
			break;
        case 'leg0':
        case 'leg1':
        case 'leg2':
			nvp.graph.setupThenRedraw();
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

function setExpected(q, low, high) {
	//uniform distribution on [low,high].  find P{RV<=q}
    let perc;
    if( q < low ) perc = 0;
    else if( q > high ) perc = 100;
    else perc = 100* (q - low + 1) / (high - low + 1);
	document.getElementById('expectedPercnvp')
        .innerHTML = (perc).toFixed(2);
}

function setActual() {
	document.getElementById('actualPercnvp')
        .innerHTML = (100 * nvp.fracEnough.getAverage()).toFixed(2);
}

//  One variable for each process step or queue
//  that contains the functions to do the specific
//  animation for that process step

class NvpQueue extends Queue {
    constructor(){
        super(nvp, "theQueue", -1);
        this.walkingTime = anim.walkingTime;
    };
	
	push(person) {
        if( !super.push(person, anim.walkingTime) ) return false;
        const arrivalTime = nvp.now + anim.walkingTime;
		person.addPath({
			t: arrivalTime - anim.walkingTime2,
			x: anim.person.path.right,
			y: anim.person.path.top
		});
		person.addPath({
			t: arrivalTime,
			x: anim.person.path.right,
			y: anim.person.path.mid
		});
        return true;
	};
    arriveAnim() {};
	pullAnim () {};
};

class  NvpWalkOffStage extends WalkAndDestroy {
	constructor(){
        super(nvp, "walkOff", true, anim.walkingTime1);
    };

	pushAnim (person) {
		person.addPath({
			t: nvp.now +
				anim.walkingTime1,
			x: anim.person.path.left,
			y: anim.person.path.bot
		});
	}
};


class NvpCombine extends Combine {
    constructor(rv, queue, store, walkoff ){
        super(nvp,'newsVendor',rv, queue, store, walkoff );
    }
	startAnim (person, pack, walkingTime) {
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
				y: anim.person.path.bot - 
                anim.person.height/2 + person.graphic.gSF.package.y,
			});
		}
	};
	
	finishAnim (person, pack) {
		if (pack) {
			person.graphic.packageVisible = true;
			person.graphic.packageColor = pack.graphic.color;
		} else {
			person.graphic.color = disappointed.color;
			person.graphic.bdaryColor = disappointed.border;
		}
	};
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
		const r = Number(nvp.usrInputs.get('dr').get());
		const cv = Number(nvp.usrInputs.get('dcv').get());
        const low = Math.floor( r * (1-cv) );
        const high = Math.ceil( r * (1+cv));
		theSimulation.demandRV = new DiscreteUniformRV(low,high);
		theSimulation.serviceRV =
			new DeterministicRV(anim.walkingTime2);
		theSimulation.Co = Number(nvp.usrInputs.get('Co').get());
		theSimulation.Cu = Number(nvp.usrInputs.get('Cu').get());
		theSimulation.quantityOrdered = 
            nvp.usrInputs.get('quan').get();

		//queues
		this.supply = new Supplier(anim.person.path.left, anim.person.path.top);

		this.queue = new NvpQueue();
		nvp.resetCollection.push(this.queue);
		
		this.store = new RetailStore();
		nvp.resetCollection.push(this.store);
		
		this.walkOffStage = new NvpWalkOffStage();
		nvp.resetCollection.push(this.walkOffStage);

		this.demand = new DemandCreator(20000, theSimulation.demandRV);
		nvp.resetCollection.push(this.demand);

		this.newsVendor = new NvpCombine(theSimulation.serviceRV,
			this.queue, this.store, this.walkOffStage);
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
	   this.current = null;
	};
	front() {
        if( this.current ) return this.current;
        return this.current = new Person(nvp, gSF, this.x, this.y);
	};
    pull(){
        const last = this.front();
        this.current = null;
        return last;
	}
}; //end class Supplier

const peopleSpacing = 70;
class DemandCreator {
	constructor(cycleLength, demandRV) {
		this.cycleLength = cycleLength;
		this.timeToNV = (2 * (anim.person.path.right - anim.person.path.left) +
			(anim.person.path.bot - anim.person.path.top)) / anim.stage.normalSpeed;
		this.demandRV = demandRV;
		
		this.curDemand = null;
		this.overageForDay = null;
		this.underageForDay = null;
        nvp.inCycle = false;
	};

	reset() {};

	cycle() {
		theSimulation.store.emptyStore();
		this.curDemand = Math.floor(theSimulation.demandRV.observe());
		theSimulation.store.addBox(theSimulation.quantityOrdered);
		//		this.store.packages.drawAll();
		
		let excess = theSimulation.quantityOrdered - this.curDemand;
		this.overageForDay = theSimulation.Co * Math.max(0, excess);
		this.underageForDay = theSimulation.Cu * Math.max(0, -excess);
		nvp.totCost += this.overageForDay + this.underageForDay;
		nvp.fracEnough.addItem(
            this.curDemand <= theSimulation.quantityOrdered? 1 : 0 );
			

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
        nvp.inCycle = true;
	};
    
	graph() {
		nvp.nRounds++;
        nvp.graph.push(nvp.nRounds, 
            this.underageForDay, this.overageForDay);
		setActual();
        if( nvp.afterNextPointRestartGraph ){
            resetAvgsRestartGraph();
            nvp.afterNextPointRestartGraph = false;
        }
		theSimulation.store.makeAllGrey();
        nvp.inCycle = false;
	}
};

function resetAvgsRestartGraph(){
    nvp.avgCost = new Average();
    nvp.fracEnough = new Average();
    nvp.graph.restartGraph(nvp.nRounds+0.5); 
};

class RetailStore extends GStore {
	constructor() {
		super(nvp, anim);
	};
	addBox(n) {
		for (let i = 0; i < n; i++) {
			this.addNew()
		};
	};
};

function defineParams() {
	let usrInputs = new Map();
	usrInputs.set('dr', new NumSlider('dr', 10, 50, 1, 20));
	usrInputs.set('dcv', new NumSlider('dcv', 0, 1, .2, 0));
	usrInputs.set('Cu', new NumSlider('Cu', 0, 10, 1, 6));
	usrInputs.set('Co', new NumSlider('Co', 0, 10, 1, 1));
	usrInputs.set('quan', new NumSlider('quan', 10, 50, 1, 20))
	usrInputs.set('reset', new Checkbox('reset', false));
	usrInputs.set('action', new RadioButtons('action', ['none', 'play', 'pause'],
		'none', 'actionnvp'));
	usrInputs.set('speed', new ArbSlider('speed', [1, 2, 5, 10, 25, 1000], 1));
	usrInputs.set('desc', new Description('desc'));
	usrInputs.set('leg0', new LegendButton('leg0', true));
	usrInputs.set('leg1', new LegendButton('leg1', true));
	usrInputs.set('leg2', new LegendButton('leg2', true));
	return usrInputs;
};


function nvpHTML(usrInputs){
    
    addDiv('nvp','nvp','whole')
	addDiv('nvp', 'leftHandSideBox'+'nvp',
			   'stageWrapper', 'statsWrapper',
			   'chartWrapper');
	 
	//stats line
	const d = document.getElementById('statsWrappernvp');
	
	const d1 = document.createElement('div');
	d1.className ="statDisplay";
    d1.title = 'Percentage of days newsvendor will "have enough" in expectation';
	const s1 = document.createElement('span');
	s1.id = 'expectedPercnvp';
	d1.append('Expected: ',s1,'%');
	
	const d2 = document.createElement('div');
	d2.className ="statDisplay";
    d2.title = 'Percentage of days newsvendor should "have enough" to minimize costs';
	const s2 = document.createElement('span');
	s2.id = 'desiredPercnvp';
	d2.append('Desired: ',s2,'%');
	
	const d3 = document.createElement('div');
	d3.className ="statDisplay";
    d3.title = 'Percentage of days newsvendor did "have enough" in this simulation';
	const s3 = document.createElement('span');
	s3.id = 'actualPercnvp';
	d3.append('Actual: ',s3,'%');
	d.append(d1,d2,d3);
    
    	
	const empty = document.createElement('div');
	empty.className = "sliderBox"
	 
	//now put in the sliders with the play/reset box	
	let elem = document.getElementById('slidersWrappernvp');
	
	elem.append(usrInputs.get('dr')
		.create('Demand Rate = ', [10, 20, 30, 40, 50]));


	elem.append(usrInputs.get('dcv')
		.create('Demand Variability = ', ['0.0', '0.5', '1.0']));

	elem.append(usrInputs.get('Cu')
		.create('Underage Cost = ', [0, 2, 4, 6, 8, 10]));

	elem.append(usrInputs.get('Co')
		.create('Overage Cost = ', [0, 2, 4, 6, 8, 10]));

	elem.append(usrInputs.get('quan')
		.create('Order Quantity = ', [10, 20, 30, 40, 50]));

	elem.append(empty);

	elem.append(genPlayResetBox('nvp', usrInputs));

	elem.append(usrInputs.get('speed')
		.create('Speed = ', ['1x', '2x', '5x', '10x', '25x', '∞'],
			["slow", ' ', ' ', ' ', "fast", '∞']));
			
			
	// const drInput = genRange('drnvp', '20', 10, 50, 1);
    // elem.append(htmlNumSlider(drInput, 'Demand Rate = ', '20', [10,20,30,40,50]) );
    // usrInputs.set('dr', new NumSlider('dr',drInput,
    //             localUpdateFromUser, 10, 50, 20, 0, 1) );
    
    // const dcvInput = genRange('dcvnvp', 0, 0, 1, .1);
    // elem.append(htmlNumSlider(dcvInput, 'Demand Variability = ', '0.0',['0.0','0.5','1.0']) );
    // usrInputs.set('dcv', new NumSlider('dcv', dcvInput,
    //             localUpdateFromUser, 0, 2, 0, 1, 10) );
    
	// const cuInput = genRange('cunvp', '8', 0, 10, 1);
    // elem.append( htmlNumSlider(cuInput, 'Underage Cost = ', '8', [0,2,4,6,8,10] )); 
	// usrInputs.set('Cu', new NumSlider('Cu',cuInput, localUpdateFromUser,
    //                                   0, 10, 8, 0, 1));
    
    // const coInput = genRange('convp', '1', 0, 10, 1);
    // elem.append( htmlNumSlider(coInput, 'Overage Cost = ', '1', [0,2,4,6,8,10] )); 
	// usrInputs.set('Co', new NumSlider('Co',coInput, localUpdateFromUser,
    //                                   0, 10, 1, 0, 1));
    
	// const quanInput = genRange('quannvp', '20', 10, 50, 1);
    // elem.append( htmlNumSlider(quanInput, 'Order Quantity = ', '20', [10,20,30,40,50] )); 
	// usrInputs.set('quan', new NumSlider('quan',quanInput, localUpdateFromUser,
    //                                     10, 50, 20, 0, 1));
    
	// elem.append(empty, genPlayResetBox('nvp'));
    // usrInputs.set('reset', new CheckBox('reset', 'resetnvp',
    //             localUpdateFromUser, false) );
    // usrInputs.set('action', new RadioButton('action', 'actionnvp', 
    //             localUpdateFromUser, ['none','play','pause'], 'none') );
    
	// const speedInput = genRange('speednvp',0,0,5,1);
    // elem.append(htmlArbSlider(speedInput, 'Speed = ', '1x',
    //                         ["slow",' ',' ',' ',"fast",'∞']) );
    // usrInputs.set('speed', new ArbSlider('speed', speedInput, 
    //             localUpdateFromUser, ["1x",'2x','5x','10x',"25x",'∞'],
	// 			                [1,2,5,10,25,1000], 0) );
    	
	const f = document.getElementById('scenariosMidnvp');
	f.style = "min-height: 18vw";
    
};

export function nvpStart() {
    let usrInputs = defineParams()
	nvpHTML(usrInputs);
    nvp = new NewsVendor(usrInputs);
    nvpDefine();
    nvp.graph = new NVGraph();

    nvp.setupScenarios();
    theSimulation.initialize();
    nvp.reset();
	return nvp;
};