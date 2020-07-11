"use strict";
// declaration of Globals

const tioxTimeConv = 10000;  //rates in tiox are k/10 seconds
import {GammaRV, Heap} from '../modules/utility.js';
//    from './modules/utility.js';
import {simu, Queue, WalkAndDestroy, MachineCenter, 
        InfiniteMachineCenter,SPerson,allSPerson, StickFigure}
    from '../modules/procsteps.js' ;
import {presets, sliders } from '../modules/rhs.js';

const theStage = {
    normalSpeed : .020,    //.25 pixels per millisecond
    width: 1000,
    height: 300,
    
    person: {width: 40, height: 60}   
};
{
    
    
    theStage.headQueue = {x: 150, y: theStage.pathY};
    theStage.box = {width:700,
                    height: 250,
                    fill: 'white', 
                    stroke: 'blue', 
                    strokeWidth: 3,
                   selectable: false};
    theStage.box.top = (theStage.height - theStage.box.height)/2;
    theStage.box.left = (theStage.width - theStage.box.width)/2;
    theStage.box.entryX = theStage.box.left;
    theStage.box.entryY = 
        (theStage.box.height - theStage.person.height)/2 + theStage.box.top;
    theStage.box.exitX = theStage.box.entryX + theStage.box.width;
    theStage.box.exitY = theStage.box.entryY;
    theStage.pathY = theStage.box.entryY;
    theStage.headQueue = { x: theStage.box.entryX, 
                           y: theStage.box.entryY};
    theStage.pathway = {left: 0, top: theStage.box.entryY,
                fill: 'white', stroke: 'green', strokeWidth: 0,
                        selectable: false,
                width: theStage.width, height: theStage.person.height};
    
    theStage.offStageLeft = {x: -100, y: theStage.pathY};
    theStage.offStageRight = {x: theStage.width+100, y: theStage.pathY};
};



simu.framedelta = 200;
simu.framedeltaFor1X = 200;
simu.nameOfSimulation = 'little'    //name for local storage
console.log(" in littles law setting name of Simulation to ",simu.nameOfSimulation);

simu.sliderTypes = {ar:'range', acv:'range', sr:'range',
    scv:'range', speed:'range', action:'radio', reset:'checkbox'},
simu.precision = {ar:1,acv:1,sr:1,scv:1,speed:0};

sliders.initialize();
presets.initialize();

class ProcessCollection {
 constructor (){
     this.processList = [];  
 };

 push (aProcess) {
     this.processList.push(aProcess);
 };

 reset () {
     this.processList.forEach( aProcess => aProcess.reset() );
 };
}; // end class processCollection

//var qLenDisplay= null;

 function resetBackground(){
    const c = simu.theCanvas;
    c.clear();
     let box = theStage.box;
     
    c.add( new fabric.Rect( box ) );
    c.add( new fabric.Rect( theStage.pathway ) );
     c.renderAll();
};

document.getElementById('sliderBigBox').addEventListener('input', captureChangeInSliderS);
const speeds = [1,2,5,10,25];
function captureChangeInSliderS(event){
//    console.log('is event '+(event.isTrusted?'real':'scripted'));
    let inputElem = event.target.closest('input');
    if (!inputElem) return
    
    var id = inputElem.id;
    if (inputElem.type == 'range'){
        var v = Number( inputElem.value )       
                .toFixed(simu.precision[id]);
        document.getElementById(id+'Display')
            .innerHTML = v;
    }
    switch(id) {
    case 'ar':  
        theSimulation.interarrivalRV
            .setRate(v/tioxTimeConv);
        break;
            
    case 'acv':  
        theSimulation.interarrivalRV.setCV(v);
        break;        

    case 'sr':  
        theSimulation.serviceRV.setTime(v*tioxTimeConv);
        break;
            
    case 'scv':  
        theSimulation.serviceRV.setCV(v);
        break;       

    case 'speed':
        simu.framedelta = simu.framedeltaFor1X * 
            speeds[v];
        simu.frameSpeed = speeds[v];
        theChart.continue();
        Person.updateForSpeed();
        document.getElementById(id+'Display')
            .innerHTML = speeds[v];
        break;

    default:
        console.log(' reached part for default');
        break;                       
    }   
}


var totInv, totTime, totPeople, lastArrDep;
simu.reset2 = function(){
    resetBackground();
    Person.reset();
    theChart.reset();     
    theProcessCollection.reset();
    totInv = totTime = totPeople = lastArrDep = 0;
    
    
        
    // schedule the initial Person to arrive and start the simulation/animation.
    theSimulation.supply.previous = null;
    theSimulation.creator.knockFromPrevious();
    
    //fudge to get animation started quickly
    let t = simu.heap.top().time-1;
    simu.frametime = Math.floor(t/simu.framedelta)*simu.framedelta;
    
    simu.theCanvas.renderAll();
};


simu.moveDisplayAll = function(){
    allSPerson.forEach(p=> p.moveDisplayWithPath(false))
} 
    


//  One variable for each process step or queue
//  that contains the functions to do the specific
//  animation for that process step

const animForQueue = {
    loc : theStage.headQueue,
    walkingTime: (theStage.headQueue.x-theStage.offStageLeft.x)/theStage.normalSpeed,

    reset : function (){  
    },

    join: function ( nInQueue, arrivalTime, person ) {
        person.addPath( {t: arrivalTime, 
                         x: animForQueue.loc.x,
                         y: animForQueue.loc.y } );
    },

    arrive: function (nSeatsUsed, person) {
    },

    leave: function (procTime, nSeatsUsed) {
    }
};

const animForWalkOffStage = {
    loc: theStage.offStageRight,
    walkingTime: null,

    computeWalkingTime: function (){
         this.walkingTime = Math.abs(theStage.box.exitX - this.loc.x)/theStage.normalSpeed;
        return this.walkingTime;
    },

    start: function (person){
        person.addPath( {t: simu.now + 
                theSimulation.walkOffStage.walkingTime,
                x: this.loc.x, y: this.loc.y } );
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
    },
     
     finish: function () {},
       
};
        
const animForLittlesBox = {
    lastFinPerson: null,
    
    reset:function (  ) {
    },
    
    start: function (theProcTime, person, m){
        let walkT = 100000;
        if ( theProcTime < walkT/2 ){
            person.addPath( {t: simu.now + theProcTime,
                    x: theStage.box.exitX, 
                    y: theStage.box.exitY} );
        } else { 
            walkT = Math.min( walkT, theProcTime);
            let rx = Math.random()  * 0.8 * theStage.box.width+
                theStage.box.width * 0.05;
            let ry = Math.random() * (theStage.box.height - 
                theStage.person.height) + theStage.box.top;
            let w = theStage.box.width;
            person.addPath( {t: simu.now + walkT * rx/w,
                    x: rx + theStage.box.entryX, 
                    y: ry} );
            person.addPath( 
                {t: simu.now +  walkT * rx/w + theProcTime - walkT,
                    x: rx + theStage.box.entryX, 
                    y: ry} );
            person.addPath( {t: simu.now + theProcTime,
                    x: theStage.box.exitX, 
                    y: theStage.box.exitY} );   
        }
        person.graphic.badgeDisplay(true);
        person.arrivalTime = simu.now;
    },
    
    finish: function(person){
        animForLittlesBox.lastFinPerson = person;
        person.updateBadge = false;
    }
};


var theProcessCollection = new ProcessCollection();

 const theSimulation = {
    //  the two random variables in the simulation
    interarrivalRV: null,
    serviceRV : null,
    
     // the 5 process steps in the simulation
    supply : null,
    queue : null,
    walkOffStage :null,
    creator : null,
    TSAagent: null,
    
    initialize: function (){
    
        // random variables
        let r = document.getElementById('ar').value;
        let cv = document.getElementById('acv').value; 
        theSimulation.interarrivalRV = new GammaRV(r/tioxTimeConv,cv);
        let t = document.getElementById('sr').value;
        cv = document.getElementById('scv').value;
        theSimulation.serviceRV = new GammaRV(1/t/tioxTimeConv,cv);
        
        //queues
        this.supply = new Supplier
              ( theStage.offStageLeft.x, theStage.offStageLeft.y);
    
                
        this.queue = new Queue("theQueue",-1, animForQueue.walkingTime,     
                animForQueue,
                null, null  );
        
//        // define the helper functions for theQueue
//        function recordQueueArrival (person){
//            person.arrivalTime = simu.now;
//        };
//        function recordQueueLeave(person) {            
//            theChart.push(simu.now,simu.now-person.arrivalTime);
//         };
//            
      
        this.walkOffStage = new WalkAndDestroy("walkOff",  animForWalkOffStage, true);
    
    
        // machine centers 
        this.creator = new MachineCenter("creator", 
             1,theSimulation.interarrivalRV,
             this.supply, this.queue, 
             animForCreator);
            
        this.LittlesBox = new InfiniteMachineCenter("LittlesBox",
              theSimulation.serviceRV,
              this.queue, this.walkOffStage,
              animForLittlesBox,LBRecordStart,LBRecordFinish);
        
        function LBRecordStart (person){
            
            person.arrivalTime = simu.now;
            totInv += (simu.now - lastArrDep) * 
                ( theSimulation.LittlesBox.getNumberBusy());
            lastArrDep = simu.now;
//            console.log(' LB start', person);
            //console.log('LB record start',simu.now,person);
            
        };
        function LBRecordFinish (person){
            totInv += (simu.now - lastArrDep) * 
                ( theSimulation.LittlesBox.getNumberBusy());
            lastArrDep = simu.now;
            totPeople++;
//            console.log(' at LB finish', simu.now,person.arrivalTime,person.which);
            totTime += simu.now - person.arrivalTime;
            
            theChart.push(simu.now, totInv/simu.now, totTime/simu.now );
            
            //console.log('LB record start',simu.now,person);
        };
        
         
        //link the queue to machine before and after
        this.queue.setPreviousNext(
            this.creator,this.LittlesBox);

        // put all the process steps with visible people in theProcessCollection
        theProcessCollection.push(this.creator);
        theProcessCollection.push(this.queue);
        theProcessCollection.push(this.LittlesBox);
        theProcessCollection.push(this.walkOffStage);
     },
};

// SUPPLIER
class Supplier {
    constructor ( x, y ){
        this.x = x;
        this.y = y;
        this.previous = null;
    };

    pull () {
        const oldcolors =['red','orange','blue','green',
                      'purple','green-yellow','magenta',
                      'brown','gray','coral'];
        const colors = ['rgb(28, 62, 203)', 'rgb(80, 212, 146)',
                        'rgb(151, 78, 224)', 'rgb(234, 27, 234)',
                        'rgb(232, 100, 51)', 'yellow',
                        'rgb(0, 0, 0)', 'rgb(74, 26, 204)',
                        'rgb(6, 190, 234)', 'rgb(206, 24, 115)'];
        const borders = ['black', 'black', 'black', 'black',
                         'gray', 'black', 'rgb(80, 212, 146)', 'black',
                         'black', 'gray', 'black', 'black']
         let n = Math.floor(Math.random()*colors.length );
        this.previous = new Person(this.previous, this.x, this.y,
                                  30, theStage.person.height); 
        this.previous.setColor(colors[n],borders[n]);
        return this.previous;
     }
};   //end class Supplier



export class Person extends SPerson {
    static updateForSpeed(){
        allSPerson.forEach(p => p.updateAllPaths());
    };
    
    static reset(){
        super.reset();
    };

    //  **** how do we start a person   with empty PathList!
    constructor (ahead, x,y= 60,w = 30,h = 30) {
        super(ahead);
        this.cur = {t: simu.now, x: x, y: y};
        this.width = w;
        this.pathList = [];
        
        
        this.graphic = new StickFigure('blue', h);
        this.graphic.initialPosition(-100,100);
//        new fabric.Rect({top: 100,left:-50, width: w, height: h , fill: "blue" })
        this.updateBadge = true;
        simu.theCanvas.add(this.graphic.figure);
     };
     setColor(bodyColor,borderColor){
         this.graphic.setColor(bodyColor,borderColor);
     }
    
    destroy(){
        super.destroy();
        simu.theCanvas.remove(this.graphic.figure);  
    };
    
     moveDisplayWithPath (dontOverlap){
        if (this.updateBadge){ 
            this.graphic.badgeSet(Math.round((simu.now-this.arrivalTime)/10000).toString()) 
        }
         
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
    
//    setTime(time){
//        this.pathList[0].t = time;
//        this.computeCountDelta(this.pathList[0]);  
//    };
//    
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
        if (n == 1 ) {
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
         this.addPath({t:simu.now +deltaTime, x:x, y:y});
     };

  };  // end class Person

//class   StickFigure {
//    constructor (theColor,size){
//        this.theHead = new fabric.Circle({
//            originX:"center", originY:"top",left: 0, top: 0,
//            fill: theColor, radius :size/8
//            });
//        this.theLeg1 = new fabric.Rect({
//            originX:"center", originY:"top",left:0, top: 5/9*size, 
//            fill: theColor,width:size/12,height: size*4/9,
//            angle: 30, strokeWidth: 1, stroke: 'black', 
//            centeredRotation: true});
//        this.theArm2 = new fabric.Rect({
//            originX:"center", originY:"top",left:0, top: .25*size,
//            fill: theColor,width:size/16,height:(size*4/9),
//            angle: -30, strokeWidth: 1, stroke: 'black',
//            });
//        this.theBody = new fabric.Rect({
//            originX:"center", originY:"top", left: 0, top: .22*size,
//            fill: theColor, width:size/10, height: size*3/9,
//            });
//        
//        this.theLeg2 = new fabric.Rect({
//            originX:"center", originY:"top",left:0, top: 5/9*size,
//            fill: theColor,width:size/12,height: size*4/9,
//            angle: -30, strokeWidth: 1, stroke: 'black', 
//            centeredRotation: true});
//        this.theArm1 = new fabric.Rect({
//            originX:"center", originY:"top",left:0, top: .25*size, 
//            fill: theColor,width:size/16,height:(size*4/9),
//            angle: 30, strokeWidth: 1, stroke: 'black'
//            });
//        this.badge = new fabric.Text('82',{visible: false,
//             left: 1/10*size, top: size/5,
//             fontSize:2/5*size});
//        
//        this.figure = new fabric.Group([this.theArm1, this.theLeg1,  this.theBody,
//                                this.theHead, this.theLeg2, this.theArm2, this.badge]);
//        this.figure.selectable = false;
//        this.deltaMaxX = size*(4/9);
//        
//     this.maxLegAngle = 100;
//        this.maxArmAngle = 80;
//        this.ratio = this.maxArmAngle/this.maxLegAngle;      this.walkDelta = 1;
//    };
//        
//    initialPosition (x,y){
//        this.curLegAngle = 0;
//        this.figure.set('left',x).set('top',y).setCoords();
//    };
//    
//    badgeDisplay (bool){
//        this.badge.set('visible',bool);
//    }
//    badgeSet(n){
//        this.badge.set('text',n.toString());
//    }
//    
//    setColor (bodyColor,borderColor){
//        let parts = this.figure.getObjects();
//        for ( let i = 0, len = parts.length; i < len; i++ ) {
//            parts[i].set('fill',bodyColor).set('stroke',borderColor);
//        }
//    };
//    
//    // curLegAngle cycles thru [0,120] and actual goes thru [-30,30] then [30,-30]
//    // via formula actual = abs( angle - 120/2) - 120/4
//     moveTo(x,y){
//        let deltaAngle = Math.abs(x-this.figure.get('left'))/this.deltaMaxX*this.maxLegAngle/2;
//        this.curLegAngle = (this.curLegAngle + deltaAngle) % this.maxLegAngle;
//        let adjLegAngle = Math.abs(this.curLegAngle - this.maxLegAngle/2)-this.maxLegAngle/4;
//        let adjArmAngle = adjLegAngle * this.ratio
//        this.theLeg1.set('angle', adjLegAngle);
//        this.theLeg2.set('angle', -adjLegAngle);
//        this.theArm2.set('angle', adjArmAngle );
//        this.theArm1.set('angle', -adjArmAngle);
//        this.figure.set('left',x).set('top',y).setCoords();
//    };
//};       // end of class StickFigure
    

 function initializeAll(){ 
    Math.seedrandom('this is the Queueing Simulation');
    simu.initialize();   // the generic
    theSimulation.initialize();   // the specific to queueing
    //reset first time to make sure it is ready to play.
    document.getElementById('resetButton').click();   
};
document.addEventListener("DOMContentLoaded",initializeAll);
 

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
                label: 'avg. inventory',
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
                label: 'avg. rate * avg. time',
                pointBackgroundColor: 'rgba(0,150,0,1)',
                pointBorderColor: 'rgba(0,150,0,1)',
                showLine: true,
                lineTension: 0,
                pointRadius: 3,
                borderColor: 'rgba(0,150,0,1)',
                    borderWidth: 3,
                fill: false,

                data: [],
                },
                {   //*** Series #3
                label: 'predicted inventory',
                pointBackgroundColor: 'rgb(185, 26, 26)',
                pointBorderColor: 'rgba(185, 26, 26)',
                showLine: true,
                    hidden: true,
                lineTension: 0,
                pointRadius: 0,
                borderColor: 'rgba(185, 26, 26)',
                    borderWidth: 3,
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
            //showLiness: true,
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
                text: 'Inventory',
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
    graphInitialTimeWidth: 100,
    graphInitialTimeShift: 100,
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
        resizeChart();
        this.reset();
    }, 
    reset: function(){
        this.stuff.data.datasets[0].data=[];
        this.stuff.data.datasets[1].data=[];
        this.stuff.data.datasets[2].data=[];
        this.total = 0;
        this.count = 0;
        this.graphScale = 1;
        this.yAxisScale = {max: 1, stepSize: .2};
        this.aVAxis = new VerticalAxisValue();
        this.graphMin = 0;
        this.graphMax = this.graphInitialTimeWidth;
        this.chart.options.scales.yAxes[0].ticks.min = 0;
        //this.yAxisScale = this.aVAxis.update(predictedInv()*2);
        this.chart.options.scales.yAxes[0].ticks.max = this.yAxisScale.max;
        this.chart.options.scales.yAxes[0].ticks.stepSize = this.yAxisScale.stepSize;
        this.continue();
    },
    continue: function(){
        this.graphScale = Math.max(this.graphScale, simu.frameSpeed); 
        this.graphTimeWidth = this.graphInitialTimeWidth*this.graphScale;
        this.graphTimeShift = this.graphInitialTimeShift*this.graphScale;
        this.graphMax = Math.max(this.graphMax,this.graphMin + this.graphTimeWidth);
        this.chart.options.scales.xAxes[0].ticks.min = this.graphMin;
        this.chart.options.scales.xAxes[0].ticks.max = this.graphMax;
        this.chart.options.scales.xAxes[0].ticks.stepSize = this.graphTimeWidth - this.graphTimeShift;
        var points = Math.max(1,Math.floor( (11-this.graphScale)/4));
        this.chart.data.datasets[0].pointRadius = 0;
        this.chart.data.datasets[0].borderWidth = points;
        this.chart.data.datasets[1].pointRadius = 0;
        this.chart.data.datasets[1].borderWidth = points;
        this.chart.data.datasets[2].borderWidth = points;
        this.chart.update();
    },
    push: function (t,inv,rt){
        
        t /= 10000;
        
        if (t > this.graphMax) {
            this.graphMin += this.graphTimeShift;
            this.graphMax += this.graphTimeShift;
            this.chart.options.scales.xAxes[0].ticks.min = this.graphMin;
            this.chart.options.scales.xAxes[0].ticks.max = this.graphMax;
            }
        const pI = predictedInv();
//        console.log( 'at chart ',t,inv,rt,pI);
        if ( inv > this.yAxisScale.max  || ( pI  && pI > this.yAxisScale.max ) ){
            this.yAxisScale = this.aVAxis.update(inv);
            this.yAxisScale = this.aVAxis.update(pI*2);
            this.chart.options.scales.yAxes[0].ticks.max = this.yAxisScale.max;
            this.chart.options.scales.yAxes[0].ticks.stepSize = this.yAxisScale.stepSize;
        }
        this.chart.data.datasets[0].data.push({x:t,y:inv});
        this.chart.data.datasets[1].data.push({x:t,y:rt});
        if (pI) this.chart.data.datasets[2].data.push({x:t,y:pI});
        this.chart.update();
        // update graph with time, this.total/this.waits.length
    } 
}

function predictedInv(){
    return (theSimulation.serviceRV.mean/tioxTimeConv)/(theSimulation.interarrivalRV.mean/tioxTimeConv);
}

class VerticalAxisValue {
    constructor(){
        this.table= [
           { max: 1.0,  stepSize: 0.2},
           { max: 1.5,  stepSize: 0.5},
           { max: 2,    stepSize: 0.5},
           { max: 3,    stepSize: 1.0},
           { max: 4,    stepSize: 1},
           { max: 5,    stepSize: 1},
           { max: 6,    stepSize: 2},
           { max: 8,    stepSize: 2},
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
window.addEventListener('resize', resizeChart);
theChart.initialize();


