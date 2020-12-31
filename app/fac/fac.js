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
	DeterministicRV, Heap, cbColors
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

class FacGraph extends TioxGraph {
	constructor(){	
		super(fac, 'chartfac', 40, {width:200, step:40}, d=>d.t, true);
		const flowtime = new GraphLine(this, d => d.flow, cbColors.blue,
					   false, true,  5, 8);
		const throughput = new GraphLine(this,d => d.thru, cbColors.yellow,
					   false, true,  5, 8, true);
        this.doReset = true;
        
        document.getElementById('leftLegendfac').append(
            flowtime.createLegend('Flow time<br>(seconds/card)'));
        document.getElementById('rightLegendfac').append(
            throughput.createLegend('Throughput<br>(cards/minute)'));

        fac.usrInputs.set('leg0', new LegendItem('leg0', flowtime, localUpdateFromUser));
        fac.usrInputs.set('leg1', new LegendItem('leg1', throughput, localUpdateFromUser));
	};
	
	push (t,flow,thru){
		t /= tioxTimeConv;
        flow /= tioxTimeConv;
        if( thru ) thru *= tioxTimeConv;
//        console.log(' at fac graph with ', t, flow, thru);
		let p = {t: t, flow: flow,
				 thru: thru
                };
		this.drawOnePoint(p);
	};
	reset(){
		if( this.doReset) super.reset(12,12);
        this.doReset = true;
	}
	updateForSpeed (factor){
		this.scaleXaxis(factor);
	};

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
anim.box.size = anim.box.space - anim.box.delta*2;

anim.card = {
	width: 40,
	height: 40,
	path: {
		left: -100,
		right: anim.stage.width * 1.1,
//		headQueue: [anim.stage.width * 0.2,anim.stage.width * 0.5,anim.stage.width * 0.8],
//		workPos: [anim.stage.width * 0.3, anim.stage.width * 0.6, anim.stage.width * 0.9],
		top: 40,
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
                 top: anim.card.path.top,
                 right: 3*c };
anim.worker[0] = {left: 4*c,
                 top: anim.card.path.top,
                 right: 5*c,
                 bottom: anim.card.path.top + 2*c,
                 color: cbColors.black};

anim.queue[1] = {left: 8*c,
                 top: anim.card.path.top,
                 right: 9*c };
anim.worker[1] = {left: 10*c,
                 top:anim.card.path.top,
                 right: 11*c,
                 bottom: anim.card.path.top + 2*c,
                 color: cbColors.blue};
anim.queue[2] = {left: 14*c,
                 top: anim.card.path.top,
                 right: 15*c };
anim.worker[2] = {left: 16*c,
                  top: anim.card.path.top,
                  right: 17*c,
                  bottom: anim.card.path.top + 2*c,
                 color: cbColors.red};

function computeStageTimes(){
    
    let qlength = fac.usrInputs.get('qln').getValue();
    theSimulation.queues[1].setMaxSeats(qlength);
    theSimulation.queues[2].setMaxSeats(qlength);
    
    for( let m = 0; m < 3; m++ ) {
        let nMachines = fac.usrInputs.get('quantity'+m).get();
        theSimulation.workers[m].setNumMachines(nMachines);
    };
    
    for(let s = 0; s < 3; s++){
        let total = 0;
        let count = 0;
        for(let key in fac.features){
            let stage = Number(fac.usrInputs.get(key).get());
            let time = Number(fac.usrInputs.get(key+'Time').get());
            if( stage == s ){
                count++
                total += time;
//                console.log(key,s, time);
            }
        }
        fac.stageTimes[s].setMean(total * tioxTimeConv);
//        console.log('stage',s,total);
        
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

    
    // set creator rate and movement based on first stage with nonzero proctime
    const k = fac.firstStage;
    fac.creatorTime.setMean( fac.stageTimes[k].mean /
    fac.usrInputs.get('quantity'+k).get()); 
    animForCreator.left = anim.queue[k].left;
    animForCreator.top = anim.queue[k].top;
    
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
    

	anim.stage.foreContext = document
			.getElementById('foregroundfac')
			.getContext('2d');
	anim.stage.backContext = document
			.getElementById('backgroundfac')
			.getContext('2d');
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
        document.getElementById('markButtonfac')
            .addEventListener('click', markCard);
//        this.setupScenarios();
    };
    localReset () {
        theSimulation.supply.previous = null;
        theSimulation.creator.knockFromPrevious();
        this.resourceCollection.drawAll();
    };

    localUpdateFromSliders(...inpsChanged){
        if( match(inpsChanged,needReset)) {
                computeStageTimes();
                this.partialReset();
                this.localReset();
                fac.graph.restartGraph(fac.now/tioxTimeConv);
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
                case 'leg0':
                case 'leg1':
                case 'action':
                case 'reset':
                    break;
                    
                case 'speed':
//                    console.log('at speed adjust',v,speeds);
                    fac.adjustSpeed(v,speeds);
                    break;
                default:
                    alert(' reached part for default, key='+inp.key);
                    console.log(' reached part for default, key=',inp.key);
                    break;
            }
        };
        
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
        fac.graph.restartGraph(fac.now/tioxTimeConv);
    }
}; 

class AnimForQueue  {
	constructor( which, lanes, left, top, anim) {
        this.which = which;
        this.lanes = lanes;
        this.left = left;
        this.top = top;
        this.anim = anim;
    };
    setQueue(queue){
        this.queue = queue;
    }
    relCoord(k) {
        let row;
        let col = Math.floor(k / this.anim.box.perCol);
        if (col < this.lanes-1) {
            const r = k % this.anim.box.perCol;
            row = ( col % 2 == 1) ? 
                    this.anim.box.perCol - 1 - r : r;
        } else { 
            col = this.lanes-1;
            row = k - col * this.anim.box.perCol;
       }
        const delta = this.anim.box.space - this.anim.box.size;
        return {
            y: this.anim.box.space * row + Math.floor(delta/2),
            x: -(this.anim.box.space) * col + delta/2
        }
    };
    
    join(len, aT, card ) {
		const point = this.relCoord(this.queue.q.length);
		const walkingTime = Math.max(
            this.left + point.x - card.cur.x, 
            this.top + point.y - card.cur.y) / anim.stage.normalSpeed;
        const arrivalTime = fac.now + walkingTime;
        card.updatePath({
			t: arrivalTime,
			x: this.left + point.x,
			y: this.top + point.y
		});
	};
    
    reset() {
    
    };

	arrive (nSeatsUsed, card) {
	};

	leave (procTime, nSeatsUsed) {
        if (this.queue.q.length == 0) return null;
		let n = this.queue.q.length;
        for (let k = 0; k < n; k++) {
            let card = this.queue.q[k];
            let point = this.relCoord(k);
            if( card.pathList.length == 0){ 
                card.updatePath({
                    t: fac.now + 700,
                    x: this.left + point.x,
                    y: this.top + point.y
                });
            } else{
                let destTime = Math.max(this.left + point.x - card.cur.x,
                                       this.top + point.y - card.cur.y) 
                                / anim.stage.normalSpeed;
//                console.log('destTime',destTime);
                card.updatePath({
                    t: fac.now + destTime+700,
                    x: this.left + point.x,
                    y: this.top + point.y
                });
            }
        };
    }
};

const animForWalkOffStage = {
    walkingTime: 2000,
	reset: function () {
    },
	start: function (card) {
         card.updatePath({
                t: fac.now + anim.card.width*2/anim.stage.normalSpeed,
                x: card.cur.x+anim.card.width*2,
                y: card.cur.y
         });
        card.addPath({
                t: fac.now + this.walkingTime,
                x: anim.card.path.right,
                y: anim.card.path.top
         });
    }
};

const animForCreator = {
    left: anim.queue[0].left,
    top: anim.queue[0].top,
    
	reset: function () {},
	start: function (theProcTime, card, m) {
    },
	finish: function (card) {
        card.arrivalTime = fac.now;
    },
};
class animForWorker {
    constructor(which) {
        this.which = which;
        this.machineCenter = null;
        this.top = anim.card.path.top;
        this.mid = (anim.worker[which].right + anim.worker[which].left)/2;
        this.left = this.mid - 0.5 * anim.GWorker.width ;
        this.leftCard = anim.worker[which].left;
        this.deltaY = anim.GWorker.height + 30;
        this.lastNumber = 0;
        this.lastStatus = [];
        
    };
    reset(){
        this.timeFirstThru = null;
        this.count = 0;
    // clear and redraw workers[this.which] 
        this.draw();
    };
     start(time,card,machine){
         card.graphic.startStage(this.which,fac.now);
         card.updatePath({
                t: fac.now + 500,
                x: this.leftCard,
                y: this.top+ machine * this.deltaY
         });
     };
    finish (card){
        if(this.which == fac.lastStage){
            let thruput = null;
            if( this.timeFirstThru ){
                this.count++;
                thruput = 60 * this.count/(fac.now - this.timeFirstThru);
            } else {
                this.timeFirstThru = fac.now
            } 
            fac.graph.push(fac.now, fac.now - card.arrivalTime, thruput );
        }
    };
    draw(){
        // helper functions: clear, draw, update an individual worker
        const clearIndiv = (j) => {
            ctx.clearRect(this.left-lineWidth, 
                    anim.GWorker.top + (this.deltaY) * j - lineWidth ,
                    anim.GWorker.width + lineWidth*2,
                    anim.GWorker.height + lineWidth*2);
        };
        const drawIndiv = (j) => {
            const status = this.machineCenter.machs[j].status;
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
            if( this.lastStatus[j] == this.machineCenter.machs[j].status )return;
            drawIndiv(j);
        };
        
        
        const ctx = anim.stage.backContext;
        const lineWidth = 15;
        ctx.lineWidth = lineWidth;
        
        let number = Number(document.getElementById('quantity'+this.which+'fac').value);
        if( fac.stageTimes[this.which].mean == 0 ) number = 0;
        
        for( let j = 0; j < 3; j++){
            if( j < number ){
                if( j < this.lastNumber ) updateIndiv(j);
                else drawIndiv(j);
            } else if( j < this.lastNumber ) clearIndiv(j);
        };
        this.lastNumber = number;
    }
};

const theSimulation = {
	// the 5 process steps in the simulation
    supply: null,
	creator: null,
    queues: [],
    workers: [],
    walkOffStage: null,
	
	initialize: function () {
        //graphs
//        fac.graph = new FacGraph();
//		fac.resetCollection.push(fac.graph);
		
		//queues
		this.supply = new Supplier(anim.card.path.left, anim.card.path.top);
        fac.resetCollection.push(this.supply);
        const shortWalkingTime = 0.25*tioxTimeConv;

		const animQueue0 = new AnimForQueue(0, 1, anim.queue[0].left,
                                       anim.queue[0].top, anim );
        this.queues[0] = new Queue(fac, "queue0", 1, 0, 
                                animQueue0, null,null);
        animQueue0.queue = this.queues[0];
        fac.resetCollection.push(this.queues[0]);
        
        const animQueue1 = new AnimForQueue(1, 3, anim.queue[1].left, 
                                       anim.queue[1].top, anim );
        this.queues[1] = new Queue(fac, "queue1", -1, 0,
                                animQueue1,	null,null);
        animQueue1.queue = this.queues[1];
        fac.resetCollection.push(this.queues[1]);
        
        const animQueue2 = new AnimForQueue(2, 3, anim.queue[2].left,
                                       anim.queue[2].top, anim );
        this.queues[2] = new Queue(fac, "queue2", -1, 0,
                                animQueue2, null, null);
        animQueue2.queue = this.queues[2];
        fac.resetCollection.push(this.queues[2]);
		
		
		this.walkOffStage = new WalkAndDestroy(fac,
            "walkOff", animForWalkOffStage, true);
		fac.resetCollection.push(this.walkOffStage);

		// workers (machine centers) 
		this.creator = new MachineCenter(fac, "creator",
			1, fac.creatorTime,
			this.supply, this.queues[0],
			animForCreator);
		fac.resetCollection.push(this.creator);

		const animWorker0 = new animForWorker(0);
        fac.resourceCollection.push(animWorker0);
        this.workers[0] = new MachineCenter(fac, "worker0",
			1, fac.stageTimes[0],
			this.queues[0], this.queues[1],
			animWorker0);
        animWorker0.machineCenter = this.workers[0];
		fac.resetCollection.push(this.workers[0]);
        
        const animWorker1 = new animForWorker(1);
        fac.resourceCollection.push(animWorker1);
        this.workers[1] = new MachineCenter(fac, "worker1",
			1, fac.stageTimes[1],
			this.queues[1], this.queues[2],
			animWorker1);
        animWorker1.machineCenter = this.workers[1];
		fac.resetCollection.push(this.workers[1]);
        
        const animWorker2 = new animForWorker(2);
        fac.resourceCollection.push(animWorker2);
        this.workers[2] = new MachineCenter(fac, "worker2",
			1, fac.stageTimes[2],
			this.queues[2], this.walkOffStage,
			animWorker2);
        animWorker2.machineCenter = this.workers[2];
		fac.resetCollection.push(this.workers[2]);
        
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
	};
    reset(){
        this.markCount = 0;
    }
	pull() {
        
		const card = new Card(fac, this.x, this.y);
        if( this.markCount > 0 ){
             this.markCount--;
            if( this.markCount > 0 ) card.graphic.mark = true;
        }
//        console.log('in supplier', card.which, card);
        return card;
	}
    bumpCount(){
        this.markCount++;
        console.log('markCount',this.markCount)
    }
}; //end class Supplier
class Worker {
    constructor(w){
        this.color = anim.worker[w].color;
        this.ctx = anim.stage.backContext;
        this.left = left;
        this.top = top;
        this.lineWidth = 15;
        this.lastStatus = null;
        
    }
    draw(status){
        if( status == this.lastStatus) return;
        this.lastStatus = status;
        this.ctx.fillStyle = 'red';  //depends on status
        //this.ctx.textFill??
        this.ctx.strokeStyle = anim.worker[w].color;
        this.ctx.clearRect(this.left, this.top, 
                      anim.Gworker.width, anim.GWorker.height);
        this.ctx.beginPath();
        
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.rect(this.left, this.top , 
                 anim.GWorker.width, anim.GWorker.height);
        this.ctx.stroke();
        this.ctx.fill();
        this.ctx.closePath();

    }};


class Card extends Item {
	constructor(omConcept, x, y = 100) {
		super(omConcept, x, y);
		this.graphic = new FaceCard(
            anim.stage.foreContext, x, y, 
            anim.box.size,anim.box.size);
	};

}; // end class Person
const pi2 =2 * 3.14159;
const pi = 3.14159;
class FaceCard {
    constructor(ctx,x,y,w,h){
        this.ctx = ctx;
        this.x = x;
        this.y = y;
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
    moveTo(x, y) {
		this.x = Math.floor(x);
		this.y = Math.floor(y);
	};
    
    draw(now){
        let ctx = this.ctx;
         ctx.save();
        
        ctx.translate(this.x + anim.box.delta,
                      this.y + anim.box.delta);
        ctx.beginPath();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        
        ctx.rect(0,0,this.w,this.h);
        if( this.mark ){
//            ctx.font = "30px Material-icons";
            ctx.fillStyle = 'pink';
//            ctx.fillText('\u153',0,0);
            ctx.fill();
        };
        ctx.stroke();
        ctx.closePath();
        
        for( let key in this.start ){
            const s = this.start[key];
            if( !s || now < s ) continue;
            const frac = Math.min(1,(now-s)/fac.features[key].adjustedTime);
            const frac1 = Math.min(1,frac*2);
            const frac2 = ( frac - 0.5 ) * 2;
            const sg = fac.usrInputs.get(key).get();
            ctx.strokeStyle = anim.worker[sg].color;
//            console.log('in draw',this.x,key)
            switch (key) {
                case 'face':
                    ctx.beginPath();
                    ctx.lineWidth = 1;
//                    ctx.rect(.5*this.w,.5*this.h,.2*this.h,.2*this.w);
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
			   'facStageWrapper','dualChartWrapper');
    
    // insert the radio button box first
    const radioButtons = document.getElementById('facDataWrapper');
    addKeyForIds('fac',radioButtons);
    const rhs = document.getElementById('rightHandSideBoxfac');  
    rhs.insertBefore(radioButtons, rhs.firstChild);
    
    usrInputs.set('face', new RadioButton('face', 'facefac',
                localUpdateFromUser, ['0','1','2']) );
    usrInputs.set('eyes', new RadioButton('eyes', 'eyesfac',
                localUpdateFromUser, ['0','1','2']) );
    usrInputs.set('nose', new RadioButton('nose', 'nosefac',
                localUpdateFromUser, ['0','1','2']) );
    usrInputs.set('mout', new RadioButton('mout', 'moutfac',
                localUpdateFromUser, ['0','1','2']) );
    usrInputs.set('ears', new RadioButton('ears', 'earsfac',
                localUpdateFromUser, ['0','1','2']) );
    usrInputs.set('hair', new RadioButton('hair', 'hairfac',
                localUpdateFromUser, ['0','1','2']) );
    usrInputs.set('faceTime', new NumSlider('faceTime', 'faceTimefac',
                localUpdateFromUser, 0,1,1) );
    usrInputs.set('eyesTime', new NumSlider('eyesTime', 'eyesTimefac',
                localUpdateFromUser, 0,1,1) );
    usrInputs.set('noseTime', new NumSlider('noseTime', 'noseTimefac',
                localUpdateFromUser, 0,1,1) );
    usrInputs.set('moutTime', new NumSlider('moutTime', 'moutTimefac',
                localUpdateFromUser, 0,1,1) );
    usrInputs.set('earsTime', new NumSlider('earsTime', 'earsTimefac',
                localUpdateFromUser, 0,1,1) );
    usrInputs.set('hairTime', new NumSlider('hairTime', 'hairTimefac',
                localUpdateFromUser, 0,1,1) );
    usrInputs.set('quantity0', new IntegerInput('quantity0', 'quantity0fac',
                localUpdateFromUser, 1) );
    usrInputs.set('quantity1', new IntegerInput('quantity1', 'quantity1fac',
                localUpdateFromUser, 1) );
    usrInputs.set('quantity2', new IntegerInput('quantity2', 'quantity2fac',
                localUpdateFromUser, 1) );
    
    
    let elem = document.getElementById('slidersWrapperfac');
	const mark = document.getElementById('markButton').cloneNode(true);
    addKeyForIds('fac',mark);
    elem.append(mark);
    const qlnInput = genRange('qlnfac',3,0,3,1);
	elem.append(htmlArbSlider(qlnInput, 'Queue Length = ', '∞', ['1','3','5','∞'] ));
    usrInputs.set('qln', new ArbSlider('qln', qlnInput, 
                localUpdateFromUser, ['1','3','5','∞'],
                                      [1,3,5,-1]) );
		
    elem.append(genPlayResetBox('fac'));
	usrInputs.set('reset', new CheckBox('reset', 'resetfac',
                localUpdateFromUser) );
    usrInputs.set('action', new RadioButton('action', 'actionfac', 
                localUpdateFromUser, ['none','play','pause']) );	
        
    const speedInput = genRange('speedfac',0,0,4,1);
    elem.append(htmlArbSlider(speedInput, 'Speed = ', '1x',
                            ["slow",' ',' ',' ',"fast"]) );
    usrInputs.set('speed', new ArbSlider('speed', speedInput, 
                localUpdateFromUser, ["1x",'2x','5x','10x',"25x"],
				                [1,2,5,10,25]) ); 
    	
	const f = document.getElementById('scenariosMidfac');
	f.style = "min-height: 16vw";
    return usrInputs;
};

export function facStart() {
//	 facDefineUsrInputs();
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