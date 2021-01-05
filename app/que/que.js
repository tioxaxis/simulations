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
	GammaRV, Heap, cbColors, Average, StageOnCanvas
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

class QueueGraph extends TioxGraph {
	constructor(){	
		super(que,'chartCanvasque', 40, {width:10, step:2}, d=>d.t,
             2000,600,false);
		this.setTitle('Waiting Time');
		const indivWait = new GraphLine(this, d => d.i, cbColors.blue,
					                   false, true,  5, 10);
		const avgWait = new GraphLine(this, d => d.a, cbColors.yellow,
					                   false, true,  5, 10);
		this.predWait = new GraphLine(this, d => d.p, cbColors.red,
					                   true, false,  10, 0);
		this.predictedWaitValue = null; /*this.predictedWait();*/
        
        const leg0 = indivWait.createLegend('individual wait');
        const leg1 = avgWait.createLegend('average wait');
        const leg2 = this.predWait.createLegend('predicted wait');
        const d3 = document.getElementById('chartLegendque');
        d3.append(leg0, leg1, leg2);
        
        que.usrInputs.set('leg0', 
            new LegendItem('leg0', indivWait, localUpdateFromUser)); 
        que.usrInputs.set('leg1', 
            new LegendItem('leg1', avgWait, localUpdateFromUser));
        que.usrInputs.set('leg2', 
            new LegendItem('leg2', this.predWait, localUpdateFromUser));
	};
	
	push (t,w){
		t /= tioxTimeConv;
		w /= tioxTimeConv;
		const a = this.averageWait.addItem(w);
        let pW = this.predictedWaitValue == Infinity ? null : this.predictedWaitValue;
		let p = {t: t, i: w,
				 a: a,
				 p: pW};
		this.drawOnePoint(p);
	};
	reset(){
		this.averageWait = new Average();
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
		//this.omConcept.usrInputs.get('leg2').legInput   will avoid the global!!
        this.predWait.setLegendText( 'predicted wait' +
					   ((pW == Infinity) ? ' = ∞' : ''));

		this.predictedWaitValue = pW;
	};
    updateForParamChange(){
        this.updatePredictedWait();
        this.averageWait = new Average();
        this.restartGraph(que.now/tioxTimeConv);
    };
}
const anim = {};
let que ;
var gSF;
var leg2Input ;// allows communication across graph setting up this elem.

const tioxTimeConv = 10000; //rates in tiox are k/10 seconds

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
		pastScanner: anim.stage.width * .80,
		top: 150,
	}
};
anim.scannerDelta = {
  	dx: 0,
	dy: anim.person.height * 1.8
};

function queDefine(){
	document.getElementById('que').omConcept = que;
	
	
	que.tioxTimeConv = tioxTimeConv;

	
    
    anim.stage.foreground = new StageOnCanvas('foregroundque',
                                anim.stage.width, anim.stage.height);
    anim.stage.background = new StageOnCanvas('backgroundque',
                                anim.stage.width, anim.stage.height);
    anim.stage.foreContext = anim.stage.foreground.reset();
	anim.stage.backContext = anim.stage.background.reset();
	que.stage = anim.stage;
    
    window.addEventListener('resize',redoStagesGraphque );
    
    const tsaAgent = document.getElementById("tsaAgent");
    anim.stage.backContext
        .drawImage(tsaAgent, anim.person.path.headQueue+10,
                   30, 80, 100);
     
	gSF = new GStickFigure(anim.stage.foreContext,
			anim.person.height);
};

function redoStagesGraphque(){
    anim.stage.foreground.reset();
    anim.stage.background.reset();
    que.graph.chart.reset();
    
    
    que.graph.setupThenRedraw();
    que.clearRedrawStage(0,true);
    console.log('in queueing and called redoStages');
};


class Queueing extends OmConcept{
    constructor(usrInputs){
        super('que');
        this.usrInputs = usrInputs;
//        this.setupScenarios();    
    };
    
    localReset () {
		
        // schedule the initial Person to arrive and start the simulation/animation.
        theSimulation.supply.previous = null;
        theSimulation.creator.knockFromPrevious();

        //fudge to get animation started quickly
        let t = que.heap.top().time - 1;
        que.now = que.frameNow = t;
        theSimulation.nInQueue = 0;
        document.getElementById('nInQueue').innerHTML = '0';
    };
    localUpdateFromSliders(...inpsChanged){
        for(let inp of inpsChanged){
            localUpdate(inp); 
        };
        if( match(inpsChanged,['ar','acv','sr','scv'])) {
            que.graph.updateForParamChange();
        }
    };
};
function localUpdateFromUser(inp){
    que.setOrReleaseCurrentLi(inp);
    localUpdate(inp);
    if( match([inp],['ar','acv','sr','scv'])) {
            que.graph.updateForParamChange();
        }
};
        
        
 function localUpdate(inp){
    let v = inp.get();
    switch (inp.key){
        case 'ar':
            theSimulation.interarrivalRV
                .setRate(v / tioxTimeConv);
            que.heap.modify('finish/creator', que.now, 
                            theSimulation.interarrivalRV);
            break;
        case 'acv':
            theSimulation.interarrivalRV
                .setCV(v);
            que.heap.modify('finish/creator', que.now,
                            theSimulation.interarrivalRV);
            break;
        case 'sr':
            theSimulation.serviceRV
                .setRate(v / tioxTimeConv);
            que.heap.modify('finish/TSAagent', que.now, 
                            theSimulation.serviceRV);
           break;
        case 'scv':
            theSimulation.serviceRV
                .setCV(v);
            que.heap.modify('finish/TSAagent', que.now, 
                            theSimulation.serviceRV);
            break;
        case 'speed':
            que.adjustSpeed(v,speeds);
            break;
        case 'action':
        case 'reset':
        case 'leg0':
        case 'leg1':
        case 'leg2':
            break;
        default:
            alert(' reached part for default, key=',inp.key);
            console.log(' reached part for default, key=',inp.key);
            break;
    }
};

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
//		console.log('in Queue join', guessInQueue,dist,time);
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

const animForWalkOffStage = {
	walkingTime: Math.abs(anim.person.path.scanner 
		- anim.person.path.right) / anim.stage.normalSpeed,

	reset: function(){},
    start: function (person) {
		person.addPath({
			t: que.now + 50 / anim.stage.normalSpeed,
			x: anim.person.path.pastScanner,
			y: anim.person.path.top
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
	
//		c.resetTransform();
		c.strokeStyle = 'blue';
		c.lineWidth = 5;
		c.beginPath();
		for (let k = 0; k < numMachines; k++) {
			c.strokeRect(locX - 28, locY - 15, 55, anim.person.height*1.4);
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
		const ar = que.usrInputs.get('ar').get();
		const acv = que.usrInputs.get('acv').get();
		theSimulation.interarrivalRV = new GammaRV(ar / tioxTimeConv, acv);
		const sr = que.usrInputs.get('sr').get();
		const scv = que.usrInputs.get('scv').get();
		theSimulation.serviceRV = new GammaRV(sr / tioxTimeConv, scv);

		//queues
		this.supply = new Supplier(anim.person.path.left, anim.person.path.top);

		this.queue = new Queue(que, "theQueue", -1,
			animForQueue.walkingTime, animForQueue,
			recordQueueArrival, recordQueueLeave);
		que.resetCollection.push(this.queue);
		
		// define the helper functions for theQueue
		function recordQueueArrival(person) {
			person.arrivalTime = que.now;
		};

		function recordQueueLeave(person) {
			que.graph.push(que.now, que.now - person.arrivalTime);
		};


		this.walkOffStage = new WalkAndDestroy(que, "walkOff",
								animForWalkOffStage, true);
		que.resetCollection.push(this.walkOffStage);

		// machine centers 
		this.creator = new MachineCenter(que, "creator",
			1, theSimulation.interarrivalRV,
			this.supply, this.queue,
			animForCreator);
		que.resetCollection.push(this.creator);

		this.TSAagent = new MachineCenter(que, "TSAagent",
			1, theSimulation.serviceRV,
			this.queue, this.walkOffStage,
			animForTSA);
		que.resetCollection.push(this.TSAagent);

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


export class Person extends Item {
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


function queHTML(){	
	let usrInputs = new Map();
    
    addDiv('que','que','whole')
	addDiv('que', 'leftHandSideBox'+'que',
			   'stageWrapper', 'statsWrapper',
			   'chartWrapper');
	 
	//stats line
	const d2 = document.getElementById('statsWrapperque');
	const delem = document.createElement('div');
	const selem = document.createElement('span');
	 selem.id = 'nInQueue';
	 delem.append('Number in Queue: ',selem);
	 d2.append(delem);
    

	//now put in the sliders with the play/reset box	
	
	let elem = document.getElementById('slidersWrapperque');
    
    const arInput = genRange('arque', '5.0', 0, 10, .1);
    elem.append(htmlNumSlider(arInput, 'Arrival Rate = ', '5.0', [0,2,4,6,8,10]) );
    usrInputs.set('ar', new NumSlider('ar',arInput,
                localUpdateFromUser, 1,3,10) );
    
    const acvInput = genRange('acvque', '0.0', 0, 2, .5);
    elem.append(htmlNumSlider(acvInput, 'Arrival CV = ', 0,['0.0','1.0','2.0']) );
    usrInputs.set('acv', new NumSlider('acv', acvInput,
                localUpdateFromUser, 1,2,10) );
    
    
    const srInput = genRange('srque', '6.0', 0, 10, .1);
    elem.append(htmlNumSlider(srInput, 'Service Rate = ', '6.0',[0,2,4,6,8,10]) );
    usrInputs.set('sr', new NumSlider('sr',srInput,
                localUpdateFromUser, 1,3,10) );
    
    const scvInput = genRange('scvque', '0.0', 0, 2, .5);
    elem.append(htmlNumSlider(scvInput, 'Service CV = ', 0,['0.0','1.0','2.0']) );
    usrInputs.set('scv', new NumSlider('scv', scvInput,
                localUpdateFromUser, 1,2,10) );
    
    elem.append( genPlayResetBox('que') );
    usrInputs.set('reset', new CheckBox('reset', 'resetque',
                localUpdateFromUser) );
    usrInputs.set('action', new RadioButton('action', 'actionque', 
                localUpdateFromUser, ['none','play','pause']) );
     
    const speedInput = genRange('speedque',0,0,5,1);
    elem.append(htmlArbSlider(speedInput, 'Speed = ', '1x',
                            ["slow",' ',' ',' ',"fast",'∞']) );
    usrInputs.set('speed', new ArbSlider('speed', speedInput, 
                localUpdateFromUser, ["1x",'2x','5x','10x',"25x",'∞'],
				                [1,2,5,10,25,1000]) );   
    
	const f = document.getElementById('scenariosMidque');
	f.style = "min-height: 26vw";
    
    return usrInputs;
};

export function queStart() {
	let usrInputs= queHTML();
    que = new Queueing(usrInputs);
    queDefine();
    que.graph = new QueueGraph();
    que.setupScenarios();
    theSimulation.initialize();
    
	que.reset();
	return que;
};