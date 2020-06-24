"use strict";
// declaration of Globals
const tioxInfinity = 5000000000000;
//import {jStat} from "./res/jstat.min.js";

     
class GammaRV {  
    constructor (rate,CV=0,minimumTime=20){
        this.rate = rate;
        this.CV = CV;
        this.minimumTime = minimumTime;
        
        this.setParams (rate, CV);
    };
    
    setRate(rate){
        this.rate = rate;
        this.setParams(this.rate,this.CV);
    };
   
    setCV(CV) {
           this.CV = CV;
           this.setParams(this.rate,this.CV);
    };
    
    setParams (rate, CV){    //note it takes the rate not the mean as input.
         this.zeroRate = rate == 0;
        this.deterministic = CV == 0;
       
        if (this.zeroRate) return
        this.mean = 1/rate;
        
        if (this.deterministic) return
        this.shape = 1/(CV*CV);
        this.scale =1/(rate*this.shape);
    };
    
   observe() {
       if ( this.zeroRate ) return tioxInfinity;
       if ( this.deterministic ) return this.mean; 
       const p = Math.random();
       return Math.max(this.minimumTime,jStat.gamma.inv(p,this.shape,this.scale));
   }; 
}; 
 
class Heap {
    constructor(compare){
        this.compare = compare;
        this.h = [];
    };
    
    reset (){
        this.h = [];
    };

     top(){
        return (this.h.length >0)? this.h[0] : null ;
    };

     push(event){
//         console.log('at heap pushing person or machine for proc', event.proc, 'future time ', event.time);
         
        this.h.push(event);
        let k = this.h.length - 1;
        while ( k >= 1 ){
            let pk = Math.floor( (k+1)/2 ) - 1;
            if ( this.compare(this.h[pk],this.h[k]) ) return;
            const temp = this.h[pk];
            this.h[pk] = this.h[k];
            this.h[k] = temp;
            k = pk;
            }
         return this.h.length;
     }

     pull(){
        const v = this.h[0];
        const r = this.h.pop();
        const n = this.h.length;
        if (n > 0) {
            this.h[0] = r;

            let k = 0;
            let lchild;
            while ( (lchild = k*2+1) < n ){
                let rchild = lchild + 1;
                if ( rchild == n || this.compare(this.h[lchild],this.h[rchild]) ){
                    if ( this.compare( this.h[lchild], this.h[k] )) {
                        const temp = this.h[k];
                        this.h[k] = this.h[lchild];
                        this.h[lchild] = temp;
                        k = lchild;
                    }
                    else break;
                }
                else {
                    if( this.compare(this.h[rchild], this.h[k]) ){
                         const temp = this.h[k];
                        this.h[k] = this.h[rchild];
                        this.h[rchild] = temp;
                        k = rchild; 
                    }
                    else break;    
                }
            }
        }
        return v;
    }
    }; //end class Heap


const theAnimation= {
    frametime : 0,        // like 'now' which is simulated time, but rounded to framedelta
    framedelta : 20,      //simulated time increment per frame
    framedeltaFor1X : 20,
    frameInterval:  20,     //milliseconds between frames
    intervalTimer : null,
    isRunning: false,
    theCanvas : null,
    
    start: function(){      
        if (theAnimation.isRunning) {
            alert(' called start but it is already running');
            debugger;
        }
        theAnimation.intervalTimer = setInterval( theAnimation.eachFrame,
                                    theAnimation.frameInterval );
        theAnimation.isRunning = true;
    },
    
    stop: function(){
        clearInterval(theAnimation.intervalTimer);
        theAnimation.isRunning = false;
        
    },
    
    eachFrame: function() {
        let theTop ;
        while( (theTop = theSimulation.heap.top())  &&
                theTop.time <= theAnimation.frametime ){
             const event = theSimulation.heap.pull();
             theSimulation.now = event.time;
             event.proc(event.item);
         }
        if( theAnimation.speedUpdateFlag ) updateForSpeed(allPeople)
        theAnimation.speedUpdateFlag = false;
        
            
        // move frame time ahead delta = 40 milliseconds => 25 frames/minute.
        theSimulation.now = theAnimation.frametime;
        theAnimation.frametime += theAnimation.framedelta;             
        theSimulation.theProcessCollection.moveDisplay();
        
        //escape hatch.
        if (theAnimation.frametime > 1000000 ){theAnimation.stop();
            console.log('reached limit and cleared Interval',            
                        this.intervalTimer, theSimulation.now);
        }
        check(checkPointer);
        theAnimation.theCanvas.renderAll();
    },
    qLenDisplay: null,
    
    resetBackground: function(theFabricCanvas){
        theFabricCanvas.clear();
        this.qLenDisplay = new fabric.Text('Queue Length = 0', 
                                           { fontSize: 20, visible: false, left: 100, top: 250 });
        theFabricCanvas.add(this.qLenDisplay); 
        
        // put other things that are fixed and not people on stage.
    },
    
    initialize: function() {
        theAnimation.theCanvas = new fabric.Canvas('theCanvas', { renderOnAddRemove: false });
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
//        theAnimation.theCanvas.on('mouse:down', function(options) {
//        console.log(options.e.clientX, options.e.clientY);
//        if (options.target) {
//            console.log('an object was clicked! ', options.target.type);
//            } } );
//    
    },
    
    reset: function() {
        theAnimation.frametime= 0;
        theAnimation.resetBackground(theAnimation.theCanvas);
        // the various process steps will be called on reset theSimulation.
    }
        
};

const theStage = {
    normalSpeed : .25,
    width: 1000,
    height: 300,
    pathY: 100,
    person: {dx: 40, dy: 60}
    
    
};
{
    theStage.offStageLeft = {x: -50, y: theStage.pathY};
    theStage.offStageRight = {x: theStage.width*1.1, y: theStage.pathY};
    
    theStage.headQueue = {x: theStage.width*0.70, y: theStage.pathY};
    theStage.queueDelta = {dx: theStage.person.dx, dy: 0};
    theStage.scanner = {x: theStage.width*0.75, y: theStage.pathY};
    theStage.pastScanner = {x: theStage.width*0.75+theStage.person.dx,
                           y: theStage.pathY};
    theStage.scannerDelta = {dx: 0, dy: theStage.person.dy};
};


const animForQueue = {
    loc : theStage.headQueue,
    delta : theStage.queueDelta,
    dontOverlap: true,
    walkingTime: (theStage.headQueue.x-theStage.offStageLeft.x)/theStage.normalSpeed,

    reset : function (){  
        this.loc = theStage.headQueue;
    },

    join: function ( nInQueue, arrivalTime, person ) {
        if ( person.isThereOverlap() ){
            person.cur.y = person.ahead.cur.y - 10;
        }
        person.pathList[0] = {t: arrivalTime, 
                         x: animForQueue.loc.x - animForQueue.delta.dx * nInQueue,
                         y: animForQueue.loc.y };
        person.graphic.set('fill', "green");  
    },

    arrive: function (nSeatsUsed, person) {
        person.graphic.set('fill', "orange");
        if ( nSeatsUsed > 10 ) theAnimation.qLenDisplay.set('text',
                    'Queue Length = ' + nSeatsUsed).set('visible',true);
    },

    leave: function (procTime, nSeatsUsed) {
        if ( nSeatsUsed > 5 )                
            theAnimation.qLenDisplay.set('text', 'Queue Length = ' + nSeatsUsed);
        else theAnimation.qLenDisplay.set('visible',false);
        
        for (let k = 0; k < theSimulation.queue.q.length; k++){
            let time;
            let p = theSimulation.queue.q[k];
            let dest = p.pathList[0];

            if ( k < theSimulation.queue.numSeatsUsed) 
                     dest.t = theSimulation.now +
                         Math.min(animForQueue.delta.dx/theStage.normalSpeed,procTime); 
                         
             dest.x += animForQueue.delta.dx;
             dest.y += animForQueue.delta.dy;
             p.computeCountDelta(p.pathList[0]);
        }
    }
};

const animForWalkOffStage = {
    loc: theStage.offStageRight,
    walkingTime: null,

    setWalkingTime: function (){
         this.walkingTime = Math.abs(theStage.scanner.x - this.loc.x)/theStage.normalSpeed;
        return this.walkingTime;
    },

    start: function (person){
         if ( person.isThereOverlap() ){
            person.cur.y = person.ahead.cur.y - 10;
         }
//            person.pathList[3] = {t: theSimulation.now+60/theStage.normalSpeed, x: 890, y: 100 };
            person.pathList[0] = {t: theSimulation.now+this.walkingTime,
                          x: this.loc.x, y: this.loc.y }
            person.graphic.set('fill',  "black");  
    }
};
        
 const animForCreator = {
    loc: theStage.offStageLeft,
    dontOverlap: false,

    reset: function () {
    },

    start: function (theProcTime,person,m)  {  // only 1 machine for creator m=1
       person.setDestWithProcTime(theProcTime,
            animForCreator.loc.x,animForCreator.loc.y);
        person.graphic.set('fill',"red");
    },
     
     finish: function () {},
       
};
        
const animForTSA = {
    firstLoc : theStage.scanner,
    delta : theStage.scannerDelta,
    dontOverlap: true,
    speedUpdateFlag: false,

    machLoc: null,
    lastFinPerson: null,
    
    reset:function ( numMachines ) {
         animForTSA.machLoc = [];
         let locX = animForTSA.firstLoc.x;
         let locY = animForTSA.firstLoc.y;
         for( let k = 0; k< numMachines; k++ ){
            const rect1 = new fabric.Rect(
                {left: theStage.scanner.x -10, 
                 top: theStage.scanner.y -15 + k*animForTSA.delta.dy,
                fill: 'white', stroke: 'blue', strokeWidth: 5,
                width: 45, height: 45});
            theAnimation.theCanvas.add(rect1);
            animForTSA.machLoc[k] = {x :locX, y :locY, rect: rect1};
            locX += animForTSA.delta.dx;
            locY += animForTSA.delta.dy;
        }    
    },
    start: function (theProcTime, person, m){
        person.setDestWithProcTime(theProcTime,
                animForTSA.machLoc[m].x,animForTSA.machLoc[m].y);
        person.graphic.set('fill',"purple");
        if (animForTSA.lastFinPerson){
            let path = animForTSA.lastFinPerson.pathList[0];
            if (path.t > theSimulation.now){
                    animForTSA.lastFinPerson.setTime( 
                        Math.min(path.t, theSimulation.now+theProcTime));
            }
        }    
    },
    
    finish: function(person){
        animForTSA.lastFinPerson = person;  
    }
};

class processCollection {
 constructor (){
     this.processList = [];  
 };

 push (aProcess) {
     this.processList.push(aProcess);
 };

 reset () {
     this.processList.forEach( aProcess => aProcess.reset() );
 };

 moveDisplay() {
     //theStage.clear();
     allPeople.forEach(p=> p.moveDisplayWithPath(false))
    // this.processList.forEach( aProcess => aProcess.moveDisplay() );
 };
    
markPeople() {
    thePersonCheck.clear();
     this.processList.forEach( aProcess => aProcess.markPeople() );
    let u = thePersonCheck.countUnmarked();
    if (u > 0 ){
        console.log('checked all the people',thePersonCheck.list.length, 'now=',theSimulation.now, 
               u,'  are unmarked');
        for (let k = 0; k<thePersonCheck.list.length; k++){
            if (!thePersonCheck.list[k].proc)console.log('unmarked is ', k);
        }
    }
};
}; // end class processCollection



const theSimulation = { 
    now: 0,
    interarrivalRV: null,
    serviceRV: null,
    
    heap : new Heap( (x,y) => x.time < y.time ),
    theProcessCollection : new processCollection(),
    
    supply : null,
    queue : null,
    walkOffStage :null,
    creator : null,
    TSAagent: null,
    
    initialize: function (){
    
        // random variables
        this.interarrivalRV = new GammaRV(sliders.arSlider.value/10000,sliders.acvSlider.value);
        this.serviceRV = new GammaRV(sliders.srSlider.value/10000,sliders.scvSlider.value);
        
        //queues
        this.supply = new Supplier(-50, 100);
    
                
        this.queue = new Queue("theQueue",-1, animForQueue.walkingTime,     
                animForQueue,
                recordQueueArrival, recordQueueLeave  );
        
        // define the helper functions
        function recordQueueArrival (person){
            person.arrivalTime = theSimulation.now;
        };
        function recordQueueLeave(person) {            
            theChart.push(theSimulation.now,theSimulation.now-person.arrivalTime);
         };
            
      
        this.walkOffStage = new WalkAndDestroy("walkOff", animForWalkOffStage, true);
    
    
        // machine centers 
        this.creator = new MachineCenter("creator", 1,this.interarrivalRV,
                                         this.supply, this.queue, 
                                         animForCreator);
            
        this.TSAagent = new MachineCenter("TSAagent",1,this.serviceRV,
                                          this.queue, this.walkOffStage,
                                         animForTSA);
         
        //link the queue to machine before and after
        this.queue.setPreviousNext(this.creator,this.TSAagent);

        // put all the things with visible people in theProcessCollection
        this.theProcessCollection.push(this.creator);
        this.theProcessCollection.push(this.queue);
        this.theProcessCollection.push(this.TSAagent);
        this.theProcessCollection.push(this.walkOffStage);
     },
    
    
    reset: function(){
        // schedule the initial Person to arrive and start the simulation/animation.  
        theSimulation.now = 0;
        this.heap.reset();
        this.theProcessCollection.reset();
        this.supply.previous = null;
//        thePersonCheck.reset();
        this.creator.knockFromPrevious();        
    },

};


function resizeChart(){
        const w = document.getElementById('canvasWrapper');
        const wW   = w.clientWidth;
        const newFontSize = wW / 750 * 14;
        theChart.chart.options.title.fontSize = newFontSize;
    theChart.chart.options.title.padding = 5;
    theChart.chart.options.legend.labels.fontSize = newFontSize;
    theChart.chart.options.legend.labels.padding = 10;
    
        theChart.chart.update();
        //alert(' in resize and w,h = '+wW+'  new font size');
      };
    
    
    
    
function resizeCanvas() {
    resizeChart();
    
    let theFabricCanvas = theAnimation.theCanvas;
    
    // w for wrapper,  c for canvas, W for width, H for height
    const w = document.getElementById('canvasWrapper');
    const cW = theFabricCanvas.getWidth();
    const cH = theFabricCanvas.getHeight();
    const ratio = cW / cH;
    const wW   = w.clientWidth;
    const wH  = w.clientHeight;
    
    
    const scale = wW /cW;
    
    const zoom  = theFabricCanvas.getZoom() * scale;
    /* console.log('Wrapper WH:'+cW+','+cH+
               '  theFabricCanvas WH:'+cW+','+cH+
               '   scale  '+scale+'   zoom '+zoom);
    */
    theFabricCanvas.setDimensions({width: wW, height: wW / ratio});
    theFabricCanvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
}





// QUEUE
class Queue {
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
        
        const arrivalTime = theSimulation.now + this.walkingTime;
        this.anim.join(this.q.length, arrivalTime, person);
        this.q.push(person);
         // insert into end of doubly linked list
        person.ahead = this.lastAdded;
        if (this.lastAdded) this.lastAdded.behind = person;
        this.lastAdded = person;

        
        theSimulation.heap.push( {time: arrivalTime,
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

//moveDisplay() {
//    this.q.forEach( p => p.moveDisplayWithPath(this.anim.dontOverlap) );
//};
markPeople(){
        let name = this.name;
        this.q.forEach( p => thePersonCheck.mark(p, name) );
};

};   //end class Queue
     
 
// SUPPLIER
class Supplier {
constructor (x,y){
    this.loc = {x:x,y:y};
    this.previous = null;
};

pull () {
      this.previous = new Person(this.previous, this.loc.x, this.loc.y); 
    return this.previous;
    //person is going to machine which should set destination. etc.
 }
};   //end class Supplier

//  WALK AND DESTROY
class WalkAndDestroy {
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
    
    
    theSimulation.heap.push( {time:theSimulation.now+this.walkingTime, 
            proc: this.destroy.bind(this), item: person});
    return true;
};
    
destroy (person) {
//    if (this.q[0] != person ) {
//        alert( ' in walk and destroy and q[0]  != person') ;
//        debugger;
//    }
//    person.destroy();
    //  this.q.shift();
    // remove 'person' from doubly linked list
    let b = person.behind;
    let a = person.ahead;
    if (b) b.ahead = person;
    if (a) a.behind = person;
    person.destroy();
}

//moveDisplay() {
////    if ( this.q.length == 0 ) return;
////    if ( this.q[0].ahead ) {
////        console.log(' move and destroy head of q has nonzero "ahead"');
////        debugger;
////    }
//    
////    if( this.q[0].cur.x >= this.loc.x ){
//////        console.log(' about to delete person ',this.q[0].which, this.q)
////        this.q[0].destroy();
////        this.q.shift();
////    }
//    let p = this.lastAdded;
//    while ( p ) {
//        p.moveDisplayWithPath(this.dontOverlap);
//        p = p.ahead;
//    }
//};
markPeople(){
    let name = this.name;
    this.q.forEach( p => thePersonCheck.mark(p, name) );
};

};  //end class WalkAndDestroy

//   MACHINE CENTER         
class MachineCenter {
     constructor (name, numMachines,procTime,
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
        this.reset();
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

             theSimulation.heap.push( {time:theSimulation.now+theProcTime, 
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

//     moveDisplay() {
//         for ( let mach of this.machs) {
//            if( mach.person ) {
//                mach.person.moveDisplayWithPath( this.anim.dontOverlap );
//            }
//         }
//     };
    
    markPeople(){
        let name = this.name;
        this.machs.forEach( 
            function (mach) {if(mach.person) thePersonCheck.mark(mach.person, name)}
        );
    };


};  //end class MachineCenter

// INFINITE MACHINE CENTER
class InfiniteMachineCenter  extends MachineCenter {
     constructor (name, procTime, input, output){
         super(name, -1, procTime,
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

function check(initialPointer){
    let deltaX = 35;
    let d;
    let kq,ka;
    let q = initialPointer;
   // let prevX = 850 + deltaX;
    while (q && q.graphic.fill == 'black' ) {
        if ( q.cur.x > 80 ){
            if (q.cur.x > 1101)foundError('too big x',1101);
            //   if (q.cur.x < 850 && q.cur.x < prevX-deltaX)
     //       foundError('too small x',850);
     //   prevX = q.cur.x
            //if (q.cur.y < 99) foundError('too small y',99);
            if (q.cur.y > 301) foundError('too big y',301);
        //if (q.behind.cur.x > q.cur.x -deltaX)
         //       foundError('behind too close',q.behind.cur.x);
        }
        q = q.behind;
    }
    while (q && q.graphic.fill == 'purple') {
        if ( q.cur.x > 80 ){
            if (q.cur.x > 851)foundError('too big x',851);
            //if (q.cur.x < 800) foundError('too small x',800);
            //if (q.cur.y > 101) foundError('y is high',100);
//            if (q.behind.cur.x > q.cur.x -deltaX) 
//                foundError('behind too close',q.behind.cur.x);
        }
       q = q.behind;
    }
    while (q && q.graphic.fill == 'orange') {
        if ( q.cur.x > 80 ){ 
            
            if (q.cur.x > 801)foundError('too big x',801);
            //if (q.cur.x < 100) foundError('too small x',100);
       
            if(q.ahead.graphic.fill == 'orange') { 
//                if ( (d= q.ahead.cur.x-q.cur.x) >60)
//                    foundError('oranges separated in currents there is a blank of size', d);
////                if( (d= q.ahead.pathList[0].x-q.pathList[0].x) > 60)
//                    foundErrror(' Oranges separated in destinations  blank of size',d);
            }
            if (q.cur.y > 101) foundError('y is off',100);
//            if (q.behind.cur.x > q.cur.x -deltaX)
//                foundError('behind too close',q.behind.cur.x);
        }
        q = q.behind;
    }
    while (q && q.graphic.fill == 'green') {
       if ( q.cur.x > 80 ){
           if (q.cur.x > 801)foundError('too big x',801);
            //if (q.cur.x < 50) foundError('too small x',50);
            if (q.cur.y > 101) foundError('y is high ',100);
//            if( q.ahead  && q.ahead.graphic.fill == 'green'){
//                kq = q.pathList.length-1;
//                ka = q.ahead.pathList.length-1;
//                if ( (d = q.ahead.pathList[ka].x-q.pathList[kq].x) > 60) 
//                foundError(' Greens separated in destinations ',d);
//            } 

//             if (q.behind.cur.x > q.cur.x -deltaX 
//                && q.behind.graphic.fill == 'green')
//                    foundError('behind too close',q.behind.cur.x);
       }
        q = q.behind;
    }
    function foundError(message, s) {
        console.log(' found inconsistency at person ',q.which, q.graphic.fill,'/n (x,y) = (',q.cur.x,q.cur.y,')', message,
                    'with value ',s)
        
        let k = 0;
        let p = initialPointer;
        while (p){
            console.log(p.which,'(x,y)=',p.cur.x,p.cur.y,p.graphic.fill);
            p = p.behind;
            if (k++ > 30){alert('infinite loop?'); break}
        };
        
        debugger;
    }

} 



 class PersonCheck {
     constructor(){
         this.list = [];
     };
     push (x){
         this.list.push({item:x,proc: null});
     };
     clear (){
         this.list.forEach(function(y){ y.proc = null;})
     }
     reset (){
         this.list = [];
     }
     mark (x,proc){
         let k = this.list.findIndex(y => y.item == x);
         if (k<0){
             console.log(' in ',proc, 'cant find',x);  
         } else if (this.list.proc){
             console.log('for item ',x, ' found in list but already has proc ',this.list[k].proc, 'vs ',proc);
             
         } else this.list[k].proc = proc;
     };
     countUnmarked () {
         let count = 0;
         for (let y of this.list){
             if(y.proc == null ) count++;
         }
         return count;
     };
     
     delete(p){
        let k = this.list.findIndex(y => y.item === p);
         this.list.splice(k,1);
     };
     
 };  // end class PersonCheck
//let thePersonCheck = new PersonCheck();
     

 var personCounter = 0;
var checkPointer = null;
var allPeople=[];

function updateForSpeed(allPeople){
    allPeople.forEach(p=>p.computeCountDelta(p.pathList[0]));
};

class Person {
    constructor (ahead, x,y= 100,w = 30,h = 30) {
        if(!checkPointer) checkPointer = this;  // capture first person;
        this.which = ++personCounter;
       // console.log('just created person', personCounter, ' at time now',
//                   theSimulation.now);
        this.ahead = ahead;
        this.behind = null;
        allPeople.push(this);
                
        this.cur = {t: theSimulation.now, x: x, y: y};
        this.width = w;
        this.pathList = [];
        this.pathList[0]= {t: -1, x: -50, y: 100};
//        this.pathList[1]= {t: -1, x: 800, y: 100};
//        this.pathList[2]= {t: -1, x: 850, y: 100};
//        this.pathList[3]= {t: -1, x: 910, y: 100};
//        this.pathList[4]= {t: -1, x: 1100, y: 100};
//        this.pathList[5]= {t: -1, x: 5000, y: 100};
//        this.index = 0;
        this.arrivalTime = null;
        
        this.graphic = new fabric.Rect({top: 100,left:-50, width: w, height: h , fill: "blue" })
        theAnimation.theCanvas.add(this.graphic);
        //this.graphic = {width: w, height:h, color: "blue"};
         this.machine = null;
 //       thePersonCheck.push(this);
        
        //console.log('total people in PersonCheck = '+thePersonCheck.list.length)
        if ( ahead ) ahead.behind = this;
     };
    
    destroy(){
//        thePersonCheck.delete(this)
        let k = allPeople.indexOf(this);
        if (k < 0){alert('failed to find person in allPeople');debugger}
        allPeople.splice(k,1);
        if ( this.behind ) {
            this.behind.ahead = null;
            checkPointer = this.behind;
        }
        theAnimation.theCanvas.remove(this.graphic);  
    };
    
     moveDisplayWithPath (dontOverlap){
         let path = this.pathList[0];
         if (path.deltaX == null) this.computeCountDelta(path);  //first time only 
         else {
//             if (theSimulation.now < path.t) {  //regular increment case
//                if (path.deltaX < 0 ) {
//                    alert ('found a negative delta X');
//                    debugger;
//                }  
//  
             if (path.count <= 0){
                 this.cur.x = path.x;
                 path.t = theAnimation.frametime;
             } else {
                 this.cur.x += path.deltaX;
                 this.cur.y += path.deltaY;
                 path.count--;
             }
                
            if( this.cur.x > 2000 || this.cur.y > 500){
                alert(' found person with too large coord');
                console.log(this);
                debugger;
//            } else { //end of one path, so find next path if it exists
//                while ( theSimulation.now >= path.t ){
//                    this.cur.x = path.x;
//                    this.cur.y = path.y;
//            
//                    if( this.pathList[this.index + 1].t < 0) return
//                    this.index++;
//                    path = this.pathList[this.index];
//                }
//            this.computeCountDelta(path);
//            }      
         }
         }
         this.graphic.set('left',this.cur.x)
                    .set('top',this.cur.y).setCoords();    
    
     };
    
    setTime(time){
        this.pathList[0].t = time;
        this.computeCountDelta(this.pathList[0]);  
    }
    
     computeCountDelta(path){
//            if (theSimulation.now > path.t) {
//                alert('found a negative delta t');
//                debugger;
//            };
//         if (path.t == this.cur.t ){
         
         
         let previousFrameTime = Math.floor(theSimulation.now / theAnimation.framedelta)
         * theAnimation.framedelta;
         path.count = Math.floor((path.t - previousFrameTime)/theAnimation.framedelta);
         
        path.deltaX = ( path.x - this.cur.x ) / path.count;
         path.deltaY = ( path.y - this.cur.y ) / path.count;
         
//         
//             this.cur.x = path.x;
//             this.cur.y = path.y
//             
//         } else { 
//             this.cur.x += (theSimulation.now-this.cur.t)*(path.x-this.cur.x)/(path.t-this.cur.t);
//             this.cur.y += (theSimulation.now-this.cur.t)*(path.y-this.cur.y)/(path.t-this.cur.t);
//         }
//         
//         path.count = Math.floor( 
//                 (path.t-theSimulation.now) / theAnimation.framedelta);
//         if(path.count == 0){
//             path.deltaX = 0;
//             path.deltaY = 0;
//         } else {
//            path.deltaX =  Math.max(0,(path.x-this.cur.x) / path.count - 1e-9);
//            path.deltaY =  (path.y-this.cur.y) / path.count ;
//         }
//         
         };
    
    isThereOverlap() {
        // is 'p' graph above the 'a' graph in [0, p.count] ?
        let p = this;
        let a = this.ahead;
        if ( !a ) return false;
        let pPath = p.pathList[0];
        let aPath = a.pathList[0];
        
        if (  p.cur.x + p.width > a.cur.x ) return true;
        if ( pPath.deltaX <= aPath.deltaX ) return false;
        return (a.cur.x - p.width - p.cur.x)/(pPath.deltaX - aPath.deltaX) <= pPath.count;
    }
     
     setDestWithProcTime(procTime,x,y){
         let distance = Math.max(Math.abs(this.cur.x-x),
                                 Math.abs(this.cur.y-y));  
         let deltaTime = Math.min(distance/theStage.normalSpeed,procTime);
         this.pathList[0] = {t:theSimulation.now +deltaTime, x:x, y:y};
         this.computeCountDelta(this.pathList[0]);
     }
  };  // end class Person


     

export function initializeAll(){
    sliders.initialize();
    presets.initialize();
    theChart.initialize();
    theAnimation.initialize();
 
    Math.seedrandom('this is the Queueing Simulation');
    theSimulation.initialize();
    
    resetAll();   
};

function resetAll(){
    allPeople=[];
    theAnimation.reset();
    theChart.reset();
    theSimulation.reset();
    theAnimation.theCanvas.renderAll();
    
    
}

 
// two Nodelist routines;
    function getChecked (nodelist){
        for (let j = 0; j < nodelist.length; j++){
            if (nodelist[j].checked ) return j
        }
        return -1;
    }
    function setChecked (nodelist,j) {
        nodelist[j].checked = true;
    }


// this is the structure to keep track of the sliders (both values and displays)
const sliders = {
        // pointers to the slider, i.e.,input range objects
        arSlider: null,
        acvSlider: null,
        srSlider: null,
        scvSlider: null,
        speedSlider: null,
        resetCheckboxPointer: null,
        actionRadioNodelist: null,
    
        // pointers to the display of the values of the sliders
        arDisplay: null,
        acvDisplay: null,
        srDisplay: null,
        scvDisplay: null,
        speedDisplay: null,
        
    // this goes with the next function
    initialize: function(){
        this.arSlider = document.getElementById("arrivalRate");
        this.arDisplay = document.getElementById("arrivalRateDisplay");
        this.acvSlider = document.getElementById("arrivalVariability");
        this.acvDisplay = document.getElementById("arrivalVariabilityDisplay");
        this.srSlider = document.getElementById("serviceRate");
        this.srDisplay = document.getElementById("serviceRateDisplay");
        this.scvSlider = document.getElementById("serviceVariability");
        this.scvDisplay = document.getElementById("serviceVariabilityDisplay");
        this.speedSlider = document.getElementById("speed");
        this.speedDisplay = document.getElementById("speedDisplay");
        this.actionRadioNodelist = document.getElementsByName("actionRadio");
        this.resetCheckboxPointer = document.getElementById("resetCheckbox");
        
        
        this.arSlider.oninput =  function () {
            let v = Number( sliders.arSlider.value ).toFixed(1);
            theSimulation.interarrivalRV.setRate(v/10000);
            sliders.arDisplay.innerHTML = v;
            setCurrentLi('ar', v);
            
        };
        this.acvSlider.oninput = function () {
            let v = Number( sliders.acvSlider.value ).toFixed(1);
            theSimulation.interarrivalRV.setCV(v);
            sliders.acvDisplay.innerHTML = v;
            setCurrentLi('acv', v);
            
        };
        this.srSlider.oninput =  function () {
           let v = Number( sliders.srSlider.value ).toFixed(1);
            theSimulation.serviceRV.setRate(v/10000);
            sliders.srDisplay.innerHTML = v;
            setCurrentLi('sr', v);
        };
        this.scvSlider.oninput = function () {
            let v = Number( sliders.scvSlider.value ).toFixed(1);
            theSimulation.serviceRV.setCV(v);
            sliders.scvDisplay.innerHTML = v;
            setCurrentLi('scv', v);
            
        };
        this.speedSlider.oninput = function(){ 
            let v = Number( sliders.speedSlider.value ).toFixed(0);
            theAnimation.framedelta =  
                theAnimation.framedeltaFor1X*v;
            theChart.continue(); 
            sliders.speedDisplay.innerHTML = v;
            setCurrentLi('speed', v);
            theAnimation.speedUpdateFlag = true;
        };
        
         
    },
    
    setSlidersFrom: function (aPreset){
        this.arSlider.value = aPreset.ar;
        this.arDisplay.innerHTML = aPreset.ar;
        this.acvSlider.value = aPreset.acv;
        this.acvDisplay.innerHTML = aPreset.acv;
        
        this.srSlider.value = aPreset.sr;
        this.srDisplay.innerHTML = aPreset.sr;
        this.scvSlider.value = aPreset.scv;
        this.scvDisplay.innerHTML= aPreset.scv;
         
        this.speedSlider.value = aPreset.speed;
        this.speedDisplay.innerHTML = aPreset.speed;
        
        if (presets.editMode) {
            setChecked(this.actionRadioNodelist,aPreset.action);
            this.resetCheckboxPointer.checked = aPreset.reset == "true";
        }
        // if things are setup and need to be adjusted fix 5 values for theSimulation/theAnimation.
        if( theSimulation.interarrivalRV ) {
            theSimulation.interarrivalRV.setParams(
                Number( sliders.arSlider.value )/10000,
                Number( sliders.acvSlider.value ));
            
            theSimulation.serviceRV.setParams(
                Number( sliders.srSlider.value )/10000,
                Number( sliders.scvSlider.value ));
        
            theAnimation.framedelta =  
               theAnimation.framedeltaFor1X*Number( sliders.speedSlider.value );
             theChart.continue();
            theAnimation.speedUpdateFlag = true;
           
        }
    },
    
    getSliders: function () {
        return  {ar: this.arSlider.value,
                 acv: this.acvSlider.value,
                 sr: this.srSlider.value,
                 scv : this.scvSlider.value,
                 speed : this.speedSlider.value};
    },
    
    actionRadio : function (value) {
            presets.currentLi.dataset.action = value;
    },
        
    resetCheck : function(checked) {
            presets.currentLi.dataset.reset = checked;
    },
};

function createOne(params) {
            const liElem = document.createElement("LI");
            liElem.innerHTML = params.desc;
            liElem.dataset.ar = params.ar;
            liElem.dataset.acv = params.acv;
            liElem.dataset.sr = params.sr;
            liElem.dataset.scv = params.scv;
            liElem.dataset.speed = params.speed;
            liElem.dataset.action = params.action;
            liElem.dataset.reset = params.reset;
            return liElem;
        }

function setCurrentLi(key, v){
            if (presets.editMode) {
                presets.currentLi.dataset[key] = v;
            } else {
                if ( presets.currentLi ) presets.currentLi.classList.remove("selected");
                presets.currentLi = null;  
            };
         }
function nextLi() {
    if ( presets.currentLi ) {
        if ( presets.currentLi.nextElementSibling )
            return presets.currentLi.nextElementSibling; 
        return presets.currentLi;
    }
    return presets.ulPointer.firstElementChild;  
}

function previousLi() {
    if ( presets.currentLi ) {
        if ( presets.currentLi.previousElementSibling )
            return presets.currentLi.previousElementSibling;
        return presets.currentLi;
    }
    return presets.ulPointer.lastElementChild;  
}

function neighborLi() {
    if ( !presets.currentLi ) return null;
    if ( presets.currentLi.previousElementSibling )
            return presets.currentLi.previousElementSibling;
    if ( presets.currentLi.nextElementSibling )
            return presets.currentLi.nextElementSibling; 
    return null; 
}



const presets = {
        
        currentLi: null,     // poiner to current  LI in the UL in the HTML
        ulPointer: null,     //pointer to the UL in the HTML
        textInpBox: null,
        
        started: null,    
        textMode: false,
        editMode: false,
    
        saveState: null,
       
    
    initialize: async function (){
         // setup the input text box
        this.textInpBox = document.createElement("INPUT");
        this.textInpBox.type = "text";
        this.textInpBox.className = "textInput";
        this.textInpBox.placeholder = "preset name";
        
        this.ulPointer = document.getElementById("ULPresetList");
        this.ulPointer.addEventListener('click', this.liClicked);
        this.ulPointer.addEventListener('dblclick', this.liDblClicked);
        
        
        var presetsRows=null;

        let presetsString = location.search;
        if ( presetsString ) {
            presetsString = decodeURI(presetsString.slice(9));
            let rows = presetsString.split(';');
            rows.pop();
            for (let row of rows ) {
                let elems = row.split(',');
                presets.ulPointer.append(createOne({ar:elems[0], acv:elems[1], sr:elems[2], scv:elems[3], speed:elems[4], action: elems[5], reset: elems[6], desc: elems[7]}));
            }
        } else {
        
        
            presetsString = localStorage.getItem("TIOX");
            if (presetsString) {
                presetsRows = JSON.parse(presetsString);

            } else {
                let response = await fetch('presets.json');
                if (response.ok) { 
                 presetsRows = await response.json();
                } 
//              else {
//                  alert("HTTP-Error: " + response.status);
//               }
           
            }     
           createList(presetsRows)
        }

        presets.printPresets();


        // defaults to nothing selected in list
        presets.currentLi = null;
        this.started = true;
        
        document.getElementById('addButton')
            .addEventListener('click',presets.addRow);
        document.getElementById('deleteButton')
            .addEventListener('click',presets.deleteSelected);
        document.getElementById('editButton')
            .addEventListener('click',presets.startEdit);
        document.getElementById('saveButton')
            .addEventListener('click',presets.saveEdit);
        document.getElementById('cancelButton')
            .addEventListener('click',presets.cancelEdit);
        document.getElementById('exportButton')
            .addEventListener('click',presets.export)
        ;
            
        document.addEventListener('keydown',keyDownFunction);
        
        function keyDownFunction (evt) {
            // evt = evt || window.event;
            const key = evt.key; 
            if (key === "Escape"){
                let elem = document.getElementById( 'exportBoxOuter');
                if (elem.style.display  == 'block' ) 
                    elem.style.display = 'none'
                else presets.deleteTextInpBox();
            } else if (key === "Enter"){
                if ( presets.editMode ) 
                    if ( presets.textMode ) presets.saveModifiedDesc();
                    else  presets.addTextBox(presets.currentLi.innerHTML);
            } else if( key === "ArrowDown"  || key === "PageDown" ){
                presets.nextRow();
            } else if( key === "ArrowUp"  || key === "PageUp" ){
                presets.previousRow();
            }
        }
    },

    
    printPresets: function () {
        console.log(presets.ulPointer);
    },
    
    // utilities for the text box:  Delete, Save, Add  from the CurrentLi row.
    deleteTextInpBox : function () {
        if ( presets.textMode ) {
            presets.currentLi.removeChild(this.textInpBox);
            presets.textMode = false;
        }
    },
    
    saveModifiedDesc : function(){
        if ( this.textMode ) {
            this.textMode = false;
            this.currentLi.removeChild(this.textInpBox);
            this.currentLi.innerHTML =  this.textInpBox.value;   
        }
        return   presets.currentLi ? presets.currentLi.innerHTML : '' ;   //does this test ever apply?
    },
    
    addTextBox : function(name){
        this.textMode = true;
        this.currentLi.appendChild(this.textInpBox);
        this.textInpBox.value = name;
        this.textInpBox.focus();    
    },
    
    // for adding an new Preset row
   addRow: function() {
        let desc =''
        if ( presets.ulPointer.childElementCount > 0 ) desc = presets.saveModifiedDesc() + " copy";
        if ( presets.currentLi ) presets.currentLi.classList.remove("selected");

        const li = createOne({ desc: desc,
                           ar: sliders.arSlider.value,
                            acv: sliders.acvSlider.value,
                            sr: sliders.srSlider.value,
                            scv: sliders.scvSlider.value,
                            speed: sliders.speedSlider.value,
                            action: getChecked(sliders.actionRadioNodelist), 
                            reset: sliders.resetCheckboxPointer.checked.toString()  
                             })
        li.classList.add("selected");
        presets.ulPointer.append(li);
        presets.currentLi = li;
        }, 
    
    nextRow: function() {
        if ( document.activeElement.tagName=="BODY"){ 
            presets.changeCurrentLiTo(nextLi());
        }
    },
    
    previousRow: function() {
        if( document.activeElement.tagName=="BODY"){
            presets.changeCurrentLiTo( previousLi());
        }
    },
    
    deleteSelected: function (){
        if ( !presets.currentLi )return;
            
        let save = presets.currentLi
        presets.changeCurrentLiTo(neighborLi());
        presets.ulPointer.removeChild(save);               
    },
    
    changeCurrentLiTo: function (newRow){
        presets.saveModifiedDesc();
        if ( presets.currentLi ) this.currentLi.classList.remove("selected");
        if ( newRow ) {
            newRow.classList.add("selected");
            sliders.setSlidersFrom(newRow.dataset);
            if ( !presets.editMode ){
                if (newRow.dataset.reset == "true") resetAll();
                if ( newRow.dataset.action == '1' && theAnimation.isRunning ) pause();
                else if ( newRow.dataset.action == '2' && !theAnimation.isRunning ) play();
            }
        };
        presets.currentLi = newRow;
        
    },

    
    // Routines to start, cancel and save an edit    
    startEdit: function(){
        presets.save = {slidersValues : sliders.getSliders(), theJSON: createJSON()};
        //    save / clone the list ulPointer.
        
        presets.editMode = true; 
        // if nothing is selected as we enter edit mode pick first preset;  Also pause.
        let x = presets.ulPointer.firstElementChild;
        if ( !presets.currentLi ) presets.changeCurrentLiTo(x);
        pause();
        
        document.getElementById("addButton").style.display = "block";
        document.getElementById('deleteButton').style.display = 'block';
        document.getElementById('menuBox').style.display = 'block';
        document.getElementById('editBox').style.display = 'none';
        document.getElementById('actionOptions').style.display = 'flex';
        document.getElementById('playButtons').style.display = 'none';
        
    },
    
    exitEdit: function() {
        presets.editMode = false;
        presets.saveModifiedDesc();
        document.getElementById("addButton").style.display = "none";
        document.getElementById('deleteButton').style.display = 'none';
        document.getElementById('menuBox').style.display = 'none';
        document.getElementById('editBox').style.display = 'block';
        document.getElementById('actionOptions').style.display = 'none';
        document.getElementById('playButtons').style.display = 'flex'; 
    },
    
    // this restores previous state (to what it was at start of edit)
    cancelEdit: function() {
        presets.exitEdit();
        // delete the list and insert the old one, need to make sure currentLi is correct.
        createList(JSON.parse(presets.save.theJSON));
        sliders.setSlidersFrom(presets.save.slidersValues);
        presets.currentLi = null;     
    },
    
    // sorts and saves the cuurent list to localStorage
    saveEdit: function(){
        presets.exitEdit();
        // delete the cloned UL
                
        // sort the Li's in UL;  key is desc
        function sortTheUL( container ) { 
            let contents = container.querySelectorAll("li");  
            let list = [];
            for ( let i = 0; i < contents.length; i++){
                list.push(contents[i]); 
            }
            list.sort((a, b) => a.innerHTML.localeCompare(b.innerHTML));
            
            for( let i = 0; i < list.length; i++ ){
//                console.log(list[i].innerHTML);
                container.append(list[i]);
            }
        }
        
        sortTheUL(presets.ulPointer);
        localStorage.setItem("TIOX",createJSON());
    },
    
    export: function() {
        document.getElementById('exportBoxOuter').style = 'display:block';
        //document.getElementById('containerOuter').style = 'display:none';
        document.getElementById('jsonDisplay').innerHTML = createJSON();
        document.getElementById('urlDisplay').innerHTML = createURL();
    },
    
    //  user clicked on an item in the list, possibly changing the selected choice
    //  and if textMode save the last entered name into the selected row
    liClicked: function(ev) {
        if (ev.target == presets.currentLi  || ev.target.parentNode == presets.currentLi ) return;
        
        presets.saveModifiedDesc();
        if (ev.target.tagName === 'LI') {
            presets.changeCurrentLiTo(ev.target);
        };
    },
        
    // 2. double click on item in UL list;  start editing name if in edit mode
    liDblClicked: function(ev){
        if( !presets.editMode ) return;
        if ( presets.textMode ) return;  // ignore if in text mode already; everything is setup.
        if(ev.target == presets.currentLi) {
            presets.addTextBox(ev.target.childNodes[0].nodeValue);
         }
    }
};

 function play(){ 
        document.getElementById('playButton').style.display = 'none';
        document.getElementById('pauseButton').style.display = 'inline';  
        theAnimation.start() ;
    };
function pause(){
        document.getElementById('pauseButton').style.display ='none';
        document.getElementById('playButton').style.display = 'block';
        theAnimation.stop()
};
document.getElementById('playButton').addEventListener('click',play);
document.getElementById('pauseButton').addEventListener('mouseup',pause);
document.getElementById('resetButton').addEventListener('mouseup',resetAll);


function createURL() {
    let searchStr = location.href+'?presets=';
    let contents = document.querySelectorAll('#ULPresetList li');
        for (let i = 0; i <contents.length; i++) {
           searchStr += contents[i].dataset.ar + "," +
                    contents[i].dataset.acv + "," +
                    contents[i].dataset.sr + "," +
                    contents[i].dataset.scv + "," +
                    contents[i].dataset.speed + "," +
                    contents[i].dataset.action + "," +
                    contents[i].dataset.reset + "," +
                    contents[i].innerHTML + ";" 
        }
        return searchStr; 
}

function createJSON() {
            let rows= [];
            let contents = document.querySelectorAll('#ULPresetList li');
            for (let i = 0; i <contents.length; i++) {
                rows[i] = {...contents[i].dataset};
                rows[i].desc = contents[i].innerHTML;
            }
            let JSONstr = JSON.stringify(rows);
            return JSONstr;
};

function createList(presetsRows) {
    presets.ulPointer.innerHTML ='';
    if (presetsRows) {
        for (let row of presetsRows){
            presets.ulPointer.append(createOne(row));
        }  
    }

}

//   TheChart variable is the interface to create the charts using Chart.js

const theChart ={
    canvas: null,
    ctx: null,
    chart: null,
    stuff: {
        type: 'scatter',
        data: {
       	    datasets: [
                {  //*** Series #1
                label: 'individual wait',
                pointBackgroundColor: 'rgba(0,0,220,1)',
                pointBorderColor: 'rgba(0,0,220,1)',
                showLine: true,
                lineTension:0,
                pointRadius: 5,
                borderColor: 'rgba(0,0,220,1)',
                    borderWidth: 3,
                fill: false,

                data: []
                },
                {   //*** Series #2
                label: 'average wait',
                pointBackgroundColor: 'rgba(0,150,0,1)',
                pointBorderColor: 'rgba(0,150,0,1)',
                showLine: true,
                lineTension: 0,
                pointRadius: 5,
                borderColor: 'rgba(0,150,0,1)',
                    borderWidth: 4,
                fill: false,

                data: [],
                }
            ]
        },
        options: {
            animation: {duration: 0}, // general animation time
            hover: {animationDuration: 0}, // duration of animations when hovering an item
            responsiveAnimationDuration: 0, // animation duration after a resize
            maintainAspectRatio: false,
            responsive: true,
            pointBackgroundColor : 'rgba(255,0,0,1)',
            showLiness: true,
            layout:{
                padding: {
                    left: 20,
                    right: 60,
                    top:20,
                    bottom:20
                }
            },
            legend:{
                display: true,
                position: 'bottom',
                labels: {boxWidth: 20,
                        //fontSize: 14,
                        padding: 20}
            },
            title:{
               display: true,
                position: 'top',
                text: 'Waiting Time',
                //fontSize: 20,
            },   
            scales: {
                xAxes: [{
                    type: 'linear',
                    position: 'bottom',
                    gridLines:{color: 'rgba(0,0,0,.3)'
                              },
                    zeroLineColor:'rgba(0,0,0,.3)',
                   //ticks:{ fontSize: 14,}
                }],
                yAxes: [{
                    type: 'linear',
                    gridLines:{color: 'rgba(0,0,0,.3)'
                              },
                    zeroLineColor:'rgba(0,0,0,.3)', 
                    //ticks:{ fontSize: 14,}
                }]
            }
            }
        
            },
    total: null,
    count: null,
    graphInitialTimeWidth: 40,
    ghrapInitialTimeShift: 30,
    graphTimeWidth: null,
    graphTimeShift: null,
    graphMin: null,
    graphMax: null,
    graphScale: null,  
    yAxisScale: null,
    initialize: function(){
        this.canvas = document.getElementById('chart')
        this.ctx = this.canvas.getContext('2d'); 
        this.chart =  new Chart(this.ctx, this.stuff); 
        this.reset();
    }, 
    reset: function(){
        this.stuff.data.datasets[0].data=[];
        this.stuff.data.datasets[1].data=[];
        this.total = 0;
        this.count = 0;
        this.graphScale = 1;
        this.yAxisScale = {max: .4, stepSize: .1};
        this.aVAxis = new VerticalAxisValue();
        this.graphMin = 0;
        this.graphMax = this.graphInitialTimeWidth;
        this.chart.options.scales.yAxes[0].ticks.min = 0;
        this.chart.options.scales.yAxes[0].ticks.max = this.yAxisScale.max;
        this.chart.options.scales.yAxes[0].ticks.stepSize = this.yAxisScale.stepSize;
        this.continue();
    },
    continue: function(){
        this.graphScale = Math.max(this.graphScale,
                          Number( sliders.speedSlider.value )); 
        this.graphTimeWidth = this.graphInitialTimeWidth*this.graphScale;
        this.graphTimeShift = this.ghrapInitialTimeShift*this.graphScale;
        this.graphMax = Math.max(this.graphMax,this.graphMin + this.graphTimeWidth);
        this.chart.options.scales.xAxes[0].ticks.min = this.graphMin;
        this.chart.options.scales.xAxes[0].ticks.max = this.graphMax;
        this.chart.options.scales.xAxes[0].ticks.stepSize = this.graphTimeWidth - this.graphTimeShift;
        var points = Math.max(1,Math.floor( (11-this.graphScale)/2));
        this.chart.data.datasets[0].pointRadius = points;
        this.chart.data.datasets[0].borderWidth = points;
        this.chart.data.datasets[1].pointRadius = points;
        this.chart.data.datasets[1].borderWidth = points;
        this.chart.update();
    },
    push: function (t,w){ 
        t /= 1000;
        w /= 1000;
        this.total += w;
        this.count++;
        if (t > this.graphMax) {
            this.graphMin += this.graphTimeShift;
            this.graphMax += this.graphTimeShift;
            this.chart.options.scales.xAxes[0].ticks.min = this.graphMin;
            this.chart.options.scales.xAxes[0].ticks.max = this.graphMax;
            }
        if ( w > this.yAxisScale.max){
            this.yAxisScale = this.aVAxis.update(w);
            this.chart.options.scales.yAxes[0].ticks.max = this.yAxisScale.max;
            this.chart.options.scales.yAxes[0].ticks.stepSize = this.yAxisScale.stepSize;
        }
        this.chart.data.datasets[0].data.push({x:t,y:w});
        this.chart.data.datasets[1].data.push({x:t,y:this.total/this.count});
        this.chart.update();
        // update graph with time, this.total/this.waits.length
    } 
}

class VerticalAxisValue {
    constructor(){
        this.table= [
           { max: 0.4,  stepSize: 0.1},
           { max: 0.5,  stepSize: 0.1},
           { max: 0.6,  stepSize: 0.2},
           { max: 0.8,  stepSize: 0.2},
           { max: 1.0,  stepSize: 0.2},
           { max: 1.5,  stepSize: 0.5},
           { max: 2,    stepSize: 0.5},
           { max: 3,    stepSize: 1.0}
        ];   
    };
    update (y) {
        while (y > this.table[0].max){
            this.table.push({max: this.table[0].max*10,stepSize: this.table[0].stepSize*10});
            this.table.shift();
        }
        return this.table[0];
    }
} ;


