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
    Heap, cbColors, Average, Thruput, StageOnCanvas, computeKeyIndex
}
from '../mod/util.js';
import {
	OmConcept
}
from '../mod/rhs.js';
import {
	Queue, WalkAndDestroy, MachineCenter,
	InfiniteMachineCenter, Combine, Item, Person,
	GStickFigure, NStickFigure, GStore, tioxColors, Package, BoxStack
}
from "../mod/stepitem.js";
import {
	TioxGraph, GraphLine
}
from "../mod/graph.js";
import {
	genPlayResetBox, genArbSlider, genButton, addDiv,
      NumSlider, htmlNumSlider,
    ArbSlider, htmlArbSlider, htmlNoSlider,
    genRange, 
	htmlCheckBox, CheckBox, 
	htmlRadioButton, RadioButton, 
	IntegerInput, 
	addKeyForIds, 
	LegendItem, LegendPair, match, Description
}
from '../mod/genHTML.js';

class BatGraph {
	constructor(){	
		//flow time graph
        this.flowGraph = new TioxGraph(bat,'fchartCanvasbat',
                40, {width:100, step:20}, d=>d.t, 1000,370,false);
		this.flowGraph.setTitle('Flow time','fchartTitle');
		const baseFlow = new GraphLine(this.flowGraph, d => d.base, 
                        {color: cbColors.yellow,
						 vertical: false, visible: true, continuous: false,
                         lineWidth: 5, dotSize: 15, right: false});
        const modFlow = new GraphLine(this.flowGraph, d => d.mod, 
                        {color: cbColors.blue, vertical: false,
                         visible: true, continuous: false,
                         lineWidth: 3, dotSize: 10, right: false});

        //throughput graph
        this.thruGraph = new TioxGraph(bat,'tchartCanvasbat',
                40, {width:100, step:20}, d=>d.t, 1000,370,false);
		this.thruGraph.setTitle('Throughput','tchartTitle');
		const baseThru = new GraphLine(this.thruGraph, d => d.base, 
                        {color: cbColors.yellow, vertical: false,
                         visible: true, continuous: false,
                         lineWidth: 5, dotSize: 15, right: false});
		const modThru = new GraphLine(this.thruGraph, d => d.mod, 
                        {color: cbColors.blue, vertical: false,
                         visible: true, continuous: false,
                         lineWidth: 3, dotSize: 10, right: false});
		        
        //add legends
		const leg0 = baseFlow.createLegend('leg0','Base Case');
		const leg1 = modFlow.createLegend('leg1','Modified');
        const d3 = document.getElementById('chartLegendbat');
        d3.classList.add('rowCenterCenter');
        d3.append(leg0,'      ', leg1); //option-spaces!!
        
        //set up legends as buttons (and includable in URL)
        bat.usrInputs.set('leg0', 
            new LegendPair('leg0', baseFlow, baseThru, localUpdateFromUser, true)); 
        bat.usrInputs.set('leg1', 
            new LegendPair('leg1', modFlow, modThru, localUpdateFromUser, true));
	};
	    
	pushBase (t,f){
		t /= tioxTimeConv;
        f/= tioxTimeConv;
		const avgFlow = this.avgBaseFlow.addItem(f);
        const avgThru = 60 * this.avgBaseThru.observe(t) * 16;
        this.flowGraph.drawOnePoint( {t: t, base: avgFlow} );
        this.thruGraph.drawOnePoint( {t: t, base: avgThru} );
	};
    pushMod (t,f){
        t /= tioxTimeConv;
        f/= tioxTimeConv;
		const avgFlow = this.avgModFlow.addItem(f);
        const avgThru = 60 * this.avgModThru.observe(t) * theSimulation.nRows * 4;
        this.flowGraph.drawOnePoint( {t: t, mod: avgFlow} );
        this.thruGraph.drawOnePoint( {t: t, mod: avgThru} );
    };
    
	reset(){
		this.avgBaseFlow = new Average();
		this.avgModFlow = new Average();
        this.avgBaseThru = new Thruput();
		this.avgModThru = new Thruput();
		this.flowGraph.reset();
		this.thruGraph.reset();
        this.xInfo = this.flowGraph.xInfo;
	}
    restartGraph(){
        this.flowGraph.restartGraph();
        this.thruGraph.restartGraph();
        
    };
	
    updateForParamChange(){
		this.avgBaseFlow = new Average();
		this.avgModFlow = new Average();
		this.avgBaseThru = new Thruput();
		this.avgModThru = new Thruput();
        this.flowGraph.restartGraph(bat.now/tioxTimeConv);
		this.thruGraph.restartGraph(bat.now/tioxTimeConv);
    };
    setupThenRedraw(){
        this.flowGraph.setupThenRedraw();
        this.thruGraph.setupThenRedraw();
    }
    scaleXaxis(factor){
        this.flowGraph.scaleXaxis(factor);
        this.thruGraph.scaleXaxis(factor);
    }
    shiftXaxis2(){
        this.flowGraph.shiftXaxis2();
        this.thruGraph.shiftXaxis2();
    }
}
const anim = {};
var bat;

const tioxTimeConv = 1000; //rates in tiox are k/10 seconds

anim.stage = {
	normalSpeed: .050, 
	width: 1000,
	height: 480,
	offstageRight: 1100,
	offstageLeft: -100
};
var gBatch, gBox, gMachine;


function batDefine(){
	document.getElementById('bat').omConcept = bat;
	
	anim.stage.foreground = new StageOnCanvas('foregroundbat',
                                anim.stage.width, anim.stage.height);
    anim.stage.background = new StageOnCanvas('backgroundbat',
                                anim.stage.width, anim.stage.height);
    anim.stage.foreContext = anim.stage.foreground.context;
	anim.stage.backContext = anim.stage.background.context;
	bat.stage = anim.stage;

	gBatch = new GBatch(anim.stage.foreContext, 4);
	gBox = new GBox(anim.stage.foreContext, 15, 17);
	gMachine = new GMachine(anim.stage.backContext, gBox.space * 4 - 20, gBox.space * 4, 10);
};

function markBatch() {
	if( theSimulation.base.creator.on(0).mark(1) > 0 )
		theSimulation.base.supply.bumpCount();
	if( theSimulation.mod.creator.on(0).mark(1) > 0)
		theSimulation.mod.supply.bumpCount();
}


class Batching extends OmConcept{
    constructor(usrInputs){
        super('bat');
        this.usrInputs = usrInputs;
		this.keyNames = ['util', 'pt', 'bSetup', 'mSetup','batch',
                         'speed','action','reset',
                         'leg0','leg1','desc'];
        this.keyIndex = computeKeyIndex(this.keyNames);

		document.getElementById('markButtonbat')
			.addEventListener('click', markBatch);
    };
    localReset () {
		// bat.graph.reset();
		
		bat.tioxTimeConv = tioxTimeConv;
		this.redrawBackground();
		// // console.log(bat.itemCollection);
		
		// for(let k = 0; k < 10; k++){
		// 	let pack = theSimulation.base.line.machs[0].in.remove();
		// 	theSimulation.base.line.machs[0].out.add(pack);
		// 	bat.clearRedrawStage(0,false);
		// }

		theSimulation.base.line.reset();
		// const bb = bat.usrInputs.get('batch').getValue();
		// console.log(' in reset bb',bb,bb/4);
		theSimulation.mod.line.reset(bat.usrInputs.get('batch').getValue() / 4);
		theSimulation.base.creator.load( null, null ,0);
		theSimulation.mod.creator.load( null, null, 1);
		// const bHead = theSimulation.base.queuehead;
		// theSimulation.base.queue.push(new Batch(cbColors.yellow,
		// 	 4, -100, 100, true));
		// const mHead = theSimulation.mod.queuehead;
		// theSimulation.mod.queue.push(new Batch(cbColors.blue,
		// 	bat.usrInputs.get('batch').getValue()/4, -100, 300, true));
		bat.clearRedrawStage(0, false);

    };
    localUpdateFromSliders(...inpsChanged){
        for(let inp of inpsChanged){
            localUpdate(inp); 
        };
		if (match(inpsChanged, ['util', 'pt', 'bSetup', 'mSetup', 'batch'])){
			this.partialReset();
			this.localReset();
			bat.graph.updateForParamChange();
        };
    };
    redoStagesGraph(){
        this.stage.foreground.reset();
        this.stage.background.reset();
        this.graph.flowGraph.chart.reset();
        this.graph.thruGraph.chart.reset();

        this.redrawBackground();
        this.graph.setupThenRedraw();
        this.clearRedrawStage(0,true);
    };
    clearStageForeground(){
        this.stage.foreground.clear();
    };
	clearStageBackground() {
		this.stage.background.clear();
	};
	redrawBackground() {
		this.redrawOneBatchLine(theSimulation.base.line);
		this.redrawOneBatchLine(theSimulation.mod.line);
	}

	redrawOneBatchLine(line){
		const c = anim.stage.backContext;
		c.strokeStyle = 'black';
		c.lineWidth = 5;
		c.beginPath();
		const machHeight = 66;
		const machWidth = 56;
		for (let k = 0; k < line.machs.length; k++) {
			let m = line.machs[k];
			c.strokeRect(m.x - machWidth / 2,
				m.y - machHeight / 2,
				machWidth, machHeight);
		}
		c.closePath();
	};
};
function localUpdateFromUser(inp){
    bat.setOrReleaseCurrentLi(inp);
    localUpdate(inp);
	if (match([inp], ['util', 'pt', 'bSetup', 'mSetup', 'batch'])) {
		bat.partialReset();
		bat.localReset();
		bat.graph.updateForParamChange();
        }
};

function updateTimeRV(){
	const cycle = (theSimulation.bSetup + 16 * theSimulation.pt) / theSimulation.util
	theSimulation.base.timeRV.setMean(cycle);
	theSimulation.mod.timeRV.setMean(cycle * theSimulation.nRows / 4);
	const mCycle = (theSimulation.mSetup + 4 * theSimulation.nRows * theSimulation.pt);

	document.getElementById('disploadbat').innerHTML = 
		(mCycle/cycle * 4 / theSimulation.nRows).toFixed(2);
}
        
 function localUpdate(inp){
	let baseInterarrivalTime, modInterarrivalTime;
    let v = inp.get();
    switch (inp.key){
        case 'util':
			theSimulation.util = inp.getValue();
			updateTimeRV();
         	break;

        case 'pt':
			theSimulation.pt = Number(v) * tioxTimeConv;
			updateTimeRV();
            break;

        case 'bSetup':
			theSimulation.bSetup = Number(v) * tioxTimeConv;
			theSimulation.base.line.setSetup(theSimulation.bSetup)
			updateTimeRV();
            break;
		case 'mSetup':
			theSimulation.mSetup = Number(v) * tioxTimeConv;
			theSimulation.mod.line.setSetup(theSimulation.mSetup)
			updateTimeRV();
			break;

        case 'batch':
            theSimulation.nRows = inp.getValue()/4;
			theSimulation.mod.line.nRows  = theSimulation.nRows;
			theSimulation.mod.supply.setNRows(theSimulation.nRows);
			theSimulation.mod.queue.setQAnim(theSimulation.nRows);
			updateTimeRV();
            break;

        case 'speed':
            bat.adjustSpeed(v);
            break;
        case 'action':
        case 'reset':
        case 'leg0':
        case 'leg1':
            break;
        default:
            alert(' reached part for default id=',inp.key);
            debugger;
            break;
    }
};


//  One variable for each process step or queue
//  that contains the functions to do the specific
//  animation for that process step
class BatCreator extends MachineCenter{
	constructor(timeRV){
		super(bat,'creator/bat',1,timeRV);
	};
	startAnim(batch, theProcTime) { };
	finishAnim(batch) {};
};

class BatQueue extends Queue {
	constructor(x,y,nRows) {
		super(bat, "queue" , -1 );
		this.snake = new BoxStack({
			isRows: false, isSnake: true,
			lanes: 3, laneLength: 6 / nRows,
			hSpace: null, vSpace: null,
			xDir: -1, yDir: 1
		})
		this.machine = {x: x, y: y};
		this.setQAnim(nRows);
	};

	setQAnim(r) {
		this.x = this.machine.x - 4 * gBox.space ;
		this.y = this.machine.y + r * gBox.space + 20;
		this.snake.setSpace(gBox.space * 4 + 5, gBox.space * r + 5);
		this.snake.setLaneLength(6 / r);
	}

	push(batch) {
		const point = this.snake.relCoord(this.q.length);
		const walkingTime = tioxTimeConv/2; 
		//Math.max(
			// this.x + point.x - batch.cur.x,
			// this.y + point.y - batch.cur.y) / anim.stage.normalSpeed;
		const arrivalTime = bat.now + walkingTime;
		if (!super.push(batch, 0)) return false;
		batch.updatePath({
			t: arrivalTime,
			x: this.x + point.x,
			y: this.y + point.y
		});
		return true;
	};

	arriveAnim(batch) {
		batch.packages[0].arrivalTime = bat.now;
	 };

	pullAnim(batch) {
		if (this.q.length == 0) return null;
		let n = this.q.length;
		for (let k = 0; k < n; k++) {
			let batch = this.q[k];
			let point = this.snake.relCoord(k);
			if (batch.pathList.length == 0) {
				batch.updatePath({
					t: bat.now + 700,
					x: this.x + point.x,
					y: this.y + point.y
				});
			} else {
				let destTime = Math.max(this.x + point.x - batch.cur.x,
					this.y + point.y - batch.cur.y)
					/ anim.stage.normalSpeed;
				batch.updatePath({
					t: bat.now + destTime + 700,
					x: this.x + point.x,
					y: this.y + point.y
				});
			}
		};
	}
};

class  BatWalkOffStage extends WalkAndDestroy {
	constructor(time){
        super(bat, "walkOff", true, time);
    };
	pushAnim (batch) {
	}
};




const theSimulation = {
	ar: null,
	pr: null,
	setup: null,
	bat: null,

	// the 3 queues and 3 machines for each line.
	// supply: null,
	// queue: null,
	// walkOffStage: null,
	// demand: null,
	// newsVendor: null,
	
	

	initialize: function () {
		// random variables
		this.swapEndTime = tioxTimeConv;
		this.util = bat.usrInputs.get('util').getValue();
		this.pt = Number(bat.usrInputs.get('pt').get()) * tioxTimeConv;
		this.bSetup = Number(bat.usrInputs.get('bSetup').get()) * tioxTimeConv;
		this.mSetup = Number(bat.usrInputs.get('mSetup').get()) * tioxTimeConv;
		this.nRows = bat.usrInputs.get('batch').getValue() / 4;
		// local helper function
		const defineLine = (iATime, height, nLines, color, setupTime, graphPush) => {
			let sys = {};
			sys.path = { m1: 260, m2: 520, m3: 790, y: height, dx: 70 };
			

			sys.supply = new Supplier(color, nLines,
				anim.stage.offstageLeft, sys.path.y);

			
			sys.timeRV = new DeterministicRV(iATime)
			sys.creator = new BatCreator(sys.timeRV);
			bat.resetCollection.push(sys.creator);


			sys.queuehead = {
				x: sys.path.m1 - sys.path.dx,
				y: sys.path.y + sys.path.dx + 20
			};
			sys.queue = new BatQueue(sys.path.m1,sys.path.y,4);
			bat.resetCollection.push(sys.queue);

			sys.walkLeft = new BatWalkOffStage(this.swapEndTime);
			bat.resetCollection.push(sys.walkLeft);
			sys.walkRight = new BatWalkOffStage(this.swapEndTime);
			bat.resetCollection.push(sys.walkRight);

			sys.line = new BatLine(sys.path.m1,
				sys.path.y, sys.path.dx, 0, 3, nLines, color, setupTime,
				sys.queue, sys.walkLeft, sys.walkRight,graphPush);
			bat.resourceCollection.push(sys.line);
			
			sys.creator.setPreviousNext(sys.supply, sys.queue);
			sys.queue.setPreviousNext(sys.creator, sys.line);
			return sys;
		}
		const interarrivalTime = (this.bSetup + 16 * this.pt) / this.util;
		
		this.base = defineLine( interarrivalTime, 100, 4, cbColors.yellow,
								this.bSetup, bat.graph.pushBase.bind(bat.graph));
		this.mod = defineLine( interarrivalTime * theSimulation.nRows / 4,
									300, theSimulation.nRows, cbColors.blue,
									this.mSetup, bat.graph.pushMod.bind(bat.graph));
	},
};

// SUPPLIER
class Supplier {
	constructor(color, nRows, x, y) {
		this.color = color;
		this.nRows = nRows;
		this.x = x;
		this.y = y;
		this.markCount = 0;
		
	   this.current = null;
	};
	front() {
        if( this.current ) return this.current;
		return this.current = new Batch(this.color, this.nRows, this.x, this.y, true);
	};
    pull(){
        const last = this.front();
        this.current = null;
		// console.log(' In Supplier ',last.which);
		this.markCount = last.mark(this.markCount);
		return last;
	}
	setNRows(n){
		this.nRows = n;
	}



	// pull() {
	// 	const last = this.front();
	// 	this.current = null;
	// 	if (this.markCount > 0) {
	// 		this.markCount--;
	// 		if (this.markCount > 0) last.mark();
	// 	}
	// 	return last;
	// };
	bumpCount() {
		this.markCount++;
	}
}; //end class Supplier

class BatLine{
	constructor( x, y, dx, dy, nMachs, nRows,
		color, setupTime,
		queue, walkLeft, walkRight, graphPush){
		this.gMachine = gMachine;
		this.x = x;
		this.y = y;
		this.dx = dx;
		this.dy = dy;
		this.nMachs = nMachs;
		this.nRows = nRows;
		this.color = color;
		this.setupTime = setupTime;
		this.machs=[];
		this.queue = queue;
		this.walkLeft = walkLeft;
		this.walkRight = walkRight;
		this.graphPush = graphPush;
		this.swapTime = tioxTimeConv;
		this.moveTime = tioxTimeConv / 2;

		for (let k = 0; k < this.nMachs; k++) {
			if (!this.machs[k]) this.machs[k] = {
				x: x,
				y: this.y,
				index: k,
				color: 'black',
				
				// in: (k != 0 ? new Batch(this.color, this.nRows, x - this.dx, this.y, false) : null),
				// out: new Batch(this.color, this.nRows, x + this.dx, this.y, false)
			};
			x += 4 * this.dx;
		}
		
		
	};
	reset(n = 4){
		this.nRows = n;
		let x = this.x;
		for (let k = 0; k < this.nMachs; k++) {
			this.machs[k].in = (k != 0 ? new Batch(this.color, this.nRows,
								 x - this.dx, this.y, false) : null);
			this.machs[k].out = new Batch(this.color, this.nRows, x + this.dx,
											 this.y, false);
			this.machs[k].status = 'idle';
			x += 4 * this.dx;
		};
	};
	setSetup(s){
		this.setupTime = s;
	}
	
	setup(machine){
		machine.status = 'setup';
		bat.heap.push({
			time: bat.now + this.setupTime, //.7 * setup time,
			type: 'startBox/bat',
			proc: this.startBox.bind(this),
			item: machine
		});
	};

	start(){
		const batch = this.queue.pull();
		if( batch != null ) {
			const machine = this.machs[0];
			const yDelta = this.nRows * gBox.space * 0.5 + 3;
			const alpha = 0.2;
			const alphaBar = 1 - alpha;

			if( machine.in ){
				machine.in.addPath({
					t: bat.now + alpha * this.swapTime,
					x: alphaBar * machine.in.cur.x + alpha * anim.stage.offstageLeft,
					y: machine.out.cur.y - yDelta
				});
				machine.in.addPath({
					t: bat.now + this.swapTime,
					x: anim.stage.offstageLeft,
					y: machine.out.cur.y - yDelta
				});
				this.walkLeft.push(machine.in);
			};
			
			batch.addPath({
				t: bat.now + tioxTimeConv,
				x: machine.x - this.dx,
				y: machine.y
			});
			machine.in = batch;
			
			this.setup(machine);
			
			

		}
		// console.log('completed setup at now= ',bat.now);
		// debugger;
	
	
	};
	
	startBox(machine){
		const box = machine.in.remove();
		if( box == null ) {
			alert('removed an null box from a batch');
			
		} else {
			// if( this.color = cbColors.blue && machine.index == 1){
			// 	console.log('StartBox mach',machine.index,bat.now, box.which);
			// 	console.log(bat.heap);
			// }
			machine.status = 'busy';
			box.inBatch = false;
			box.z = 1;
			machine.box = box;
			
			box.addPath({
				t: bat.now + this.moveTime,
				x: machine.x,
				y: machine.y
			});
			bat.heap.push({
				time: bat.now +  tioxTimeConv * 
						Number(bat.usrInputs.get('pt').get()),
				type: 'finishBox/bat',
				proc: this.finishBox.bind(this),
				item: machine
			});
			// console.log('in START ', machine.out.packages.length,' now=',bat.now);
		}
		// console.log(bat.heap);
	};

	knockFromPrevious(){
		if( this.machs[0].status == 'idle' ) this.start();
	}
	
	finishBox(machine){
		const box = machine.box;
		machine.out.add(box);
		const point = machine.out.positionLast();
		box.addPath({
			t: bat.now + this.moveTime,
			x: point.x,
			y: point.y
		});
		bat.heap.push({
			time: bat.now + this.moveTime,
			type: 'finishPlusOne/bat',
			proc: this.finishPlusOne.bind(this),
			item: machine
		});
		if( machine.out.isFull() ) {
			machine.status = 'idle';
			// if 0 or 1
			if( machine.index == 0 || machine.index == 1) {
				const next = this.machs[machine.index + 1];
				if( next.status == 'idle' ) this.setup(next);
			}
			
			if( machine.index == 0 ){
				this.start();
			} else {
				const prev = this.machs[machine.index - 1];
				if( prev.out.isFull() ){
					this.setup(machine);
				}
			}
		} else 
			this.startBox(machine);
		// console.log(' in finishBox',machine.out.packages.length, 'now=',bat.now);
	};
	finishPlusOne(machine){
		// console.log('in FinishPlusONE', machine.out.packages.length,' now=',bat.now);
		const last = machine.out.packages[machine.out.packages.length - 1];
		last.inBatch = true;
		last.pathList = [];
		last.z = 0
		if( machine.out.isFull() ){

			
			const yDelta = this.nRows * gBox.space * 0.5 + 3;
			const alpha = 0.2;
			const alphaBar = 1 - alpha;

			if( machine.index == 0 ){
				// handle moving in offstage, bringing new 'in' from queue, 
			
			};
			if( machine.index == 0 || machine.index == 1 ){
				// handle swapping out with next in
				const next = this.machs[machine.index + 1];
				
				const firstBit = alphaBar * machine.out.cur.x + alpha * next.in.cur.x;
				const lastBit = alpha * machine.out.cur.x + alphaBar * next.in.cur.x;

				next.in.addPath({
					t: bat.now + this.swapTime * alpha,
					x: lastBit,
					y: machine.out.cur.y - yDelta
				});
				next.in.addPath({
					t: bat.now + this.swapTime * alphaBar,
					x: firstBit,
					y: machine.out.cur.y - yDelta
				});
				next.in.addPath({
					t: bat.now + this.swapTime,
					x: machine.out.cur.x,
					y: machine.out.cur.y
				});


				machine.out.addPath({
					t: bat.now + this.swapTime * alpha,
					x: firstBit,
					y: next.in.cur.y + yDelta
				});
				machine.out.addPath({
					t: bat.now + this.swapTime * alphaBar,
					x: lastBit,
					y: next.in.cur.y + yDelta
				});
				machine.out.addPath({
					t: bat.now + this.swapTime,
					x: next.in.cur.x,
					y: next.in.cur.y
				});
				const temp = next.in;
				next.in = machine.out;
				machine.out = temp;

				next.in.cur.inQ = true;
				machine.out.cur.inQ = false;

			}
			if (machine.index == 2) {
				//handle swapping out off stage and get new in from offstage
				
				this.graphPush(bat.now, bat.now - machine.out.packages[0].arrivalTime);
				machine.out.addPath({
					t: bat.now + alpha * this.swapTime,
					x: alphaBar * machine.out.cur.x + alpha * anim.stage.offstageRight,
					y: machine.out.cur.y + yDelta
				});
				machine.out.addPath({
					t: bat.now + this.swapTime,
					x: anim.stage.offstageRight,
					y: machine.out.cur.y + yDelta
				});
				this.walkRight.push(machine.out);
				


				const emptyBatch = new Batch(this.color, this.nRows, 
					anim.stage.offstageRight, machine.out.cur.y - yDelta,false);
				emptyBatch.addPath({
					t: bat.now + alphaBar * this.swapTime,
					x: machine.out.cur.x + yDelta,
					y: machine.out.cur.y - yDelta
				})
				emptyBatch.addPath({
					t: bat.now + this.swapTime,
					x: machine.out.cur.x,
					y: machine.out.cur.y
				})
				machine.out = emptyBatch;
			};
		}
	};
	draw(){
		this.drawMachine(this.machs[0]);
		this.drawMachine(this.machs[1]);
		this.drawMachine(this.machs[2]);
	}
	drawMachine(machine) {
		const ctx = gMachine.ctx;
		const dx = gMachine.w; 
		const dy = gMachine.h;
		const dxBig = dx + gMachine.lineWidth * 2;
		const dyBig = dy + + gMachine.lineWidth * 2;
		ctx.clearRect(machine.x - dxBig/2, machine.y - dyBig/2, dxBig, dyBig);

		ctx.lineWidth = gMachine.lineWidth;
		const status = machine.status;
		ctx.fillStyle = (status == 'busy' ? '#54ed77' : 'lightyellow');
		ctx.beginPath();
		ctx.strokeStyle = this.color;
		ctx.rect(machine.x - dx / 2, machine.y - dy / 2, dx, dy);

		ctx.stroke();
		ctx.fill();
		ctx.closePath();
		if (status != 'busy') {
			ctx.beginPath();
			ctx.textAlign = 'center';
			ctx.fillStyle = 'black';
			ctx.font = "20px Arial";
			ctx.fillText(status, machine.x, machine.y + dy/4);
			ctx.closePath();
		};
	};
};
class GBatch {
	constructor(context, length) {
		this.ctx = context;
		this.length = length;
	};
};
class GBox {
	constructor(context, size, space){
		this.ctx = context;
		this.size = size;
		this.space = space;
	};
};
class GMachine {
	constructor(context, width, height, lineWidth){
		this.ctx = context;
		this.w = width;
		this.h = height;
		this.lineWidth = lineWidth; 
	};
};


class Package2 extends Item {
	constructor(omConcept, color, x, y) {
		super(omConcept, x, y);
		this.color = color;
	};
	draw(){
		const ctx = gBox.ctx;
		ctx.fillStyle = this.color;
		ctx.strokeStyle = 'black';
		ctx.lineWidth = 1;
		ctx.fillRect(this.cur.x - gBox.size / 2,
			this.cur.y - gBox.size / 2,
			gBox.size, gBox.size);
		ctx.strokeRect(this.cur.x - gBox.size / 2,
			this.cur.y - gBox.size / 2,
			gBox.size, gBox.size);
	}
};

class Batch extends Item{
	constructor(color, nRows, x, y, inQ){
		super(bat,x,y);
		this.color = color;
		this.cur.nRows = nRows;
		this.cur.inQ = inQ;
		this.cur.nItems = ( inQ ? 4 * nRows : 0 );
		this.packages = [];
		this.boxStack = new BoxStack({
			isRows: true, isSnake: false,
			lanes: nRows, laneLength: 4,
			hSpace: gBox.space,
			vSpace: gBox.space,
			xDir: +1, yDir: +1
		});
		this.nMarked = 0;
		for( let k = 0; k < this.cur.nItems; k++){
			let point = this.boxStack.relCoord(k)
			this.packages[k] = new Package2(bat, this.color, x + point.x, y + point.y);
			this.packages[k].inBatch = true;
		}
	}
	mark(n){
		while( this.nMarked < this.cur.nRows * 4 && n > 0 ){
			this.packages[this.nMarked].color = cbColors.red;
			this.nMarked++;
			n--;
		}
		return n;
	}
	remove(){
		if( this.packages.length == 0 ) return null;
		this.cur.nItems--
		return this.packages.shift();
	};
	add(pack){
		this.cur.nItems++
		this.packages.push(pack);
	}

	positionLast(){
		const n = this.packages.length;
		const point = this.boxStack.relCoord(n-1);
		let left = this.cur.x - 2 * gBox.space + gBox.size/2;
		let top = this.cur.y - this.cur.nRows / 2 * gBox.space + gBox.size/2;
		return {x: left + point.x, y: top + point.y};
	};
	isFull(){
		return this.cur.nRows * 4 == this.cur.nItems;
	};
	draw(){
		// console.log('in BATCH draw',this.which,this.cur.x,this.cur.y);
		let ctx = gBatch.ctx;
		let length = gBatch.length;
		let size = gBox.size;
		let space = gBox.space;
		
		let delta = (space - size) / 2;
		
		
		//draw black box around the batch.
		ctx.strokeStyle = 'black';
		ctx.lineWidth = delta;
		ctx.beginPath();
		let left = this.cur.x - 2 * space;
		let top = this.cur.y - this.cur.nRows / 2 * space;
		ctx.rect(left - 2 * delta, top - 2 * delta,
			space * length + 2 * delta,
			space * this.cur.nRows + 2 * delta);
		ctx.stroke();
		ctx.closePath();
		left += size/2;
		top += size/2;
		
		
		const start = (this.cur.inQ ?  length * this.cur.nRows - this.cur.nItems : 0);
		for(let  k = 0; k < this.cur.nItems; k++ ){
			const p = this.packages[k];
			if( p.inBatch ) {
				let point = this.boxStack.relCoord(k + start);
				p.cur.x = left + point.x;
				p.cur.y = top + point.y;
				p.draw();
			}
		}
		// draw a rectangle 4 wide by rows high 
		// centered at x,y with nItems in it
		// if filling=true then fill from the bottom
		// else fill from the top
	};
};



function batHTML(){	
	let usrInputs = new Map();
    
    addDiv('bat','bat','whole')
	addDiv('bat', 'leftHandSideBox'+'bat',
			   'tallStageWrapper',
			   'twoChartWrapper');
	 
    
    	
	 
	//now put in the sliders with the play/reset box	
	let elem = document.getElementById('slidersWrapperbat');
    
    const bSetupInput = genRange('bSetupbat', '2', 2, 8, 1);
	bSetupInput.className = 'backYellow';
    elem.append( htmlNumSlider(bSetupInput, 'Setup Time = ', '2', [2,4,6,8] )); 
	usrInputs.set('bSetup', new NumSlider('bSetup',bSetupInput, localUpdateFromUser,
                                      2, 8, 2, 0, 1));

	const mSetupInput = genRange('mSetupbat', '2', 2, 8, 1);
	mSetupInput.className = 'backBlue';
	elem.append(htmlNumSlider(mSetupInput, 'Setup Time = ', '2', [2, 4, 6, 8]));
	usrInputs.set('mSetup', new NumSlider('mSetup', mSetupInput, localUpdateFromUser,
		2, 8, 2, 0, 1));

	const utilInput = genRange('utilbat', '2', 0, 3, 1);
	utilInput.className = 'backYellow';
	elem.append(htmlArbSlider(utilInput, 'Utilization = ',
		'.95', [0.8, 0.9, 0.95, 0.99]));
	usrInputs.set('util', new ArbSlider('util', utilInput,
		localUpdateFromUser, ["0.8", '0.9', '0.95', '0.99'],
		 [0.8, 0.9, 0.95, 0.99], 2));

	
	// const sp = document.createElement('span');
	// sp.id = 'disploadfactorbat';
	// sp.append(1);
	// const LF = document.createElement('div');
	// LF.className = 'sliderBox columnAroundCenter';
	// LF.append('Load Factor = ',sp);
	elem.append(htmlNoSlider('loadbat', 'Load Factor = ', '1'));  
    elem.append(htmlNoSlider('setBatchbat', 'Batch Size = ', '16'));
	const batchInput = genRange('batchbat', 3, 0, 3, 1);
	batchInput.className = 'backBlue';
    elem.append( htmlArbSlider(batchInput, 'Batch Size = ', '16', [4,8,12,16] )); 
	usrInputs.set('batch', new ArbSlider('batch',batchInput, localUpdateFromUser,
                ["4",'8','12','16'], [4,8,12,16], 3) );
    
	const mark = document.getElementById('markButton').cloneNode(true);
	addKeyForIds('bat', mark);
	// const empty = document.createElement('div');
	// empty.className = "sliderBox"
	elem.append(mark);


	const ptInput = genRange('ptbat', '2', 2, 8, 2);
	elem.append(htmlNumSlider(ptInput, 'Processing Time = ', '2', [2, 4, 6, 8]));
	usrInputs.set('pt', new NumSlider('pt', ptInput, localUpdateFromUser,
		2, 8, 2, 0, 1));
    
	elem.append( genPlayResetBox('bat'));
    usrInputs.set('reset', new CheckBox('reset', 'resetbat',
                localUpdateFromUser, false) );
    usrInputs.set('action', new RadioButton('action', 'actionbat', 
                localUpdateFromUser, ['none','play','pause'], 'none') );
    
	const speedInput = genRange('speedbat',0,0,4,1);
	speedInput.className ='backDefault';
    elem.append(htmlArbSlider(speedInput, 'Speed = ', '1x',
                            ["slow",' ',' ',' ',"fast"]) );
    usrInputs.set('speed', new ArbSlider('speed', speedInput, 
                localUpdateFromUser, ["1x",'2x','5x','10x',"25x"],
				                [1,2,5,10,25], 0) );
    
    	
	const f = document.getElementById('scenariosMidbat');
	f.style = "min-height:12vw";
    usrInputs.set('desc', new Description('desc'));
    return usrInputs;
};

export function batStart() {
    let usrInputs = batHTML();
    bat = new Batching(usrInputs);
    batDefine();
    bat.graph = new BatGraph();
    bat.setupScenarios();
    theSimulation.initialize();
    bat.reset();
	return bat;
};
