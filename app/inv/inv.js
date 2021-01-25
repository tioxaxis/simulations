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

// declaration of Globals
const disappointed = {
	color: 'rgb(235, 230, 230)',
	border: 'rgb(31, 105, 245)'
};
const tioxTimeConv = 10000; //time are in milliseconds/10
import {
	GammaRV, UniformRV, DeterministicRV, Heap, cbColors, StageOnCanvas
}
from '../mod/util.js';
import {
	displayToggle, OmConcept
}
from '../mod/rhs.js';

import {
	Queue, WalkAndDestroy, MachineCenter,
	InfiniteMachineCenter, Combine, Item, BoxStack,
	GStickFigure, NStickFigure, GStore, Package, tioxColors
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
    genRange, genRadio, hideNode,
     htmlCheckBox, CheckBox, 
    htmlRadioButton, RadioButton, 
    IntegerInput, 
    addKeyForIds, 
    LegendItem, match
}
from '../mod/genHTML.js';

class InvGraph extends TioxGraph {
	constructor(){
		super(inv,'chartCanvasinv',40, {width:24, step:6}, d=>d.t,
             2000,600,false);
		this.predictedInvValue = null;
		this.setTitle('Inventory');
		const onhandInv = new GraphLine(this, d => d.i, cbColors.blue,
					   true, true,  3, 0);
		const bothInv = new GraphLine(this, d => d.ip, cbColors.red,
					   true, true,  3, 0);
		const predInv = new GraphLine(this, d => d.p, cbColors.orange,
					   true, false,  10, 0);
        
       
        const d4 = document.getElementById('chartLegendinv');
        d4.append(onhandInv.createLegend('On Hand'),
                  bothInv.createLegend('On Hand and On Order'),
                  predInv.createLegend('Predicted On Hand')
                  );
        inv.usrInputs.set('leg0', 
            new LegendItem('leg0', onhandInv, localUpdateFromUser, true));
        inv.usrInputs.set('leg1', 
            new LegendItem('leg1', bothInv, localUpdateFromUser, true));
        inv.usrInputs.set('leg2', 
            new LegendItem('leg2', predInv, localUpdateFromUser, false)); 
	
		if( inv.whichRule == 'methRop'){
			this.resetRopLine(Number(inv.usrInputs.get('rop').get()));
		} else {
			this.resetPeriodLines(Number(inv.usrInputs.get('period').get()));
		}
	};
	
	push (t, inv, invPosition){
		this.predictedInvValue = this.computePredInv();
		t /= tioxTimeConv;
		let p = {t: t, i: inv,
				 ip: invPosition,
				 p: this.predictedInvValue};
		this.drawOnePoint(p);
	};
	
	reset(){
//		console.log('in Graph Inventory Reset');
        let maxI;
		if ( inv.whichRule == 'methRop' ){
			maxI = theSimulation.rop + theSimulation.quantityOrdered + 1;
		} else {
			maxI = theSimulation.upto+1;
		};
		super.reset(maxI);
//		const v = document.getElementById('speedinv').value;
//		const f = speeds[v].graph;
//		this.updateForSpeed(f);
	};
//	updateForSpeed (factor){
//		this.scaleXaxis(factor);
//	};
	computePredInv () {
		let avgInv;
		
		const P = theSimulation.period;
		const L = theSimulation.leadtimeRV.mean;
		const R = theSimulation.arrivalRV.rate;
		if (inv.whichRule == 'methUpto') {
			const U = theSimulation.upto;
			if ( U > R * (P + L) ){
				avgInv = U - R * (L + P/ 2);
			} else {
				const t = P - L + U / R;
				avgInv = R * t * t / (P * 8);
			}
		} else {  //methRop
			const Q = theSimulation.quantityOrdered;
			const SS = theSimulation.rop - R * L;
			if ( SS >= 0 ) {
				avgInv =  Q / 2 + SS;
			} else {
				avgInv = (Q / 2) * (Q / (Q - SS))
			}
		}
		return avgInv;
	};
	
		
	resetRopLine(y){
//        console.log(' In Graph Inventory ROP LINE');
		this.setExtraLines(cbColors.yellow,{min:y},null);
	}
	resetPeriodLines(x){
//		console.log(' In Graph Inventory PERIOD LINES');
        this.setExtraLines(cbColors.yellow,null, {min:x,step:x});
	};
    updateForParamChange(){
        this.restartGraph(inv.now/tioxTimeConv);
    };
    
}
const anim = {};
var inv;
var gSF;

function animSetup(){
	anim.stage = { 
	normalSpeed: .10, //.10 pixels per millisecond
	width: 1000,
	height: 300
	};
	anim.person =  {
			width: 40,
			height: 60
	};

	anim.box = {space: 20, size: 16, perRow: 10};
	anim.store = {
			left: 400,
			top: 80,
			stroke: 1,
			width: anim.box.space * anim.box.perRow,
	};
	anim.store.height = anim.store.width;
	anim.store.right = anim.store.left + anim.store.width;
	anim.store.bot = anim.store.top + anim.store.width;

	anim.person.path = {
		left: -100,
		right: anim.store.left - 20,
		top: anim.store.top,
		bot: anim.store.top + anim.box.space * 7,
		mid: anim.store.top + anim.box.space * 3.5,
	};
    
    anim.walkingTime1 = (anim.person.path.right - anim.person.path.left) /
                            anim.stage.normalSpeed,
	anim.walkingTime2 = (anim.person.path.mid - anim.person.path.top) /
                            anim.stage.normalSpeed,
	anim.walkingTime = ((anim.person.path.right - anim.person.path.left) +
		                (anim.person.path.mid - anim.person.path.top)) /
                            anim.stage.normalSpeed,
	anim.walkOffStageTime = anim.walkingTime1;
    
    anim.truck = {
		height: anim.box.space *5,
		
		bedWidth: anim.box.perRow * anim.box.space,
		
		path:{
			left: anim.store.right,
			right: 1000,
			top: anim.store.top - 2 * anim.box.space,
			bot: anim.store.bot - 5 * anim.box.space,
		}
	};
	anim.truck.cabWidth = anim.truck.height/2;
	anim.truck.width = anim.truck.bedWidth + anim.truck.cabWidth;


};

animSetup();

function invDefine(){
	document.getElementById('inv').omConcept = inv;

	
	inv.whichRule = 'methRop';

	anim.stage.foreground = new StageOnCanvas('foregroundinv',
                                anim.stage.width, anim.stage.height);
    anim.stage.background = new StageOnCanvas('backgroundinv',
                                anim.stage.width, anim.stage.height);
    anim.stage.foreContext = anim.stage.foreground.context;
	anim.stage.backContext = anim.stage.background.context;
	inv.stage = anim.stage;
      
	gSF = new GStickFigure(anim.stage.foreContext,
			anim.person.height, anim.box.size);
	
	inv.tioxTimeConv = tioxTimeConv;
};

//function redoStagesGraph(){
//    anim.stage.foreground.reset();
//    anim.stage.background.reset();
//    inv.graph.chart.reset();
//    
//    
//    inv.graph.setupThenRedraw();
//    inv.clearRedrawStage(0,true);
//    console.log('in Inventory and called redoStages');
//};

class Inventory extends OmConcept{
    constructor(usrInputs){
        super('inv');
        this.usrInputs = usrInputs;
//        this.setupScenarios();    
    }
    localReset () {
        inv.itemCollection.moveDisplayAll(0); 

        // schedule the initial Person to arrive and start the simulation/animation.
        theSimulation.supply.previous = null;
        theSimulation.creator.knockFromPrevious();

        //fudge to get animation started quickly
        let t = inv.heap.top().time - 1;
        inv.now = inv.frameNow = t;
        if (inv.whichRule == 'methUpto') {
            inv.heap.push({
                time: 0 + theSimulation.period,
                type: 'next order',
                proc: theSimulation.store.orderUpto
                    .bind(theSimulation.store),
                item: null
            });
        }
        document.getElementById('lostSales').innerHTML = '0'
        ;
        document.getElementById('fillRate').innerHTML = '100';
        document.getElementById('serviceLevel').innerHTML = '100';
    };
    
    localUpdateFromSliders(...inpsChanged){
        for(let inp of inpsChanged){
            localUpdate(inp); 
        };
        if( match(inpsChanged,['ar','acv','lt','ltcv',
                     'quan','rop','period','upto'])) {
            inv.graph.updateForParamChange();
        }
    };
    redoStagesGraph(){
        this.stage.foreground.reset();
        this.stage.background.reset();
        this.graph.chart.reset();

        this.redrawBackground();
        this.graph.setupThenRedraw();
        this.clearRedrawStage(0,true);
//        console.log('in Inventory and called redoStages');
    };
    redrawBackground() {
        theSimulation.store.drawStore();    
    };
};
function localUpdateFromUser(inp){
    inv.setOrReleaseCurrentLi(inp);
    localUpdate(inp);
    if( match([inp],['ar','acv','lt','ltcv',
                     'quan','rop','period','upto'])) {
            inv.graph.updateForParamChange();
        }
};    
function localUpdate(inp){
    let v = inp.get();
    switch (inp.key){
        case 'ar':
            theSimulation.arrivalRV.setRate(Number(v) / tioxTimeConv);
            break;
        case 'acv':
            theSimulation.arrivalRV.setCV(Number(v));
            break;
        case 'lt':
            theSimulation.leadtimeRV.setTime(Number(v) * tioxTimeConv);
            break;
        case 'ltcv':
            theSimulation.leadtimeRV.setCV(Number(v));
            break;
        case 'quan':
            theSimulation.quantityOrdered = Number(v);
            break;
        case 'rop':
            theSimulation.rop = Number(v);
            if( inv.whichRule == 'methRop'){
                inv.graph.resetRopLine(Number(v));
                inv.graph.setupThenRedraw();
            }
            break;
        case 'period':
            theSimulation.period = Number(v) * tioxTimeConv;
            inv.heap.modify('next order', 
                function(){const p = theSimulation.period;
                           return Math.floor((inv.now + p)/p) * p});
            if( inv.whichRule == 'methUpto'){
                inv.graph.resetPeriodLines(Number(v));
                inv.graph.setupThenRedraw();
            }
            break;
        case 'upto':
            theSimulation.upto = Number(v);
            break;
        case 'method':
            inv.whichRule = v;
            if( v == 'methRop'){
                displayToggle(['rop1','rop2'], ['upto1','upto2']);
                const rop = Number(inv.usrInputs.get('rop').get());
                inv.graph.resetRopLine(rop);
                inv.graph.setupThenRedraw();
            } else if( v == 'methUpto'){
                displayToggle(['upto1','upto2'], ['rop1','rop2']);
                const period = Number(inv.usrInputs.get('period').get());
                inv.graph.resetPeriodLines(period);
                inv.graph.setupThenRedraw();
            } else {
                alert('picked inv simulation with nonexistant method ', v);
			     debugger;
            }
//            console.log('changing method>'+ v+"<");
            inv.reset();
            break;
        case 'speed':
            inv.adjustSpeed(v,speeds);
            break;
        case 'action':
        case 'reset':
        case 'leg0':
        case 'leg1':
        case 'leg2':
            break;
        default:
            alert(' captureChangeInSliderS reached part for default');
            debugger;
            break; 
    }
};


const speeds = [{time:1,graph:1,anim:true},
				{time:2,graph:1,anim:true},
				{time:5,graph:2,anim:true},
				{time:10,graph:2,anim:true},
				{time:25,graph:5,anim:true},
			   {time:1000,graph:10,anim:false}];


//  One variable for each process step or queue
//  that contains the functions to do the specific
//  animation for that process step

class InvQueue  extends Queue {
    constructor() {
        super (inv,"theQueue", -1)
        this.walkingTime = anim.walkingTime;
    };
	

	push (person) {
        if( !super.push(person, anim.walkingTime) ) return false;
        const arrivalTime = inv.now + anim.walkingTime;
        
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

class InvCreator extends MachineCenter {
    constructor( ){
        super(inv, "creator",1, theSimulation.arrivalRV); 
    };
    startAnim(machine, theProcTime){};
    finishAnim(machine){};
};

class InvCombine  extends Combine {
    constructor(rv, queue, store, walkoff ){
        super(inv,'inventory',rv, queue, store, walkoff );
    };
	startAnim (person, pack, walkingTime) {
		person.addPath({ //walk to bot
			t: inv.now + walkingTime,
			x: anim.person.path.right,
			y: anim.person.path.bot
	
        });
		const leftTime = walkingTime / 2;
		if (pack) {
			pack.addPath({
				t: inv.now + leftTime,
				x: anim.person.path.right + person.graphic.gSF.package.x,
				y: pack.cur.y
			});
			pack.addPath({ // move up to arm height in other time
				t: inv.now + walkingTime,
				x: anim.person.path.right + person.graphic.gSF.package.x,
				y: anim.person.path.bot + person.graphic.gSF.package.y,
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



class InvWalkOffStage extends WalkAndDestroy {
    constructor(){
        super(inv, "walkOff", true, anim.walkOffStageTime);
    };
    pushAnim (person) {
		person.addPath({
			t: inv.now + anim.walkOffStageTime,
			x: anim.person.path.left,
			y: anim.person.path.bot
		});
	};
};

const theSimulation = {
	arrivalRV: null,
	serviceRV: null,

	// the 5 process steps in the simulation
	supply: null,
	queue: null,
	walkOffStage: null,
	store: null,
	seller: null,


	// Q,R Model quantities
	quantityOrdered: null,
	rop: null,

	// order-up-to model quantities 
	period: null,
	upto: null,

	initialize: function () {
		// random variables
		let ar = Number(document.getElementById('arinv').value);
		let acv = Number(document.getElementById('acvinv').value);
		theSimulation.arrivalRV = new GammaRV(ar / tioxTimeConv, acv);
		theSimulation.serviceRV =
			new DeterministicRV(anim.walkingTime2);
		let lt = Number(document.getElementById('ltinv').value);
		let ltcv = Number(document.getElementById('ltcvinv').value);
		theSimulation.leadtimeRV = new GammaRV(1 / (lt * tioxTimeConv), ltcv);
		
		theSimulation.quantityOrdered = Number(
			inv.usrInputs.get('quan').get());
		theSimulation.rop = Number(
			inv.usrInputs.get('rop').get());
		theSimulation.period = Number(
			inv.usrInputs.get('period').get()) * tioxTimeConv;
		theSimulation.upto = Number(
			inv.usrInputs.get('upto').get());

		//queues
		this.supply = new Supplier(anim.person.path.left,
			anim.person.path.top);

		this.queue = new InvQueue();
		inv.resetCollection.push(this.queue);

		this.walkOffStage = new InvWalkOffStage();
        inv.resetCollection.push(this.walkOffStage);

		this.store = new RopStore();
		inv.resetCollection.push(this.store);

		//machine centers 
		this.creator = new InvCreator();
		inv.resetCollection.push(this.creator);

		this.seller = new InvCombine(theSimulation.serviceRV,
			this.queue, this.store, this.walkOffStage);
		inv.resetCollection.push(this.seller);

		//link the queue to machine before and after
		this.creator.setPreviousNext(this.supply,this.queue);
        this.queue.setPreviousNext(this.creator, this.seller);
	}, //end of initialize
};


// SUPPLIER
class Supplier {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	};
	pull() {
		return new Person(inv, this.x, this.y		);
	}
}; //end class Supplier

class RopStore extends GStore {
	constructor() {
		super(inv,anim);
		this.name = 'ropRetail'

		//stats for performance of store
		this.inv = null;
		this.invInDoor = null;
		this.invPosition = null;
		this.lostSales = null;
		this.totalDemand = null;
		this.nRounds = null;
		this.roundsWithEnough = null;
		this.packages = []; //the packages in the store.
	};
	reset() {
		// start with the store filled in the first round.
		super.reset();
		if (inv.whichRule == 'methRop')
			this.inv = theSimulation.quantityOrdered;
		else
			this.inv = theSimulation.upto;

		this.invInDoor = this.inv;
		this.invPosition = this.inv;

		for (let k = 0; k < this.inv; k++)
			this.addNew();
		this.lostSales = 0;
		this.totalDemand = 0;
		this.nRounds = 0;
		this.roundsWithEnough = 0;
		this.stockout = false;
	};
	truckAtDoor(item) {
		item.truck.graphic.setReverse();
		item.load.graphic.setReverse();
		item.load.cur.x -=
			anim.truck.cabWidth;
		const n = item.load.graphic.packages.length;
		
		let topOfInventory = anim.store.bot - anim.box.space *
			Math.ceil(this.invInDoor / anim.box.perRow);
		this.invInDoor += n;
		item.load.addPath({
			t: item.load.arrivalTime,
			x: anim.store.left,
			y: topOfInventory
		});
	};
	truckArrival(item) {
		// final steps after inventory almost in store.
		let load = item.load;
		let truck = item.truck;
		const n = load.graphic.packages.length;
		for (let k = 0; k < n; k++) {
			let point = this.boxStack.relCoord(this.inv + k);
			load.graphic.packages[k].cur.x = anim.store.left + point.x;
			load.graphic.packages[k].cur.y = anim.store.bot + point.y;
			load.graphic.packages[k].graphic
				.moveTo(this.left + point.x, anim.store.bot + point.y);
		}
		load.graphic.packages.forEach(p => {
			p.inBatch = false
		});
		this.packages.push(...load.graphic.packages);
		load.graphic.packages = [];
		load.destroy();
		this.inv += n;

		inv.graph.push(inv.now, this.inv,
			this.invPosition);
		// keep track stockouts by round
		this.nRounds++;
		if (!this.stockout) this.roundsWithEnough++;
		this.stockout = false;
		document.getElementById('serviceLevel').innerHTML =
			( 100*(this.roundsWithEnough/this.nRounds) ).toFixed(0);
	};
	truckDestroy(truck) { //event when truck is finally offStageRight
		truck.destroy();
	};
	pull() { //person arrived at queue, sell one unit.
		let pack = super.pull();
		this.totalDemand++;
		if (pack == null) {
			this.stockout = true;
			this.lostSales++;
		} else {
			this.invPosition--;
			if (this.invPosition <= theSimulation.rop &&
				inv.whichRule == 'methRop') {
				this.orderQuan();
			}
			this.invInDoor--;
			this.inv--;
		};
		document.getElementById('lostSales').innerHTML = this.lostSales;
		document.getElementById('fillRate').innerHTML =
			((1 - this.lostSales / this.totalDemand) * 100).toFixed(0);
		
		inv.graph.push(inv.now, this.inv,
			this.invPosition);
		return pack;
	};

	orderQuan() {
		this.createDelivery(theSimulation.quantityOrdered);
	};
	orderUpto() {
		const p = theSimulation.period;
        inv.heap.push({
			time: Math.floor((inv.now + p) / p) * p,
			type: 'next order',
			proc: this.orderUpto.bind(this),
			item: null
		});
		let quantity = Math.max(0, theSimulation.upto - this.invPosition);
		if (quantity > 0) this.createDelivery(quantity);
	};

	createDelivery(quantity) {
//		console.log('at create a delivery:', inv.now);
		this.invPosition += quantity;
		inv.graph.push(inv.now, this.inv,
			this.invPosition);
		const truck = new Truck(inv, anim);
		const truckLT = theSimulation.leadtimeRV.observe();
		const timeMoveDown1 = Math.min(2000, truckLT / 6);
		const timeMoveDown2 = Math.min(4000, truckLT / 3);
		const frac = timeMoveDown1 / (timeMoveDown1 + timeMoveDown2);


		const delta = truck.deltaPointFlatBed();
		const load = new LoadOfBoxes(inv, anim.stage.foreContext,
			truck.cur.x + delta.dx, truck.cur.y + delta.dy, quantity, anim.box);

		const timeTravel = truckLT - timeMoveDown1 - timeMoveDown2;
		const atDoorTime = inv.now + timeTravel;
		const splitTime = inv.now + timeTravel + timeMoveDown1;
		load.arrivalTime = inv.now + truckLT;

		inv.heap.push({
			time: atDoorTime,
			type: 'truck AtDoor',
			proc: this.truckAtDoor.bind(this),
			item: {
				truck: truck,
				load: load
			}
		});
		inv.heap.push({
			time: load.arrivalTime+1,  //just ensures truck arrives after pull.
			type: 'truck arrival',
			proc: this.truckArrival.bind(this),
			item: {
				truck: truck,
				load: load
			}
		});
		inv.heap.push({
			time: load.arrivalTime + timeTravel,
			type: 'truck return',
			proc: this.truckDestroy.bind(this),
			item: truck
		});
		truck.addPath({
			t: atDoorTime - 20,
			x: anim.truck.path.left,
			y: anim.truck.path.top
		});
		truck.addPath({
			t: load.arrivalTime,
			x: anim.truck.path.left,
			y: anim.truck.path.bot
		});
		truck.addPath({
			t: load.arrivalTime + timeTravel,
			x: anim.truck.path.right,
			y: anim.truck.path.bot
		});

		let point = truck.deltaPointFlatBed();
		let topOfInventory = anim.store.bot - anim.box.space *
			Math.ceil(this.invInDoor / anim.box.perRow);

		load.addPath({
			t: atDoorTime - 20,
			x: anim.truck.path.left + point.dx,
			y: anim.truck.path.top + point.dy,
				
		});


		load.addPath({
			t: splitTime,
			x: anim.truck.path.left,
			y: Math.min(anim.truck.path.top + point.dy +
				frac * (anim.truck.path.bot - anim.truck.path.top),
				topOfInventory)
		});
	};
};



const pi2 = 2 * Math.PI;
class Truck extends Item {
	constructor(omConcept,anim) {
		
		super(omConcept,anim.truck.path.right, anim.truck.path.top);
		this.anim = anim;
		this.graphic = new FlatBed(anim);
	};
	deltaPointFlatBed() {
		return {
			dx: this.anim.truck.cabWidth,
			dy: this.anim.truck.height -
				0.75 * this.anim.box.space
		}
	}
};
class FlatBed {
	constructor(anim) {
		this.anim = anim;
		this.reverse = 0;
	};
	moveTo(x, y) {
		this.x = Math.floor(x);
		this.y = Math.floor(y);
	};
	setReverse() {
		this.reverse = this.anim.truck.cabWidth + this.anim.truck.bedWidth;
	}
	draw() {
		let c = this.anim.stage.foreContext;
		c.save();
		if (this.reverse) {
			c.translate(2 * (this.x) + this.reverse, 0);
			c.scale(-1, 1);
		};
		c.fillStyle = 'lightgrey';
		c.strokeStyle = 'black';
		c.lineWidth = 2;

		//body
		c.beginPath();
		c.moveTo(this.x, this.y + this.anim.truck.height);
		c.lineTo(this.x + this.anim.truck.width, this.y + this.anim.truck.height);
		c.lineTo(this.x + this.anim.truck.width, this.y + this.anim.truck.height - 0.75 * this.anim.box.space);
		c.lineTo(this.x + this.anim.truck.cabWidth, this.y + this.anim.truck.height - 0.75 * this.anim.box.space);
		c.lineTo(this.x + this.anim.truck.cabWidth, this.y);
		c.lineTo(this.x + this.anim.truck.cabWidth / 2, this.y);
		c.lineTo(this.x, this.y + this.anim.truck.height / 2);
		c.lineTo(this.x, this.y + this.anim.truck.height);
		c.closePath();
		c.stroke();
		c.fill();

		//wheels  
		c.beginPath();
		c.arc(this.x + this.anim.truck.cabWidth / 2,
			this.y + this.anim.truck.height,
			this.anim.box.space / 2, 0, pi2);
		c.stroke();
		c.fill();

		c.beginPath();
		c.arc(this.x + this.anim.truck.width - this.anim.truck.cabWidth / 2,
			this.y + this.anim.truck.height,
			this.anim.box.space / 2, 0, pi2);
		c.stroke();
		c.fill();

		c.restore();
	};
};

class LoadOfBoxes extends Item {
	constructor(omConcept, context, left, bot, quantity, box) {
		super(omConcept, left, bot);
		this.graphic = new DisplayBoxes(context, left, bot,
			quantity, box);
	};
};

class DisplayBoxes {
	constructor(ctxDB, left, bot, quantity, box) {
		this.ctxDB = ctxDB;
		this.left = left;
		this.bot = bot;
		this.box = box;
		this.packages = [];
		this.reverse = 0;

		for (let k = 0; k < quantity; k++) {
			let colorIndex = Math.floor(Math.random() * tioxColors.length);
			let pack = new Package(inv, this.ctxDB,
				tioxColors[colorIndex], box.size, 0, 0);
			this.packages.push(pack);
			pack.inBatch = true;
		}
		this.boxStack = new BoxStack(box, false);
	};
	moveTo(left, bot) {
		this.left = Math.floor(left);
		this.bot = Math.floor(bot);
	};
	setReverse() {
		this.reverse = this.box.space * this.box.perRow;
	}
	draw() {
		this.ctxDB.save();
		if (this.reverse) {
			this.ctxDB.translate(2 * (this.left) + this.reverse, 0);
			this.ctxDB.scale(-1, 1);
		};
		for (let i = 0; i < this.packages.length; i++) {
			this.ctxDB.fillStyle = this.packages[i].graphic.color;
			let point = this.boxStack.relCoord(i);
			this.ctxDB.fillRect(
				this.left + point.x,
				this.bot + point.y,
				this.box.size, this.box.size);
		};
		this.ctxDB.restore();
	};
};

export class Person extends Item {
	constructor(omConcept, x, y) {
		super(omConcept, x, y);
		this.graphic = new NStickFigure(gSF, x, y);
	};	
}; // end class Person



function invHTML(){	
    let usrInputs = new Map();
    
    addDiv('inv','inv','whole')
	addDiv('inv', 'leftHandSideBox'+'inv',
			   'stageWrapper', 'statsWrapper',
			   'chartWrapper');
	 
	//stats line
	const d = document.getElementById('statsWrapperinv');
	
	const d1 = document.createElement('div');
	d1.className ="statDisplay";
	d1.title = 'number of customers leaving without a package since the start of the simulation';
    const s1 = document.createElement('span');
	s1.id = 'lostSales'
    
	d1.append('Lost Sales: ',s1);
	
	const d2 = document.createElement('div');
	d2.className ="statDisplay";
	d2.title = 'percentage of customers leaving with a package';const s2 = document.createElement('span');
	s2.id = 'fillRate'
	d2.append('Fill Rate: ',s2,'%');
	
	const d3 = document.createElement('div');
	d3.className ="statDisplay";
	d3.title = 'percentage of truck arrivals which arrived before lost sales occurred on that cycle';
    const s3 = document.createElement('span');
	s3.id = 'serviceLevel'
	
    d3.append('Service Level: ',s3,'%');
	d.append(d1,d2,d3);
	
	//method radio boxes at top of rhs
	const e1 = document.createElement('label');
	e1.append('Rule for Orders:');
	const e2 = genRadio('methodinv','Reorder Point',
                        'methRopinv','methRop',true);
	const e3 = genRadio('methodinv','Order up to', 'methUptoinv','methUpto',false);
	
	const ewhich = document.createElement('div');
	ewhich.className = 'ropupto rowAroundCenter';
	ewhich.id = 'ropuptoinv';
	ewhich.append(e1,e2,e3);
	
	let elem = document.getElementById('slidersWrapperinv');
	elem.parentNode.prepend(ewhich);
	
    //radio buttons have to be in document before running this!!
    usrInputs.set('method', new RadioButton('method', 'methodinv', 
                localUpdateFromUser, ['methRop','methUpto'], 'methRop') );
    
	//now put in the sliders with the play/reset box	
	const arInput = genRange('arinv', '5', 1, 9, 1);
    elem.append(htmlNumSlider(arInput, 'Arrival Rate = ',
                              '5', [1,3,5,7,9]) );
    usrInputs.set('ar', new NumSlider('ar',arInput,
                localUpdateFromUser, 1, 9, 5, 0,2,1) );
    
    const acvInput = genRange('acvinv', '0.0', 0, 2, .5);
    elem.append(htmlNumSlider(acvInput, 'Arrival CV = ',
                              '0.0', ['0.0','1.0','2.0']) );
    usrInputs.set('acv', new NumSlider('acv', acvInput,
                localUpdateFromUser, 0, 2, 0, 1,2,10) );
    
    const ltInput = genRange('ltinv', '5', 2, 10, 1);
    elem.append(htmlNumSlider(ltInput, 'Lead Time = ',
                              '5', [2,4,6,8,10]) );
    usrInputs.set('lt', new NumSlider('lt',ltInput,
                localUpdateFromUser, 2, 10, 5, 0,2,1) );
    
    const ltcvInput = genRange('ltcvinv', '0.0', 0, 2, .5);
    elem.append(htmlNumSlider(ltcvInput, 'Lead Time CV = ',
                              '0.0', ['0.0','1.0','2.0']) );
    usrInputs.set('ltcv', new NumSlider('ltcv', ltcvInput,
                localUpdateFromUser, 0, 2, 0, 1,2,10) );
    
    const quanInput = genRange('quaninv', 24, 10,50,1);
    const rop1 = htmlNumSlider(quanInput, 'Order Quantity = ',
                             24, [10,20,30,40,50]);
    rop1.id = 'rop1';
    usrInputs.set('quan', new NumSlider('quan', quanInput,
               localUpdateFromUser, 10, 50, 24, 0,2,1));
    
    const ropInput = genRange('ropinv', 10, 5, 85, 1);
    const rop2 = htmlNumSlider(ropInput, 'Reorder Point = ',
                             10, [5,25,45,65,85]);
    rop2.id ='rop2';
    usrInputs.set('rop', new NumSlider('rop', ropInput,
                localUpdateFromUser, 5, 85, 10, 0,2,1));
    
    const periodInput = genRange('periodinv', 3, 2, 8, 1);
    const upto1 = htmlNumSlider(periodInput, 'Period = ',
                             3, [2,4,6,8,10,12]);
    upto1.id = 'upto1';
    usrInputs.set('period', new NumSlider('period', periodInput,
                localUpdateFromUser, 2, 12, 3, 0,1,1));
    
    
    const uptoInput = genRange('uptoinv', 36, 10, 90, 1);
    const upto2 = htmlNumSlider(uptoInput, 'Up to Quantity = ',
                             36, [10,30,50,70,90]);
    upto2.id = 'upto2';
    usrInputs.set('upto', new NumSlider('upto', uptoInput,
                localUpdateFromUser, 10, 90, 36, 0,2,1));
    elem.append(rop1,rop2,hideNode(upto1),hideNode(upto2));
    
    elem.append( genPlayResetBox('inv') );
    usrInputs.set('reset', new CheckBox('reset', 'resetinv',
                localUpdateFromUser, false) );
    usrInputs.set('action', new RadioButton('action', 'actioninv', 
                localUpdateFromUser, ['none','play','pause'], 'none') );
    
    
	const speedInput = genRange('speedinv',0,0,5,1);
    elem.append(htmlArbSlider(speedInput, 'Speed = ', '1x',
                            ["slow",' ',' ',' ',"fast",'∞']) );
    usrInputs.set('speed', new ArbSlider('speed', speedInput, 
                localUpdateFromUser, ["1x",'2x','5x','10x',"25x",'∞'],
				                [1,2,5,10,25,1000], 0) );  
	
	const f = document.getElementById('scenariosMidinv');
	f.style = "min-height: 17vw";
    
    return usrInputs;
};

export function invStart() {
    let usrInputs = invHTML();
    inv = new Inventory(usrInputs);
    invDefine();
    inv.graph = new InvGraph();
    inv.setupScenarios();
    theSimulation.initialize();
    inv.reset();
	return inv;
};
