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

class QueueGraph extends TioxGraph {
	constructor(){	
		super(que,'chartCanvasque', 40, {width:10, step:2}, d=>d.t,
             2000,600,false);
		this.setTitle('Waiting Time','chartTitle');
		const indivWait = new GraphLine(this, d => d.i, 
                        {color: cbColors.blue, vertical: false,
                         visible: que.usrInputs.get('leg0'), 
                         continuous: false,
                         lineWidth: 5, dotSize: 12, right: false});
		const avgWait = new GraphLine(this, d => d.a, 
                      {color: cbColors.yellow, vertical: false,
                          visible: que.usrInputs.get('leg1'), continuous: false,
                         lineWidth: 5, dotSize: 8, right: false});
		this.predWait = new GraphLine(this, d => d.p,
                        {color: cbColors.red, vertical: true,
                            visible: que.usrInputs.get('leg2'), continuous: true,
                         lineWidth: 10, dotSize: 0, right: false});
		
        // this.predictedWaitValue = this.predictedWait();
        
                     
        const d3 = document.getElementById('chartLegendque');
        d3.append('  ', 
            que.usrInputs.get('leg0').create(cbColors.blue, 'individual wait', 'que'),
            que.usrInputs.get('leg1').create(cbColors.yellow, 'average wait', 'que'),
            que.usrInputs.get('leg2').create(cbColors.red, 'predicted wait', 'que'),
            '  ');
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
        
        let yMax;
        if ( this.predictedWaitValue ){
            yMax = (this.predictedWaitValue == Infinity)?
			    1.5: Math.max(1.5,this.predictedWaitValue * 1.1);
        } else yMax = 1.5;
		super.reset(yMax); 
        this.updatePredictedWait();
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
        que.usrInputs.get('leg2')
            .setLegendText( 'predicted wait' + ((pW == Infinity) ? ' = ∞' : ''));

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

const tioxTimeConv = 10000; //rates in tiox are k/10 seconds

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

        que.now = que.frameNow = 0;
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
        // console.log('REDO STAGES Graph from app.js');
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
			c.strokeRect(locX - scannerWidth/2,
                         locY - scannerHeight/2,
                         scannerWidth, scannerHeight);
			tsa.machs[k].locx = locX;
            tsa.machs[k].locy = locY;
			locX += anim.scannerDelta.dx;
			locY += anim.scannerDelta.dy;
		}
		c.closePath();
    };
};
document.getElementById('que')
    .addEventListener('localUpdate',localUpdateFromUser);
function localUpdateFromUser(event){
    const inp = que.usrInputs.get(event.detail.key);
    que.setOrReleaseCurrentLi(inp);
    localUpdate(inp);
    if( match([inp],['ar','acv','sr','scv'])) {
            que.graph.updateForParamChange();
        }
};
function localUpdate(inp){
    switch (inp.key){
        case 'ar':
            theSimulation.interarrivalRV
                .setRate(inp.getNumber() / tioxTimeConv);
            que.heap.modify('finish/creator',
                () => que.now + theSimulation.interarrivalRV.observe());
            break;
        case 'acv':
            theSimulation.interarrivalRV
                .setCV(inp.getNumber());
            que.heap.modify('finish/creator',
                () => que.now + theSimulation.interarrivalRV.observe());
            break;
        case 'sr':
            theSimulation.serviceRV
                .setRate(inp.getNumber() / tioxTimeConv);
            que.heap.modify('finish/TSAagent',
                () => que.now +
                theSimulation.serviceRV.observe());
           break;
        case 'scv':
            theSimulation.serviceRV
                .setCV(inp.getNumber());
            que.heap.modify('finish/TSAagent',
                () => que.now +
                theSimulation.serviceRV.observe());
            que.heap.modify('adjustWalkers',
                           () => que.now + halfServiceTime())
            break;
        case 'speed':
            que.adjustSpeed(inp.getIndex());
            break;
        case 'action':
        case 'reset':
            break;
        case 'leg0':
        case 'leg1':
        case 'leg2':
            que.graph.setupThenRedraw();
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
        person.inWalkQ = {
            startX:anim.person.path.left,
            endX: anim.person.path.headQueue,
            releaseT : que.now,
            arrivalT : que.now + this.walkingTime
        };
        if( person.ahead ){
            if( person.ahead.inWalkQ )
                person.inWalkQ.initDeltaX = (que.now - person.ahead.inWalkQ.releaseT) * anim.stage.normalSpeed;
        }
        person.arrivalTime = que.now + this.walkingTime;
        person.width = this.delta.dx;
        return true;
	};

	arriveAnim (person) {
        document.getElementById('nInQueue').innerHTML = 
			this.numSeatsUsed.toString().padEnd(5,' ');
	};

	pullAnim (person) {
        person.inWalkQ = null;
        let walkForOne = this.delta.dx / anim.stage.normalSpeed;
        que.graph.push(que.now, que.now - person.arrivalTime);
        document.getElementById('nInQueue').innerHTML = 
			this.numSeatsUsed.toString().padEnd(5,' ');
	};
};

function printQ(when, q){
    console.log(when,'Now = ',que.now);
    for( let k = 0; k < q.length; k++){
        const p = q[k];
        console.log(p.which,' #PL=',p.pathList.length, 
                    p.cur.x,p.cur.t.toFixed(0));
        if( p.pathList.length>0 ) 
            console.log('    and pathList ',p.pathList[0].x,
                    p.pathList[0].t.toFixed(0));
    }
}

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
    finishAnim(machine){
    };
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
	
	startAnim (machine, procTime) {
        const p = machine.person;
        const distance = Math.max(Math.abs(p.cur.x - machine.locx),
			Math.abs(p.cur.y - machine.locy));
        
        let  walkTime = distance / this.omConcept.stage.normalSpeed;
        let armTime = 1000;
        let remTime = procTime - 2 * armTime - walkTime;
        if( remTime < 0.3 * procTime ){
            walkTime = 0.3 * procTime;
            armTime = 0.2 * procTime;
            remTime = 0.3 * procTime;
        }
        
        p.addPath({
            t: que.now + walkTime,
            x: machine.locx,
            y: machine.locy
        });
        p.addPath({
            t: que.now + walkTime + armTime,
            x: machine.locx,
            y: machine.locy,
            l: 30,
            a: 120,
        });
        p.addPath({
            t: que.now + walkTime + armTime + remTime,
            x: machine.locx,
            y: machine.locy,
            l: 30,
            a: 120,
        });
         p.addPath({
            t: que.now + walkTime + 2* armTime + remTime,
            x: machine.locx,
            y: machine.locy,
            l: 30,
            a: 22,
        });
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
function defineParams(){
    let usrInputs = new Map();
    usrInputs.set('ar', new NumSlider('ar',   0, 10, .1, 5));
    usrInputs.set('acv', new NumSlider('acv', 0,  2, .5, 0));
    usrInputs.set('sr', new NumSlider('sr',   0, 10, .1, 6));
    usrInputs.set('scv', new NumSlider('scv', 0, 2,  .5, 0));
    usrInputs.set('reset', new Checkbox('reset', false));
    usrInputs.set('action', new RadioButtons('action', ['none', 'play', 'pause'],
                                            'none', 'actionque'));
    usrInputs.set('speed', new ArbSlider('speed',   [1, 2, 5, 10, 25, 1000], 1));
    usrInputs.set('desc', new Description('desc'));
    usrInputs.set('leg0', new LegendButton('leg0', true));
    usrInputs.set('leg1', new LegendButton('leg1', true));
    usrInputs.set('leg2', new LegendButton('leg2', false));
    return usrInputs;
}
function queHTML(usrInputs){	
    
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
    

		
	let elem = document.getElementById('slidersWrapperque');
    
    elem.append(usrInputs.get('ar')
        .create('Arrival Rate = ', [0, 2, 4, 6, 8, 10]));
    
    
    elem.append(usrInputs.get('acv')
        .create('Arrival CV = ', ['0.0', '1.0', '2.0']));
    
    elem.append(usrInputs.get('sr')
        .create('Service Rate = ', [0, 2, 4, 6, 8, 10]));

    elem.append(usrInputs.get('scv')
        .create('Service CV = ', ['0.0', '1.0', '2.0']));

    elem.append(genPlayResetBox('que',usrInputs));

    elem.append(usrInputs.get('speed')
        .create('Speed = ', ['1x', '2x', '5x', '10x', '25x', '∞'],
                ["slow", ' ', ' ', ' ', "fast", '∞']) );
      
	const f = document.getElementById('scenariosMidque');
	f.style = "min-height: 24vw";
};

export function queStart() {
	let usrInputs = defineParams();
    queHTML(usrInputs);
    que = new Queueing(usrInputs);
    queDefine();
    que.graph = new QueueGraph();

    que.setupScenarios();
    theSimulation.initialize();
	que.reset();
	return que;
};