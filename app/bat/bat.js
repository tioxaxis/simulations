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
import {
	genPlayResetBox, genArbSlider, genButton, addDiv,
      NumSlider, htmlNumSlider,
    ArbSlider, htmlArbSlider,
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
		const baseFlow = new GraphLine(this.flowGraph, d => d.flow, 
                        {color: cbColors.yellow,
						 vertical: false, visible: true, continuous: false,
                         lineWidth: 3, dotSize: 5, right: false});
        const modFlow = new GraphLine(this.flowGraph, d => d.flow, 
                        {color: cbColors.blue, vertical: false,
                         visible: true, continuous: false,
                         lineWidth: 3, dotSize: 5, right: false});

        //throughput graph
        this.thruGraph = new TioxGraph(bat,'tchartCanvasbat',
                40, {width:100, step:20}, d=>d.t, 1000,370,false);
		this.thruGraph.setTitle('Throughput','tchartTitle');
		const baseThru = new GraphLine(this.thruGraph, d => d.thru, 
                        {color: cbColors.yellow, vertical: false,
                         visible: true, continuous: false,
                         lineWidth: 3, dotSize: 5, right: false});
		const modThru = new GraphLine(this.thruGraph, d => d.thru, 
                        {color: cbColors.blue, vertical: false,
                         visible: true, continuous: false,
                         lineWidth: 3, dotSize: 5, right: false});
		        
        //add legends
        const leg0 = baseFlow.createLegend('Base Case');
		const leg1 = modFlow.createLegend('Modified');
        const d3 = document.getElementById('pairChartLegendbat');
        d3.classList.add('pairChartLegend');
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
        this.avgBaseThru.out(t);
        const avgThru = this.avgBaseThru.avgR();
        this.flowGraph.drawOnePoint( {t: t, s: avgFlow} );
        this.thruGraph.drawOnePoint( {t: t, s: avgThru} );
	};
    pushMod (t,f){
        t /= tioxTimeConv;
        f/= tioxTimeConv;
		const avgFlow = this.avgModFlow.addItem(f);
        this.avgModThru.out(t);
        const avgThru = this.avgModThru.avgR();
        this.flowGraph.drawOnePoint( {t: t, j: avgFlow} );
        this.thruGraph.drawOnePoint( {t: t, j: avgThru} );
    };
    
	reset(){
		this.avgBaseFlow = new Average();
		this.avgModFlow = new Average();
        this.avgBaseThru = new IRT(eos.now/tioxTimeConv,0);
        this.avgModThru = new IRT(eos.now/tioxTimeConv,0);
		this.flowGraph.reset();
		this.thruGraph.reset();
        this.xInfo = this.flowGraph.xInfo;
	}
    restartGraph(){
        this.flowGraph.restartGraph();
        this.thruGraph.restartGraph();
        
    };
	
    updateForParamChange(){
        this.timeFirstThru = null;
        this.count = 0;
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
var lastRound;

const tioxTimeConv = 10000; //rates in tiox are k/10 seconds

anim.stage = {
	normalSpeed: .050, 
	width: 1000,
	height: 480
};
anim.batch = {
	space: 50,
	size: 50,
	perRow: 4
}
anim.box = {
		width: 10,
		height: 10
};


anim.batch.path = {
	base:{
		left: -100,
		right: 700,
		// top: anim.store.top + anim.person.height/2,
		// bot: anim.store.top + anim.person.height/2  + anim.box.space*7
	},
	mod:{
		left: -100,
		right: 700,
		// top: anim.store.top + anim.person.height/2,
		// bot: anim.store.top + anim.person.height/2  + anim.box.space*7
	}
};

// anim.batch.path.mid = (anim.person.path.top + anim.person.path.bot) / 2;
anim.walkingTime = (anim.batch.path.right - anim.batch.path.left) /
                            anim.stage.normalSpeed;

function batDefine(){
	document.getElementById('bat').omConcept = bat;
	
	anim.stage.foreground = new StageOnCanvas('foregroundbat',
                                anim.stage.width, anim.stage.height);
    anim.stage.background = new StageOnCanvas('backgroundbat',
                                anim.stage.width, anim.stage.height);
    anim.stage.foreContext = anim.stage.foreground.context;
	anim.stage.backContext = anim.stage.background.context;
	bat.stage = anim.stage;

	
    
    	
	bat.fullSpeedSim = function(){
				
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

class Batching extends OmConcept{
    constructor(usrInputs){
        super('bat');
        this.usrInputs = usrInputs;
        this.keyNames = ['ar', 'pr', 'setup','batch',
                         'speed','action','reset',
                         'leg0','leg1','desc'];
        this.keyIndex = computeKeyIndex(this.keyNames);
    };
    localReset () {
		
		bat.graph.reset();
		
		// theSimulation.supply.previous = null;
		
		bat.tioxTimeConv = tioxTimeConv;
		lastRound = 0;

		let test = new Batch(4, 300, 300,
			anim.stage.foreContext, 'green');
		test.graphic.draw(300, 200, 4, 9, false);




    };
    localUpdateFromSliders(...inpsChanged){
        for(let inp of inpsChanged){
            localUpdate(inp); 
        };
        if( match(inpsChanged,['ar', 'pr', 'setup','batch'])){
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
    redrawBackground() {
        // theSimulation.store.drawStore();
    };
};
function localUpdateFromUser(inp){
    bat.setOrReleaseCurrentLi(inp);
    localUpdate(inp);
    if( match([inp],['ar', 'pr', 'setup','batch'])) {
            bat.graph.updateForParamChange();
        }
};


        
 function localUpdate(inp){
    let v = inp.get();
    switch (inp.key){
        case 'ar':
            theSimulation.ar = Number(v);
         	break;

        case 'pr':
            theSimulation.pr = Number(v);
            break;

        case 'setup':
			theSimulation.setup = Number(v);
            break;

        case 'batch':
            theSimulation.batch = Number(v);
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
            alert(' reached part for default id=',key);
            debugger;
            break;
    }
};


//  One variable for each process step or queue
//  that contains the functions to do the specific
//  animation for that process step

class BatQueue extends Queue {
    constructor(){
        super(bat, "theQueue", -1);
        this.walkingTime = anim.walkingTime;
    };
	//// adjust for batch of various sizes.
	push(person) {
        if( !super.push(person, anim.walkingTime) ) return false;
        const arrivalTime = bat.now + anim.walkingTime;
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

class  BatWalkOffStage extends WalkAndDestroy {
	constructor(){
        super(bat, "walkOff", true, anim.walkingTime1);
    };
	////   adjust for batch of various sizes.
	pushAnim (person) {
		person.addPath({
			t: bat.now +
				anim.walkingTime1,
			x: anim.person.path.left,
			y: anim.person.path.bot
		});
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
		this.ar = Number(bat.usrInputs.get('ar').get());
		this.pt = Number(bat.usrInputs.get('pt').get());
        this.setup = Number(bat.usrInputs.get('setup').get());
		this.nRows = Number(bat.usrInputs.get('batch').get()) / 4;

		this.base = {};
		this.base.path ={y:100};
		this.base.queue = new BatQueue();
		this.base.walkLeft = new BatWalkOffStage(
			-100, this.base.path.y);
		this.base.walkRight = new BatWalkOffStage(
			1100, this.base.path.y);
		
		this.base = new BatLine(
			200, this.base.path.y, 100, 0, 3, 4,
			this.base.queue, this.base.walkLeft, this.base. walkRight);
		
		

			


	},
};

// SUPPLIER
class Supplier {
	constructor(x, y, nRows) {
		this.x = x;
		this.y = y;
		this.nRows = nRows;
	   this.current = null;
	};
	front() {
        if( this.current ) return this.current;
        return this.current = new Batch(bat, this.x, this.y, nRows);
	};
    pull(){
        const last = this.front();
        this.current = null;
        return last;
	}
}; //end class Supplier


class BatLine{
	constructor(x,y,dx,dy,nMachs,nRows,
		queue,walkLeft,walkRight){
		this.x = x;
		this.y = y;
		this.dx = dx;
		this.dy = dy;
		const delta = 100;
		this.nMachs = nMachs;
		this.nRows = nRows;
		this.machs=[];
		this.queue = queue;
		this.walkLeft = walkLeft;
		this.walkRight = walkRight;

		for(let k = 0; k < nMachs; k++){
			this.machs[k] = {x: x, y: y, 
							in: new Batch(nRows, x - delta, y, true),
							out: new Batch(nRows,x + delta, y, false)
							}
			x+= dx;
			y+= dy;
		}
		
	};
	processOneBox(){
		// in and out of each machine 
		this.machs[1].nItems--
		if (this.machs[1].nItems > 0) ;
			// schedule next return. 
	};
	start(){
		//schedule finish
		//schedule movement of one item
		if( this.machs[1].in.nItems > 0){
			// schedule movement of one item, item#: nRows*4-nItems 
			// from in to machine and then machine to out at item#: same position
		}
	}
	knockFromPrevious(){
		this.machs[1].in = this.queue.pull();
		this.start();
	}
	
	finish(){
		//mach 1
		this.walkLeft.push(this.mach[1].in);
		this.machs[1].in = this.queue.pull();
		this.start();

		//mach 2
		const save1 = this.machs[2].in;
		// setup movement to this position.
		this.machs[2].in = this.machs[1].out;
		// setup movement to this position
		this.machs[1].out = save1;
		


		// mach 3
		const save2 = this.machs[3].in;
		// setup movement to this position.
		this.machs[3].in = this.machs[2].out;
		// setup movement to this position
		this.machs[2].out = save2;

		//end action
		this.walkRight.push(this.machs[3].out);
		// setup movement to this.mach[3] out
		this.machs[3].out = new Batch(this.nRows, x, y, false);
	}
	// swap(emptyBatch){
	// 	const save = this.out;
	// 	// move emptyBatch into position for this.out
	// 	this.out = emptyBatch;
	// 	this.in = this.previous.swap( this.in );
	// 	// move this.in into position to process
	// 	return (save);
	// };
	// collect(rows){
	// 	const emptyBatch = new Batch(rows, x, y);  
	// 	// x,y for off screen;
	// 	// move to position for out
	// 	const full = this.previous.swap( emptyBatch );
	// 	// this.base.walkOffStageRight.push(full);
	// 	// move the full off stage to right.
	// };
};

class Batch extends Item{
	constructor(rows,x,y,ctx,color){
		super(bat,x,y);
		this.nItems = 4 * rows;
		this.rows = rows;
		this.graphic = new BatchGraphic(ctx,color);
	}
	remove(){
		this.nItems--
	};
	add(){
		this.nItems++
	}

	draw(){
		//draw rectangle 4 wide and rows high 
		// centered at 
	}
};
var box = {size:40, space:52};

class BatchGraphic {
	constructor(ctx,color){
		this.ctx = ctx;
		this.color = color;
	}
	draw(xBatch,yBatch,nRows,nItems,filling){
		let delta = (box.space - box.size) / 2;
		this.ctx.strokeStyle = 'black';
		this.ctx.lineWidth = delta;
		this.ctx.beginPath();
		
		let left = xBatch - 2 * box.space;
		let top = yBatch - nRows / 2 * box.space;
		this.ctx.rect(left - 2 * delta, top - 2 * delta,
			box.space * 4 + 2 * delta, box.space * nRows + 2 * delta);
		this.ctx.stroke();
		this.ctx.closePath();

		this.ctx.strokeStyle = this.color;
		this.ctx.fillStyle = this.color;
		this.ctx.beginPath();
		
		for(let  k = 0; k < nItems; k++ ){
			let j = (filling ? k : nRows*4 -1 - k);
			let x = left + (j % 4) * box.space;
			let y = top + Math.floor( j / 4 ) * box.space;
			this.ctx.rect(x, y, box.size, box.size);

			

		}
		this.ctx.stroke();
		this.ctx.fill();
		this.ctx.closePath();
		// draw a rectangle 4 wide by rows high 
		// centered at x,y with nItems in it
		// if filling=true then fill from the bottom
		// else fill from the top
	}
}


function batHTML(){	
	let usrInputs = new Map();
    
    addDiv('bat','bat','whole')
	addDiv('bat', 'leftHandSideBox'+'bat',
			   'tallStageWrapper',
			   'pairChartWrapper');
	 
    
    	
	const empty = document.createElement('div');
	empty.className = "sliderBox"
	 
	//now put in the sliders with the play/reset box	
	let elem = document.getElementById('slidersWrapperbat');
	
    const arInput = genRange('arbat', '20', 10, 50, 1);
    elem.append(htmlNumSlider(arInput, 'Arrival Rate = ', '20', [10,20,30,40,50]) );
    usrInputs.set('ar', new NumSlider('ar',arInput,
                localUpdateFromUser, 10, 50, 20, 0, 1) );
    
	const ptInput = genRange('ptbat', '2', 2, 8, 2);
    elem.append( htmlNumSlider(ptInput, 'Processing Time = ', '2', [2,4,6,8] )); 
	usrInputs.set('pt', new NumSlider('pt',ptInput, localUpdateFromUser,
                                      2, 8, 2, 0, 1));
    
    const setupInput = genRange('setupbat', '2', 2, 8, 1);
    elem.append( htmlNumSlider(setupInput, 'Setup Time = ', '2', [2,4,6,8] )); 
	usrInputs.set('setup', new NumSlider('setup',setupInput, localUpdateFromUser,
                                      2, 8, 2, 0, 1));
    
	const batchInput = genRange('batchbat', 3, 0, 3, 1);
    elem.append( htmlArbSlider(batchInput, 'Batch Size = ', '16', [4,8,12,16] )); 
	usrInputs.set('batch', new ArbSlider('batch',batchInput, localUpdateFromUser,
                ["4",'8','12','16'], [2,4,8,16], 3) );
    
    
	elem.append( genPlayResetBox('bat'));
    usrInputs.set('reset', new CheckBox('reset', 'resetbat',
                localUpdateFromUser, false) );
    usrInputs.set('action', new RadioButton('action', 'actionbat', 
                localUpdateFromUser, ['none','play','pause'], 'none') );
    
	const speedInput = genRange('speedbat',0,0,5,1);
    elem.append(htmlArbSlider(speedInput, 'Speed = ', '1x',
                            ["slow",' ',' ',' ',"fast",'∞']) );
    usrInputs.set('speed', new ArbSlider('speed', speedInput, 
                localUpdateFromUser, ["1x",'2x','5x','10x',"25x",'∞'],
				                [1,2,5,10,25,1000], 0) );
    
    	
	const f = document.getElementById('scenariosMidbat');
	f.style = "min-height:24vw";
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
