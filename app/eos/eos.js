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
	GammaRV, Heap, cbColors, Average, IRT, StageOnCanvas,
    ItemSplitterRandom
}
from "../mod/util.js";
import {
	OmConcept, displayToggle
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
    LegendItem, match, ButtonOnOff
}
from '../mod/genHTML.js';

class EosGraph  {
	//controls both of the flow time and throughput graphs
    constructor(){	
		//flow time graph
        this.flowGraph = new TioxGraph(eos,'fchartCanvaseos',
                40, {width:10, step:2}, d=>d.t, 1000,370,false);
		this.flowGraph.setTitle('Average Flow time','fchartTitle');
		const sepFlow = new GraphLine(this.flowGraph,
                d => d.s, cbColors.yellow, false, true,  5, 10);
		const jointFlow = new GraphLine(this.flowGraph,
                d => d.j, cbColors.blue, false, true,  5, 10);
		        
        //throughput graph
        this.thruGraph = new TioxGraph(eos,'tchartCanvaseos',
                40, {width:10, step:2}, d=>d.t, 1000,370,false);
		this.thruGraph.setTitle('Average Throughput','tchartTitle');
		const sepThru = new GraphLine(this.thruGraph,
                d => d.s, cbColors.yellow, false, true,  5, 10);
		const jointThru = new GraphLine(this.thruGraph,
                d => d.j, cbColors.blue, false, true,  5, 10);
        
        //setup legends (connected directly to flow graph)
        const leg0 = sepFlow.createLegend('Separate');
        const leg1 = jointFlow.createLegend('Joint');
        const d3 = document.getElementById('pairChartLegendeos');
        d3.append(leg0,'      ', leg1); //option-spaces!!
        
        eos.usrInputs.set('leg0', 
            new LegendItem('leg0', sepFlow, localUpdateFromUser, true)); 
        eos.usrInputs.set('leg1', 
            new LegendItem('leg1', jointFlow, localUpdateFromUser, true));
        
        //setup callbacks so throuhput graphs 
        //  respond to clicks on legends as well.
        sepFlow.button.addEventListener('click',() => {
            sepThru.visible = !sepThru.visible;
            sepThru.graph.setupThenRedraw()
        });
        jointFlow.button.addEventListener('click',() => {
            jointThru.visible = !jointThru.visible;
            jointThru.graph.setupThenRedraw()
        }); 
        
        
	};
	
	pushSep (t,f){
		t /= tioxTimeConv;
        f/= tioxTimeConv;
		const avgFlow = this.avgSepFlow.addItem(f);
        this.avgSepThru.out(t);
        const avgThru = this.avgSepThru.avgR();
//        console.log('Avg throughput Sep', avgThru);
        this.flowGraph.drawOnePoint( {t: t, s: avgFlow} );
        this.thruGraph.drawOnePoint( {t: t, s: avgThru} );
	};
    pushJoint (t,f){
        t /= tioxTimeConv;
        f/= tioxTimeConv;
		const avgFlow = this.avgJointFlow.addItem(f);
        this.avgJointThru.out(t);
        const avgThru = this.avgJointThru.avgR();
//        console.log('Avg throughput Joint', avgThru);
        this.flowGraph.drawOnePoint( {t: t, j: avgFlow} );
        this.thruGraph.drawOnePoint( {t: t, j: avgThru} );
    };
	reset(){
		this.avgSepFlow = new Average();
		this.avgJointFlow = new Average();
        this.avgSepThru = new IRT(eos.now/tioxTimeConv,0);
        this.avgJointThru = new IRT(eos.now/tioxTimeConv,0);
		this.flowGraph.reset();
		this.thruGraph.reset();
        this.xInfo = this.flowGraph.xInfo;
	}
    restartGraph(){
        this.flowGraph.restartGraph();
        this.thruGraph.restartGraph();
        
    };
	
    updateForParamChange(){
        this.avgSepFlow = new Average();
		this.avgJointFlow = new Average();
        this.avgSepThru = new IRT(eos.now/tioxTimeConv,0);
        this.avgJointThru = new IRT(eos.now/tioxTimeConv,0);
        this.flowGraph.restartGraph(eos.now/tioxTimeConv);
		this.thruGraph.restartGraph(eos.now/tioxTimeConv);
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
let eos ;
var sGSF, jGSF;
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
	width: 480,
	height: 480
};
anim.sStage = {};
anim.jStage = {};
anim.person = {
	width: 30,
	height: 45,
	path: {
		left: -100,
		right: anim.stage.width * 1.1,
		headQueue: anim.stage.width * 0.7,
		scanner: anim.stage.width * 0.8,
		pastScanner: anim.stage.width * .90,
		y: anim.stage.height/2,
	}
};
anim.walkOffStageTime = Math.abs(
    anim.person.path.scanner - anim.person.path.right) / anim.stage.normalSpeed;
anim.scannerDelta = {
  	dx: 0,
	dy: anim.person.height * 1.8
};

function eosDefine(){
	document.getElementById('eos').omConcept = eos;
	
	eos.tioxTimeConv = tioxTimeConv;

    anim.stage.sForeground = new StageOnCanvas('sForegroundeos',
                                anim.stage.width, anim.stage.height);
    anim.stage.sBackground = new StageOnCanvas('sBackgroundeos',
                                anim.stage.width, anim.stage.height);
    anim.stage.sForeContext = anim.stage.sForeground.context;
	anim.stage.sBackContext = anim.stage.sBackground.context;
    anim.stage.jForeground = new StageOnCanvas('jForegroundeos',
                                anim.stage.width, anim.stage.height);
    anim.stage.jBackground = new StageOnCanvas('jBackgroundeos',
                                anim.stage.width, anim.stage.height);
    anim.stage.jForeContext = anim.stage.jForeground.context;
	anim.stage.jBackContext = anim.stage.jBackground.context;
	eos.stage = anim.stage;
    
	sGSF = new GStickFigure(anim.stage.sForeContext,
			anim.person.height);
    jGSF = new GStickFigure(anim.stage.jForeContext,
			anim.person.height);
};

//function pauseOnIdleControl(){
//    if( eos.enablePauseOnIdle ){
//        eos.enablePauseOnIdle = false;
//        displayToggle('pauseOnIdleTurnOneos','pauseOnIdleTurnOffeos');
//    } else {
//        eos.enablePauseOnIdle = true;
//        displayToggle('pauseOnIdleTurnOffeos','pauseOnIdleTurnOneos');
//        
//    }
//};
class EconScale extends OmConcept{
    constructor(usrInputs){
        super('eos');
        this.usrInputs = usrInputs;
//        document.getElementById('pauseOnIdleButtoneos')
//            .addEventListener('click', pauseOnIdleControl);
//        this.enablePauseOnIdle = false;
    };
    
    localReset () {
        // schedule the initial Person to arrive and start the simulation/animation.
        this.redrawBackground();
        theSimulation.creator.create();
//        theSimulation.supply.previous = null;
//        theSimulation.creator.knockFromPrevious();
//
//        //fudge to get animation started quickly
//        let t = eos.heap.top().time - 1;
//        eos.now = eos.frameNow = t;
    };
    localUpdateFromSliders(...inpsChanged){
        for(let inp of inpsChanged){
            localUpdate(inp); 
        };
        if( match(inpsChanged,['ar','acv','util','scv'])) {
            eos.graph.updateForParamChange();
        }
        if( match(inpsChanged,['num'])){
            this.partialReset();
            this.localReset();
            this.redrawBackground();
            eos.graph.updateForParamChange();
        }
    };
    clearStageForeground(){
        this.stage.sForeground.clear();
        this.stage.jForeground.clear();
    };
    clearStageBackground(){
        this.stage.sBackground.clear();
        this.stage.jBackground.clear();
    };
    redoStagesGraph(){
        this.stage.sForeground.reset();
        this.stage.sBackground.reset();
        this.stage.jForeground.reset();
        this.stage.jBackground.reset();
        this.graph.flowGraph.chart.reset();
        this.graph.thruGraph.chart.reset();
        
        this.redrawBackground();
        this.graph.setupThenRedraw();
        this.clearRedrawStage(0,true);//// need to clear both stages
    };
sPathsY(nMach) {
    let pathsY = [];
    
    const boxWidth = anim.person.width * 1.7;
    const boxHeight = anim.person.height * 2;
    const boxSep = boxHeight * 0.3;
    const midpt = anim.stage.height/2  /*boxHeight * 0.1;*/
    const total = nMach * boxHeight + (nMach-1) * boxSep;
    var top = midpt - total/2;
    for( let k = 0; k < nMach; k++ ){
        pathsY[k] = top + boxHeight/2;
        top += boxHeight +  boxSep;
    };
    return pathsY;
}
    redrawBackground() {
        this.clearStageBackground();
        const nMach = eos.usrInputs.get('num').get();
        theSimulation.sepArrivalSplitter.setNumber(nMach);
        theSimulation.jTSAagent.setNumMachines(nMach);
//        var smachs = [];
//        for(let k = 0; k < nMach; k++ ){
//            smachs[k] = theSimulation.sTSAagents[k].machs[0];   
//        }
//        this.drawMachineCenter(nMach, smachs, 
//                anim.stage.sBackContext, cbColors.yellow, 5,
//                anim.person, anim.stage.height, anim.person.path.scanner);
//        this.drawMachineCenter(nMach, theSimulation.jTSAagent.machs, 
//                anim.stage.jBackContext, cbColors.blue, 5, 
//                anim.person, anim.stage.height, anim.person.path.scanner);
//        
        //
        //set queue paths
        theSimulation.jTSAagent.setup2DrawMC();
        theSimulation.jTSAagent.draw()
        let pathsY = this.sPathsY(nMach);
//        theSimulation.jQueue.pathY = anim.stage.height/2;
        for( let k = 0; k < nMach; k++ ){
            theSimulation.sQueues[k].pathY = pathsY[k];
            theSimulation.sTSAagents[k].setup1DrawMC(eos.stage.sBackContext, cbColors.yellow,
                    15, true, anim.person.path.scanner, pathsY[k], 1, anim.person);
            theSimulation.sTSAagents[k].setup2DrawMC();
            theSimulation.sTSAagents[k].draw();
        }
    };
};
function localUpdateFromUser(inp){
    eos.setOrReleaseCurrentLi(inp);
    localUpdate(inp);
    if( match([inp],['ar','acv','util','scv'])) {
            eos.graph.updateForParamChange();
        }
    if( inp.key == 'num'){
        eos.partialReset();
        eos.localReset();
        eos.redrawBackground();
        eos.graph.updateForParamChange();//restartGraph(eos.now/tioxTimeConv);
    }
};
        
        
 function getServRate(){
    const a = Number(eos.usrInputs.get('ar').get());
    const u = Number(eos.usrInputs.get('util').getValue());
    const n = Number(eos.usrInputs.get('num').get());
     return a/u/n/tioxTimeConv;
 };
function updateServiceRate(a,u,n){
    if(!a) a = Number(eos.usrInputs.get('ar').get());
    if(!u) u = Number(eos.usrInputs.get('util').getValue());
    if(!n) n = Number(eos.usrInputs.get('num').get());
     const s = a/(u * n);
    theSimulation.serviceRV.setRate(s / tioxTimeConv);
 };
function updateArrivalRate(u,s,n){
    
    if(!u) u = Number(eos.usrInputs.get('util').getValue());
    if(!s) s = Number(eos.usrInputs.get('sr').get());
    if(!n) n = Number(eos.usrInputs.get('num').get());
     const a = u * s * n;
    theSimulation.interarrivalRV.setRate(a / tioxTimeConv);
    console.log('a=',a,' s=',s,' n=',n,' u=',u,' computed util=',a/s/n);
 };

function localUpdate(inp){
    let v = inp.get();
    switch (inp.key){
        case 'util':
            updateArrivalRate(inp.getValue(), null, null);
            eos.heap.modify('finish/creator',
                () => eos.now + theSimulation.interarrivalRV.observe());
            break;
        case 'acv':
            theSimulation.interarrivalRV.setCV(v);
            eos.heap.modify('finish/creator',
                () => eos.now + theSimulation.interarrivalRV.observe());
            break;
        case 'sr':
            updateArrivalRate(null, v, null);
            theSimulation.serviceRV.setRate(v / tioxTimeConv);
            eos.heap.modify('finish/TSAagent',
                () => eos.now +
                theSimulation.serviceRV.observe());
           break;
        case 'scv':
            theSimulation.serviceRV.setCV(v);
            eos.heap.modify('finish/TSAagent',
                () => eos.now +
                theSimulation.serviceRV.observe());
            break;
        case 'num':
            v = Number(v);
            updateArrivalRate( null, null, v); theSimulation.jTSAagent.setNumMachines(v);
            for( let k = 0; k < 4; k++){
                theSimulation.sTSAagents[k].active = k < v;
            }
            break;
        case 'idle':
            break;
        case 'speed':
            eos.adjustSpeed(v,speeds);
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

class EosQueue extends Queue {
	constructor (name, /*graphType*/){
        super(eos, name, -1);
//        this.graphType = graphType;
        this.delta = {dx: anim.person.width,
			          dy: 0},
	    this.dontOverlap = true,
	    this.walkingTime = (anim.person.path.headQueue 
                            - anim.person.path.left) / anim.stage.normalSpeed;
    };

	push (person) {
        if( !super.push(person, this.walkingTime) ) return false;
        person.checkAhead = true;
        person.arrivalTime = eos.now + this.walkingTime;
        person.width = this.delta.dx;
        const sr = Number(eos.usrInputs.get('sr').get());
        const nLeave = Math.floor(sr * this.nextMachine.numMachines *  this.walkingTime);
        const dist = Math.max(0,(this.q.length - 1 - nLeave)) * this.delta.dx;
        person.cur.x = anim.person.path.left - dist;
        person.cur.y = this.pathY;
        person.addPath({
                t: eos.now + this.walkingTime,
                x: anim.person.path.headQueue - dist,
                y: this.pathY
            });
        
        person.cur.x = anim.person.path.left - dist;
		if (person.isThereOverlap()) {
			person.cur.y = person.ahead.cur.y - 10;
		}
        return true;
	};

	arriveAnim (person) {
//        document.getElementById('nInQueue').innerHTML = 
//			this.numSeatsUsed.toString().padEnd(5,' ');
        
        
        const eosueActual = (anim.person.path.headQueue - person.cur.x)/this.delta.dx+1;
        const desiredX = anim.person.path.headQueue -
                    this.delta.dx * (this.numSeatsUsed-1);
        person.pathList = [];
        if( person.cur.x >= desiredX ){
            person.cur.x = desiredX;
        } else {
            person.addPath({t: eos.now, x: desiredX, y: this.pathY });
        }
	};

	pullAnim (person) {
        let walkForOne = this.delta.dx / anim.stage.normalSpeed;
//        this.graphType(eos.now, eos.now - person.arrivalTime);
//        document.getElementById('nInQueue').innerHTML = 
//			this.numSeatsUsed.toString().padEnd(5,' ');
        
        for( let k = 0; k < this.numSeatsUsed; k++ ){
            let p = this.q[k];   
            let pos = p.cur.x
                p.updatePathDelta(
                eos.now + Math.min(walkForOne,person.procTime),
					this.delta.dx, this.delta.dy)
        };
        
        for (let k = this.numSeatsUsed; 
             k < this.q.length; k++) {
			let p = this.q[k];
            const sr = Number(eos.usrInputs.get('sr').get());
            const nLeave = Math.floor(sr * this.nextMachine.numMachines *(p.arrivalTime - eos.now));
            const dist = Math.max(0,(k - nLeave)) * this.delta.dx;
            p.updatePath({t: p.pathList[0].t,
					      x: Math.max(p.pathList[0].x,
                              anim.person.path.headQueue - dist),
                          y: this.pathY 
                         });
        }
	};
    
    checkIdleMachines(){
        if(!eos.usrInputs.get('idle').getValue()) return;
        const n = eos.usrInputs.get('num').get();
        for( let k = 0; k < n; k++ ){
            if( theSimulation.sTSAagents[k].machs[0].status == 'idle' ){
                this.omConcept.pause();
                return;
            }
        }
        console.log('didnt find a idle machines');
    }
};

class EosWalkOffStage extends WalkAndDestroy {
    constructor(){
	   super(eos, "walkOff", true, anim.walkOffStageTime);
    };
    pushAnim (person) {
        person.addPath({
			t: eos.now + 50 / anim.stage.normalSpeed,
			x: anim.person.path.pastScanner,
			y: anim.person.path.y
		});
		person.addPath({
			t: eos.now + anim.walkOffStageTime - 50 / anim.stage.normalSpeed,
			x: anim.person.path.right,
			y: anim.person.path.y
		});

		if (person.isThereOverlap()) {
			person.cur.y = person.ahead.cur.y - 10;
		}
	}
    arriveAnim (person){
    }
};

class EosTSA extends MachineCenter {
	constructor( name, k, graphType){
        super(eos, "TSAagent "+name, k, theSimulation.serviceRV); 
        this.graphType = graphType;
        this.dontOverlap = true;
        this.lastFinPerson = null;
    };

	reset () {
		this.lastFinPerson = null;
        super.reset();
	};
	
	startAnim (machine, theProcTime) {
        //delink it.
        const s = machine.person.ahead;
        if( s ) s.behind = null;
        
        
        machine.person.ahead = machine.lastFinPerson;
        machine.person.setDestWithProcTime(theProcTime,
			machine.locx, machine.locy);
    };

	finishAnim (machine) {
//        const s = machine.person.behind;
//        if( s ) s.ahead = null;
        this.graphType(eos.now, eos.now - machine.person.arrivalTime);
        machine.person.checkAhead = false;
		machine.lastFinPerson = machine.person;
	}
    
    checkForQueue(){
        if(!eos.usrInputs.get('idle').getValue()) return;
        const n = eos.usrInputs.get('num').get();
        for( let k = 0; k < n; k++ ){
            if( theSimulation.sQueues[k].numSeatsUsed > 0 ){
                this.omConcept.pause();
                return;
            }
        }
        console.log('didnt find a queue>0');
    }
};
//var arrIndex = -1;
//var arrValues = [2000,2000,2000,2000];
//class ArrRV {
//    constructor(){};
//    observe(){
//        let n = arrValues.length;
//        arrIndex = (arrIndex + 1) % n;
//        return arrValues[arrIndex];
//    };
//    setRate(){};
//};
//var serIndex = -1;
//var serValues = [3000,2000,1000,800,600,400,300,200,100,90,80];
//class SerRV{
//    constructor(){};
//    observe(){
//        let n = serValues.length;
//        serIndex = (serIndex + 1) % n;
//        return serValues[serIndex];
//    };
//    setRate(){};
//};

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
        const nServers = 4;   //maximum possible.
		// random variables
		const util = eos.usrInputs.get('util').get();
        const sr = eos.usrInputs.get('sr').get();
		const num = eos.usrInputs.get('num').get();
        const acv = eos.usrInputs.get('acv').get();
		const scv = eos.usrInputs.get('scv').get();
        const ar = util * sr * num;
        theSimulation.interarrivalRV = new GammaRV(ar / tioxTimeConv, acv);
		theSimulation.serviceRV = new GammaRV(sr / tioxTimeConv, scv); 

		//queues
		this.sSupply = new Supplier(sGSF,anim.person.path.left, anim.person.path.y);
        this.jSupply = new Supplier(jGSF,anim.person.path.left, anim.person.path.y);

		this.jQueue = new EosQueue("jointQ");
        this.jQueue.pathY = anim.person.path.y;
		eos.resetCollection.push(this.jQueue);
        
        this.sQueues = [];
        for( let k = 0; k < nServers; k++ ){
            this.sQueues[k] = new EosQueue("SepQ"+k);
            
            eos.resetCollection.push(this.sQueues[k]);
            }

		this.sWalkOffStage = new EosWalkOffStage();
        this.jWalkOffStage = new EosWalkOffStage();
        eos.resetCollection.push(this.sWalkOffStage);
		eos.resetCollection.push(this.jWalkOffStage);

		
		this.sepArrivalSplitter = new ItemSplitterRandom(this.sQueues);
        this.creator = new EosCreator(
            this.interarrivalRV,
            this.sSupply,this.jSupply,
            this.sepArrivalSplitter,this.jQueue);

		// machine centers 
        this.jTSAagent = new EosTSA("joint", nServers,
                            eos.graph.pushJoint.bind(eos.graph)); 
        this.jTSAagent.pauseOnIdle = false;
        this.jTSAagent.setup1DrawMC(eos.stage.jBackContext, cbColors.blue,
            15, true, anim.person.path.scanner, anim.person.path.y, 4, anim.person);
		eos.resetCollection.push(this.jTSAagent);
        eos.resourceCollection.push(this.jTSAagent);
        this.sTSAagents = [];
        for( let k = 0; k < 4; k++ ){
                this.sTSAagents[k] = new EosTSA("sep"+k,1,
                                   eos.graph.pushSep.bind(eos.graph));
                this.sTSAagents[k].pauseOnIdle = true;
                
                eos.resetCollection.push(this.sTSAagents[k]);
                eos.resourceCollection.push(this.sTSAagents[k]);
            };
        const n = eos.usrInputs.get('num').get();
         for( let k = 0; k < 4; k++){
                theSimulation.sTSAagents[k].active = k < n;
            }
        
        

		//link the queue to machine before and after
        this.jQueue.setPreviousNext(this.arrivalSplitter, this.jTSAagent);
        for( let k = 0; k < nServers; k++ ){
                this.sQueues[k].setPreviousNext(this.sepArrivalSplitter, this.sTSAagents[k]);
            }
        this.jTSAagent.setPreviousNext(this.jQueue, this.jWalkOffStage);
        for( let k = 0; k < nServers; k++ ){
                this.sTSAagents[k].setPreviousNext(this.sQueues[k], this.sWalkOffStage);
            }
        
       
	},
};

// SUPPLIER
class Supplier {///// two suppliers for two stages of gSF.????
	constructor(gSF, x, y) {
        this.gSF = gSF;
		this.x = x;
		this.y = y;
        this.current = null;
	};
	front() {
        if( this.current ) return this.current;
        return this.current = new Person(eos, this.gSF, this.x, this.y);
	};
    pull(){
        const last = this.front();
        this.current = null;
        return last;
	};
}; //end class Supplier

class EosCreator {
    constructor(rv, sSupplier, jSupplier, sQueue, jQueue){
        this.sSupplier = sSupplier;
        this.jSupplier = jSupplier;
        this.sQueue = sQueue;
        this.jQueue = jQueue;
        this.rv = rv;
        
    };
    create (){
        const sPerson = this.sSupplier.pull();
        const jPerson = this.jSupplier.pull();
        sPerson.graphic.color = jPerson.graphic.color;
        sPerson.graphic.bdaryColor = jPerson.graphic.bdaryColor;
        this.sQueue.push(sPerson);
        this.jQueue.push(jPerson);
        const t = this.rv.observe(); ;
        eos.heap.push({
			time: eos.now + t,
			type: 'create',
			proc: this.create.bind(this),
			item: null
		})
    }
}


export class Person extends Item {
	constructor(omConcept, gSF, x, y = 100) {
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


function eosHTML(){	
	let usrInputs = new Map();
    
    addDiv('eos','eos','whole')
	addDiv('eos', 'leftHandSideBox'+'eos',
			   'pairStageWrapper', 
			   'pairChartWrapper');

	//now put in the sliders with the play/reset box	
	
	let elem = document.getElementById('slidersWrappereos');
    
    const utilInput = genRange('utileos', 2, 0, 4, 1);
    elem.append(htmlArbSlider(utilInput, 'System Utilization = ', '0.9',
                              [.5,.7,.9,.95,.99]) );
    usrInputs.set('util', new ArbSlider('util',utilInput,
                localUpdateFromUser, [.5,.7,.9,.95,.99],[.5,.7,.9,.95,.99], 2) );
    
    
    
    const acvInput = genRange('acveos', 0, 0, 2, .5);
    elem.append(htmlNumSlider(acvInput, 'Arrival CV = ', '0.0',['0.0','1.0','2.0']) );
    usrInputs.set('acv', new NumSlider('acv', acvInput,
                localUpdateFromUser, 0, 2, 0, 1, 2, 10) );
    
    const srInput = genRange('sreos', '1.0', 0, 2, .1);
    elem.append(htmlNumSlider(srInput, 'Service Rate = ', '1.0',
                              [0, 0.5,1.0,1.5,2.0]) );
    usrInputs.set('sr', new NumSlider('sr',srInput,
                localUpdateFromUser, 0, 2, 1, 1, 3, 10) );
    
    
    const scvInput = genRange('scveos', 0, 0, 2, .5);
    elem.append(htmlNumSlider(scvInput, 'Service CV = ', '0.0',['0.0','1.0','2.0']) );
    usrInputs.set('scv', new NumSlider('scv', scvInput,
                localUpdateFromUser, 0, 2, 0, 1,2,10) );
    
    const numInput = genRange('numeos', 2, 2, 4, 1);
    elem.append(htmlNumSlider(numInput, 'Number of Servers = ', '2',['2','3','4']));
    usrInputs.set('num', new NumSlider('num',numInput,
                                      localUpdateFromUser, 2, 4, 2, 0, 1, 1 ));
    
    const pauseOnIdle = document.getElementById('pauseOnIdleButton')
            .cloneNode(true);
    addKeyForIds('eos',pauseOnIdle);
    elem.append(pauseOnIdle);
    usrInputs.set('idle',new ButtonOnOff('idle',pauseOnIdle,
                            'pauseOnIdleTurnOneos','pauseOnIdleTurnOffeos',
                            localUpdateFromUser,false));

    
    // fill in HTML for pause on next occurance of an idle slider.
    
    elem.append( genPlayResetBox('eos') );
    usrInputs.set('reset', new CheckBox('reset', 'reseteos',
                localUpdateFromUser, false) );
    usrInputs.set('action', new RadioButton('action', 'actioneos', 
                localUpdateFromUser, ['none','play','pause'], 'none') );
     
    const speedInput = genRange('speedeos',0,0,5,1);
    elem.append(htmlArbSlider(speedInput, 'Speed = ', '1x',
                            ["slow",' ',' ',' ',"fast",'∞']) );
    usrInputs.set('speed', new ArbSlider('speed', speedInput, 
                localUpdateFromUser, ["1x",'2x','5x','10x',"25x",'∞'],
				                [1,2,5,10,25,1000], 0) );   
    
	const f = document.getElementById('scenariosMideos');
	f.style = "min-height: 20vw";
    
    return usrInputs;
};

export function eosStart() {
	let usrInputs= eosHTML();
    eos = new EconScale(usrInputs);
    eosDefine();
    eos.graph = new EosGraph();
    eos.setupScenarios();
    theSimulation.initialize();
    
	eos.reset();
	return eos;
};