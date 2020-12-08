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
	TioxGraph
}
from "../mod/graph.js";

class FacGraph extends TioxGraph {
	constructor(omConcept,name){	
		super(omConcept, name, 40, {width:100, step:20}, d=>d.t, true);
		this.setupLine(0, d => d.flow, cbColors.blue,
					   false, true, 5, 10);
		this.setLegend(0, 'Flow time');
		this.setupLine(1, d => d.thru, cbColors.yellow,
					   false, true, 5, 10, true);
		this.setLegend(1,'Throughput');
//		this.setupLine(2, d => d.p, cbColors.red,
//					   true, false, 10, 0);
//		this.setLegend(2,'predicted wait');	
//		this.predictedWaitValue = this.predictedWait();
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
//		this.total = 0;
//		this.count = 0;
//		let yMax = (this.predictedWaitValue == Infinity)?
//			1.5: Math.max(1.5,this.predictedWaitValue * 1.1);
		super.reset(0);
//		
//		const v = document.getElementById('speedfac').value;
//		const f = speeds[v].graph;
//		this.updateForSpeed(f);
	}
	updateForSpeed (factor){
		this.scaleXaxis(factor);
//		console.log('in graph update for speed',factor)
	};
//	predictedWait () {
//			const sr = theSimulation.serviceRV.rate;
//			const ir = theSimulation.interarrivalRV.rate;
//			const iCV = theSimulation.interarrivalRV.CV;
//			const sCV = theSimulation.serviceRV.CV;
//			if (sr == 0) return Infinity;
//			let rho = ir / sr;
//			if (rho >= 1) return Infinity;
//			let pW = (rho / (1 - rho) / ir / tioxTimeConv) 
//					* (iCV * iCV + sCV * sCV) / 2;
//			return pW;
//		};
//	updatePredictedWait () {
//		let pW = this.predictedWait();
//		this.drawOnePoint({
//			t: (que.now / tioxTimeConv),
//			p: (pW == Infinity)?null:pW
//		});
//		this.setLegend(2,'predicted wait' +
//					   ((pW == Infinity) ? ' = ∞' : ''));
//
//		this.predictedWaitValue = pW;
//	};
}
let fac ;
const anim = {};
var gSF;

const tioxTimeConv = 1000; 
const moveTime = 0.25 * tioxTimeConv;  //.25 seconds;

const speeds = [{time:1, display:'1x', graph:1, anim:true},
				{time:2, display:'2x', graph:1, anim:true},
				{time:5, display:'5x', graph:2, anim:true},
				{time:10, display:'10x', graph:2, anim:true},
				{time:25, display:'25x', graph:5, anim:true},
			   {time:1000, display:'∞', graph:20, anim:false}];

const qlengths = [{qlen: 3, display: 3},
                  {qlen: 6, display: 6},
                  {qlen: 10, display: 10},
                  {qlen: -1, display: '∞'}];
anim.stage = {
	normalSpeed: .5, 
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

function facDefine(){
	fac = new OmConcept('fac', facEncodeURL, facDecodeURL, localReset);
	document.getElementById('fac').omConcept = fac;
	
	document.getElementById('slidersWrapperfac')
	.addEventListener('input', captureChangeInSliderS);
    
    document.getElementById('facDataWrapper')
			.addEventListener('input', captureChangeInFacData);
	
	fac.tioxTimeConv = tioxTimeConv;
	fac.sliderTypes = {
		qln: 'range',
		face: 'radio',
		eyes: 'radio',
		nose: 'radio',
		mouth: 'radio',
		ears: 'radio',
		hair: 'radio',
        faceTime: 'range',
        eyesTime: 'range',
        noseTime: 'range',
        earsTime: 'range',
        moutTime: 'range',
        hairTime: 'range',
        quantity1: 'number',
        quantity2: 'number',
        quantity3: 'number',
        speed: 'range',
		action: 'radio',
		reset: 'checkbox'
	};
    fac.stageTimes = [];
    for( let k = 0; k < 3; k++)
        fac.stageTimes[k] = new DeterministicRV(0);
    fac.creatorTime = new DeterministicRV(0);
    fac.features = {face: {},eyes:{},nose:{},ears:{},mout:{},hair:{}};


	anim.stage.foreContext = document
			.getElementById('foregroundfac')
			.getContext('2d');
	anim.stage.backContext = document
			.getElementById('backgroundfac')
			.getContext('2d');
    
    
    
    
	fac.stage = anim.stage;
};
function localReset () {
		
	// schedule the initial Person to arrive and start the simulation/animation.
	theSimulation.supply.previous = null;
	theSimulation.creator.knockFromPrevious();

	//fudge to get animation started quickly
//	let t = fac.heap.top().time - 1;
	fac.now = fac.frameNow = 0;
    computeStageTimes(fac.stageTimes, fac.features);

    
    //link the queues and machines to only include machines with 
    // procTime > 0.
    let previousMachine = theSimulation.constructor;
    for( let i = 0; i < 3; i++ ){
        if( fac.stageTimes[i].mean != 0 ){
            previousMachine.nextQueue = theSimulation.queues[i];
            theSimulation.queues[i].previousMachine = previousMachine;
            previousMachine = theSimulation.workers[i];
        }
    };
    previousMachine.nextQueue = theSimulation.walkOffStage;
    theSimulation.walkOffStage.previousMachine = previousMachine;
};

function facDecodeURL(str){
	const actionValue = {N:"none", G:"play", S:"pause"};
	const boolValue = {T: 'true', F: 'false'};
	return( 
	{qln: str.substr(0,1),
     face: str.substring(1,2),
     eyes: str.substring(2,3),
     nose: str.substring(3,4),
     mouth: str.substring(4,5),
     ears: str.substring(5,6),
     hair: str.substring(6,7),
     quantity1: str.substring(7,8),
     quantity2: str.substring(8,9),
     quantity3: str.substring(9,10),
     speed: str.substring(16,17),
	 action: actionValue[str.substring(17,18)],
	 reset: boolValue[str.substring(18,19)],
	 desc: str.substring(22)
	})
};
function facEncodeURL(row){
	const actionValue = {none: "N", play: "G", pause: "S"};
	return ('') 
	.concat(row.qln, row.face, row.eyes, row.nose, row.mouth,
            row.ears, row.hair, row.quantity1, row.quantity2, row.quantity3,
            row.speed, actionValue[row.action], row.desc);
}


function computeStageTimes(stageTimes,features){
//   const features = ['face','eyes','nose','ears','mout','hair'];
    
    for(let f in features){
        features[f].time = Number(
            document.getElementById(f+'Time').value) * tioxTimeConv;
    };
    for(let s = 0; s < 3; s++){
        let total = 0;
        let firstF = null;
        let lastF = null;
        for(let f in features){
           
            const c = document.getElementById(f + s).checked;
           if (c) {
               if( !firstF ) firstF = f;
                lastF = f;
               features[f].stage = s;
               total += features[f].time;
           }   
        }
        if( firstF ) features[firstF].time -= moveTime;
        if( lastF ) features[lastF].time -= moveTime;
//        total -= moveTime ;
        stageTimes[s].setMean(total);
        
       } 
    if( stageTimes[0].mean != 0 ){
        fac.creatorTime.setMean( stageTimes[0].mean /
            document.getElementById('quantity0').value);
        animForCreator.left = anim.queue[0].left;
        animForCreator.top = anim.queue[0].top;
    }
    else if ( stageTimes[1].mean != 0 ){
        fac.creatorTime.setMean( stageTimes[1].mean /
         document.getElementById('quantity1').value);
        animForCreator.left = anim.queue[1].left;
        animForCreator.top = anim.queue[1].top;
    }
    else if ( stageTimes[2].mean != 0 ){
        fac.creatorTime.setMean( stageTimes[2].mean /
           document.getElementById('quantity2').value);
        animForCreator.left = anim.queue[2].left;
        animForCreator.top = anim.queue[2].top;
    }
    else { alert ('no positive process times');
         debugger}
//   console.log('here are the stageTimes:', fac.creatorTime.mean, stageTimes[0].observe(),
//              stageTimes[1].observe(),stageTimes[2].observe()) 
}
function captureChangeInFacData(event){
    let inputElem = event.target.closest('input');
	if (!inputElem) return

	var id = inputElem.id ;
    if (inputElem.type == 'range') {
		var v = Number(inputElem.value);
		document.getElementById(id + 'Display')
			.innerHTML = v;
	} 
    if (inputElem.type == 'number'){
        const n = Number(inputElem.id.slice(-1));
        const v = Number(inputElem.value);
        theSimulation.workers[n].setNumMachines(v);
    }
        
        
        // if editmode then capture the changes
      /*else if (inputElem.type == 'radio'){
        if(fac.currentLi) {
            let scen = fac.currentLi.scenario;
            let n = inputElem.name;
            scen[n] = id;
            console.log(scen);
        }
    }*/ 
    computeStageTimes(fac.stageTimes, fac.features);
    fac.reset();
//    console.log('stage times', fac.stageTimes);
};
function captureChangeInSliderS(event) {
	let inputElem = event.target.closest('input');
	if (!inputElem) return;

	var idShort = inputElem.id.slice(0,-3) ;
	      //need to remove the concept name or
	if (inputElem.type == 'range') {
		var v = Number(inputElem.value);
		document.getElementById(idShort + 'facDisplay')
			.innerHTML = v;
	}
    if( inputElem.type == 'number'){};
    
	switch (idShort) {
		
		case 'qln':
            break;
            
        case 'speed':
			fac.adjustSpeed(idShort,v,speeds);
			break;
		case 'none':
		case 'play':
		case 'pause':
		case 'reset':
			break;
		default:
			alert(' reached part for default, id=',idShort);
			console.log(' reached part for default, id=',idShort);
			break;
	}
}

//  One variable for each process step or queue
//  that contains the functions to do the specific
//  animation for that process step

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
		const walkingTime = /*(len == 0 ? 250 : */Math.max(
            this.left + point.x - card.cur.x, 
            this.top + point.y - card.cur.y) / anim.stage.normalSpeed;
        const arrivalTime = fac.now + walkingTime;
        card.updatePath({
			t: arrivalTime,
			x: this.left + point.x,
			y: this.top + point.y
		});
//         ('setting an arrival at time', arrivalTime);
//        console.log('for location',this.left + point.x,this.top + point.y )
//        debugger;
        
	};
    
    reset() {};

	arrive (nSeatsUsed, card) {
//        console.log('card arrived at queue',this.which,
//                   'now=',fac.now, 'card xcoord',card.cur.x);
		//		may not need to displau number document.getElementById('nInQueue').innerHTML = 
        //			theSimulation.nInQueue ;
	};

	leave (procTime, nSeatsUsed) {
		if (this.queue.q.length == 0) return null;
//		let card = this.queue.q.shift();

		let n = this.queue.q.length;
        for (let k = 0; k < n; k++) {
            let card = this.queue.q[k];
            let point = this.relCoord(k);
            card.updatePath({
                t: fac.now + 700,
                x: this.left + point.x,
                y: this.top + point.y
            });
        };
//        return card;
    }
};

const animForWalkOffStage = {
    walkingTime: 2000,
	reset: function () {
        this.count = 0;
        this.timeFirstThru = null;
    },
	start: function (card) {
        
        let thruput = null;
        if( this.timeFirstThru ){
            this.count++;
            thruput = this.count/(fac.now - this.timeFirstThru);
        } else {
            this.timeFirstThru = fac.now
        } 
//        console.log('now=',fac.now,'about to graph', card.which);
        fac.graph.push(fac.now, card.flowTime, thruput )
        
        
         card.updatePath({
                t: fac.now + moveTime,
                x: card.cur.x+anim.card.width,
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
        card.addPath({
           t: fac.now + theProcTime,
            x: this.left,
            y: this.top
        })
    },
	finish: function (card) {
        card.arrivalTime = fac.now;
//        console.log('now', fac.now, 'finished creator', card.which);
         
    },
};
class animForWorker {
    constructor(which, machineCenter,left,top) {
        this.which = which;
        this.machineCenter = machineCenter;
        this.top = top;
        this.left = left;
        this.deltaY = anim.GWorker.height + 30;
        this.lastExit = null;
    };
    reset(){
        
    // clear and redraw workers[this.which] 
        const ctx = anim.stage.backContext
        const w = this.which;
        const lineWidth = 15;
        const mid = (anim.worker[w].right + anim.worker[w].left)/2;
        const left = mid - 0.5 * anim.GWorker.width ;
        ctx.clearRect(left-lineWidth, 0,
            anim.GWorker.width + lineWidth*2, fac.stage.height);
        let m = document.getElementById('quantity'+w).value;
        if( fac.stageTimes[w].mean == 0 ) return;
        
        ctx.fillStyle = cbColors.lightYellow;
        for( let j = 0; j < m; j++){
            ctx.beginPath();
            ctx.strokeStyle = anim.worker[w].color;
            ctx.lineWidth = lineWidth;
            ctx.rect(left, anim.GWorker.top + (this.deltaY) * j , anim.GWorker.width,anim.GWorker.height);
        ctx.stroke();
        ctx.fill();
        ctx.closePath();
        };
    };
     start(time,card,machine){
//         if( this.which == 0 ) card.arrivalTime = fac.now;
         card.graphic.startStage(this.which,fac.now);
//         console.log(' 350 now',fac.now,'started stage',this.which, card.which);
         
//         console.log(card.pathList);
         card.updatePath({
                t: fac.now + 350,
                x: this.left,
                y: this.top+ machine * this.deltaY
         });
         
         if( this.which == 0 ) card.arrivalTime = fac.now;
         // background should switch to blue - working.  
         // the idle or blocked should go away.
     };
    leave(card){
//        console.log('now',fac.now, 'leaving stage',this.which,'card', card.which, )
    };
    finish (card){
        card.flowTime = fac.now - card.arrivalTime;
//        console.log('now',fac.now, ' finishing stage ', this.which,'card ',card.which, 'flowtime', card.flowTime);
//        console.log('finished stage',this.which ,card.which, fac.now, 'card flowtime',card.flowTime);
        
//        console.log('finished stage',this.which ,card.which, fac.now);
//        let thruput = null;
//        if( this.which == 2 ){
//            console.log('finished stage',this.which ,card.which, fac.now);
//        }
////            const flowTime = fac.now - card.arrivalTime;
//            if( this.lastExit ){
//                thruput = 1/(fac.now - this.lastExit);
//                
//            } 
//            this.lastExit = fac.now
//            fac.graph.push(fac.now, flowTime, thruput )
            //plot (fac.now, flowTime)
//        }
             //queue will start moving it
             // change machine to blocked or idle
             // let start adjust this
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

        computeStageTimes(fac.stageTimes, fac.features);
        
        //graphs
        fac.graph = new FacGraph(fac, 'chartfac');
		fac.resetCollection.push(fac.graph);
		
		//queues
		this.supply = new Supplier(anim.card.path.left, anim.card.path.top);
        const shortWalkingTime = 0;//0.25*tioxTimeConv;

		const anim0 = new AnimForQueue(0, 1, anim.queue[0].left,
                                       anim.queue[0].top, anim );
        this.queues[0] = new Queue(fac, "queue0", -1, shortWalkingTime, 
                                anim0, null,null);
        anim0.queue = this.queues[0];
        fac.resetCollection.push(this.queues[0]);
        
        const anim1 = new AnimForQueue(1, 3, anim.queue[1].left, 
                                       anim.queue[1].top, anim );
        this.queues[1] = new Queue(fac, "queue1", -1, shortWalkingTime,
                                anim1,	null,null);
        anim1.queue = this.queues[1];
        fac.resetCollection.push(this.queues[1]);
        
        const anim2 = new AnimForQueue(2, 3, anim.queue[2].left,
                                       anim.queue[2].top, anim );
        this.queues[2] = new Queue(fac, "queue2", -1, shortWalkingTime,
                                anim2, null, null);
        anim2.queue = this.queues[2];
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

		this.workers[0] = new MachineCenter(fac, "worker0",
			1, fac.stageTimes[0],
			this.queues[0], this.queues[1],
			new animForWorker(0, this.workers[0], 
                anim.worker[0].left, anim.worker[0].top));
        this.workers[0].leaveEarly = 250;
		fac.resetCollection.push(this.workers[0]);
        
        this.workers[1] = new MachineCenter(fac, "worker1",
			1, fac.stageTimes[1],
			this.queues[1], this.queues[2],
			new animForWorker(1, this.workers[1],
                anim.worker[1].left, anim.worker[1].top));
        this.workers[1].leaveEarly = 250;
		fac.resetCollection.push(this.workers[1]);
        
        this.workers[2] = new MachineCenter(fac, "worker2",
			1, fac.stageTimes[2],
			this.queues[2], this.walkOffStage,
			new animForWorker(2, this.workers[2], 
                anim.worker[2].left, anim.worker[2].top));
        this.workers[2].leaveEarly = 250;
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
	};
	pull() {
        
		const card = new Card(fac, this.x, this.y);
//        console.log('in supplier', card.which, card);
        return card;
	}
}; //end class Supplier


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
//        this.stage = {face:null, eyes:null, nose: null, 
//                     ears:null, mout:null, hair:null};
    }
    startStage (which, now){
        
        let t = now +moveTime;
        for ( let f in fac.features){
            if( fac.features[f].stage == which){
                this.start[f] = t;
                t += fac.features[f].time;
            };
        };
//        console.log('which', which, this.start);
    };
    moveTo(x, y) {
		this.x = Math.floor(x);
		this.y = Math.floor(y);
	};
    
    draw(now){
//        console.log('drawing one card at ',this.x,this.y,now);
//        console.log('start',this.start);
        let ctx = this.ctx;
         ctx.save();
        
        ctx.translate(this.x + anim.box.delta,
                      this.y + anim.box.delta);
        ctx.beginPath();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        
        ctx.rect(0,0,this.w,this.h);
//        ctx.font="20px Arial";
//        ctx.fillText(this.which, 0,20);
        ctx.stroke();
        ctx.closePath();
        
        for( let f in this.start ){
            const s = this.start[f];
            if(!s || now < s ) continue;
            const frac = Math.min(1,(now-s)/fac.features[f].time);
            const frac1 = Math.min(1,frac*2);
            const frac2 = ( frac - 0.5 ) * 2;
            const sg = fac.features[f].stage
            ctx.strokeStyle = anim.worker[sg].color;
            switch (f) {
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

import {
	genPlayResetBox, genSlider, genArbSlider, genButton, addDiv
}
from '../mod/genHTML.js';

function facHTML(){	
	addDiv('fac','fac','whole')
	addDiv('fac', 'leftHandSideBox'+'fac',
			   'facStageWrapper','dualChartWrapper');
//    document.getElementById('leftHandSideBox'+'fac').append(
//        document.getElementById('facDataWrapper'));
//    
	 
    
    // insert the radio button box first
    const rhs = document.getElementById('rightHandSideBox'+'fac');
    const radioButtons = document.getElementById('facDataWrapper');

    rhs.insertBefore(radioButtons, rhs.firstChild);

    
	//stats line
//	const d2 = document.getElementById('statsWrapperfac');
//	const delem = document.createElement('div');
//	const selem = document.createElement('span');
//	 selem.id = 'throughput';
//	 delem.append('Throughput: ',selem);
//	 d2.append(delem);
//	const d2elem = document.createElement('div');
//	const s2elem = document.createElement('span');
//	s2elem.id = 'flowtime';
//	 d2elem.append('Flow time: ',selem);
//	 d2.append(d2elem);
    
    // add two graphs in here.
	 
	//now put in the sliders with the play/reset box	
	let elem = document.getElementById('slidersWrapperfac');
	elem.append(
		genButton('markfac','Mark'),
		genArbSlider('qlnfac','Queue Length = ',0,['3','6','∞'],['3','6','∞']),
		genPlayResetBox('fac'),
		genArbSlider('speedfac','Speed = ',0, ['1x','2x','5x','10x','25x','full'],
				  ["slow",' ',' ',' ',"fast",'full'])
	);
	
	const f = document.getElementById('scenariosMidfac');
	f.style = "min-height: 16vw";
};

export function facStart() {
	facHTML();
    facDefine();
    
	theSimulation.initialize();
	fac.reset();
	return fac;
};