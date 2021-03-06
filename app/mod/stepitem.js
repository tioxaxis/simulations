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
	Heap
}
from './util.js';
const darkGrey = 'rgb(52,52,52)';


export class Queue {
	constructor(omConcept, name, numSeats, procTimeRV) {
		this.omConcept = omConcept;
		this.name = name;
		this.maxSeats = numSeats;
        this.procTimeRV = procTimeRV;

//		this.animFunc = animFunc;

		this.previousMachine = null;
		this.nextMachine = null;

		this.numSeatsUsed = null;
		this.q = null;
		this.lastAdded = null;
		this.reset();
	};

	setPreviousNext(previousMachine, nextMachine) {
		this.previousMachine = previousMachine;
		this.nextMachine = nextMachine;
	};
    
    setMaxSeats( n ){
        this.maxSeats = n;
    }

	reset() {
		this.q = [];
		this.lastAdded = null;
		this.numSeatsUsed = 0;
        this.lastPerCompTime = 0;
	};

	empty() {
		return this.numSeatsUsed == 0;
	};

	front() {
		return (this.numSeatsUsed > 0 ? this.q[0] : null );
	};

	queueLength() {
		return this.q.length;
	}

	push(person, walkingTime = 0) {
		if (this.q.length == this.maxSeats) return false;
        person.arrivalTime = this.omConcept.now + walkingTime;
        if( this.procTimeRV) {
            person.procTime = this.procTimeRV.observe();
		    person.compTime = Math.max(this.lastPerCompTime,
                                   person.arrivalTime) + person.procTime;
            this.lastPerCompTime = person.compTime;
        }
        this.q.push(person);
        
		// insert into end of doubly linked list
		person.ahead = this.lastAdded;
		if (this.lastAdded) this.lastAdded.behind = person;
		this.lastAdded = person;

		this.omConcept.heap.push({
			time: person.arrivalTime,
			type: 'arrive',
			proc: this.arrive.bind(this),
			item: person
		});
		this.printQueue();
		return true;
	};

	arrive(person) {
		this.numSeatsUsed++;
		this.arriveAnim(person);
		if (this.numSeatsUsed == 1) 
            this.nextMachine.knockFromPrevious();
        
        if( this.pauseOnIdle && this.numSeatsUsed == 1 )
             this.checkIdleMachines();
        
        // check for switch and call routine.
        
		this.printQueue();
	};

	pull() {
		if (this.numSeatsUsed == 0) return null;
		this.numSeatsUsed--;
		const person = this.q.shift();
		this.pullAnim(person); /// this is the right thing but 
		if (this.q.length < this.maxSeats) {
			this.previousMachine.knockFromNext();
		}
		this.printQueue();
		return person;
	};

	printQueue() {
	};
}; //end class Queue

//  WALK AND DESTROY
export class WalkAndDestroy {
	constructor(omConcept, name, dontOverlap, walkingTime) {
		this.omConcept = omConcept;
		this.name = name;
		this.walkingTime = walkingTime;
		this.dontOverlap = dontOverlap;
		this.lastAdded = null;
	};

	reset() {};

	push(person) {
		// insert into end of doubly linked list
		person.ahead = this.lastAdded;
		if (this.lastAdded) this.lastAdded.behind = person;
		this.lastAdded = person;

        
		this.pushAnim(person);

		this.omConcept.heap.push({
			time: this.omConcept.now + this.walkingTime,
			type: 'walkoff/destroy',
			proc: this.destroy.bind(this),
			item: person
		});
		return true;
	};

	destroy(person) {
		person.destroy();
	};
}; //end export class WalkAndDestroy

//   MACHINE CENTER         
export class MachineCenter {
	constructor(omConcept, name, numMachines, procTimeRV) {
		this.omConcept = omConcept;
		this.name = name;
		this.numMachines = numMachines;
		this.numberBusy = 0;
		this.procTimeRV = procTimeRV;
        this.active = true;
        this.machIndex = 0;
		this.machs = [];
        for(let k = 0; k < this.numMachines; k++){
            this.machs[k] = {};
        }
	};

    setPreviousNext(previousQueue, nextQueue) {
		this.previousQueue = previousQueue;
		this.nextQueue = nextQueue;
	};
    
	reset() {
		for (let k = 0; k < this.numMachines; k++) {
			this.machs[k] = {status: 'idle', person: null, index: k};
        };
		this.numberBusy = 0
	};

	setNumMachines( numMachines ){
        for( let k = this.numMachines; k < numMachines; k++){
            this.machs[k] = {status: 'idle', person: null, index: k};   
        };
        this.numMachines = numMachines;
    };
    
    getAverageProcTimeRV() {
		return this.procTimeRV.mean;
	};

	getNumberBusy() {
		return this.numberBusy
	};

	findIdle() {
		const n = this.machs.findIndex(x => x.status == 'idle');
        return (n >= this.numMachines ? -1 : n);
	};
	on(index){
		return this.machs[index].person;
	}

	findBlocked() {
        this.machIndex = (this.machIndex + 1) % this.numMachines;
        for( let i = 0; i < this.numMachines; i++) {
            if( this.machs[this.machIndex].status == 'blocked'){
                return this.machIndex;
            }
            this.machIndex = (this.machIndex + 1) % this.numMachines;
        }
        return -1;
	};

	knockFromPrevious() {
		let m = this.findIdle();
		if (m >= 0) this.start(this.machs[m]);
	};

	knockFromNext() {
		let m = this.findBlocked()
		if (m >= 0) this.finish(this.machs[m]);
	};

	start(machine) {	
		return this.load(null, machine, null);;
	};

	load(person, machine, time ){
		if( person == null ) {
			person = this.previousQueue.front();
			if( person == null ) return false;
		}
		if( machine == null ){
			const m = this.findIdle();
			if( m < 0 ) return false;
			machine = this.machs[m];
		};
		if( time == null ){
			if( this.procTimeRV )
				person.procTime = time = this.procTimeRV.observe();
			else time = person.procTime;
		}
        this.previousQueue.pull();
		
		person.machine = machine;
		machine.status = 'busy';
		machine.person = person;

		this.omConcept.heap.push({
			time: this.omConcept.now + time,
			type: 'finish/' + this.name,
			proc: this.finish.bind(this),
			item: machine
		});
		this.startAnim(machine, time);
		this.numberBusy++;
		return true;
	};
	finish(machine) {
        const person = machine.person;
        if (person.behind) {
            person.behind.ahead = null;
        }
        person.behind = null;
//        if( isNaN(person.cur.x) || isNaN(person.cur.w))
//            debugger;
        let success = this.nextQueue.push(machine.person);
        if (success) {
			this.finishAnim(machine);
			machine.status = 'idle';
			machine.person = null;
			this.start(machine);
		} else {
			machine.status = 'blocked';
		}
		this.numberBusy--;
        if(this.pauseOnIdle && machine.status == 'idle'){
            this.checkForQueue();
        } 
	};
    
    setup1DrawMC(ctx, color, lineWidth, center, stageX, stageY, maxMachines, item){
        this.ctx = ctx;
        this.color = color;
        this.lineWidth = lineWidth;
        this.center = center;
        this.stageX = stageX;
        this.stageY = stageY;
        this.maxMachines = maxMachines;
        this.boxWidth = item.width * 1.7;
        this.boxHeight = item.height * 2;
        this.boxSep = this.boxHeight * 0.3
        this.boxCenter = {dx: this.boxWidth / 2,
                          dy: this.boxHeight * 0.4};
    };
    
    setup2DrawMC(nMach = this.numMachines){
        this.top; 
        const totHeight = nMach * this.boxHeight + (nMach-1)*this.boxSep;
        if( this.center ){
            this.top = this.stageY - totHeight/2 + this.boxHeight * 0.1
        }else {
            this.top = this.stageY - this.boxCenter.dy;    
        };
        this.left = this.stageX - this.boxWidth/2;
        
        var lastTop = this.top;
        for( let k = 0; k < nMach; k++ ){
            this.machs[k].locx = this.stageX ;
            this.machs[k].locy = lastTop + this.boxCenter.dy;
            lastTop += this.boxHeight + this.boxSep;
        };
    };
    
    draw(nMach = this.numMachines){
        if( !this.active ) return;
        const MaxHeight = this.maxMachines * this.boxHeight 
                        + (this.maxMachines-1)*this.boxSep;
        this.ctx.clearRect(this.left - this.lineWidth,  this.top - this.lineWidth,
                        this.boxWidth + 2*this.lineWidth, MaxHeight);
        
        this.ctx.lineWidth = this.lineWidth;
        var lastTop = this.top;
        for( let k = 0; k < nMach; k++ ){
            const status = this.machs[k].status;
            this.ctx.fillStyle = (status == 'busy' ? '#54ed77' : 'lightyellow');
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.color;
            this.ctx.rect(this.left, lastTop, this.boxWidth, this.boxHeight);
            
            this.ctx.stroke();
            this.ctx.fill();
            this.ctx.closePath();
            if( status != 'busy') {
                this.ctx.beginPath();
                this.ctx.textAlign = 'center';
                this.ctx.fillStyle = 'black';
                this.ctx.font = "20px Arial";
                this.ctx.fillText(status, this.stageX,lastTop + this.boxHeight * .9);
                this.ctx.closePath();
            };
            lastTop += this.boxHeight + this.boxSep;
        };
        
    };
}; //end class MachineCenter

// INFINITE MACHINE CENTER
export class InfiniteMachineCenter extends MachineCenter {
	constructor(omConcept, name, procTimeRV) {
		super(omConcept, name, -1, procTimeRV);
		//create a first machine to avoid a nasty edge case, make the machine idle with noone.
		this.machs.push({
			status: 'idle',
			person: null
		});
	};

	findIdle() {
		let m = this.machs.findIndex(x => x.status == 'idle')
		if (m >= 0) return m;
		else { // infinite number of machines and none is free so create a new one.  
			this.machs.push({
				status: 'idle',
				person: null
			});
			return this.machs.length - 1;
		}
	};
}; //end class InfiniteMachineCenter

export class Combine {
	constructor(omConcept, name, procTimeRV,
		personQ, packageQ, afterQ) {
		this.omConcept = omConcept;
		this.name = name;
		this.procTimeRV = procTimeRV;
		this.personQ = personQ;
		this.packageQ = packageQ;
		this.afterQ = afterQ;
    };
	reset() {};
	knockFromPrevious() {
		this.start();
	};
	start() {
		const theProcTime = this.procTimeRV.observe();
		const person = this.personQ.pull();
		const pack = this.packageQ.pull();
		this.startAnim(person, pack, theProcTime);
        
		this.omConcept.heap.push({
			time: this.omConcept.now + theProcTime,
			type: 'finish' + this.omConcept.name,
			proc: this.finish.bind(this),
			item: {
				person: person,
				package: pack
			}
		});
	};
	finish(item) {
		this.finishAnim(item.person, item.package);
		if (item.package) {
			item.package.destroy();
		}
		this.afterQ.push(item.person);
	};
};

// Resource is something that does not move in simulation
// but may need to be redrawn at each cycle.
export class ResourceCollection extends Array{
   constructor(){
       super();
   };
    reset(){
        this.splice(0,this.length);
    };
    drawAll(){
        this.forEach(r => r.draw());
    };
    remove(resource){
        let k = this.indexOf(resource);
        if (k < 0) {
			alert('failed to find resource in all');
			debugger;
		}
		this.splice(k, 1);
	};
};

// Item is something that moves in simulation
// ItemCollection keeps track of all those things that move
// with properties only for the simulation, the procsteps
export class ItemCollection extends Array {
	constructor() {
		super();
		};
	reset() {
		this.splice(0, this.length);
	};
	moveDisplayAll(deltaSimuTime) { 
		var items = this;
		let level = 1;
		while( items.length > 0 ){
			let next = [];
			for( let p of items ){
				if( p.z >= level ){
					next.push(p);
				} else {
                    p.moveDisplayWithPath(deltaSimuTime);
                    
                    if( isNaN(p.cur.x) || isNaN(p.cur.y)) {
                        console.log('FOUND NaN which=',p.which,p.cur.x,p.cur.y);
                        debugger;
                    }
				}
			}
			items = next;
			level++
		};
	};

	updatePositionAll(){
		this.forEach(p => p.updatePosition())
	};
	updateForSpeed() {
		this.forEach(p => p.updateAllPaths());
	};
	remove(item) {
		let k = this.indexOf(item);
		if (k < 0) {
			alert('failed to find person or package in all');
			debugger
		}
		this.splice(k, 1);
	};
};

var itemCollCount = 0;

//Item is the simulation object that moves
// but its graphic is what gets drawn
export class Item {
	constructor(omConcept, x, y) {
		this.omConcept = omConcept;
		this.omConcept.itemCollection.push(this);
		this.which = ++itemCollCount;
		this.cur = {
			t: this.omConcept.now,
			x: x,
			y: y
		};
		this.pathList = [];
		this.arrivalTime = null;
		this.machine = null;
		this.graphic = null;
		this.inBatch = false;
	};

	setColor(bodyColor, borderColor) {
		this.graphic.setColor(bodyColor, borderColor);
	};

    moveDisplayWithPath(deltaSimuT) {
		if (this.inBatch) return;
        while (this.pathList.length > 0) {
            const path = this.pathList[0];
            if( path.speedX == undefined ) this.updatePathSpeeds(path);
            
            this.updateCur(deltaSimuT, path);
            if( this.cur.t < path.t ) break;
            deltaSimuT = Math.max(0, this.omConcept.now - path.t);
            this.pathList.shift();
        };
        if( this.inWalkQ ) this.updateCurWalkQ(deltaSimuT);
		this.draw();
		// this.graphic.draw(this.cur, this.omConcept.now);
    };
    
    //helper function for above and for updateAngle in Person.
    updateCur(deltaSimuT, path){
        
        let newX = this.cur.x + path.speedX * deltaSimuT;
        if (path.speedX >= 0)
                newX = Math.min(newX, path.x);
            else
                newX = Math.max(newX, path.x);

        let newY = this.cur.y + path.speedY * deltaSimuT;
        if (path.speedY >= 0)
                newY = Math.min(newY, path.y);
            else
                newY = Math.max(newY, path.y);
        
        if( this.checkAhead && this.ahead){ //only pos-x-direction
             const dx = Math.abs( this.ahead.cur.x - newX); 
             const dy = Math.abs( this.ahead.cur.y - newY); 
             if( dx < this.gSF.width && dy < this.gSF.height ){
                 const dt = (this.ahead.cur.x - this.gSF.width 
                             - this.cur.x) / path.speedX;
                 this.cur.x = this.ahead.cur.x - this.gSF.width;
                 this.cur.y += path.speedY * dt;
                 return dt;
             }
        }
        this.cur.x = newX;
        this.cur.y = newY;
        
        this.cur.t = Math.min(this.omConcept.now,path.t);
        return deltaSimuT;
    };
    
    updateCurWalkQ(deltaT){
//        if( isNaN(this.cur.w) ) debugger;
        const lastX = this.cur.x;
        const f = Math.min(1,(this.omConcept.now - this.inWalkQ.releaseT) 
                    / ( this.inWalkQ.arrivalT - this.inWalkQ.releaseT));
        const absX = this.inWalkQ.endX * f + this.inWalkQ.startX * (1-f);
        const a = this.ahead;
        const w = this.inWalkQ;
        if( a ){
            //if first in line?
            if( a.inWalkQ == null 
               && this.omConcept.now >= w.arrivalT ){
               const speed = Math.max(this.omConcept.stage.normalSpeed*.5,
                                      this.width/a.procTime);
                this.cur.x = Math.min(w.endX,
                                    this.cur.x + speed * deltaT); 
            } else if( w.initDeltaX ){
                const deltaX = w.initDeltaX * (1-f) + this.width;
                this.cur.x = Math.min(a.cur.x - deltaX, absX);
            } else 
                this.cur.x = absX;
        } else{
            this.cur.x = absX;
        }
        this.cur.w = this.updateW( this.cur.w, this.cur.x - lastX );
        this.cur.l = this.legAngle( this.cur.w );
        this.cur.a = this.armAngle( this.cur.l );
    }
	
	updatePosition(){
		if (this.inBatch) return;
        
        while (this.pathList.length > 0) {
			const path = this.pathList[0];
			let deltaT = path.t - this.omConcept.now;
			if (deltaT <= 0) {
				this.cur.t = path.t;
				this.cur.x = path.x;
				this.cur.y = path.y;
				this.pathList.shift();
            } else {
				const f = (this.omConcept.now - this.cur.t) / (path.t - this.cur.t);
                this.cur.x = this.cur.x + (path.x - this.cur.x) * f;
                this.cur.y = this.cur.y + (path.y - this.cur.y) * f;    
				this.cur.t = this.omConcept.now;
                if( path.speedX == undefined ) this.updatePathSpeeds(path);
				break;
			};
            
		};
        if( this.inWalkQ ) 
                this.updateCurWalkQ(1e8);
		this.draw();
	};
		
	
	setDestWithProcTime(procTime, x, y) {
		let distance = Math.max(Math.abs(this.cur.x - x),
			Math.abs(this.cur.y - y));
		let deltaTime = Math.min(distance / 
							this.omConcept.stage.normalSpeed, 0.5*procTime);
		this.addPath({
			t: this.omConcept.now + deltaTime,
			x: x,
			y: y
		});
	};
	updatePathDelta(t, dx, dy) {
		let n = this.pathList.length;
		if( n > 0 ){
            let tempPath = this.pathList[n - 1];
		  this.pathList.splice(n - 1, 1);
		  this.addPath({
			t: t,
			x: tempPath.x + dx,
			y: tempPath.y + dy
		  });
        } else {
            this.addPath({t:t,
                          x: this.cur.x + dx,
                          y: this.cur.y + dy
                         })
        }
	};

	updatePath(triple) {
		if (this.pathList.length > 1) {
			alert('pathlist has length greater than 1 on update');
			debugger;
		}
		this.pathList.shift();
		this.addPath(triple);
	};

	updateAllPaths() {
		let oldList = this.pathList;
		this.pathList = [];
		for (let triple of oldList) {
			this.addPath(triple);
		}
	};
    updatePathSpeeds(path){
        const deltaT = path.t - this.omConcept.now;
        path.speedX = (path.x - this.cur.x) / Math.max(1,deltaT);
        path.speedY = (path.y - this.cur.y) / Math.max(1,deltaT);
    }

	addPath(triple) {
		this.pathList.push(triple);
    };

	destroy() {
		this.omConcept.itemCollection.remove(this);
		let b = this.behind;
		let a = this.ahead;
		if (b) b.ahead = a;
		if (a) a.behind = b;
	};
	draw() {
        this.graphic.draw(this.cur, this.omConcept.now);
	}
}; // end of class Item


export class Person extends Item {
    constructor(omConcept, gSF, x, y = 100) {
		super(omConcept, x, y);
        this.gSF = gSF;
        
        
        this.cur.l = Math.floor( Math.random() * this.gSF.maxL/2)-this.gSF.maxL/4;
        this.cur.a = this.armAngle( this.cur.l );
        this.cur.w = this.backToW( this.cur.l );
            
		this.graphic = new NStickFigure(gSF);
	};
    updatePathSpeeds(path){
        super.updatePathSpeeds(path);
        const cur = this.cur;
        
        const deltaT = path.t - cur.t;
        path.armWalking = true;
        if( path.a ) {
            cur.a = Math.abs(cur.a);
            path.speedA = (path.a - cur.a) / Math.max(1,deltaT);
            path.armWalking = false;
        }
        path.legWalking = true;
        if( path.l ){
            cur.l = Math.abs(cur.l);
            path.speedL = (path.l - cur.l) / Math.max(1,deltaT); 
            path.legWalking = false;
        }
    }
    
    //helper functions for angles of Stick Figure
    deltaW( deltaX ){
        const dw = Math.abs(deltaX) / this.gSF.maxX * this.gSF.maxL / 2;
        return dw;
    };
    updateW( w, deltaX ){
        return ( w + this.deltaW(deltaX)) % this.gSF.maxL;
    };
    legAngle( w ){
        return Math.abs( w - this.gSF.maxL / 2) - this.gSF.maxL/4;
    }
    armAngle( l ){
        return this.gSF.maxA/this.gSF.maxL * l;
    };
    backToW( l ){
        return this.gSF.maxL / 4 - l;
    };
    
    
    updateCur(deltaT,path) {
        // updates XY and based on that updates angle for stickFigure
        const dt = super.updateCur(deltaT,path);
        const dx = dt * path.speedX;

        if( path.legWalking ){
            this.cur.w = this.updateW( this.cur.w, dx);
            this.cur.l = this.legAngle( this.cur.w );
        } else {
            const newL = this.cur.l +  dt * path.speedL; 
            if (path.speedL >= 0)
                this.cur.l = Math.min(newL, path.l);
            else
                this.cur.l = Math.max(newL, path.l);
        };

        if( path.armWalking ){
            this.cur.a = this.armAngle( this.cur.l );
        } else {
            const newA = this.cur.a + dt * path.speedA;
            if (path.speedA >= 0)
                this.cur.a = Math.min(newA, path.a);
            else
                this.cur.a = Math.max(newA, path.a);
        };
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

export const tioxColors = ['rgb(28, 62, 203)',
     'rgb(80, 212, 146)', 'rgb(151, 78, 224)',
     'rgb(234, 27, 234)', 'rgb(164, 132, 252)', 'rgb(29, 157, 127)',
      'rgb(74, 26, 204)', 'rgb(6, 190, 234)',
     'rgb(206, 24, 115)', 'rgb(0, 0, 0)']

const tioxBorders = ['black', 'black', 'black', 'black',
     'gray', 'black', 'rgb(80, 212, 146)', 'black',
     'black', 'gray', 'black', 'black'];


const pi2 = Math.PI * 2;
export class GStickFigure {
	constructor(context, size, boxSize = 20) {
		this.context = context;
        this.height = size;
        this.width = 2/3 * size;
		let radius = size / 8;
		this.head = {
			x: 0,
			y: radius,
			r: radius,
			stroke: 1
		};
		this.body = {
			x: 0,
			y: 0.22 * size,
			w: size / 10,
			h: size * 0.4
		};
		this.leg = {
			x: 0,
			y: size * 5 / 9,
			w: size / 12,
			h: size * 4 / 9
		};
		this.arm = {
			x: 0,
			y: size / 4,
			w: size / 16,
			h: size * 4 / 9
		};
		this.badge = {
			x: 1 / 6 * size,
			y: 2 / 5 * size
		};
		this.maxX = size * (4 / 9);
        this.maxL = 120;
        this.maxA = 90;
		this.fontSize = Math.floor(2 / 5 * size);
		this.context.font = Math.floor(2 / 5 * size) + 'px Arial';
		this.package = {
			x:  - boxSize,
			y: 0.20  * size + boxSize/2,
			w: boxSize,
			h: boxSize
		};
	}
};

export class NStickFigure {
	constructor(gSF) {
		this.gSF = gSF;
        let n = Math.floor(Math.random() * tioxColors.length);
		this.color = tioxColors[n];
		this.bdaryColor = tioxBorders[n];
		
		this.badgeText = 0;
		this.badgeVisible = false;
		this.packageVisible = false;
		this.packageColor = null;
	};

	initialPosition(x, y) {
		this.x = Math.floor(x);
		this.y = Math.floor(y);
	};

	badgeDisplay(bool) {
		this.badgeVisible = bool;
	};
	badgeSet(n) {
		this.badgeText = n;
	};

	moveTo(x, y) {
		let deltaAngle = Math.abs(x - this.x) / this.gSF.deltaMaxX * this.maxLegAngle / 2;
		this.legAngleDegrees = (this.legAngleDegrees + deltaAngle) % this.maxLegAngle;
		this.legAngleRadians = (Math.abs(this.legAngleDegrees -
			this.maxLegAngle / 2) - this.maxLegAngle / 4) * pi2 / 360;
		this.armAngleRadians = this.legAngleRadians * this.ratio;
		this.x = x;
		this.y = y;
	};

    
    draw(cur,now) {
		// use cur.x,cur.y as starting point and draw the rest of the
		// parts by translating and rotating from there
        if ( cur.x < -50 || cur.x > 1050 ) return;
		let c = this.gSF.context;
        
        const armRadians = cur.a / 360 * pi2;
        const legRadians = cur.l / 360 * pi2;
		c.save();
		c.strokeStyle = this.bdaryColor;
		c.fillStyle = this.color;
		//person (x,y) comes as center.  Adjust for this here
        c.translate(cur.x , cur.y - this.gSF.height/2);

		//package
		if (this.packageVisible) {
			c.save();
			c.fillStyle = this.packageColor;
			c.fillRect(this.gSF.package.x - this.gSF.package.w/2,
                       this.gSF.package.y - this.gSF.package.h/2,
				this.gSF.package.w, this.gSF.package.h);
			c.restore();
		}

		c.beginPath();

		// arm1
		if (!this.packageVisible) {
			c.save();
			c.translate(this.gSF.arm.x, this.gSF.arm.y);
			c.rotate(armRadians);
			c.rect(-this.gSF.arm.w / 2, 0, this.gSF.arm.w, this.gSF.arm.h);
			c.restore();
		}

		// leg2
		c.save();
		c.translate(this.gSF.leg.x, this.gSF.leg.y);
		c.rotate(-legRadians);
		c.rect(-this.gSF.leg.w / 2, 0, this.gSF.leg.w, this.gSF.leg.h);
		c.restore();


		//  leg 1
		c.save();
		c.translate(this.gSF.leg.x, this.gSF.leg.y);
		c.rotate(legRadians);
		c.rect(-this.gSF.leg.w / 2, 0, this.gSF.leg.w, this.gSF.leg.h);
		c.restore();

		// arm2
		c.save();
		c.translate(this.gSF.arm.x, this.gSF.arm.y);
		if (this.packageVisible) {
			c.rotate(pi2 / 5);
		} else {
			c.rotate(-armRadians);
		}
		c.rect(-this.gSF.arm.w / 2, 0, this.gSF.arm.w, this.gSF.arm.h);
		c.restore();
        
        // body
		c.save();
		c.translate(this.gSF.body.x, this.gSF.body.y);
		c.rect(-this.gSF.body.w / 2, 0, this.gSF.body.w,
			this.gSF.body.h);
		c.restore();
        c.stroke();  //all but the head.
		c.fill();
        
        // head
		c.save();
		c.translate(this.gSF.head.x, this.gSF.head.y);
        c.beginPath()
		c.arc(0, 0, this.gSF.head.r, 0, pi2, true);
		c.restore();
		c.stroke();
		c.fill();

		//badge
		if (this.badgeVisible) {
            c.font = this.gSF.fontSize + 'px Arial'; 
            // why must we set this every draw.  Is it being reset somewhere???
			c.fillText(this.badgeText, this.gSF.badge.x, this.gSF.badge.y);
		}
		c.restore();
	};
};
export class BoxStack {
    constructor(params){
        this.params = params;
        /* isRows, isSnake, lanes, laneLength, hSpace, vSpace, xDir, yDir  */
    };
    rowCol(k){
        let r,c;
        r = Math.floor(k/this.params.laneLength);
        if( r < this.params.lanes ){
            c = k % this.params.laneLength; 

        } else {
            r = this.params.lanes - 1;
            c = k - (this.params.lanes -1 ) * (this.params.laneLength);
        }
        if( this.params.isSnake && r % 2 == 1 ){
            c = this.params.laneLength - 1 - c;
        }
        return ( this.params.isRows ? {r:r,c:c} : {r:c,c:r} );
    };
    relCoord(k){
        const {r,c} = this.rowCol(k);
        const deltaX = c * this.params.hSpace * this.params.xDir;
        const deltaY = r * this.params.vSpace * this.params.yDir;
//        console.log('in relCoord k=',k,deltaX,deltaY);
        return {x: deltaX, y: deltaY};
    };
	setSpace(hSpace,vSpace){
		this.params.hSpace = hSpace;
		this.params.vSpace = vSpace;
	}
	setLaneLength(l){
		this.params.laneLength = l;
	}
    
};

export class GStore {
	constructor(omConcept,anim) {
		this.omConcept = omConcept;
		this.anim = anim;
		this.firstBox = {x:this.anim.store.left + this.anim.box.space/2,
                         y:this.anim.store.bot - this.anim.box.space/2};
        this.boxStack = new BoxStack({isRows: true, isSnake: true,
                                   lanes: 1000, laneLength: 10,
                                   hSpace: anim.box.space,
                                   vSpace: anim.box.space,
                                   xDir: +1, yDir: -1});
		this.drawStore();
		this.packages = [];
		this.snake = true;
	};
	reset() {
		this.packages = [];
	};
	drawStore() {
        const c = this.anim.stage.backContext;
        const s = this.anim.store;
        const b = this.anim.box;
		c.save();
//		c.resetTransform();
		c.strokeStyle = 'black';
//		c.fillStyle = 'white'
		c.lineWidth = s.stroke;;
		c.strokeRect(s.left, s.top, s.width, s.height);
		c.beginPath();
		c.moveTo(s.left, s.top);
		c.lineTo(s.left + s.width / 2, s.top / 2);
		c.lineTo(s.left + s.width, s.top);
//		c.lineTo(s.left, s.top);
		c.closePath();
		
		this.drawShelves(c, s, b);
        c.stroke();
//		c.fill();
		c.restore();
	};
	drawShelves(c, s, b) {
		let left, right, y;
		for (let k = 0; k < 9; k++) {
			left = s.left + ((k % 2) == 0 ? 0 : b.space);
			right = s.left + s.width - ((k % 2) == 0 ? b.space : 0);
			y = s.bot - (k + 1) * b.space;
			c.moveTo(left, y);
			c.lineTo(right, y);
		};
	};
	emptyStore() {
		this.packages.forEach(p => p.destroy());
		this.packages = [];
	};
	inventory() {
		return this.packages.length;
	};

	addNew() {
		let point = this.boxStack.relCoord(this.packages.length);
		let color = tioxColors[Math.floor(
			Math.random() *	(tioxColors.length - 1))];
            // -1 eliminates "black" boxes because dark gray boxes
            // are used to indicate boxes that must be thrown out.
		let pack = new Package(this.omConcept,
			this.anim.stage.foreContext, color, this.anim.box.size,
			this.firstBox.x + point.x, this.firstBox.y + point.y);
		this.packages.push(pack);
	};
	pull() {
		return this.remove()
	};
	remove() {
		if (this.packages.length == 0) return null;
		let pack = this.packages.shift();

		if (this.snake) {
			let n = this.packages.length;
			for (let k = 0; k < n; k++) {
				let p = this.packages[k];
				let point = this.boxStack.relCoord(k);
				p.updatePath({
					t: this.omConcept.now + 300,
					x: this.firstBox.x + point.x,
					y: this.firstBox.y + point.y
				});
			};
		}
		return pack;
	};
	makeAllGrey() {
		for (let pack of this.packages) {
			pack.graphic.color = darkGrey;
		}
	};
};

export class Package extends Item {
	constructor(omConcept,ctx, color, boxSize, x, y) {
		super(omConcept,x, y);
		this.graphic = new ColorBox(ctx, color, boxSize);
	};
};

class ColorBox {
	constructor(ctx, color, boxSize) {
		this.ctx = ctx;
		this.color = color;
		this.boxSize = boxSize;
	};
	draw(cur,now) {
		this.ctx.fillStyle = this.color;
		this.ctx.fillRect(cur.x - this.boxSize/2,
                          cur.y - this.boxSize/2,
			             this.boxSize, this.boxSize)
	};
};