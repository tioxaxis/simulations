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
		if (this.numSeatsUsed > 0) return this.q[0];
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
        
//        this.pushAnim(person);
		

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
//        console.log('In ARRIVAL numSU',this.numSeatsUsed,
//                   person);
//        debugger;
		if (this.numSeatsUsed == 1) 
            this.nextMachine.knockFromPrevious();
        
		this.printQueue();
	};

	pull() {
		if (this.numSeatsUsed == 0) return null;
		this.numSeatsUsed--;
		const person = this.q.shift();
//        console.log('in PULL From Queue now=',this.omConcept.now,
//                    '  NSU=',this.numSeatsUsed, person)
		this.pullAnim(person); /// this is the right thing but 
		if (this.q.length < this.maxSeats) {
			this.previousMachine.knockFromNext();
		}
//		if (this.recordLeave) this.recordLeave(person);
		this.printQueue();
		return person;
	};

	printQueue() {
		//this.q.forEach(p => console.log('which',p.which,p.pathList, p));
	};
}; //end class Queue

//  WALK AND DESTROY
export class WalkAndDestroy {
	constructor(omConcept, name, dontOverlap, walkingTime) {
		this.omConcept = omConcept;
		this.name = name;
//		this.animFunc = animFunc;
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

//		// need to set up substitute function for this
//        this.previousQueue = previousQueue;
//		this.nextQueue = nextQueue;
//		this.animFunc = animFunc;
        this.machIndex = 0;

		this.machs = [];
		// setup machines if finite number with positions offset by dx,dy
		// if infinite number of machines then create them on the fly in same position.
	};

    setPreviousNext(previousQueue, nextQueue) {
		this.previousQueue = previousQueue;
		this.nextQueue = nextQueue;
	};
    
	reset() {
		this.machs = [];
		for (let k = 0; k < this.numMachines; k++) {
			this.machs[k] = {
				status: 'idle',
				person: null,
				index: k
			};
		}
        this.omConcept.redrawBackground();
//		if (this.animFunc) this.animFunc.reset(this.numMachines);
		this.numberBusy = 0
	};

	setNumMachines( numMachines){
        this.numMachines = numMachines;
    };
    
    
    getAverageProcTimeRV() {
		return this.procTimeRV.mean;
	};

	getNumberBusy() {
		return this.numberBusy
	};

	findIdle() {
		return this.machs.findIndex(x => x.status == 'idle');
	};

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
		const person = this.previousQueue.pull();
        let theProcTime;
		if( !person ) return false;
        if( this.procTimeRV ) {
            theProcTime = person.procTime = this.procTimeRV.observe();
//            console.log('generating proc time machine=',this.name,' which=',person.which, person.procTime);
        } else {
            theProcTime = person.procTime
        };
        
        person.machine = machine;
        machine.status = 'busy';
        machine.person = person;
        this.startAnim(machine, theProcTime);   

        this.omConcept.heap.push({
            time: this.omConcept.now + theProcTime,
            type: 'finish/' + this.name,
            proc: this.finish.bind(this),
            item: machine
        });

        // does this make sense anymore leave is nonexistant??
        if( this.leaveEarly ){
            this.omConcept.heap.push({
                time: this.omConcept.now + theProcTime - this.leaveEarly,
                type: 'leave/' + this.name,
                proc: this.leave.bind(this),
                item: machine
            })
        };
        
//			if (this.recordStart) this.recordStart(person);
        this.numberBusy++;
        //remove 'person' from doubly linked list
//        if (person.behind) person.behind.ahead = null;
//        person.behind = null;
        return true;
		
	};
    
//    leave(machine){
//        machine.person.success = this.nextQueue.push(machine.person);
//        this.animFunc.leave(machine.person);
//    }

	finish(machine) {
//		if (this.recordFinish) this.recordFinish(machine.person);
//        if (this.animFunc) this.animFunc.finish(machine.person);
        
        //note bene  the two previous steps must happen first for face game
        // to correctly account for completion time before WalkandDestroy
        // marks the flow time for process
        const person = machine.person;
        if (person.behind) person.behind.ahead = null;
        person.behind = null;
        
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
    drawAll(redraw = false){
        this.forEach(r => r.draw(redraw));
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
//        console.log('movedisplayAll #ofItems=',this.length)
		this.forEach(p => p.moveDisplayWithPath(deltaSimuTime))
	}
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
		if (this.ahead) this.ahead.behind = this;
		this.behind = null;
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

	moveDisplayWithPath_old(deltaSimuT) {
		if (this.inBatch) return;
		while (this.pathList.length > 0) {
			var path = this.pathList[0];
			if (path.t < this.omConcept.now) {
				this.cur.t = path.t;
				this.cur.x = path.x;
				this.cur.y = path.y;
				this.pathList.shift();
				deltaSimuT = Math.max(0, this.omConcept.now - path.t);
			} else {
				path.speedX = (path.x - this.cur.x) 
                                / (path.t - this.cur.t);
                path.speedY = (path.y - this.cur.y)
                                / (path.t - this.cur.t);
                this.cur.t = this.omConcept.now;
                
				this.cur.x += path.speedX * deltaSimuT;
				if (path.speedX > 0)
					this.cur.x = Math.min(this.cur.x, path.x);
				else
					this.cur.x = Math.max(this.cur.x, path.x);
                
				this.cur.y += path.speedY * deltaSimuT;
				if (path.speedY > 0)
					this.cur.y = Math.min(this.cur.y, path.y);
				else
					this.cur.y = Math.max(this.cur.y, path.y);
				break;
			};
		};

//		console.log('drawing one item at ',this.cur.x,this.cur.y);
        this.graphic.moveTo(this.cur.x, this.cur.y);
		this.draw();
	};
    
    
    moveDisplayWithPath(deltaSimuT) {
		if (this.inBatch) return;
		while (this.pathList.length > 0) {
            var path = this.pathList[0];
//            if( this.blocked ){ //only pos-x-direction
//                const aheadX = this.ahead.cur.x - this.width;
//                if( aheadX < path.x ){
//                    this.cur.x = aheadX;
//                    break;
//                }
//                this.blocked = false;
//            }
            this.cur.t = this.omConcept.now;
			this.cur.x += path.speedX * deltaSimuT;
            this.cur.y += path.speedY * deltaSimuT;
            if( this.checkAhead && this.ahead){ //only pos-x-direction
                 const aheadX = this.ahead.cur.x - this.width;
                 if( aheadX < this.cur.x && aheadX < path.x ){
//                     this.blocked = true;
                     this.cur.x = aheadX;
                     break;
                 }
            }
            if (path.speedX >= 0)
                this.cur.x = Math.min(this.cur.x, path.x);
            else
                this.cur.x = Math.max(this.cur.x, path.x);


            if (path.speedY >= 0)
                this.cur.y = Math.min(this.cur.y, path.y);
            else
                this.cur.y = Math.max(this.cur.y, path.y);
			
			if( this.omConcept.now <= path.t ) break;
            
            this.cur.t = path.t;
            this.cur.x = path.x;
            this.cur.y = path.y;
            this.pathList.shift();
            deltaSimuT = Math.max(0, this.omConcept.now - path.t);
        };
        this.graphic.moveTo(this.cur.x, this.cur.y);
		this.draw();
    };
	
	updatePosition(){
		const speed = this.omConcept.stage.normalSpeed;
		if (this.inBatch) return;
		while (this.pathList.length > 0) {
			var path = this.pathList[0];
			let deltaT = path.t - this.omConcept.now;
			if (deltaT <= 0) {
				this.cur.t = path.t;
				this.cur.x = path.x;
				this.cur.y = path.y;
				this.pathList.splice(0, 1);
			} else {
				this.cur.t = this.omConcept.now;
				
				const velocX = (path.x - this.cur.x)/deltaT;
				const signX = Math.sign(velocX);
				this.speedX = signX * Math.min(Math.abs(velocX),speed);	this.cur.x = path.x - this.speedX * deltaT;
												   
				const velocY = (path.y - this.cur.y)/deltaT;
				const signY = Math.sign(velocY);
				this.speedY = signY * Math.min(Math.abs(velocY,speed));	this.cur.y = path.y - this.speedY * deltaT;
											   
				break;
			};
		};

		this.graphic.moveTo(this.cur.x, this.cur.y);
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
		this.pathList.splice(0, 1);
		this.addPath(triple);
	};

	updateAllPaths() {
		let oldList = this.pathList;
		this.pathList = [];
		for (let triple of oldList) {
			this.addPath(triple);
		}
	};

	addPath(triple) {
		this.pathList.push(triple);
		const n = this.pathList.length;
		let last = {};
		if (n == 1) {
			last = {
				t: this.omConcept.now,
				x: this.cur.x,
				y: this.cur.y
			};
		} else {
			last = this.pathList[n - 2];
		}

		let path = this.pathList[n - 1];
		let deltaT = path.t - last.t;

//		if (deltaT == 0) {
			path.speedX = (path.x - last.x) / Math.max(1,deltaT);
			path.speedY = (path.y - last.y) / Math.max(1,deltaT);
//		} else {
//			path.speedX = (path.x - last.x) / deltaT;
//			path.speedY = (path.y - last.y) / deltaT;
//		}
//        if( path.speedX < 0){
//            alert('addPath created pathList with speed X< 0');
//            debugger;
//        }
//        if( path.x > 700 && path.x < 750){
//            console.log(this, this.which, this.pathList,path.x);
//            debugger;
//        }
	};

	destroy() {
		this.omConcept.itemCollection.remove(this);
		let b = this.behind;
		let a = this.ahead;
		if (b) b.ahead = a;
		if (a) a.behind = b;
	};
	draw() {
		this.graphic.draw(this.omConcept.now);
	}
}; // end of class Item

export const tioxColors = ['rgb(28, 62, 203)', 'rgb(80, 212, 146)', 'rgb(151, 78, 224)',
     'rgb(234, 27, 234)', 'rgb(164, 132, 252)', 'rgb(29, 157, 127)',
     'rgb(0, 0, 0)', 'rgb(74, 26, 204)', 'rgb(6, 190, 234)',
     'rgb(206, 24, 115)']

const tioxBorders = ['black', 'black', 'black', 'black',
     'gray', 'black', 'rgb(80, 212, 146)', 'black',
     'black', 'gray', 'black', 'black'];


const pi2 = Math.PI * 2;
export class GStickFigure {
	constructor(context, size, boxSize = 20) {
		this.context = context;
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
		this.deltaMaxX = size * (4 / 9);
		this.fontSize = Math.floor(2 / 5 * size);
		this.context.font = Math.floor(2 / 5 * size) + 'px Arial';
		this.package = {
			x: -25,
			y: 0.25 * size,
			w: boxSize,
			h: boxSize
		};
	}
};

export class NStickFigure {
	constructor(gSF, x = 200, y = 100) {
		let n = Math.floor(Math.random() * tioxColors.length);
		this.color = tioxColors[n];
		this.bdaryColor = tioxBorders[n];
		this.maxLegAngle = 120;
		this.maxArmAngle = 90;
		this.armAngleRadians = null //pi2 / 15;
		this.legAngleRadians = Math.random() * pi2/8; //pi2 / 12;
		let d = Math.floor( Math.random() * this.maxLegAngle);
		this.legAngleDegrees = d;
		this.gSF = gSF;
		
		this.badgeText = null;
		this.badgeVisible = false;
		this.ratio = this.maxArmAngle / this.maxLegAngle;
		this.x = Math.floor(x);
		this.y = Math.floor(y);
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

    
    draw() {
		// use x,y as starting point and draw the rest of the
		// parts by translating and rotating from there

		if ( this.x < -50 || this.x > 1050 ) return;
		let c = this.gSF.context;
        
		c.save();
		c.strokeStyle = this.bdaryColor;
		c.fillStyle = this.color;
		c.translate(this.x, this.y);

		//package
		if (this.packageVisible) {
			c.save();
			c.fillStyle = this.packageColor;
			c.fillRect(this.gSF.package.x, this.gSF.package.y,
				this.gSF.package.w, this.gSF.package.h);
			c.restore();
		}

		c.beginPath();

		// arm1
		if (!this.packageVisible) {
			c.save();
			c.translate(this.gSF.arm.x, this.gSF.arm.y);
			c.rotate(this.armAngleRadians);
			c.rect(-this.gSF.arm.w / 2, 0, this.gSF.arm.w, this.gSF.arm.h);
			c.restore();
		}

		// leg2
		c.save();
		c.translate(this.gSF.leg.x, this.gSF.leg.y);
		c.rotate(-this.legAngleRadians);
		c.rect(-this.gSF.leg.w / 2, 0, this.gSF.leg.w, this.gSF.leg.h);
		c.restore();


		//  leg 1
		c.save();
		c.translate(this.gSF.leg.x, this.gSF.leg.y);
		c.rotate(this.legAngleRadians);
		c.rect(-this.gSF.leg.w / 2, 0, this.gSF.leg.w, this.gSF.leg.h);
		c.restore();

		// arm2
		c.save();
		c.translate(this.gSF.arm.x, this.gSF.arm.y);
		if (this.packageVisible) {
			c.rotate(pi2 / 5);
		} else {
			c.rotate(-this.armAngleRadians);
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
	constructor(box, snake = true) {
		this.box = box;
		this.snake = snake;
	}
	relCoord(k) {
		let row = Math.floor(k / this.box.perRow);
		let c = k % this.box.perRow;
		let col = (this.snake && row % 2 == 1) ?
			this.box.perRow - 1 - c : c;
		let delta = this.box.space - this.box.size;
		return {
			x: this.box.space * col + Math.floor(delta / 2),
			y: -(this.box.space) * (1 + row) + delta - 1
		};
	};
}

export class GStore {
	constructor(omConcept,anim) {
		this.omConcept = omConcept;
		this.anim = anim;
		this.boxStack = new BoxStack(anim.box, true);
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
//        c.beginPath();
		for (let k = 0; k < 9; k++) {
			left = s.left + ((k % 2) == 0 ? 0 : b.space);
			right = s.left + s.width - ((k % 2) == 0 ? b.space : 0);
			y = s.bot - (k + 1) * b.space;
//			c.beginPath();
			c.moveTo(left, y);
			c.lineTo(right, y);
//			c.closePath();
//			c.stroke();
		};
//        c.stroke();
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
			Math.random() *	tioxColors.length)];
		let pack = new Package(this.omConcept,
			this.anim.stage.foreContext, color, this.anim.box.size,
			this.anim.store.left + point.x, this.anim.store.bot + point.y);
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
					x: this.anim.store.left + point.x,
					y: this.anim.store.bot + point.y
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
		this.graphic.moveTo(x, y);
	};
};

class ColorBox {
	constructor(ctx, color, boxSize) {
		this.ctx = ctx;
		this.color = color;
		this.boxSize = boxSize;
	};
	moveTo(x, y) {
		this.x = Math.floor(x);
		this.y = Math.floor(y);
	};
	draw() {
		this.ctx.fillStyle = this.color;
		this.ctx.fillRect(this.x, this.y,
			this.boxSize, this.boxSize)
	};
};
