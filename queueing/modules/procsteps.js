import {Heap} from './utility.js';

export var simu = {
    now: 0,
    
    heap: new Heap ((x,y) => x.time < y.time ),
   
    frametime : 0,        // like 'now' which is simulated time, but rounded to framedelta
    framedelta : 20,      //simulated time increment per frame
    framedeltaFor1X : 20,
    frameInterval:  20,    //milliseconds between frames
    frameSpeed : 1.0 ,       //framedelta/framedeltaFor1X
    intervalTimer : null,
    isRunning: false,
    theCanvas : null,
    
    initialize: function(  ) {
        simu.theCanvas = new fabric.Canvas('theCanvas', { renderOnAddRemove: false });
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        //simu.reset();
    },
    
    reset: function() {
        simu.now = 0;
        simu.heap.reset();
        
        simu.frametime= 0;
        // the various process steps will be called on reset theSimulation.
        simu.reset2();
        
    }
    
};

function resizeCanvas() {
    let theFabricCanvas = simu.theCanvas;
    
    // w for wrapper,  c for canvas, W for width, H for height
    const w = document.getElementById('canvasWrapper');
    const cW = theFabricCanvas.getWidth();
    const cH = theFabricCanvas.getHeight();
    const ratio = cW / cH;
    const wW   = w.clientWidth;
    const wH  = w.clientHeight;
    
    const scale = wW /cW;
    const zoom  = theFabricCanvas.getZoom() * scale;
    
    theFabricCanvas.setDimensions({width: wW, height: wW / ratio});
    theFabricCanvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]); 
}


// play pause toggle and listeners that run them.
function togglePlayPause() {
        if ( simu.isRunning ) pause();
        else play();
    };

function play(){ 
        if ( simu.isRunning ) return;
        document.getElementById('playButton').style.display = 'none';
        document.getElementById('pauseButton').style.display = 'inline';  
        simu.intervalTimer = setInterval(eachFrame, simu.frameInterval );
        simu.isRunning = true;;
    };
function pause(){
        if ( !simu.isRunning ) return; 
        document.getElementById('pauseButton').style.display ='none';
        document.getElementById('playButton').style.display = 'block';
        clearInterval(simu.intervalTimer);
        simu.isRunning = false;
};
document.getElementById('playButton').addEventListener('click',play);
document.getElementById('pauseButton').addEventListener('click',pause);
document.getElementById('resetButton').addEventListener('click',simu.reset);
document.addEventListener('keydown',keyDownFunction);

function keyDownFunction (evt) {
            const key = evt.key; 
            if (evt.code === "Space") {
                togglePlayPause();
            }
}

function eachFrame () {
 //       simu.checkChangeSimuParams();
        
        let theTop ;
        while( (theTop = simu.heap.top())  &&
                theTop.time <= simu.frametime ){
             const event = simu.heap.pull();
             simu.now = event.time;
             event.proc(event.item);
         }
        
            
        // move frame time ahead delta = 40 milliseconds => 25 frames/minute.
        simu.now = simu.frametime;
        simu.frametime += simu.framedelta;             
        simu.moveDisplayAll();
        
        //escape hatch.
        if (simu.frametime > 1000000 ){pause();
            console.log('reached limit and cleared Interval',            
                        simu.intervalTimer, simu.now);
        }
        // Person.check();
        simu.theCanvas.renderAll();
    };









export class Queue {
constructor (name, numSeats, walkingTime,
             anim,
             recordArrive = null, recordLeave = null ){
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

setPreviousNext (previousMachine, nextMachine){
    this.previousMachine = previousMachine;
    this.nextMachine = nextMachine;
    this.averageProcTime = nextMachine.getAverageProcTime();
    // get average time from machine next and store it here
};
        
reset (){
    this.q = [];
    this.lastAdded = null;
    this.numSeatsUsed = 0;
    this.anim.reset();
    }

empty (){
    return this.numSeatsUsed == 0;
};

front () {
    if( this.numSeatsUsed > 0) return this.q[0];
};

push (person) {
//   console.log('added person', person.which,person,' on queue ', this.name);
    
    if ( this.q.length == this.maxSeats ) return false;
    else {
        
        const arrivalTime = simu.now + this.walkingTime;
        this.anim.join(this.q.length, arrivalTime, person);
        this.q.push(person);
         // insert into end of doubly linked list
        person.ahead = this.lastAdded;
        if (this.lastAdded) this.lastAdded.behind = person;
        this.lastAdded = person;

        
        simu.heap.push( {time: arrivalTime,
            proc: this.arrive.bind(this), item: person});
        this.printQueue();
        return true;
    }
};
    
arrive (person) {
     this.numSeatsUsed++;
     this.anim.arrive(this.numSeatsUsed, person);
     if (this.recordArrive) this.recordArrive(person);
     if (this.numSeatsUsed == 1) this.nextMachine.knockFromPrevious() ;
    this.printQueue();
};
    
pull (procTime) {
    if ( this.numSeatsUsed == 0 ) return null;
    else {
        this.numSeatsUsed--;
        const person = this.q.shift();        
        this.anim.leave(procTime, this.numSeatsUsed);   /// this is the right thing but 
        if ( this.q.length < this.maxSeats ){
            this.previous.knock();
        }
        if ( this.recordLeave ) this.recordLeave(person);
        this.printQueue();
        return person;
    }
};
    printQueue(){
//        this.q.forEach(p => console.log('which',p.which,p));
        return;
    }

};   //end class Queue
     
 

//  WALK AND DESTROY
export class WalkAndDestroy {
constructor (name, animForWalkAndDestroy, dontOverlap){
    this.name = name;
    this.animForWalkAndDestroy = animForWalkAndDestroy;
    
    this.walkingTime =this.animForWalkAndDestroy.setWalkingTime();
    this.dontOverlap = dontOverlap;
    this.lastAdded = null;
    //this.q = [];   
};
    
reset(){
   // this.q = [];
    };

push (person) {
    // *******
    
    //this.q.push(person);
    // insert into end of doubly linked list
    person.ahead = this.lastAdded;
    if (this.lastAdded) this.lastAdded.behind = person;
    this.lastAdded = person;
    this.animForWalkAndDestroy.start(person);
    
    
    simu.heap.push( {time:simu.now+this.walkingTime, 
            proc: this.destroy.bind(this), item: person});
    return true;
};
    
destroy (person) {
    let b = person.behind;
    let a = person.ahead;
    if (b) b.ahead = person;
    if (a) a.behind = person;
    person.destroy();
}
};  //end export class WalkAndDestroy

//   MACHINE CENTER         
 export class MachineCenter {
     constructor (name, numMachines, procTime,
                   previousQ,nextQ, 
                  anim,
                  recordStart = null, recordFinish = null){
         this.name = name;
         this.numMachines = numMachines;
         this.procTime = procTime;
         
         this.previousQ = previousQ;
         this.nextQ = nextQ;
         this.anim = anim;
         this.recordStart = recordStart;
         this.recordFinish = recordFinish;
         
         this.machs = null;
         // setup machines if finite number with positions offset by dx,dy
         // if infinite number of machines then create them on the fly in same position.
     };
        
    reset (){
        this.machs = [];
        for ( let k = 0; k < this.numMachines; k++){
             this.machs[k] = {status : 'idle', person : null, index: k};
         }
        this.anim.reset(this.numMachines);
    }
    
     getAverageProcTime(){
       return this.procTime.mean;  
     };

     findIdle() {
        return  this.machs.findIndex( x => x.status == 'idle' );
     };

     findBlocked() {
        return this.machs.findIndex( x => x.status == 'blocked' )    
     };

     knockFromPrevious(){
        let m = this.findIdle();
        if (m >= 0) this.start(this.machs[m]);     
     };

     knockFromNext(){
         let m = this.findBlocked()
         if ( m >= 0 )this.finish(this.machs[m]);
     };

     start (machine) {
         
         let theProcTime = this.procTime.observe();
         const person = this.previousQ.pull(theProcTime);
         
         if ( person ) {             
             
             this.anim.start(theProcTime, person, machine.index);
             person.machine = machine;
             
             machine.status = 'busy';
             machine.person = person;

             simu.heap.push( {time:simu.now+theProcTime, 
                proc: this.finish.bind(this), item: machine});
             if (this.recordStart) this.recordStart(person);
             
             //remove 'person' from doubly linked list
             if (person.behind) person.behind.ahead = null;
             person.behind = null;
         }
     };
    
    finish (machine) {
         //console.log('finishing person', machine.person.which,' on machine ', this.name);
        
        let success = this.nextQ.push(machine.person);
        if ( success ) {
            if (this.recordFinish) this.recordFinish(machine.person);
            this.anim.finish(machine.person);
             machine.status = 'idle';
             machine.person = null;
             this.start(machine);
         }
         else {
             machine.status = 'blocked';
         }
     };   

};  //end class MachineCenter

// INFINITE MACHINE CENTER
 export class InfiniteMachineCenter  extends MachineCenter {
     constructor (name,  procTime, input, output){
         super(name, -1,  procTime,
                   previousQ, nextQ, 
                  null, null, null) ;
         //create a first machine to avoid a nasty edge case, make the machine idle with noone.
        this.machs.push( {status : 'idle', person : null } );
        this.name = name;

     };

     findIdle() {
        let m = this.machs.findIndex( x => x.status == 'idle' )
        if (m >= 0) return m;
        else { // infinite number of machines and none is free so create a new one.  
               this.machs.push( {status: 'idle', person: null, x: this.firstLoc.x, y: this.firstLoc.y});
               return this.machs.length -1; 
         }
     };
};  //end class InfiniteMachineCenter

// minimal Person with properties only for the simulation, the procsteps
export class SPerson {
    static all = [];
    static counter = 0;

static reset(){
    SPerson.all = [];
    SPerson.counter = 0;
    
};

constructor (ahead){
    this.which = ++SPerson.counter;
    this.ahead = ahead;
    this.behind = null;
    SPerson.all.push(this);
    this.arrivalTime = null;
    this.machine = null;
    if ( ahead ) ahead.behind = this;
};

destroy(){
    let k = SPerson.all.indexOf(this);
        if (k < 0){alert('failed to find person in all');debugger}
        SPerson.all.splice(k,1);
        if ( this.behind ) {
            this.behind.ahead = null;
        }   ;
    
};
}