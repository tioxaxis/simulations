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
	GammaRV, Heap, cbColors, Average, StageOnCanvas, computeKeyIndex
}
from "../mod/util.js";
import {
	OmConcept
}
from '../mod/rhs.js';
import {
	Queue, WalkAndDestroy, MachineCenter,
	InfiniteMachineCenter, Item, Person, 
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
    LegendItem, match, Description
}
from '../mod/genHTML.js';

class QueueGraph extends TioxGraph {
	constructor(){	
		super(que,'chartCanvasque', 40, {width:10, step:2}, d=>d.t,
             2000,600,false);
		this.setTitle('Waiting Time','chartTitle');
		const indivWait = new GraphLine(this, d => d.i, cbColors.blue,
					                   false, true,  5, 12);
		const avgWait = new GraphLine(this, d => d.a, cbColors.yellow,
					                   false, true,  5, 8);
		this.predWait = new GraphLine(this, d => d.p, cbColors.red,
					                   true, false,  10, 0);
		this.predictedWaitValue = null; /*this.predictedWait();*/
        
        const leg0 = indivWait.createLegend('individual wait');
        const leg1 = avgWait.createLegend('average wait');
        const leg2 = this.predWait.createLegend('predicted wait');
        const d3 = document.getElementById('chartLegendque');
        d3.append(leg0, leg1, leg2);
        
        que.usrInputs.set('leg0', 
            new LegendItem('leg0', indivWait, localUpdateFromUser, true)); 
        que.usrInputs.set('leg1', 
            new LegendItem('leg1', avgWait, localUpdateFromUser, true));
        que.usrInputs.set('leg2', 
            new LegendItem('leg2', this.predWait, localUpdateFromUser, false));
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
	}
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
		headQueue: anim.stage.width * 0.75,
		scanner: anim.stage.width * 0.80,
		pastScanner: anim.stage.width * .85,
		top: 180,
	}
};
anim.walkOffStageTime = Math.abs(
    anim.person.path.scanner - anim.person.path.right) / anim.stage.normalSpeed;
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
    anim.stage.foreContext = anim.stage.foreground.context;
	anim.stage.backContext = anim.stage.background.context;
	que.stage = anim.stage;
    
	gSF = new GStickFigure(anim.stage.foreContext,
			anim.person.height);
};

class Queueing extends OmConcept{
    constructor(usrInputs){
        super('que');
        this.usrInputs = usrInputs;
        
        this.keyNames = ['ar','acv','sr','scv',
                         'speed','action','reset',
                         'leg0','leg1','leg2','desc'];
        this.keyIndex = computeKeyIndex(this.keyNames);
    };
    
    localReset () {
        // schedule the initial Person to arrive and start the simulation/animation.
        this.redrawBackground();
        theSimulation.supply.previous = null;
        theSimulation.creator.knockFromPrevious();

        //fudge to get animation started quickly
        let t = que.heap.top().time - 1;
        que.now = que.frameNow = t;
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
    clearStageBackground(){
        this.stage.background.clear();
    };
    redrawBackground() {
        const tsaAgent = document.getElementById("tsaAgent");
        this.clearStageBackground();
        this.stage.backContext
            .drawImage(tsaAgent, anim.person.path.headQueue+10,
                   30, 80, 100);
        
        const tsa = theSimulation.TSAagent;
		let locX = anim.person.path.scanner;
		let locY = anim.person.path.top;
		const c = anim.stage.backContext;
	    const numMachines = 1;
		c.strokeStyle = 'blue';
		c.lineWidth = 5;
		c.beginPath();
        const scannerHeight = 84;
        const scannerWidth = 56;
		for (let k = 0; k < tsa.machs.length; k++) {
			c.strokeRect(locX - scannerWidth/2, locY - scannerHeight/2,
                         scannerWidth, scannerHeight);
			tsa.machs[k].locx = locX;
            tsa.machs[k].locy = locY;
			locX += anim.scannerDelta.dx;
			locY += anim.scannerDelta.dy;
		}
		c.closePath();
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
            que.heap.modify('finish/creator',
                () => que.now + theSimulation.interarrivalRV.observe());
            break;
        case 'acv':
            theSimulation.interarrivalRV
                .setCV(v);
            que.heap.modify('finish/creator',
                () => que.now + theSimulation.interarrivalRV.observe());
            break;
        case 'sr':
            theSimulation.serviceRV
                .setRate(v / tioxTimeConv);
            que.heap.modify('finish/TSAagent',
                () => que.now +
                theSimulation.serviceRV.observe());
           break;
        case 'scv':
            theSimulation.serviceRV
                .setCV(v);
            que.heap.modify('finish/TSAagent',
                () => que.now +
                theSimulation.serviceRV.observe());
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

class QueQueue extends Queue {
	constructor (){
        super(que, "theQueue", -1);
        this.delta = {dx: anim.person.width,
			          dy: 0},
	    this.dontOverlap = true,
	    this.walkingTime = (anim.person.path.headQueue 
                            - anim.person.path.left) / anim.stage.normalSpeed;
    };

	push (person) {
        if( !super.push(person, this.walkingTime) ) return false;
        person.checkAhead = true;
        person.arrivalTime = que.now + this.walkingTime;
        person.width = this.delta.dx;
        const servRate = Number(que.usrInputs.get('sr').get()) / tioxTimeConv;
        const nLeave = Math.floor(servRate * this.walkingTime);
        const dist = Math.max(0,(this.q.length - 1 - nLeave)) * this.delta.dx;
        person.cur.x = anim.person.path.left - dist;
        person.addPath({
                t: que.now + this.walkingTime,
                x: anim.person.path.headQueue - dist,
                y: anim.person.path.top
            });
        
        person.cur.x = anim.person.path.left - dist;
		if (person.isThereOverlap()) {
			person.cur.y = person.ahead.cur.y - 10;
		}
        return true;
	};

	arriveAnim (person) {
        document.getElementById('nInQueue').innerHTML = 
			this.numSeatsUsed.toString().padEnd(5,' ');
        
        
        const queueActual = (anim.person.path.headQueue - person.cur.x)/this.delta.dx+1;
        const desiredX = anim.person.path.headQueue -
                    this.delta.dx * (this.numSeatsUsed-1);
        person.pathList = [];
        if( person.cur.x >= desiredX ){
            person.cur.x = desiredX;
        } else {
            person.addPath({t: que.now, x: desiredX, y: anim.person.path.top });
        }
	};

	pullAnim (person) {
        let walkForOne = this.delta.dx / anim.stage.normalSpeed;
        que.graph.push(que.now, que.now - person.arrivalTime);
        document.getElementById('nInQueue').innerHTML = 
			this.numSeatsUsed.toString().padEnd(5,' ');
        
        for( let k = 0; k < this.numSeatsUsed; k++ ){
            let p = this.q[k];   
            let pos = p.cur.x
                p.updatePathDelta(
                que.now + Math.min(walkForOne,person.procTime),
					this.delta.dx, this.delta.dy)
        };
        
        for (let k = this.numSeatsUsed; 
             k < this.q.length; k++) {
			let p = this.q[k];   
            const servRate = Number(que.usrInputs.get('sr').get()) / tioxTimeConv;
            const nLeave = Math.floor(servRate * (p.arrivalTime - que.now));
            const dist = Math.max(0,(k - nLeave)) * this.delta.dx;
            p.updatePath({t: p.pathList[0].t,
					      x: Math.max(p.pathList[0].x,
                              anim.person.path.headQueue - dist),
                          y: anim.person.path.top 
                         });
        }
	};
};

class QueWalkOffStage extends WalkAndDestroy {
    constructor(){
	   super(que, "walkOff", true, anim.walkOffStageTime);
    };
    pushAnim (person) {
        person.addPath({
			t: que.now + 50 / anim.stage.normalSpeed,
			x: anim.person.path.pastScanner,
			y: anim.person.path.top
		});
		person.addPath({
			t: que.now + anim.walkOffStageTime - 50 / anim.stage.normalSpeed,
			x: anim.person.path.right,
			y: anim.person.path.top
		});

		if (person.isThereOverlap()) {
			person.cur.y = person.ahead.cur.y - 10;
		}
	}
    arriveAnim (person){
    }
};

class QueCreator extends MachineCenter {
    constructor( ){
        super(que, "creator",1, theSimulation.interarrivalRV); 
    };
    startAnim(machine, theProcTime){};
    finishAnim(machine){};
};

class QueTSA extends MachineCenter {
	constructor( ){
        super(que, "TSAagent", 1, theSimulation.serviceRV); 
        this.dontOverlap = true;
        this.lastFinPerson = null;
    };

	reset () {
		this.lastFinPerson = null;
        super.reset();
	};
	
	startAnim (machine, theProcTime) {
        machine.person.setDestWithProcTime(theProcTime,
			machine.locx, machine.locy);
//        console.log('in StartAnim TSA queueing', que.now, machine.person.pathList);
//        debugger;
    };

	finishAnim (machine) {
        machine.person.checkAhead = false;
		this.lastFinPerson = machine.person;
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
		theSimulation.interarrivalRV = new GammaRV(ar / tioxTimeConv, acv); // ArrRV();
		const sr = que.usrInputs.get('sr').get();
		const scv = que.usrInputs.get('scv').get();
		theSimulation.serviceRV = new GammaRV(sr / tioxTimeConv, scv); //SerRV();

		//queues
		this.supply = new Supplier(anim.person.path.left, anim.person.path.top);

		this.queue = new QueQueue();
		que.resetCollection.push(this.queue);

		this.walkOffStage = new QueWalkOffStage();
		que.resetCollection.push(this.walkOffStage);

		// machine centers 
		this.creator = new QueCreator();
		que.resetCollection.push(this.creator);

		this.TSAagent = new QueTSA(); 
		que.resetCollection.push(this.TSAagent);

		//link the queue to machine before and after
		this.creator.setPreviousNext(this.supply, this.queue);
        this.queue.setPreviousNext(this.creator, this.TSAagent);
        this.TSAagent.setPreviousNext(this.queue, this.walkOffStage);
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
        return this.current = new Person(que, gSF, this.x, this.y);
	};
    pull(){
        const last = this.front();
        this.current = null;
        return last;
	}
}; //end class Supplier


//export class Person extends Item {
//	constructor(omConcept, x, y = 100) {
//		super(omConcept, x, y);
//		this.graphic = new NStickFigure(gSF, x, y);
//	};
//
//	isThereOverlap() {
//		// is 'p' graph above the 'a' graph in [0, p.count] ?
//		let p = this;
//		let a = this.ahead;
//		if (!a) return false;
//		let pPath = p.pathList[0];
//		let aPath = a.pathList[0];
//		if (!aPath) return false;
//		return false;
////		return (pPath.t < aPath.t + a.width / aPath.speedX)
//			//        if (  p.cur.x + p.width > a.cur.x ) return true;
//			//        if ( pPath.deltaX <= aPath.deltaX ) return false;
//			//        return (a.cur.x - p.width - p.cur.x)/(pPath.deltaX - aPath.deltaX) <= pPath.count;
//	};
//}; // end class Person


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
                localUpdateFromUser, 0, 10, 5, 1,3,10) );
    
    const acvInput = genRange('acvque', 0, 0, 2, .5);
    elem.append(htmlNumSlider(acvInput, 'Arrival CV = ', '0.0',['0.0','1.0','2.0']) );
    usrInputs.set('acv', new NumSlider('acv', acvInput,
                localUpdateFromUser, 0, 2, 0, 1,2,10) );
    
    
    const srInput = genRange('srque', '6.0', 0, 10, .1);
    elem.append(htmlNumSlider(srInput, 'Service Rate = ', '6.0',[0,2,4,6,8,10]) );
    usrInputs.set('sr', new NumSlider('sr',srInput,
                localUpdateFromUser, 0, 10, 6, 1,3,10) );
    
    const scvInput = genRange('scvque', 0, 0, 2, .5);
    elem.append(htmlNumSlider(scvInput, 'Service CV = ', '0.0',['0.0','1.0','2.0']) );
    usrInputs.set('scv', new NumSlider('scv', scvInput,
                localUpdateFromUser, 0, 2, 0, 1,2,10) );
    
    elem.append( genPlayResetBox('que') );
    usrInputs.set('reset', new CheckBox('reset', 'resetque',
                localUpdateFromUser, false) );
    usrInputs.set('action', new RadioButton('action', 'actionque', 
                localUpdateFromUser, ['none','play','pause'], 'none') );
     
    const speedInput = genRange('speedque',0,0,5,1);
    elem.append(htmlArbSlider(speedInput, 'Speed = ', '1x',
                            ["slow",' ',' ',' ',"fast",'∞']) );
    usrInputs.set('speed', new ArbSlider('speed', speedInput, 
                localUpdateFromUser, ["1x",'2x','5x','10x',"25x",'∞'],
				                [1,2,5,10,25,1000], 0) );   
    
	const f = document.getElementById('scenariosMidque');
	f.style = "min-height: 26vw";
    
    usrInputs.set('desc', new Description('desc'));
    
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