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
	GammaRV, Heap, cbColors
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


let fac ;
const anim = {};
var gSF;

const tioxTimeConv = 10000; //rates in tiox are k/10 seconds
const precision = {
	ar: 1,
	acv: 1,
	sr: 1,
	scv: 1,
	speed: 0
}
const speeds = [{time:1,graph:1,anim:true},
				{time:2,graph:1,anim:true},
				{time:5,graph:2,anim:true},
				{time:10,graph:2,anim:true},
				{time:25,graph:5,anim:true},
			   {time:1000,graph:20,anim:false}];

anim.stage = {
	normalSpeed: .050, 
	width: 1000,
	height: 480
};
anim.card = {
	width: 40,
	height: 40,
	path: {
		left: -100,
		right: anim.stage.width * 1.1,
		headQueue: [anim.stage.width * 0.2,anim.stage.width * 0.5,anim.stage.width * 0.8],
		scanner: [anim.stage.width * 0.25, anim.stage.width * 0.55, anim.stage.width * 0.85],
		top: 100,
	}
};
anim.scannerDelta = {
  	dx: 0,
	dy: anim.card.height * 1.8
};
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
        speed: 'range',
		action: 'radio',
		reset: 'checkbox'
	};
    fac.stageTimes = [];


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
	let t = fac.heap.top().time - 1;
	fac.now = fac.frameNow = t;
	theSimulation.nInQueue = 0;
	document.getElementById('nInQueue').innerHTML = '0';
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
     stage1: str.substring(7,8),
     stage2: str.substring(8,9),
     stage3: str.substring(9,10),
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
            row.ears, row.hair, row.stage1, row.stage2, row.stage3,
            row.speed, actionValue[row.action], row.desc);
}


function computeStageTimes(stageTimes){
   const features = ['face','eyes','nose','ears','mout','hair'];
    for(let s = 0; s < 3; s++){
       stageTimes[s] = 0;
       for(let f of features){
           const c = document.getElementById(f + s).checked;
           const v = document.getElementById(f+'Time').value
           if (c) stageTimes[s] += Number(v) ;
       }
   }    
    
   console.log('here are the stageTimes:', stageTimes) 
}
function captureChangeInFacData(event){
    let inputElem = event.target.closest('input');
	if (!inputElem) return

	var id = inputElem.id ;
    if (inputElem.type == 'range') {
		var v = Number(inputElem.value);
		document.getElementById(id + 'Display')
			.innerHTML = v;
	} // if editmode then capture the changes
      /*else if (inputElem.type == 'radio'){
        if(fac.currentLi) {
            let scen = fac.currentLi.scenario;
            let n = inputElem.name;
            scen[n] = id;
            console.log(scen);
        }
    }*/ 
    computeStageTimes(fac.stageTimes);
};
function captureChangeInSliderS(event) {
	let inputElem = event.target.closest('input');
	if (!inputElem) return

	var idShort = inputElem.id.slice(0,-3) ;
	      //need to remove the concept name or
	if (inputElem.type == 'range') {
		var v = Number(inputElem.value)
			.toFixed(precision[idShort]);
		document.getElementById(idShort + 'facDisplay')
			.innerHTML = v;
	}
	switch (idShort) {
		
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

const animForQueue1 = {
	
};
const animForQueue2 = {
	
};
const animForQueue3 = {
	
};

const animForWalkOffStage = {
	
};

const animForCreator = {
	reset: function () {},
	start: function (theProcTime, person, m) {},
	finish: function () {},
};

const theSimulation = {
	
	// the 5 process steps in the simulation
	creator: null,
    supply: null,
	queue1: null,
    stage1: null,
    queue2: null,
    stage2: null,
    queue3: null,
    stage3: null,
	walkOffStage: null,
	
	initialize: function () {

		fac.resetCollection.push(fac.graph);
		
		//queues
		this.supply = new Supplier(anim.person.path.left, anim.person.path.top);


		this.queue1 = new Queue(que, "queue1", -1,
			animForQueue.walkingTime, animForQueue,
			null,null);
        fac.resetCollection.push(this.queue1);
        
        this.queue2 = new Queue(que, "queue1", -1,
			animForQueue.walkingTime, animForQueue,
			null,null);
        fac.resetCollection.push(this.queue2);
        
        this.queue3 = new Queue(que, "queue1", -1,
			animForQueue.walkingTime, animForQueue,
			null,null);
        fac.resetCollection.push(this.queue3);
		
		
		this.walkOffStage = new WalkAndDestroy(que, "walkOff",
								animForWalkOffStage, true);
		fac.resetCollection.push(this.walkOffStage);

		// machine centers 
		this.creator = new MachineCenter(que, "creator",
			1, theSimulation.interarrivalRV,
			this.supply, this.queue1,
			animForCreator);
		fac.resetCollection.push(this.creator);

		this.stage1 = new MachineCenter(que, "stage1",
			1, theSimulation.serviceRV,
			this.queue1, this.queue2,
			animForstage);
		fac.resetCollection.push(this.stage1);
        
        this.stage2 = new MachineCenter(que, "stage2",
			1, theSimulation.serviceRV,
			this.queue2, this.queue3,
			animForstage);
		fac.resetCollection.push(this.stage2);
        
        this.stage3 = new MachineCenter(que, "stage3",
			1, theSimulation.serviceRV,
			this.queue3, this.walkOffStage,
			animForstage);
		fac.resetCollection.push(this.stage3);
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


class Card extends Item {
	constructor(omConcept, x, y = 100) {
		super(omConcept, x, y);
		this.graphic = new FaceCard(
            anim.stage.foreContext, x, y, 190, 190,
                                   {face:1000, eyes:2000, nose: 3000, 
                     ears:4000, mout:5000, hair:6000});
	};

}; // end class Person
const pi2 =2*3.14159;
const pi = 3.14159;
class FaceCard {
    constructor(ctx,x,y,w,h,procTimes){
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.start = {face:null, eyes:null, nose: null, 
                     ears:null, mout:null, hair:null};
        this.stage = {face:null, eyes:null, nose: null, 
                     ears:null, mout:null, hair:null};
        this.procTimes = procTimes;
    }
    startStage (which, features ,now){
        let t = now;
        for ( let f in features){
            if( features[f]){
                this.start[f] = t;
                this.stage[f] = which;
                t += this.procTimes[f];
            };
        };
        console.log('which', which, this.start,this.stage);
    };
    
    draw(x,y,now){
       const color = ['black','green','red'];
        let ctx = this.ctx;
         ctx.save();
        ctx.translate(x,y);
        ctx.beginPath();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        
        ctx.rect(0,0,this.w,this.h);
        ctx.stroke();
        ctx.closePath();
//        ctx.beginPath();
//        ctx.strokeStyle = '#5cc65c';
//        ctx.lineWidth = 10;
//        
//        ctx.arc(this.w, this.h, 1.3*this.w, 0, pi2);
//                    
//        ctx.stroke();
//        
//        ctx.closePath();
                    
        
        
        for( let f in this.start ){
            const s = this.start[f];
            if(!s || now < s ) continue;
            const frac = Math.min(1,(now-s)/this.procTimes[f]);
            const frac1 = Math.min(1,frac*2);
            const frac2 = ( frac - 0.5 ) * 2;
            ctx.strokeStyle = color[this.stage[f]];
            switch (f) {
                case 'face':
                    ctx.beginPath();
                    ctx.lineWidth = 4;
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
}



import {
	genPlayResetBox, genSlider, genArbSlider, genButton, addDiv
}
from '../mod/genHTML.js';

function facHTML(){	
	addDiv('fac','fac','whole')
	addDiv('fac', 'leftHandSideBox'+'fac',
			   'facStageWrapper', 'statsWrapper');
    document.getElementById('leftHandSideBox'+'fac').append(
        document.getElementById('facDataWrapper'));
    
	 
	//stats line
	const d2 = document.getElementById('statsWrapperfac');
	const delem = document.createElement('div');
	const selem = document.createElement('span');
	 selem.id = 'throughput';
	 delem.append('Throughput: ',selem);
	 d2.append(delem);
	const d2elem = document.createElement('div');
	const s2elem = document.createElement('span');
	s2elem.id = 'flowtime';
	 d2elem.append('Flow time: ',selem);
	 d2.append(d2elem);
	 
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
	f.style = "min-height: 26vw";
};

export function facStart() {
	facHTML();
    facDefine();
    let c = new Card(fac, 120,130);
    c.graphic.startStage(0, {face:true, eyes:false, nose: false, 
                     ears:false, mout:true, hair:false}, 500);
    
    
    c.graphic.startStage(1, {face:false, eyes:true, nose: true, 
                     ears:true, mout:false, hair:false}, 8000);
   c.graphic.draw(100,50,9500);
    c.graphic.draw(300,50,10000);
    c.graphic.draw(500,50,10500);
    c.graphic.draw(700,50,11000);
    c.graphic.draw(100,250,11500);
    c.graphic.draw(300,250,12000);
    c.graphic.draw(500,250,12500);
    
    
    
    c.graphic.startStage(2, {face:false, eyes:false, nose: false, 
                     ears:false, mout:false, hair:true}, 20000);
    
    c.graphic.draw(700,250,90000);
     
    
    
//	theSimulation.initialize();
//	fac.reset();
//	return fac;
};