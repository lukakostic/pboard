/*
Handle gestures on mobile and pc:
click
double click   (so must not react to click immediately)
click hold
double click hold

znaci moram da registrujem click event (i stopPropagate ga).
da registrujem mouseup i mousedown
pratim tajminge zadnja 2 klika.
takodje da svakih 10ms uporedjujem trenutno vreme od vremena zadnjeg klika  (tako detektujem single clicks - ako nema drugi klik nakon nekog dozvoljenog perioda vremena )

takodje moram da pamtim down i up lokacije (i dal je pomeran iznad treshold u toku tog vremena)
da znam dal holduje, il dragguje.

single click drag (brzi) se racuna kao swipe tj scroll.
Tako da immediately cim detektujes da je mis izvan drag-radius, racuna se kao single-drag (nebitno dal ubrzo nakon toga ide second mouse click.)
Ako ide second mouse click posle, da li se on racuna kao zaseban single click? to bi bilo najjednostavnije al nzm kakvi su consequences da kazemo.
*/


const tresholds = {
    drag_px : 30,
    hold_ms : 100,
    doubleclick_ms : 300,
};

class Click{
    constructor(){
        this.down = Date.now();
        this.up = null;
    }
    getDuration(){if(this.up)}
}

function onSingleClick(){}
function onSingleHold(){}
function onSingleDrag_Begin(){}
function onDoubleClick(){}
function onDoubleHold(){}
function onDoubleDrag_Begin(){}

let clicks /*: {down:timestamp,up:timestamp}[]*/ = [];

const killEvent = (e)=>{e.stopImmediatePropagation();e.preventDefault();};
document.body.addEventListener('click',e=>killEvent(e));
document.body.addEventListener('mouseup',e=>{

});
document.body.addEventListener('mousedown',e=>{

});

setInterval(()=>{
    //takodje da svakih 10ms uporedjujem trenutno vreme od vremena zadnjeg klika  (tako detektujem single clicks - ako nema drugi klik nakon nekog dozvoljenog perioda vremena )
    //movement detection
},10);