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
	DeterministicRV, Heap, cbColors, StageOnCanvas,
    Average, IRT, computeKeyIndex
}
from "../mod/util.js";
import {
	OmConcept
}
from '../mod/rhs.js';
import {
	Queue, WalkAndDestroy, MachineCenter,
	InfiniteMachineCenter, Item, BoxStack,
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


class FacGraph {
	//controls both of the flow time and throughput graphs
    constructor(){	
		//flow time graph
        this.flowGraph = new TioxGraph(fac,'fchartCanvasfac',
                40, {width:200, step:40}, d=>d.t, 1000,370,false);
		this.flowGraph.setTitle('Flow time','fchartTitle');
		const flow = new GraphLine(this.flowGraph, d => d.flow, 
                        {color: cbColors.blue, vertical: false,
                         visible: true, continuous: false,
                         lineWidth: 5, dotSize: 8, right: false});
        
        //throughput graph
        this.thruGraph = new TioxGraph(fac,'tchartCanvasfac',
                40, {width:200, step:40}, d=>d.t, 1000,370,false);
		this.thruGraph.setTitle('Throughput','tchartTitle');
		const thru = new GraphLine(this.thruGraph, d => d.thru, 
                        {color: cbColors.yellow, vertical: false,
                         visible: true, continuous: false,
                         lineWidth: 5, dotSize: 8, right: false});
		        
        //add legends
        const leg0 = flow.createLegend('Individual Flow 2Times (seconds/card)');
        const d3 = document.getElementById('pairChartLeftLegendfac');
        d3.classList.add('pairChartLegend');
        d3.append(leg0);
        const leg1 = thru.createLegend('Avg. Throughput (cards/minute)');
        const d4 = document.getElementById('pairChartRightLegendfac');
        d4.classList.add('pairChartLegend');
        d4.append(leg1);
        
        //set up legends as buttons (and includable in URL)
        fac.usrInputs.set('leg0', 
            new LegendItem('leg0', flow, localUpdateFromUser, true));
        fac.usrInputs.set('leg1', 
            new LegendItem('leg1', thru, localUpdateFromUser, true));
	};
	    
	push(t,f){
		t /= tioxTimeConv;
        f/= tioxTimeConv;
        // flow time is in seconds/item
        this.flowGraph.drawOnePoint( {t: t, flow: f});
        if( this.timeFirstThru ){
            this.count++;
            // thruput is in items/minute
            const thruput = 60 * this.count/(fac.now - this.timeFirstThru) * tioxTimeConv;
            this.thruGraph.drawOnePoint( {t: t, thru: thruput} );
        } else {
            this.timeFirstThru = fac.now
        } 
	};
    
	reset(){
		this.avgFlow = new Average();
        this.avgThru = new IRT(fac.now/tioxTimeConv,0);
        this.flowGraph.reset();
		this.thruGraph.reset();
        this.xInfo = this.flowGraph.xInfo;
        this.timeFirstThru = null;
        this.count = 0;
	}
    restartGraph(){
        this.flowGraph.restartGraph();
        this.thruGraph.restartGraph();
        
    };
	
    updateForParamChange(){
        this.timeFirstThru = null;
        this.count = 0;
        this.flowGraph.restartGraph(fac.now/tioxTimeConv);
		this.thruGraph.restartGraph(fac.now/tioxTimeConv);
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
let fac;
let facInputs = {};
var gSF;

const tioxTimeConv = 1000; 
const moveTime = 0.50 * tioxTimeConv;  //.25 seconds;

const speeds = [{time:1, display:'1x', graph:1, anim:true},
				{time:2, display:'2x', graph:1, anim:true},
				{time:5, display:'5x', graph:2, anim:true},
				{time:10, display:'10x', graph:2, anim:true},
				{time:25, display:'25x', graph:5, anim:true},
			   ];

const qlengths = [{qlen: 3, display: 3},
                  {qlen: 6, display: 6},
                  {qlen: 10, display: 10},
                  {qlen: -1, display: '∞'}];
anim.stage = {
	normalSpeed: .2, 
	width: 1000,
	height: 480
};
anim.box ={ delta: 2, space: 50}
anim.box.width = 46;
anim.box.height = 46;
anim.box.size = anim.box.space - anim.box.delta*2;

anim.card = {
	width: 40,
	height: 40,
	path: {
		left: -100,
		right: anim.stage.width * 1.1,
		top: 40,
        y: 65,
	}
};
const c = anim.box.space;
anim.worker = [];
anim.queue = [];
anim.card.path.top = 40;


anim.box.perCol = Math.floor(
    (anim.stage.height - anim.card.path.top) 
    / anim.box.space);

anim.GWorker = {width: 1.5*c, height: 2*c,
               top: anim.card.path.top -.2*c};

anim.queue[0] = {left: 2*c,
                 headX: 2.5*c,
                 top: anim.card.path.top,
                 right: 3*c };
anim.worker[0] = {left: 4*c,
                 top: anim.card.path.top,
                 right: 5*c,
                 bottom: anim.card.path.top + 2*c,
                  x: 4.5*c,
                 color: cbColors.black};

anim.queue[1] = {left: 8*c,
                 headX: 8.5*c,
                 top: anim.card.path.top,
                 right: 9*c };
anim.worker[1] = {left: 10*c,
                 top:anim.card.path.top,
                 right: 11*c,
                 bottom: anim.card.path.top + 2*c,
                  x: 10.5*c,
                  color: cbColors.blue};
anim.queue[2] = {left: 14*c,
                 headX: 14.5*c,
                 top: anim.card.path.top,
                 right: 15*c };
anim.worker[2] = {left: 16*c,
                  top: anim.card.path.top,
                  right: 17*c,
                  bottom: anim.card.path.top + 2*c,
                  x: 16.5*c,
                  color: cbColors.red};

function computeStageTimes(){
    
    let qlength = fac.usrInputs.get('qln').getValue();
    theSimulation.queues[1].setMaxSeats(qlength);
    theSimulation.queues[2].setMaxSeats(qlength);
    
    
    
    for(let s = 0; s < 3; s++){
        let total = 0;
        let count = 0;
        for(let key in fac.features){
            let stage = Number(fac.usrInputs.get(key).get());
            let time = Number(fac.usrInputs.get(key+'Time').get());
            if( stage == s ){
                count++
                total += time;
            }
        }
        fac.stageTimes[s].setMean(total * tioxTimeConv);
        
        // adjust the feature time by stage to remove the movetime.
        let delta =  moveTime/count;
        for(let key in fac.features){
            let stage = fac.usrInputs.get(key).get();
            let time = fac.usrInputs.get(key+'Time').get()
            if( stage == s) {
                fac.features[key].adjustedTime = time * tioxTimeConv - delta;
                }
        };
    };
    
    //determine the first and last stage with non-zero procTime
    fac.firstStage = null;
    for( let i = 0; i < 3; i++)
        if( fac.stageTimes[i].mean != 0 ){
            fac.firstStage = i;
            break;
        }
    fac.lastStage = null;
    for( let i = 2; i >=0; i--)
        if( fac.stageTimes[i].mean != 0 ){
            fac.lastStage = i;
            break;
        }
    
    for( let m = 0; m < 3; m++ ) {
        let nMachines = fac.usrInputs.get('quantity'+m).get();
        if( fac.stageTimes[m].mean == 0 ) nMachines = 0; 
        theSimulation.workers[m].setNumMachines(nMachines);
    };
    
    // set creator rate and movement based on first stage with nonzero proctime
    const k = fac.firstStage;
    fac.creatorTime.setMean( fac.stageTimes[k].mean /
    fac.usrInputs.get('quantity'+k).get()); 
    
    anim.firstQueue = {left: anim.queue[k].left, top: anim.queue[k].top};
    
    //set links between machines and queues in process
    let previousMachine = theSimulation.creator;
    for( let i = 0; i < 3; i++ ){
        if( fac.stageTimes[i].mean != 0 ){
            previousMachine.nextQueue = theSimulation.queues[i];
            theSimulation.queues[i].previousMachine = previousMachine;
            previousMachine = theSimulation.workers[i];
        }
    };
    previousMachine.nextQueue = theSimulation.walkOffStage;
    theSimulation.walkOffStage.previousMachine = previousMachine;
}

function facDefine(){
	document.getElementById('fac').omConcept = fac;
	fac.tioxTimeConv = tioxTimeConv;
    fac.stageTimes = [];
    fac.features = {face: {},eyes:{},nose:{},ears:{},mout:{},hair:{}};
    for( let k = 0; k < 3; k++)
        fac.stageTimes[k] = new DeterministicRV(0);
    fac.creatorTime = new DeterministicRV(0);
    

	anim.stage.foreground = new StageOnCanvas('foregroundfac',
                                anim.stage.width, anim.stage.height);
    anim.stage.background = new StageOnCanvas('backgroundfac',
                                anim.stage.width, anim.stage.height);
    anim.stage.foreContext = anim.stage.foreground.context;
	anim.stage.backContext = anim.stage.background.context;
	fac.stage = anim.stage;
    
    return fac;
};

function markCard(){
    theSimulation.creator.machs[0]
        .person.graphic.mark = true;
    theSimulation.supply.bumpCount();
}
const needReset = ['qln', 'face',
                   'eyes', 'nose',
                   'mout', 'ears',
                   'hair', 'faceTime',
                   'eyesTime', 'noseTime',
                   'earsTime', 'moutTime',
                   'hairTime', 'quantity0', 
                   'quantity1', 'quantity2'];

class FaceGame extends OmConcept {
	constructor(usrInputs){
        super('fac');
        this.usrInputs = usrInputs;
        
        this.keyNames = ['face','eyes','nose','mout','ears','hair',     
                         'faceTime','eyesTime','noseTime',
                         'earsTime','moutTime','hairTime',
                         'quantity0', 'quantity1', 'quantity2',
                         'qln',
                         'speed','action','reset',
                         'leg0','leg1','desc'];
        this.keyIndex = computeKeyIndex(this.keyNames);
        document.getElementById('markButtonfac')
            .addEventListener('click', markCard);
    };
    localReset () {
        theSimulation.supply.previous = null;
        theSimulation.creator.knockFromPrevious();
//        this.resourceCollection.drawAll();
    };

    localUpdateFromSliders(...inpsChanged){
        if( match(inpsChanged,needReset)) {
                computeStageTimes();
                this.partialReset();
                this.localReset();
                fac.graph.updateForParamChange();
        }
        
        for(let inp of inpsChanged){
            let v = inp.get();
            switch (inp.key){
                case 'face':
                case 'eyes':
                case 'ears':
                case 'nose':
                case 'mout':
                case 'hair':
                case 'faceTime':
                case 'eyesTime':
                case 'earsTime':
                case 'noseTime':
                case 'moutTime':
                case 'hairTime':
                case 'quantity0':
                case 'quantity1':
                case 'quantity2':
                case 'qln':
                case 'action':
                case 'reset':
                    break;
                case 'leg0':
                case 'leg1':
                    break;
    
                case 'speed':
                    fac.adjustSpeed(v,speeds);
                    break;
                default:
                    alert(' reached part for default, key='+inp.key);
                    console.log(' reached part for default, key=',inp.key);
                    break;
            }
        };
        
    };
    clearStageForeground(){
        this.stage.foreground.clear();
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
    redrawBackground() {
    };
};
function localUpdateFromUser(inp){
    fac.setOrReleaseCurrentLi(inp);
    if( inp.key =='speed')
        fac.adjustSpeed(inp.get(),speeds);
    else if( match([inp],needReset) ){
        computeStageTimes();
        fac.partialReset()
        fac.localReset()
        fac.graph.updateForParamChange();
    }
}; 



class FacQueue  extends Queue{
	constructor( which, lanes, anim) {
        super(fac, "queue"+which, 1, 0);
        this.which = which;
        this.anim = anim;
        this.snake = new BoxStack({isRows: false, isSnake: true,
                lanes: lanes, laneLength: this.anim.box.perCol,
                hSpace: this.anim.box.space, vSpace: this.anim.box.space,
                xDir: -1, yDir: 1})
    };

    setHead(x,y){
        this.x = x;
        this.y = y;
    }
    
    push(card) {
		const point = this.snake.relCoord(this.q.length);
		const walkingTime = Math.max(
            this.x + point.x - card.cur.x, 
            this.y + point.y - card.cur.y) / anim.stage.normalSpeed;
        const arrivalTime = fac.now + walkingTime;
        if( !super.push(card, 0) ) return false;
        card.updatePath({
			t: arrivalTime,
			x: this.x + point.x,
			y: this.y + point.y
		});
        return true;
	};
    
    arriveAnim (card) {};

	pullAnim (card) {
        if (this.q.length == 0) return null;
        let n = this.q.length;
        for (let k = 0; k < n; k++) {
            let card = this.q[k];
            let point = this.snake.relCoord(k);
            if( card.pathList.length == 0){
                
                card.updatePath({
                    t: fac.now + 700,
                    x: this.x + point.x,
                    y: this.y + point.y
                });
            } else{
                let destTime = Math.max(this.x + point.x - card.cur.x,
                                       this.y + point.y - card.cur.y) 
                                / anim.stage.normalSpeed;
                card.updatePath({
                    t: fac.now + destTime+700,
                    x: this.x + point.x,
                    y: this.y + point.y
                });
            }
        };
    }
};

class FacWalkOffStage extends WalkAndDestroy {
    constructor(){
        super(fac, "walkOff", true, anim.walkOffStageTime);
        this.walkingTime= 2000;
    };
	pushAnim (card) {
         card.updatePath({
                t: fac.now + anim.card.width*2/anim.stage.normalSpeed,
                x: card.cur.x+anim.card.width*2,
                y: card.cur.y
         });
        card.addPath({
                t: fac.now + this.walkingTime,
                x: anim.card.path.right,
                y: anim.card.path.y
         });
    }
};

class FacCreator extends MachineCenter {
    constructor(){
        super(fac, "creator",1, fac.creatorTime);///need correct thing here
    };
	
	startAnim (machine) {};
	finishAnim (machine) {
        machine.person.sysEntryTime = fac.now;
    };
};
class FacStage extends MachineCenter {
    constructor(which) {
        super(fac, "worker"+which, 1, fac.stageTimes[which])
        this.which = which;
        this.setup1DrawMC(fac.stage.backContext,
                anim.worker[which].color, 15, false,
                anim.worker[which].x, anim.card.path.y, 
                4, anim.box);
        this.setup2DrawMC();
        this.top = anim.card.path.top;
        this.mid = (anim.worker[which].right + anim.worker[which].left)/2;
        this.left = this.mid - 0.5 * anim.GWorker.width ;
        this.leftCard = anim.worker[which].left;
        this.deltaY = anim.GWorker.height + 30;
        this.lastNumber = 0;
        this.lastStatus = [];
    };
    reset(){
        super.reset();
        // clear and redraw workers[ at stage this.which] 
        this.setup2DrawMC();
        this.draw();
    };
    setNumberMachines( n ){
        super.setNumberMachines(n);
        this.setup2DrawMC();
    };
    pathY(){
        return this.machs[0].locy;
    }
    
    startAnim (machine){
         const card = machine.person;
         card.graphic.startStage(this.which,fac.now);
         card.updatePath({
                t: fac.now + 500,
                x: machine.locx,
                y: machine.locy
         });
     };
    finishAnim (machine){
        if(this.which == fac.lastStage){
            const card = machine.person;
            fac.graph.push(fac.now, fac.now - card.sysEntryTime);
        }
    };
    draw5(redraw = false){   //this draws FAC workers only as needed. 
        // currently not used.
        
        
        // helper functions: clear, draw, update an individual worker
        const clearIndiv = (j) => {
            ctx.clearRect(this.left-lineWidth, 
                    anim.GWorker.top + (this.deltaY) * j - lineWidth ,
                    anim.GWorker.width + lineWidth*2,
                    anim.GWorker.height + lineWidth*2);
        };
        const drawIndiv = (j) => {
            const status = this.machs[j].status;
            ctx.fillStyle = (status == 'busy' ? 'lightgreen' : 'lightyellow');
            const label = (status == 'busy' ? '' : status);
            const top = anim.GWorker.top + (this.deltaY) * j ;
            ctx.beginPath();
            ctx.rect(this.left, top, anim.GWorker.width,
                     anim.GWorker.height);
            ctx.strokeStyle = anim.worker[this.which].color;
            ctx.stroke();
            ctx.fill();
            ctx.closePath();
            if( status != 'busy') {
                ctx.beginPath();
                ctx.textAlign = 'center';
                ctx.fillStyle = 'black';
                ctx.font = "20px Arial";
                ctx.fillText(status, this.mid,top + anim.GWorker.height - 10);
                ctx.closePath();
            };
            this.lastStatus[j] = status;
        };
        const updateIndiv = (j) => {
            if( this.lastStatus[j] == this.machs[j].status )return;
            drawIndiv(j);
        };
        
        const ctx = anim.stage.backContext;
        const lineWidth = 15;
        ctx.lineWidth = lineWidth;
        let number = Number(document.getElementById('quantity'+this.which+'fac').value);
        if( fac.stageTimes[this.which].mean == 0 ) number = 0;
        
        if( redraw ){
            for( let j = 0; j < number; j++){
             drawIndiv(j);
            }
            this.lastNumber = number;
        } else {
            for( let j = 0; j < 3; j++){
                if( j < number ){
                    if( j < this.lastNumber ) updateIndiv(j);
                    else drawIndiv(j);
                } else if( j < this.lastNumber ) clearIndiv(j);
            };
            this.lastNumber = number;
        }
    };
};

const theSimulation = {
	// the 5 process steps in the simulation
    supply: null,
	creator: null,
    queues: [],
    workers: [],
    walkOffStage: null,
	
	initialize: function () {
		
		//queues
		this.supply = new Supplier(anim.card.path.left, anim.card.path.y);
        fac.resetCollection.push(this.supply);
        const shortWalkingTime = 0.25*tioxTimeConv;

		const nColumns = [1,3,3];
        this.queues = [];
        for( let k = 0; k < 3; k++){
            this.queues[k] = new FacQueue(k, nColumns[k],  anim);
            fac.resetCollection.push(this.queues[k]);
        }	
		
		this.walkOffStage = new FacWalkOffStage();
		fac.resetCollection.push(this.walkOffStage);

		// workers (machine centers) 
		this.creator = new FacCreator();
		fac.resetCollection.push(this.creator);
        
        for( let j = 0; j < 3; j++){
            this.workers[j] = new FacStage(j);
//            this.workers[j].setup1DrawMC(fac.stage.backContext,
//                anim.worker[j].color, 15, false, anim.worker[j].left, 0, anim.box);
            fac.resourceCollection.push(this.workers[j]);
		    fac.resetCollection.push(this.workers[j]);
            this.queues[j].setHead(anim.queue[j].headX, anim.card.path.y)
        }
        
        this.creator.setPreviousNext(this.supply, this.queues[0]);
        this.workers[0].setPreviousNext(this.queues[0], this.queues[1]);
        this.workers[1].setPreviousNext(this.queues[1], this.queues[2]);
        this.workers[2].setPreviousNext(this.queues[2], this.walkOffStage);
        
        this.queues[0].setPreviousNext(this.creator, this.workers[0]);
        this.queues[1].setPreviousNext(this.workers[0], this.workers[1]);
        this.queues[2].setPreviousNext(this.workers[1], this.workers[2]);
        
	},
};

// SUPPLIER
class Supplier {
	constructor(x, y) {
		this.x = x;
		this.y = y;
        this.markCount = 0;
        this.current = null;
	};
    reset(){
        this.markCount = 0;
    }
	front() {
        if( this.current ) return this.current;
        return this.current = new Card(fac, this.x, this.y);
	};
    pull(){
        const last = this.front();
        this.current = null;
        if( this.markCount > 0 ){
             this.markCount--;
            if( this.markCount > 0 ) last.graphic.mark = true;
        }
        return last;
	};
    bumpCount(){
        this.markCount++;
    }
}; //end class Supplier


class Card extends Item {
	constructor(omConcept, x, y = 100) {
		super(omConcept, x, y);
		this.graphic = new FaceCard(
            anim.stage.foreContext, /*x, y,*/ 
            anim.box.size,anim.box.size);
	};

}; 

const pi2 =2 * 3.14159;
const pi = 3.14159;
export class FaceCard {
    constructor(ctx,/*x,y,*/w,h){
        this.ctx = ctx;
//        this.x = x;
//        this.y = y;
        this.w = w;
        this.h = h;
        this.start = {face:null, eyes:null, nose: null, 
                     ears:null, mout:null, hair:null};
        this.mark = false;
    }
    startStage (stage, now){
        //set start time for each feature at stage
        let t = now + moveTime;
        for ( let key in fac.features){
            let s = Number(fac.usrInputs.get(key).get())
            if( s == stage){
                this.start[key] = t;
                t += fac.features[key].adjustedTime;
            };
        };
    };
    
    draw(cur,now){
        let ctx = this.ctx;
         ctx.save();
        
        // should be able to adjust this to (this.x-this.w/2, this.y - this.h/2) so I can use centered coordinates to pass.
        ctx.translate(cur.x - this.w/2 ,
                      cur.y - this.h/2);
        ctx.beginPath();
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'white';
        ctx.lineWidth = 1;
        
        ctx.rect(0,0,this.w,this.h);
        if( this.mark ){
//            ctx.font = "30px Material-icons";
            ctx.fillStyle = 'pink';
//            ctx.fillText('\u153',0,0);
           
        };
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
        
        for( let key in this.start ){
            const s = this.start[key];
            if( !s || now < s ) continue;
            const frac = Math.min(1,(now-s)/fac.features[key].adjustedTime);
            const frac1 = Math.min(1,frac*2);
            const frac2 = ( frac - 0.5 ) * 2;
            const sg = fac.usrInputs.get(key).get();
            ctx.strokeStyle = anim.worker[sg].color;
            switch (key) {
                case 'face':
                    ctx.beginPath();
                    ctx.lineWidth = 1;
                    ctx.arc(.5*this.w, .5*this.h, .325*this.w, 0, frac*pi2);
                    ctx.stroke();
                    ctx.closePath();
                    break;
                case 'eyes':
                    
                    ctx.beginPath();
                    ctx.arc(.35*this.w,.4*this.h,.07*this.w,0,frac1*pi2);
                    ctx.stroke();
                    ctx.closePath();
                    ctx.beginPath();
                    ctx.arc(.33*this.w,.42*this.h,.02*this.w,0,frac1*pi2);
                    ctx.stroke();
                    ctx.closePath();
                    if( frac <=.5 ) break;
                    ctx.beginPath();
                    ctx.arc(.65*this.w,.4*this.h,.07*this.w,0,frac2*pi2);
                    ctx.stroke();
                    ctx.closePath();
                    ctx.beginPath();
                    ctx.arc(.63*this.w,.42*this.h,.02*this.w,0,frac2*pi2);
                    ctx.stroke();
                    ctx.closePath();
                    break;
                case 'nose':
                    ctx.beginPath();
                    ctx.moveTo(.5*this.w,.4*this.h);
                    ctx.lineTo((.5 -.1*frac1)*this.w,(.4 +.2*frac1)*this.h);
                    if( frac > .5 )  
                        ctx.lineTo((.4+.1*frac2)*this.w,.6*this.h);
                    ctx.stroke();
                    ctx.closePath();
                    break;
                case 'ears':
                    ctx.beginPath();
                    ctx.arc(0.25*this.w, 0.5*this.h, 0.15*this.w, 0.6*pi,
                            (0.6 + 0.8 * frac1)*pi);
                    ctx.stroke();
                    ctx.closePath();
                    if( frac < 0.5 ) break;
                    ctx.beginPath();
                    ctx.arc(.75*this.w, .5*this.h, .15*this.w, 1.6*pi,
                            ((1.6 + .8 * frac2) % 2)*pi);
                    ctx.stroke();
                    ctx.closePath();
                    break;
                case 'mout':
                    ctx.beginPath();
                    ctx.arc(.5*this.w, .48*this.h, .25*this.w, .20*pi,
                            (.2 + frac*.6)*pi);
                    ctx.stroke();
                    ctx.closePath();
                    break;
                case 'hair':
                    ctx.beginPath();
                    ctx.moveTo(.3*this.w,.25*this.h);
                    ctx.lineTo(.35*this.w,.1*this.h);
                    if( frac > .125 ) ctx.lineTo(.40*this.w,.2*this.h);
                    if( frac > .250 ) ctx.lineTo(.45*this.w,.1*this.h);
                    if( frac > .375 ) ctx.lineTo(.5*this.w,.2*this.h);
                    if( frac > .500 ) ctx.lineTo(.55*this.w,.1*this.h);
                    if( frac > .625 ) ctx.lineTo(.6*this.w,.2*this.h);
                    if( frac > .750 ) ctx.lineTo(.65*this.w,.1*this.h);
                    if( frac > .875 ) ctx.lineTo(.7*this.w,.25*this.h);
                    ctx.stroke();
                    ctx.closePath();
                    break;
            }
        }
        ctx.restore();
    };
};

function facHTML(){	
	let usrInputs = new Map();
    
    addDiv('fac','fac','whole')
	addDiv('fac', 'leftHandSideBox'+'fac',
			   'facStageWrapper','pairChartWrapper');
    
    // insert the radio button box first
    const radioButtons = document.getElementById('facDataWrapper');
    addKeyForIds('fac',radioButtons);
    const rhs = document.getElementById('rightHandSideBoxfac');  
    rhs.insertBefore(radioButtons, rhs.firstChild);
    
    usrInputs.set('face', new RadioButton('face', 'facefac',
                localUpdateFromUser, ['0','1','2'], '0') );
    usrInputs.set('eyes', new RadioButton('eyes', 'eyesfac',
                localUpdateFromUser, ['0','1','2'], '1') );
    usrInputs.set('nose', new RadioButton('nose', 'nosefac',
                localUpdateFromUser, ['0','1','2'], '1') );
    usrInputs.set('mout', new RadioButton('mout', 'moutfac',
                localUpdateFromUser, ['0','1','2'], '1') );
    usrInputs.set('ears', new RadioButton('ears', 'earsfac',
                localUpdateFromUser, ['0','1','2'], '1') );
    usrInputs.set('hair', new RadioButton('hair', 'hairfac',
                localUpdateFromUser, ['0','1','2'], '2') );
    usrInputs.set('faceTime', new NumSlider('faceTime', 'faceTimefac',
                localUpdateFromUser, 1, 9, 1, 0, 1) );
    usrInputs.set('eyesTime', new NumSlider('eyesTime', 'eyesTimefac',
                localUpdateFromUser, 1, 9, 2, 0, 1) );
    usrInputs.set('noseTime', new NumSlider('noseTime', 'noseTimefac',
                localUpdateFromUser, 1, 9, 1, 0, 1) );
    usrInputs.set('moutTime', new NumSlider('moutTime', 'moutTimefac',
                localUpdateFromUser, 1, 9, 2, 0, 1) );
    usrInputs.set('earsTime', new NumSlider('earsTime', 'earsTimefac',
                localUpdateFromUser, 1, 9, 1, 0, 1) );
    usrInputs.set('hairTime', new NumSlider('hairTime', 'hairTimefac',
                localUpdateFromUser, 1, 9, 2, 0, 1) );
    usrInputs.set('quantity0', new IntegerInput('quantity0', 'quantity0fac',
                localUpdateFromUser, 1, 3, 1) );
    usrInputs.set('quantity1', new IntegerInput('quantity1', 'quantity1fac',
                localUpdateFromUser, 1, 3, 1) );
    usrInputs.set('quantity2', new IntegerInput('quantity2', 'quantity2fac',
                localUpdateFromUser, 1, 3, 1) );
    
    
    let elem = document.getElementById('slidersWrapperfac');
	const mark = document.getElementById('markButton').cloneNode(true);
    addKeyForIds('fac',mark);
    elem.append(mark);
    const qlnInput = genRange('qlnfac',3,0,3,1);
	elem.append(htmlArbSlider(qlnInput, 'Max Queue Length = ', '∞', ['1','3','5','∞'] ));
    usrInputs.set('qln', new ArbSlider('qln', qlnInput, 
                localUpdateFromUser, ['1','3','5','∞'],
                                      [1,3,5,-1], 3) );
		
    elem.append(genPlayResetBox('fac'));
	usrInputs.set('reset', new CheckBox('reset', 'resetfac',
                localUpdateFromUser, false) );
    usrInputs.set('action', new RadioButton('action', 'actionfac', 
                localUpdateFromUser, ['none','play','pause'], 'none') );	
        
    const speedInput = genRange('speedfac',0,0,4,1);
    elem.append(htmlArbSlider(speedInput, 'Speed = ', '1x',
                            ["slow",' ',' ',' ',"fast"]) );
    usrInputs.set('speed', new ArbSlider('speed', speedInput, 
                localUpdateFromUser, ["1x",'2x','5x','10x',"25x"],
				                [1,2,5,10,25], 0) ); 
    	
	const f = document.getElementById('scenariosMidfac');
	f.style = "min-height: 16vw";
    
    usrInputs.set('desc', new Description('desc'));
    return usrInputs;
};

export function facStart() {
    let usrInputs = facHTML();
    fac = new FaceGame(usrInputs);
    facDefine();
    fac.graph = new FacGraph();
    fac.setupScenarios();
    theSimulation.initialize();
    
    computeStageTimes();
	fac.reset();
	return fac;
};