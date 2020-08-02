"use strict";
// declaration of Globals

const tioxTimeConv = 1000;  //time are in milliseconds
import {GammaRV, UniformRV, Heap} from '../modules/utility.js';
import { Queue, WalkAndDestroy, MachineCenter, 
        InfiniteMachineCenter,SPerson,allSPerson, 
       GStickFigure, NStickFigure }
    from '../modules/procsteps.js' ;

const theStage = {
    normalSpeed : .10,    //.25 pixels per millisecond
    width: 1000,
    height: 300,
    
    person: {width: 40, height: 60}   
};

{   theStage.store = {left: 720, top:80, width:200, height: 200,
                     stroke:1};
    
    
    theStage.pathLeft = -100;
    theStage.pathRight = 700;
    theStage.pathTop = 50;
   theStage.pathBot = 200;
   theStage.offStageEntry = {x: theStage.pathLeft, y: theStage.pathTop};
    theStage.offStageExit = {x: theStage.pathLeft, y: theStage.pathBot};
    theStage.headQueue = {x: theStage.pathRight, y: theStage.pathBot};
};


simu.theStage = theStage;
simu.framedelta = 200;
simu.framedeltaFor1X = 200;
simu.sliderTypes = {dr:'range', dcv:'range', Cu:'range',
    Co:'range', quan: 'range', speed:'range', action:'radio', reset:'checkbox'},
simu.precision = {dr:0,dcv:1,Cu:0,Co:0,quant: 0,speed:0};
simu.editMode = false;

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

 function setBackground(){
    const background = document.getElementById('theBackground');
    const c = background.getContext('2d');
     const s = theStage.store;
     c.resetTransform();
     c.strokeStyle = 'black';
     c.lineWidth= s.stroke;;
      c.strokeRect(s.left, s.top, s.width, s.height);
     c.beginPath();
     c.moveTo(s.left, s.top);
     c.lineTo(s.left+s.width/2,s.top-50);
     c.lineTo(s.left+s.width,s.top);
     c.closePath();
     c.stroke();
 };

document.getElementById('sliderBigBox').addEventListener('input', captureChangeInSliderS);
const speeds = [1,3,10,30];
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
    case 'dr':  
        theSimulation.demandRV
            .setMean(v/tioxTimeConv);
//        theChart.updatePredictedInv();   
        break;
            
    case 'dcv':  
        theSimulation.demandRV.setVariance(v);
        break;        

    case 'Cu':  
        theSimulation.Cu = v;
        break;
            
    case 'Co':  
        theSimulation.Co = v;
        break;  
            
    case 'quan':
        theSimulation.quantityOrdered = v;
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


//var totInv, totTime, totPeople, lastArrDep, LBRFcount ;
simu.reset2 = function(){
    Person.reset();
    theChart.reset();     
    theProcessCollection.reset();
//    totInv = totTime = totPeople = lastArrDep = LBRFcount = 0;
    gSF = new GStickFigure( theStage.person.height );
    
    
        
    // schedule the initial Person to arrive and start the simulation/animation.
    theSimulation.supply.previous = null;
//    theSimulation.creator.knockFromPrevious();
    
    //fudge to get animation started quickly
//    let t = simu.heap.top().time-1;
//    simu.now = simu.frametime = Math.floor(t/simu.framedelta)*simu.framedelta;
    simu.heap.push( {time: simu.now+500, type: 'new cycle', 
        proc: theSimulation.demand.cycle.bind(theSimulation.demand), item: null});
    
};

//  One variable for each process step or queue
//  that contains the functions to do the specific
//  animation for that process step

const animForQueue = {
    walkingTime1: (theStage.pathRight - theStage.offStageEntry.x)/theStage.normalSpeed,
    walkingTime2: (theStage.pathBot - theStage.pathTop)/theStage.normalSpeed,
    walkingTime : ( (theStage.pathRight - theStage.offStageEntry.x) +
             (theStage.pathBot - theStage.pathTop)) /theStage.normalSpeed,
    
    reset : function (){ 
    },

    join: function ( qLength, arrivalTime, person ) {
         person.addPath( {t: arrivalTime - this.walkingTime2, 
                         x: theStage.pathRight,
                         y: theStage.pathTop } );
        person.addPath( {t: arrivalTime, 
                         x: theStage.pathRight,
                         y: theStage.pathBot } );
    },

    arrive: function (nSeatsUsed, person) {
    },

    leave: function (procTime, nSeatsUsed) {
    }
};

const animForWalkOffStage = {
    walkingTime: null,

    computeWalkingTime: function (){
         this.walkingTime = (theStage.pathRight - theStage.pathLeft) / theStage.normalSpeed;
        return this.walkingTime;
    },

    start: function (person){
        person.addPath( {t: simu.now + 
                this.walkingTime,
                x: theStage.pathLeft, y: theStage.pathBot } );
    }
};

 const animForCreator = {
    loc: theStage.offStageEntry,
    reset: function () {
    },

    start: function (theProcTime,person,m)  {  // only 1 machine for creator m=1
       person.setDestWithProcTime(theProcTime,
            animForCreator.loc.x,animForCreator.loc.y);
    },
     
     finish: function () {},
    };
        
const animForNV = {
    lastFinPerson: null,
    
    reset:function (  ) {
    },
    
    start: function (theProcTime, person, m){
//        let walkT = 5 * tioxTimeConv;
//        if ( theProcTime < walkT+ 3 * tioxTimeConv ){
//            person.addPath( {t: simu.now + theProcTime,
//                    x: theStage.box.exitX, 
//                    y: theStage.box.exitY} );
//        } else { 
//            walkT = Math.min( walkT, theProcTime);
//            let rx = Math.random()  * 0.8 * theStage.box.width+
//                theStage.box.width * 0.05;
//            let ry = Math.random() * (theStage.box.height - 
//                theStage.person.height) + theStage.box.top;
//            let w = theStage.box.width;
//            person.addPath( {t: simu.now + walkT * rx/w,
//                    x: rx + theStage.box.entryX, 
//                    y: ry} );
//            person.addPath( 
//                {t: simu.now +  walkT * rx/w + theProcTime - walkT,
//                    x: rx + theStage.box.entryX, 
//                    y: ry} );
//            person.addPath( {t: simu.now + theProcTime,
//                    x: theStage.box.exitX, 
//                    y: theStage.box.exitY} );   
//        }
        
        
//        person.graphic.badgeDisplay(true);
        person.arrivalTime = simu.now;
    },
    
    finish: function(person){
        animForNV.lastFinPerson = person;
    }
};


var theProcessCollection = new ProcessCollection();

 const theSimulation = {
    //  the two random variables in the simulation
    demandRV: null,
        
     // the 5 process steps in the simulation
    supply : null,
    queue : null,
    walkOffStage :null,
    demand : null,
    newsVendor: null,
     Cu : null,
     Co : null,
     quantityOrdered : null,
    
    initialize: function (){
        setBackground();
        
        
        
        
        // random variables
        let r = document.getElementById('dr').value;
        let cv = document.getElementById('dcv').value; 
        theSimulation.demandRV = new UniformRV(r,cv);
//        let t = document.getElementById('sr').value;
//        cv = document.getElementById('scv').value;
        theSimulation.serviceRV = new UniformRV(0,0);
        theSimulation.Co = document.getElementById('Co').value;
            theSimulation.Cu = document.getElementById('Cu').value;
            theSimulation.quantityOrdered = document.getElementById('quan').value;;
        
//        
        //queues
        this.supply = new Supplier
              ( theStage.offStageEntry.x, theStage.offStageEntry.y);
    
                
        this.queue = new Queue("theQueue",-1, animForQueue.walkingTime,     
                animForQueue,
                null, null  );
              
        this.walkOffStage = new WalkAndDestroy("walkOff",  animForWalkOffStage, true);
    
    
        // machine centers 
//        this.creator = new MachineCenter("creator", 
//             1,theSimulation.demandRV,
//             this.supply, this.queue, 
//             animForCreator);
            
        this.demand = new DemandCreator(20000, theSimulation.demandRV);
        
        this.newsVendor = new MachineCenter("newsVendor",1,
              theSimulation.serviceRV,
              this.queue, this.walkOffStage,
              animForNV,null,null);
        
//        function LBRecordStart (person){
//            
//            person.arrivalTime = simu.now;
//            totInv += (simu.now - lastArrDep) * 
//                ( theSimulation.LittlesBox.getNumberBusy());
//            lastArrDep = simu.now;
////            console.log(' LB start', person);
//            //console.log('LB record start',simu.now,person);
//            
//        };
//        function LBRecordFinish (person){
//            totInv += (simu.now - lastArrDep) * 
//                ( theSimulation.LittlesBox.getNumberBusy());
//            lastArrDep = simu.now;
//            totPeople++;
//            totTime += simu.now - person.arrivalTime;
//            LBRFcount = (LBRFcount + 1) % (simu.frameSpeed*5);
//            if (!LBRFcount){
//                theChart.push(simu.now, totInv/simu.now, totTime/simu.now );
//                console.log( 'in LBRF tot people ',totPeople)
//            };
//            
            
            
            //console.log('LB record start',simu.now,person);
        
        
         
        //link the queue to machine before and after
        this.queue.setPreviousNext(
            this.creator,this.newsVendor);

        // put all the process steps with visible people in theProcessCollection
//        theProcessCollection.push(this.creator);
        theProcessCollection.push(this.demand);
        theProcessCollection.push(this.queue);
        theProcessCollection.push(this.newsVendor);
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
        this.previous = new Person(this.previous, this.x, this.y,
                                  30, theStage.person.height); 
        return this.previous;
     }
};   //end class Supplier

const peopleSpacing = 60;
class DemandCreator {
    constructor (cycleLength, demandRV ){
        this.cycleLength = cycleLength;
        this.demandRV = demandRV;
        this.totCost =null;
        this.nRounds = null;
        this.curDemand = null;
        
        };

    reset() {
        this.totCost = 0
        this.nRounds = 0;
    };
    
    cycle() {
        this.curDemand = Math.floor(theSimulation.demandRV.observe());
        let t = simu.now ;
        let deltaT = peopleSpacing/theStage.normalSpeed;

        for ( let i = 0; i < this.curDemand; i++ ){
            t += deltaT
            let person = theSimulation.supply.pull();
            simu.heap.push({time:t, type: 'create',
            proc: theSimulation.queue.push.bind(theSimulation.queue), 
                            item: person});
        }
        simu.heap.push( 
            {time: t + this.cycleLength - 2000,
             type: 'plot', 
             proc: this.graph.bind(theSimulation.demand),
             item: null } )
        simu.heap.push( 
            {time: t + this.cycleLength,
             type: 'new cycle',
             proc: this.cycle.bind(this),
             item: null} );

    };
    graph(){
        this.nRounds ++;
        let excess = theSimulation.quantityOrdered - this.curDemand; 
        let overageForDay = theSimulation.Co * Math.max(0,excess);
        let underageForDay = theSimulation.Cu * Math.max(0, - excess);
        this.totCost += overageForDay + underageForDay;
        theChart.push(this.nRounds, underageForDay, overageForDay, this.totCost/this.nRounds);
        
    }
}

var gSF ;
export class Person extends SPerson {
    
    constructor (ahead, x,y= 60,w = 30,h = 30) {
        super(ahead, x, y);
        
        this.width = w;
        
        this.graphic = new NStickFigure( gSF, x, y);
        this.updateBadge = false;
//        simu.theCanvas.add(this.graphic.figure);
     };
     
    
     moveDisplayWithPath (deltaSimT){
         if (this.updateBadge){ 
            this.graphic.badgeSet(Math.round((simu.now-this.arrivalTime)/tioxTimeConv).toString()) 
         }       
         super.moveDisplayWithPath(deltaSimT);
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
    

 function initializeAll(){ 
    Math.seedrandom('this is the Queueing Simulation');
    simu.initialize();   // the generic
    theSimulation.initialize();   // the specific to queueing
    //reset first time to make sure it is ready to play.
     theChart.initialize();
    document.getElementById('resetButton').click();   
};


document.addEventListener("DOMContentLoaded",initializeAll);
 

//   TheChart variable is the interface to create the charts using Chart.js

export const theChart ={
    predictedInvValue: null,
    canvas: null,
    ctx: null,
    chart: null,
    stuff: {
        type: 'scatter',
        data: {
       	    datasets: [
                {  //*** Series #1
                label: 'underage',
                pointBackgroundColor: 'rgb(220, 0, 0)',
                pointBorderColor: 'rgb(220, 0, 0)',
                showLine: false,
                lineTension:0,
                pointRadius: 5,
                borderColor: 'rgb(220, 0, 0)',
                    borderWidth: 3,
                fill: false,

                data: []
                },
                {   //*** Series #2
                label: 'overage',
                pointBackgroundColor: 'rgba(0,150,0,1)',
                pointBorderColor: 'rgba(0,150,0,1)',
                showLine: false,
                lineTension: 0,
                pointRadius: 3,
                borderColor: 'rgba(0,150,0,1)',
                    borderWidth: 3,
                fill: false,

                data: [],
                },
                {   //*** Series #3
                label: 'average cost',
                pointBackgroundColor: 'rgb(26, 26, 185)',
                pointBorderColor: 'rgb(26, 26, 185)',
                showLine: true,
                lineTension: 0,
                pointRadius: 0,
                borderColor: 'rgb(26, 26, 185)',
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
                text: '$ of cost per day',
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
    graphInitialTimeWidth: 20,
    graphInitialTimeShift: 15,
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
//        this.predictedInvValue = this.predictedInv();
    }, 
    reset: function(){
        this.stuff.data.datasets[0].data=[];
        this.stuff.data.datasets[1].data=[];
        this.stuff.data.datasets[2].data=[];
        this.total = 0;
        this.count = 0;
        this.graphScale = 1;
        this.yAxisScale = {max: 100, stepSize: 20};
        this.aVAxis = new VerticalAxisValue();
        this.graphMin = 0;
        this.graphMax = this.graphInitialTimeWidth;
        this.chart.options.scales.yAxes[0].ticks.min = 0;
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
        this.chart.data.datasets[0].pointRadius = points;
        this.chart.data.datasets[0].borderWidth = points;
        this.chart.data.datasets[1].pointRadius = points;
        this.chart.data.datasets[1].borderWidth = points;
        this.chart.data.datasets[2].borderWidth = points;
        this.chart.update();
    },
    push: function (n,under,over,avg){
        
        
        if (n > this.graphMax) {
            this.graphMin += this.graphTimeShift;
            this.graphMax += this.graphTimeShift;
            this.chart.options.scales.xAxes[0].ticks.min = this.graphMin;
            this.chart.options.scales.xAxes[0].ticks.max = this.graphMax;
            }
        //        console.log( 'at chart ',t,inv,rt,pI);
        let bigger = Math.max(over, under);
        if ( bigger > this.yAxisScale.max ){
            this.yAxisScale = this.aVAxis.update(bigger);
            this.chart.options.scales.yAxes[0].ticks.max = this.yAxisScale.max;
            this.chart.options.scales.yAxes[0].ticks.stepSize = this.yAxisScale.stepSize;
        }
        this.chart.data.datasets[0].data.push({x:n,y:under});
        this.chart.data.datasets[1].data.push({x:n,y:over});
        this.chart.data.datasets[2].data.push({x:n,y:avg});
        this.chart.update();
        // update graph with time, this.total/this.waits.length
    },
        
//     updatePredictedInv: function(){
//        this.chart.data.datasets[2].data.push(
//            {x:(simu.now-1)/10000, y:theChart.predictedInvValue});
//        theChart.predictedInvValue = theChart.predictedInv();
//        this.chart.data.datasets[2].data.push(
//            {x:(simu.now/10000), y:theChart.predictedInvValue});
//        this.chart.update();
//     },
//     predictedInv: function (){
////        return (theSimulation.serviceRV.mean)/(theSimulation.interarrivalRV.mean);
//     }
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



