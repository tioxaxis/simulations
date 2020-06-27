"use strict";
// declaration of Globals

const tioxTimeConv = 10000;  //rates in tiox are k/10 seconds
import {GammaRV, Heap} 
    from './modules/utility.js';
import {Queue, Supplier, WalkAndDestroy, MachineCenter, 
        InfiniteMachineCenter}
    from './modules/procsteps.js' ;
import {simuParams} 
    from './modules/simuParams.js';


const theAnimation= {
    simu : null,
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
    
    checkChangeSimuParams: function(){
        if (!simuParams.changeFlag )return;
        if ( simuParams.changed('ar') ){
          theSimulation.interarrivalRV.setRate(
              simuParams.getParam ( 'ar' )/tioxTimeConv);
        }
        if ( simuParams.changed('acv') ){
          theSimulation.interarrivalRV.setCV(
              simuParams.getParam ( 'acv' ));
        }
        if ( simuParams.changed('sr') ){
          theSimulation.serviceRV.setRate(
              simuParams.getParam ( 'sr' )/tioxTimeConv);
        }
        if ( simuParams.changed('scv') ){
            theSimulation.serviceRV.setCV(
                simuParams.getParam ( 'scv' ));
        }
        if ( simuParams.changed('speed') ){
            theAnimation.framedelta = theAnimation.framedeltaFor1X * simuParams.getParam('speed');
            theChart.continue();
            Person.updateForSpeed();
        }
        simuParams.changeFlag = false;
    },
         
    eachFrame: function() {
        theAnimation.checkChangeSimuParams();
        
        let theTop ;
        while( (theTop = theAnimation.simu.heap.top())  &&
                theTop.time <= theAnimation.frametime ){
             const event = theAnimation.simu.heap.pull();
             theAnimation.simu.now = event.time;
             event.proc(event.item);
         }
        
            
        // move frame time ahead delta = 40 milliseconds => 25 frames/minute.
        theAnimation.simu.now = theAnimation.frametime;
        theAnimation.frametime += theAnimation.framedelta;             
        theAnimation.simu.theProcessCollection.moveDisplay();
        
        //escape hatch.
        if (theAnimation.frametime > 1000000 ){theAnimation.stop();
            console.log('reached limit and cleared Interval',            
                        theAnimation.intervalTimer, theAnimation.simu.now);
        }
        Person.check();
        theAnimation.theCanvas.renderAll();
    },
    qLenDisplay: null,
    
    resetBackground: function(theFabricCanvas){
        theFabricCanvas.clear();
        this.qLenDisplay = new fabric.Text( 'Queue Length = 0', 
            { fontSize: 20, visible: false, 
             left: 100, top: 250 });
        theFabricCanvas.add(this.qLenDisplay); 
        
        // put other things that are fixed and not people on stage.
    },
    
    initialize: function( simu ) {
        this.simu = simu;
        
        theAnimation.theCanvas = new fabric.Canvas('theCanvas', { renderOnAddRemove: false });
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
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
     Person.all.forEach(p=> p.moveDisplayWithPath(false))
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
        let r = simuParams.getParam('ar');
        let cv = simuParams.getParam('acv'); 
        this.interarrivalRV = new GammaRV(r/tioxTimeConv,cv);
        r = simuParams.getParam('sr');
        cv = simuParams.getParam('scv');
        this.serviceRV = new GammaRV(r/tioxTimeConv,cv);
        
        //queues
        this.supply = new Supplier(theSimulation, -50, 100);
    
                
        this.queue = new Queue("theQueue",-1,theSimulation, animForQueue.walkingTime,     
                animForQueue,
                recordQueueArrival, recordQueueLeave  );
        
        // define the helper functions
        function recordQueueArrival (person){
            person.arrivalTime = theSimulation.now;
        };
        function recordQueueLeave(person) {            
            theChart.push(theSimulation.now,theSimulation.now-person.arrivalTime);
         };
            
      
        this.walkOffStage = new WalkAndDestroy("walkOff", theSimulation, animForWalkOffStage, true);
    
    
        // machine centers 
        this.creator = new MachineCenter("creator", 1,theSimulation,this.interarrivalRV,
                                         this.supply, this.queue, 
                                         animForCreator);
            
        this.TSAagent = new MachineCenter("TSAagent",1,theSimulation,this.serviceRV,
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
     
 }; 

export class Person {
    static simu = null;
    static anim = null;
    static all = [];
    static personCounter = 0;
    static checkPointer = null;
    static updateForSpeed(){
        Person.all.forEach(p => p.computeCountDelta( p.pathList[0] ));
    };
    static setup(simu, anim){
        Person.simu = simu;
        Person.anim = anim;
        Person.checkPointer = null;
        Person.personCounter = 0;
        Person.all = [];
    };

    constructor (ahead, x,y= 100,w = 30,h = 30) {
        // capture first person;
        if(!Person.checkPointer) Person.checkPointer = this;  
        this.which = ++Person.personCounter;
       // console.log('just created person', personCounter, ' at time now',
//                   Person.simu.now);
        this.ahead = ahead;
        this.behind = null;
        Person.all.push(this);
                
        this.cur = {t: Person.simu.now, x: x, y: y};
        this.width = w;
        this.pathList = [];
        this.pathList[0]= {t: -1, x: -50, y: 100};
        this.arrivalTime = null;
        
        this.graphic = new fabric.Rect({top: 100,left:-50, width: w, height: h , fill: "blue" })
        Person.anim.theCanvas.add(this.graphic);
        //this.graphic = {width: w, height:h, color: "blue"};
         this.machine = null;
 //       thePersonCheck.push(this);
        
        //console.log('total people in PersonCheck = '+thePersonCheck.list.length)
        if ( ahead ) ahead.behind = this;
     };
    
    destroy(){
//        thePersonCheck.delete(this)
        let k = Person.all.indexOf(this);
        if (k < 0){alert('failed to find person in all');debugger}
        Person.all.splice(k,1);
        if ( this.behind ) {
            this.behind.ahead = null;
            Person.checkPointer = this.behind;
        }
        Person.anim.theCanvas.remove(this.graphic);  
    };
    
     moveDisplayWithPath (dontOverlap){
         let path = this.pathList[0];
         if (path.deltaX == null) this.computeCountDelta(path);  //first time only 
         else {
             if (path.count <= 0){
                 this.cur.x = path.x;
                 path.t = Person.anim.frametime;
             } else {
                 this.cur.x += path.deltaX;
                 this.cur.y += path.deltaY;
                 path.count--;
             }
                
            if( this.cur.x > 2000 || this.cur.y > 500){
                alert(' found person with too large coord');
                console.log(this);
                debugger;
            }
         }
         this.graphic.set('left',this.cur.x)
                    .set('top',this.cur.y).setCoords();    
     };
    
    setTime(time){
        this.pathList[0].t = time;
        this.computeCountDelta(this.pathList[0]);  
    };
    
     computeCountDelta(path){
         
         let previousFrameTime = Math.floor(Person.simu.now / Person.anim.framedelta)
         * Person.anim.framedelta;
         path.count = Math.floor((path.t - previousFrameTime)/Person.anim.framedelta);
         
        path.deltaX = ( path.x - this.cur.x ) / path.count;
         path.deltaY = ( path.y - this.cur.y ) / path.count;
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
    };
     
     setDestWithProcTime(procTime,x,y){
         let distance = Math.max(Math.abs(this.cur.x-x),
                                 Math.abs(this.cur.y-y));  
         let deltaTime = Math.min(distance/theStage.normalSpeed,procTime);
         this.pathList[0] = {t:Person.simu.now +deltaTime, x:x, y:y};
         this.computeCountDelta(this.pathList[0]);
     };


static  check(){
    let deltaX = 35;
    let d;
    let kq,ka;
    let q = Person.checkPointer;
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

  };  // end class Person



     

export function initializeAll(){
    theChart.initialize();
    theAnimation.initialize(theSimulation);
 
    Math.seedrandom('this is the Queueing Simulation');
    theSimulation.initialize();
    
    resetAll();   
};
 function resetAll(){
    Person.setup(theSimulation,theAnimation);
    theAnimation.reset();
    theChart.reset();
    theSimulation.reset();
    theAnimation.theCanvas.renderAll();
    
    
}

//  

function togglePlayPause() {
        if ( theAnimation.isRunning ) pause();
        else play();
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
document.getElementById('pauseButton').addEventListener('click',pause);
document.getElementById('resetButton').addEventListener('click',resetAll);
document.addEventListener('keydown',keyDownFunction);

function keyDownFunction (evt) {
            const key = evt.key; 
            if (evt.code === "Space") {
                togglePlayPause();
            }
}
 

//   TheChart variable is the interface to create the charts using Chart.js

export const theChart ={
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
                Number( simuParams.getParam('speed') )); 
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


