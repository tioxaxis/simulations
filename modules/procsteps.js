import {Heap} from './utility.js';

simu.now = 0;
    
simu.heap = new Heap ((x,y) => x.time < y.time );
   
simu.frametime = 0;       // like 'now' which is simulated time, but rounded to framedelta
simu.framedelta = 5;  //simulated time increment per frame
simu.framedeltaFor1X = 5;
simu.frameInterval =  20;    //milliseconds between frames
simu.frameSpeed = 1.0;    //framedelta/framedeltaFor1X
simu.intervalTimer = null;
simu.isRunning = false;
simu.nameOfSimulation = null;
simu.theCanvas = null;
    
simu.initialize = function(  ) {
        simu.theCanvas = new fabric.Canvas('theCanvas', { renderOnAddRemove: false });
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        //simu.reset();
    };
    
simu.reset = function() {
        simu.now = 0;
        simu.heap.reset();
        
        simu.frametime= 0;
        // the various process steps will be called on reset theSimulation.
        simu.reset2();
        
    };
    
    

//console.log(' inside procsteps &&&&&&& and global test = ',globalTest);
//console.log(simu);

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
        if (document.getElementById('playButtons')
            .style.display == 'none') return
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
            if (evt.code == "Space") {
                togglePlayPause();
            }
}
var maxtime = 0;
function eachFrame () {
//        let date = new Date() ;
//        let t = date.getMilliseconds();
        let theTop;
        //console.log ('frametime ',simu.frametime);
        while( (theTop = simu.heap.top())  &&
                theTop.time <= simu.frametime ){
             const event = simu.heap.pull();
             simu.now = event.time;
             event.proc(event.item);
         }
        
            
        // move frame time ahead delta = 40 milliseconds => 25 frames/minute.
        simu.now = simu.frametime;
        simu.frametime += simu.framedelta;             
        SPerson.moveDisplayAll();
        
        //escape hatch.
//        if (simu.frametime > 1000000 ){pause();
//            console.log('reached limit and cleared Interval',            
//                        simu.intervalTimer, simu.now);
//        }
        simu.theCanvas.renderAll();
//        let ndate = new Date();
//        let nt = ndate.getMilliseconds();
//        maxtime = Math.max(maxtime, nt-t);
//        console.log(' max time ',maxtime);
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
    };

empty (){
    return this.numSeatsUsed == 0;
};

front () {
    if( this.numSeatsUsed > 0) return this.q[0];
};
    
queueLength () {
    return this.q.length;
}

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

        
        simu.heap.push( {time: arrivalTime, type: 'arrive',
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
//        this.q.forEach(p => console.log('which',p.which,p.pathList, p));
        return;
    };

};   //end class Queue
     
 

//  WALK AND DESTROY
export class WalkAndDestroy {
constructor (name, animForWalkAndDestroy, dontOverlap){
    this.name = name;
    this.animForWalkAndDestroy = animForWalkAndDestroy;
    
    this.walkingTime =this.animForWalkAndDestroy.computeWalkingTime();
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
    
    
    simu.heap.push( {time:simu.now+this.walkingTime, type: 'walkoff', 
            proc: this.destroy.bind(this), item: person});
    return true;
};
    
destroy (person) {
    let b = person.behind;
    let a = person.ahead;
    if (b) b.ahead = person;
    if (a) a.behind = person;
    person.destroy();
};
};  //end export class WalkAndDestroy

//   MACHINE CENTER         
 export class MachineCenter {
     constructor (name, numMachines, procTime,
                   previousQ,nextQ, 
                  anim,
                  recordStart = null, recordFinish = null){
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
        
    reset (){
        this.machs = [];
        for ( let k = 0; k < this.numMachines; k++){
             this.machs[k] = {status : 'idle', person : null, index: k};
         }
        this.anim.reset(this.numMachines);
        this.numberBusy = 0
    };
    
     getAverageProcTime(){
       return this.procTime.mean;  
     };
     
     getNumberBusy () {return this.numberBusy};
         
     
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

             simu.heap.push( {time:simu.now+theProcTime, type:'finish/'+this.name,
                proc: this.finish.bind(this), item: machine});
             if (this.recordStart) this.recordStart(person);
             this.numberBusy++;
             //remove 'person' from doubly linked list
             if (person.behind) person.behind.ahead = null;
             person.behind = null;
         };
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
        this.numberBusy--;
//        {
//            console.log('time =', simu.now);
//            for( let p of allSPerson){
//                console.log(p.which,p.arrivalTime);
//            }
//        }
     };   

};  //end class MachineCenter

// INFINITE MACHINE CENTER
 export class InfiniteMachineCenter  extends MachineCenter {
     constructor (name,  procTime, input, output,anim,
                  recordStart,recordFinish){
         super(name, -1,  procTime,
                   input, output, 
                  anim, recordStart,recordFinish) ;
         //create a first machine to avoid a nasty edge case, make the machine idle with noone.
        this.machs.push( {status : 'idle', person : null } );
        this.name = name;

     };

     findIdle() {
        let m = this.machs.findIndex( x => x.status == 'idle' )
        if (m >= 0) return m;
        else { // infinite number of machines and none is free so create a new one.  
               this.machs.push( {status: 'idle', person: null });
               return this.machs.length -1; 
         }
     };
};  //end class InfiniteMachineCenter

// minimal Person with properties only for the simulation, the procsteps
export var allSPerson = [];
var counterSPerson = 0;
export class SPerson {

    static reset(){
        allSPerson = [];
        counterSPerson = 0;  
    };
    static moveDisplayAll (){
        allSPerson.forEach(p=> p.moveDisplayWithPath())
    } 
    
    static updateForSpeed(){
        allSPerson.forEach(p => p.updateAllPaths());
    };

    constructor (ahead, x, y){
        this.which = ++counterSPerson;
        this.ahead = ahead;
        this.behind = null;
        allSPerson.push(this);
        this.cur = {t: simu.now, x: x, y: y};
        this.pathList = [];
        this.arrivalTime = null;
        this.machine = null;
        this.graphic = null;
        if ( ahead ) ahead.behind = this;
    };
    
   setColor(bodyColor,borderColor){
         this.graphic.setColor(bodyColor,borderColor);
     }
    
   moveDisplayWithPath (){
         if (this.pathList.length == 0) return;
         let path = this.pathList[0];
         if (path.count <= 0){
             this.cur.x = path.x;
             this.cur.y = path.y;
             this.pathList.splice(0,1);
         } else {
             this.cur.x += path.deltaX;
             this.cur.y += path.deltaY;
             path.count--;
         };

        if( this.cur.x > 2000 || this.cur.y > 500){
            alert(' found person with too large coord');
            console.log(this);
            debugger;
        };
         this.graphic.moveTo(this.cur.x,this.cur.y);    
     };  
    
    updatePathDelta(t,dx,dy){
        let n = this.pathList.length;
        let tempPath = this.pathList[n-1];
//        if (this.pathList.length > 1 ){
//             alert( 'pathlist has length greater than 1 on update');
//             debugger;
//         }
        this.pathList.splice(n-1,1);
        this.addPath( {t: t,
                  x: tempPath.x+dx,
                  y: tempPath.y+dy} )
    };

    updatePath(triple) {
         if (this.pathList.length > 1 ){
             alert( 'pathlist has length greater than 1 on update');
             debugger;
         }
         this.pathList.splice(0,1);
         this.addPath(triple);
     };
     
    updateAllPaths(){
         let oldList = this.pathList;
         this.pathList = [];
         for ( let triple of oldList ){
             this.addPath( triple );
         }
    };

    addPath(triple){
        this.pathList.push(triple);
        const n = this.pathList.length;
        let last = {};
        if ( n == 1 ) {
            last = {t: simu.now, x: this.cur.x, y: this.cur.y };
        } else {
            last = this.pathList[n-2];
        }

        let previousFrameTime = Math.floor(last.t / simu.framedelta)
                                    * simu.framedelta;
        let path = this.pathList[n-1];
        path.count = Math.floor((path.t - previousFrameTime) /                                     simu.framedelta);
        if ( path.count == 0 ){
             path.deltaX = 0;
             path.deltaY = 0;
        } else {
            path.deltaX = ( path.x - last.x ) / path.count;
            path.deltaY = ( path.y - last.y ) / path.count;
        }
//        console.log('in add Path', this.which,this.pathList, this);
//        debugger;
    };  

    destroy(){
        let k = allSPerson.indexOf(this);
        if (k < 0){alert('failed to find person in all');debugger}
        allSPerson.splice(k,1);
        if ( this.behind ) {
            this.behind.ahead = null;
        };
        simu.theCanvas.remove(this.graphic.figure);
    };
} ;    // end of class SPerson

var SFcolors = ['rgb(28, 62, 203)', 'rgb(80, 212, 146)',
                        'rgb(151, 78, 224)', 'rgb(234, 27, 234)',
                        'rgb(232, 100, 51)', 'yellow',
                        'rgb(0, 0, 0)', 'rgb(74, 26, 204)',
                        'rgb(6, 190, 234)', 'rgb(206, 24, 115)'];
var SFborders = ['black', 'black', 'black', 'black',
                         'gray', 'black', 'rgb(80, 212, 146)', 'black',
                         'black', 'gray', 'black', 'black']; 
export class   StickFigure {
//    static colors = ['rgb(28, 62, 203)', 'rgb(80, 212, 146)',
//                        'rgb(151, 78, 224)', 'rgb(234, 27, 234)',
//                        'rgb(232, 100, 51)', 'yellow',
//                        'rgb(0, 0, 0)', 'rgb(74, 26, 204)',
//                        'rgb(6, 190, 234)', 'rgb(206, 24, 115)'];
//    static borders = ['black', 'black', 'black', 'black',
//                         'gray', 'black', 'rgb(80, 212, 146)', 'black',
//                         'black', 'gray', 'black', 'black'];
        
    constructor (size){
        let n = Math.floor(Math.random()*SFcolors.length );
        let theColor = SFcolors[n];
        let theBorder = SFborders[n];
        this.theHead = new fabric.Circle({
            originX:"center", originY:"top",left: 0, top: 0,
            fill: theColor,stroke: theBorder,
            radius :size/8
            });
        this.theLeg1 = new fabric.Rect({
            originX:"center", originY:"top",left:0, top: 5/9*size, 
            fill: theColor, stroke: theBorder, 
            width:size/12,height: size*4/9,
            angle: 30, strokeWidth: 1,  
            centeredRotation: true});
        this.theArm2 = new fabric.Rect({
            originX:"center", originY:"top",left:0, top: .25*size,
            fill: theColor, stroke: theBorder,
            width:size/16,height:(size*4/9),
            angle: -30, strokeWidth: 1, 
            });
        this.theBody = new fabric.Rect({
            originX:"center", originY:"top", left: 0, top: .22*size,
            fill: theColor, stroke: theBorder,
            width:size/10, height: size*3/9,
            });
        
        this.theLeg2 = new fabric.Rect({
            originX:"center", originY:"top",left:0, top: 5/9*size,
            fill: theColor, stroke: theBorder,
            width:size/12,height: size*4/9,
            angle: -30, strokeWidth: 1,  
            centeredRotation: true});
        this.theArm1 = new fabric.Rect({
            originX:"center", originY:"top",left:0, top: .25*size, 
            fill: theColor, stroke: theBorder,
            width:size/16,height:(size*4/9),
            angle: 30, strokeWidth: 1, 
            });
        this.badge = new fabric.Text('0',{visible: false,
             left: 1/10*size, top: size/5,
              fill: theColor, stroke: theBorder, strokeWidth: 1,                            
             fontSize:2/5*size});
        
        this.figure = new fabric.Group([this.theArm1, this.theLeg1,  this.theBody,
                                this.theHead, this.theLeg2, this.theArm2, this.badge]);
        this.figure.selectable = false;
        simu.theCanvas.add(this.figure);
        this.deltaMaxX = size*(4/9);
        
        this.maxLegAngle = 100;
        this.maxArmAngle = 80;
        this.ratio = this.maxArmAngle/this.maxLegAngle;      this.walkDelta = 1;
    };
        
    initialPosition (x,y){
        this.curLegAngle = Math.random()*this.maxLegAngle;
        this.figure.set('left',x).set('top',y).setCoords();
    };
    
    badgeDisplay (bool){
        this.badge.set('visible',bool);
    }
    badgeSet(n){
        this.badge.set('text',n.toString());
    }
    
    setColor (bodyColor,borderColor){
        let parts = this.figure.getObjects();
        for ( let i = 0, len = parts.length; i < len; i++ ) {
            parts[i].set('fill',bodyColor).set('stroke',borderColor);
        }
    };
    
    // curLegAngle cycles thru [0,120] and actual goes thru [-30,30] then [30,-30]
    // via formula actual = abs( angle - 120/2) - 120/4
     moveTo(x,y){
        let deltaAngle = Math.abs(x-this.figure.get('left'))/this.deltaMaxX*this.maxLegAngle/2;
        this.curLegAngle = (this.curLegAngle + deltaAngle) % this.maxLegAngle;
        let adjLegAngle = Math.abs(this.curLegAngle - this.maxLegAngle/2)-this.maxLegAngle/4;
        let adjArmAngle = adjLegAngle * this.ratio
        this.theLeg1.set('angle', adjLegAngle);
        this.theLeg2.set('angle', -adjLegAngle);
        this.theArm2.set('angle', adjArmAngle );
        this.theArm1.set('angle', -adjArmAngle);
        this.figure.set('left',x).set('top',y).setCoords();
    };
};       // end of class StickFigure