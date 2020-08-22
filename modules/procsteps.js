import {
    Heap
}
from './utility.js';
const darkGrey = 'rgb(52,52,52)';
simu.now = 0;
simu.frametime = 0;
simu.heap = new Heap((x, y) => x.time < y.time);

simu.framedelta = 5; //simulated time increment per frame
simu.framedeltaFor1X = 5;
simu.frameInterval = 20; //not used??? between frames
simu.frameSpeed = 1.0; //framedelta/framedeltaFor1X

simu.isRunning = false;
simu.nameOfSimulation = null;
simu.theCanvas = null;
simu.context = null; //context for drawing on theCanvas
simu.requestAFId = null; // id for requestAnimationFrame

simu.initialize = function () {
    simu.theCanvas = document.getElementById('theCanvas');
    simu.context = simu.theCanvas.getContext('2d');
    simu.theBackground = document.getElementById('theBackground');
    simu.backcontext = theBackground.getContext('2d');
    //        window.addEventListener('resize', resizeCanvas);
};

simu.reset = function () {
    clearCanvas();
    simu.now = 0;
    simu.frametime = 0;
    simu.heap.reset();
    simu.reset2();
};

function clearCanvas() {
    simu.context.clearRect(0, 0, simu.theCanvas.width, simu.theCanvas.height);
}

// play pause toggle and listeners that run them.
function togglePlayPause() {
    if (simu.isRunning) pause();
    else play();
};

function play() {
    if (simu.isRunning) return;
    if (document.getElementById('playButtons')
        .style.display == 'none') return
    document.getElementById('playButton').style.display = 'none';
    document.getElementById('pauseButton').style.display = 'inline';
    simu.lastFrame = performance.now();
    //console.log('at play', simu.lastFrame);
    simu.requestAFId = window.requestAnimationFrame(eachFrame);
    simu.isRunning = true;

};

function pause() {
    if (!simu.isRunning) return;
    document.getElementById('pauseButton').style.display = 'none';
    document.getElementById('playButton').style.display = 'block';
    window.cancelAnimationFrame(simu.requestAFId);
    simu.isRunning = false;
};
document.getElementById('playButton').addEventListener('click', play);
document.getElementById('pauseButton').addEventListener('click', pause);
document.getElementById('resetButton').addEventListener('click', simu.reset);
document.addEventListener('keydown', keyDownFunction);

function keyDownFunction(evt) {
    if (simu.editMode) return;
    const key = evt.key;
    if (evt.code == "Space") {
        evt.preventDefault();
        togglePlayPause();
    }
};

function eachFrame(currentTime) {
    // cuurentTime seems off
    let alternateTime = performance.now();
    //        console.log( 'at each frame',currentTime, alternateTime, 'lastFrame', simu.lastFrame);

    let deltaT = Math.min(100, alternateTime - simu.lastFrame);
    simu.lastFrame = alternateTime;
    let deltaSimT = deltaT * simu.frameSpeed;
    simu.frametime += deltaSimT;


    let theTop;

    while ((theTop = simu.heap.top()) &&
        theTop.time <= simu.frametime) {
        const event = simu.heap.pull();
        simu.now = event.time;
        //            console.log('next event is ',event.type);
        event.proc(event.item);
    }
    simu.now = simu.frametime;
    // console.log('in eachFrame now=', simu.now);
    clearCanvas();
    // for each collection of items move them.
    allCollections.forEach(c => c.moveDisplayAll(deltaSimT));
    simu.requestAFId = window.requestAnimationFrame(eachFrame);
};


export class Queue {
    constructor(name, numSeats, walkingTime,
        anim,
        recordArrive = null, recordLeave = null) {
        this.name = name;
        this.maxSeats = numSeats;
        this.walkingTime = walkingTime;

        this.anim = anim;
        this.previousMachine = null;
        this.nextMachine = null;

        this.recordArrive = recordArrive;
        this.recordLeave = recordLeave;


        this.numSeatsUsed = null;
        this.q = null;
        this.lastAdded = null;
        this.reset();
    };

    setPreviousNext(previousMachine, nextMachine) {
        this.previousMachine = previousMachine;
        this.nextMachine = nextMachine;
        //    this.averageProcTime = nextMachine.getAverageProcTime();
        // get average time from machine next and store it here
    };

    reset() {
        this.q = [];
        this.lastAdded = null;
        this.numSeatsUsed = 0;
        this.anim.reset();
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

    push(person) {
        //   console.log('added person', person.which,person,' on queue ', this.name);

        if (this.q.length == this.maxSeats) return false;
        else {

            const arrivalTime = simu.now + this.walkingTime;
            this.anim.join(this.q.length, arrivalTime, person);
            this.q.push(person);
            // insert into end of doubly linked list
            person.ahead = this.lastAdded;
            if (this.lastAdded) this.lastAdded.behind = person;
            this.lastAdded = person;


            simu.heap.push({
                time: arrivalTime,
                type: 'arrive',
                proc: this.arrive.bind(this),
                item: person
            });
            this.printQueue();
            return true;
        }
    };

    arrive(person) {
        this.numSeatsUsed++;
        this.anim.arrive(this.numSeatsUsed, person);
        if (this.recordArrive) this.recordArrive(person);
        if (this.numSeatsUsed == 1) this.nextMachine.knockFromPrevious();
        this.printQueue();
    };

    pull(procTime) {
        if (this.numSeatsUsed == 0) return null;
        else {
            this.numSeatsUsed--;
            const person = this.q.shift();
            this.anim.leave(procTime, this.numSeatsUsed); /// this is the right thing but 
            if (this.q.length < this.maxSeats) {
                this.previous.knock();
            }
            if (this.recordLeave) this.recordLeave(person);
            this.printQueue();
            return person;
        }
    };

    printQueue() {
        //        this.q.forEach(p => console.log('which',p.which,p.pathList, p));
        return;
    };

}; //end class Queue



//  WALK AND DESTROY
export class WalkAndDestroy {
    constructor(name, animForWalkAndDestroy, dontOverlap) {
        this.name = name;
        this.animForWalkAndDestroy = animForWalkAndDestroy;

        this.walkingTime = this.animForWalkAndDestroy.walkingTime;
        this.dontOverlap = dontOverlap;
        this.lastAdded = null;
    };

    reset() {};

    push(person) {
        // insert into end of doubly linked list
        person.ahead = this.lastAdded;
        if (this.lastAdded) this.lastAdded.behind = person;
        this.lastAdded = person;
        this.animForWalkAndDestroy.start(person);

        simu.heap.push({
            time: simu.now + this.walkingTime,
            type: 'walkoff/destroy',
            proc: this.destroy.bind(this),
            item: person
        });
        return true;
    };

    destroy(person) {
        //    let b = person.behind;
        //    let a = person.ahead;
        //    if (b) b.ahead = person;
        //    if (a) a.behind = person;
        person.destroy();
    };
}; //end export class WalkAndDestroy

//   MACHINE CENTER         
export class MachineCenter {
    constructor(name, numMachines, procTime,
        previousQ, nextQ,
        anim,
        recordStart = null, recordFinish = null) {
        this.name = name;
        this.numMachines = numMachines;
        this.numberBusy = 0;
        this.procTime = procTime;

        this.previousQ = previousQ;
        this.nextQ = nextQ;
        this.anim = anim;
        this.recordStart = recordStart;
        this.recordFinish = recordFinish;

        this.machs = [];
        // setup machines if finite number with positions offset by dx,dy
        // if infinite number of machines then create them on the fly in same position.
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
        if (this.anim) this.anim.reset(this.numMachines);
        this.numberBusy = 0
    };

    getAverageProcTime() {
        return this.procTime.mean;
    };

    getNumberBusy() {
        return this.numberBusy
    };


    findIdle() {
        return this.machs.findIndex(x => x.status == 'idle');
    };

    findBlocked() {
        return this.machs.findIndex(x => x.status == 'blocked')
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

        let theProcTime = this.procTime.observe();
        const person = this.previousQ.pull(theProcTime);

        if (person) {

            if (this.anim) {
                this.anim.start(theProcTime, person, machine.index);
            }
            person.machine = machine;
            machine.status = 'busy';
            machine.person = person;

            simu.heap.push({
                time: simu.now + theProcTime,
                type: 'finish/' + this.name,
                proc: this.finish.bind(this),
                item: machine
            });
            if (this.recordStart) this.recordStart(person);
            this.numberBusy++;
            //remove 'person' from doubly linked list
            if (person.behind) person.behind.ahead = null;
            person.behind = null;
        };
    };

    finish(machine) {

        let success = this.nextQ.push(machine.person);
        if (success) {
            if (this.recordFinish) this.recordFinish(machine.person);
            if (this.anim) this.anim.finish(machine.person);
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
    constructor(name, procTime, input, output, anim,
        recordStart, recordFinish) {
        super(name, -1, procTime,
            input, output,
            anim, recordStart, recordFinish);
        //create a first machine to avoid a nasty edge case, make the machine idle with noone.
        this.machs.push({
            status: 'idle',
            person: null
        });
        this.name = name;

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

// minimal Person with properties only for the simulation, the procsteps


var allCollections = [];
export class ItemCollection {
    constructor() {
        allCollections.push(this);
        this.reset();
    };
    reset() {
        this.all = [];
        this.counter = 0;
        this.lastAdded = null;
    };
    moveDisplayAll(deltaSimT) {
        this.all.forEach(p => p.moveDisplayWithPath(deltaSimT))
    }
    updateForSpeed() {
        this.all.forEach(p => p.updateAllPaths());
    };
    remove(item) {
        let k = this.all.indexOf(item);
        if (k < 0) {
            alert('failed to find person in all');
            debugger
        }
        this.all.splice(k, 1);
    };
    removeFirst() {
        let item = this.all[0];
        this.all.splice(0, 1);
        return item;
    };
};
export class Item {
    constructor(collection, x, y) {
        this.collection = collection;
        this.which = ++this.collection.counter;
        this.collection.all.push(this);

        this.ahead = this.collection.lastAdded;
        this.collection.lastAdded = this;
        if (this.ahead) this.ahead.behind = this;
        this.behind = null;


        this.cur = {
            t: simu.now,
            x: x,
            y: y
        };
        this.pathList = [];
        this.arrivalTime = null;
        this.machine = null;
        this.graphic = null;

    };

    setColor(bodyColor, borderColor) {
        this.graphic.setColor(bodyColor, borderColor);
    }

    moveDisplayWithPath(deltaSimT) {

        while (this.pathList.length > 0) {
            //           if (this.which <= 2 ){
            //        console.log(this.which, 'path ',this.pathList[0].t, this.pathList[0].x, 'cur x', this.cur.x, deltaSimT, simu.now)
            //    }   ;
            var path = this.pathList[0];
            //            console.log('BEFORE mDWP person ', this.which, 'now=',simu.now,'cur.x,path.x',this.cur.x, path.x,' deltaT=',deltaSimT)
            let deltaX = path.speedX * deltaSimT;
            if (deltaX > 0 && this.cur.x > path.x + 10) debugger;
            if (path.t < simu.now) {
                this.cur.t = path.t;
                this.cur.x = path.x;
                this.cur.y = path.y;
                this.pathList.splice(0, 1);
                deltaSimT = Math.max(0, simu.now - path.t);
            } else {
                this.cur.t = simu.now;
                this.cur.x += path.speedX * deltaSimT;
                if (path.speedX > 0)
                    this.cur.x = Math.min(this.cur.x, path.x);
                else
                    this.cur.x = Math.max(this.cur.x, path.x);
                this.cur.y += path.speedY * deltaSimT;
                if (path.speedY > 0)
                    this.cur.y = Math.min(this.cur.y, path.y);
                else
                    this.cur.y = Math.max(this.cur.y, path.y);
                //                 let extra = this.cur.x + path.speedX * (path.t-this.cur.t)- path.x;
                //                 if ( this.which <=2 && extra > 0){
                //                  console.log ('extra', extra, this.cur, path, );
                //                     }
                //                 ;
                break;
            };

        };

        this.graphic.moveTo(this.cur.x, this.cur.y);
        this.graphic.draw();

        function crossTarget(x, delta, target) {
            if (delta > 0) {
                return (x <= target) && (target <= x + delta)
            } else if (delta < 0) {
                return (x + delta <= target) && (target <= x)
            } else {
                return false;
            }
        };
    };

    updatePathDelta(t, dx, dy) {
        let n = this.pathList.length;
        let tempPath = this.pathList[n - 1];
        this.pathList.splice(n - 1, 1);
        this.addPath({
            t: t,
            x: tempPath.x + dx,
            y: tempPath.y + dy
        })
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
                t: simu.frametime,
                x: this.cur.x,
                y: this.cur.y
            };
        } else {
            last = this.pathList[n - 2];
        }

        let path = this.pathList[n - 1];
        let deltaT = path.t - last.t;

        if (deltaT == 0) {
            path.speedX = 0;
            path.speedY = 0;
        } else {
            path.speedX = (path.x - last.x) / deltaT;
            path.speedY = (path.y - last.y) / deltaT;
        }
    };

    destroy() {
        this.collection.remove(this);
        if (this.collection.lastAdded == this)
            this.collection.lastAdded = null;
        let b = this.behind;
        let a = this.ahead;
        if (b) b.ahead = a;
        if (a) a.behind = b;
    };
    draw() {
        this.graphic.draw();
    }
}; // end of class Item
export var tioxColors = ['rgb(28, 62, 203)', 'rgb(80, 212, 146)', 'rgb(151, 78, 224)',
     'rgb(234, 27, 234)', 'rgb(164, 132, 252)', 'rgb(29, 157, 127)',
     'rgb(0, 0, 0)', 'rgb(74, 26, 204)', 'rgb(6, 190, 234)',
     'rgb(206, 24, 115)']

var tioxBorders = ['black', 'black', 'black', 'black',
     'gray', 'black', 'rgb(80, 212, 146)', 'black',
     'black', 'gray', 'black', 'black'];


const pi2 = Math.PI * 2;
export class GStickFigure {
    constructor(context, size, boxSize = 20) {
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
        this.context = context;
        this.context.font = Math.floor(2 / 5 * size) + 'px Arial';
        this.package = {
            x: -25,
            y: 0.25 * size,
            w: boxSize - 2,
            h: boxSize - 2
        };
    }
};

export class NStickFigure {
    constructor(gSF, x = 200, y = 100) {
        let n = Math.floor(Math.random() * tioxColors.length);
        this.color = tioxColors[n];
        this.bdaryColor = tioxBorders[n];
        this.armAngleRadians = pi2 / 15;
        this.legAngleRadians = pi2 / 12;
        this.legAngleDegrees = 30;
        this.gSF = gSF;
        this.maxLegAngle = 120;
        this.maxArmAngle = 90;
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

        // body
        c.save();
        c.translate(this.gSF.body.x, this.gSF.body.y);
        c.rect(-this.gSF.body.w / 2, 0, this.gSF.body.w,
            this.gSF.body.h);
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

        // head
        c.save();
        c.translate(this.gSF.head.x, this.gSF.head.y);
        c.arc(0, 0, this.gSF.head.r, 0, pi2, true);
        c.restore();

        // draw (fill and stroke) the entire figure
        c.stroke();
        c.fill();

        //badge
        if (this.badgeVisible) {
            c.save();
            c.fillText(this.badgeText, this.gSF.badge.x, this.gSF.badge.y);
            c.restore();
        }



        c.restore();


    };

};


export class GStore {
    constructor(ctxStore, ctxPack, left, top, boxSize, boxesPerRow) {

        this.ctxStore = ctxStore;
        this.store = {
            left: left,
            top: top
        }
        this.store.width = boxSize * boxesPerRow;
        this.store.height = this.store.width;
        this.store.bot = this.store.top + this.store.height;
        this.drawStore(this.ctxStore, this.store);

        this.packages = new StackPackages(ctxPack,             boxSize, boxesPerRow);
        this.packages.updateLeftBot(this.store.left, this.store.bot)
    };
    reset() {
        const s = this.store;
        this.ctxStore.resetTransform();
        this.ctxStore.clearRect(s.left, s.top, s.width, s.height)
    };
    drawStore(c, s) {
        c.save();
        c.resetTransform();
        c.strokeStyle = 'black';
        c.fillStyle = 'white'
        c.lineWidth = s.stroke;;
        c.strokeRect(s.left, s.top, s.width, s.height);
        c.beginPath();
        c.moveTo(s.left, s.top);
        c.lineTo(s.left + s.width / 2, s.top / 2);
        c.lineTo(s.left + s.width, s.top);
        c.lineTo(s.left, s.top);
        c.closePath();
        c.stroke();
        c.fill();
        c.restore();
    };
    emptyStore() {
        const c = this.ctxStore;
        const s = this.store;
        c.clearRect(s.left, s.top, s.width, s.height)
        this.packages.emptyStore();
    }
    drawAll() {
        this.packages.drawAll();
    }
    inventory() {
        return this.packages.inventory();
    }
    remove() {
        return this.packages.remove();
    }
};
class StackPackages extends ItemCollection {
    constructor(ctxPack, boxSize, boxesPerRow, snake = true) {
        super();
        this.ctxPack = ctxPack;
        //        this.updateLeftBot(left, bot) ;
        this.boxSize = boxSize;
        this.boxesPerRow = boxesPerRow;
        this.snake = snake;
        this.box = {
            w: boxSize,
            h: boxSize,
            wInner: boxSize - 2,
            hInner: boxSize - 2,
            nPerRow: boxesPerRow
        };
    }
    emptyStore() {
        this.reset();
    };
    inventory() {
        return this.all.length;
    };
    updateLeftBot(left, bot) {
        this.left = left;
        this.bot = bot;
    }

    drawAll() {
        const c = this.ctxPack;
        for (let i = 0; i < this.all.length; i++) {
            this.all[i].draw();
        };
    };
	relCoord(k) {
		let row = Math.floor( k / this.box.nPerRow);
		let c = k % this.box.nPerRow;
		let col = (row % 2 == 0) ?
			c : this.box.nPerRow - 1 - c;
		return {x:this.box.w * col,
				y: - this.box.w * (1+row)};
	};
//    rx(k) {
//        return this.box.w * (k % this.box.nPerRow);
//    };
//    ry(k) {
//        return -this.box.h * (1 +
//            Math.floor(k / this.box.nPerRow));
//    };
    addExisting(item) {
        let point  = this.relCoord(this.all.length);
        let pack = new Package(this, this.ctxPack,
            item.color, this.boxSize,
            item.x, item.y);
        pack.addPath({
            t: simu.now + 200,
            x: this.left + point.x,
            y: this.bot + point.y
        });
    };
    addNew() {
        let point  = this.relCoord(this.all.length);
        let color = tioxColors[Math.floor(Math.random() *
            tioxColors.length)];
//        let tx = this.left + this.rx(k);
//		let ty = this.bot + this.ry(k);
//		console.log(' adding box', k, 'with coord',tx,ty);
		let pack = new Package(this, this.ctxPack,
            color, this.boxSize,
            this.left + point.x,
            this.bot + point.y);
 
    };
    remove() {
        let pack = this.removeFirst();
        if (this.snake) {
            let n = this.all.length;
            for (let k = 0; k < n; k++) {
                let p = this.all[k];
				let point  = this.relCoord(k);
                p.updatePath({
                    t: simu.now + 800,
                    x: this.left + point.x,
                    y: this.bot + point.y
                });
            };
        }
        return pack;
    };
	makeAllGrey(){
		for( let pack of this.all ){
			pack.graphic.color = darkGrey;
		}
	};
};
class Package extends Item {
    constructor(collection, ctx,
        color, boxSize, x, y) {
        super(collection, x, y);
        this.graphic = new ColorBox(ctx, color, boxSize);
		this.graphic.moveTo(x,y);
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
        this.ctx.beginPath();
		this.ctx.arc(this.x+this.boxSize/2,
					 this.y+this.boxSize/2,
					 7, 0, pi2);
		this.ctx.closePath();
		this.ctx.fill();	
//			fillRect(this.x, this.y,
//            this.boxSize - 2, this.boxSize - 7)
    };
};
