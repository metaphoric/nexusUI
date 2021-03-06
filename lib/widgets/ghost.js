var math = require('../utils/math')
var util = require('util');
var widget = require('../core/widget');

/** 
	@class ghost (alpha) 
	Interface gesture capture / playback (in development)    
	
	```html
	<canvas nx="ghost"></canvas>
	```
	<canvas nx="ghost" style="margin-left:25px"></canvas>
*/

var ghost = module.exports = function(target) {
	
	this.defaultSize = { width: 100, height: 50 };
	widget.call(this, target);
	
	//define unique attributes
	this.recording = false;
	this.playing = false;
	this.maxLength = 2000;
	this.components = new Array();
	this.buffer = new Array();
	//this.moment is for the record head
	this.moment = 0;
	//this.needle is for the playback head
	this.needle = 0;
	this.val = new Object();
	this.rate = 1;
	this.start = 0;
	this.end = 1;
	this.size = 0;
	this.looping = true;
	this.boundLog = this.log.bind(this)
	this.direction = 1;
	//settings
	this.noise = 0;
	this.loopstart = 0;
	this.loopend = 0;
	this.mode = "linear";   // linear,bounce,random,wander,pattern/dream
	//init
	this.init();

	this.boundAdv = this.advance.bind(this);
	nx.aniItems.push(this.boundAdv)

}

util.inherits(ghost, widget);


ghost.prototype.init = function() {
	this.draw();
}

ghost.prototype.watch = function() {
	for (var key in nx.widgets) {
		this.connect(nx.widgets[key]);
	}
}
	
	//sets a new component to be recorded
ghost.prototype.connect = function(target) {
	var compIndex = this.components.length;
	this.components.push(target);
	target.tapeNum = compIndex;
	target.isRecording = true;
	target.recorder = this;
	this.buffer[compIndex] = new Object();
	for (var key in target.val) {
		this.buffer[compIndex][key] = new Array();
	}
	
}
	
	//the actual recording function
ghost.prototype.write = function(index, val) {
	if (this.moment>=this.maxLength) {
		this.stop();
	}
	for (var key in val) {
		if (this.buffer[index][key]) {
			this.buffer[index][key][this.moment] = val[key];
		}
	}
	this.draw();
}
	

ghost.prototype.draw = function() {

	with (this.context) {
		fillStyle = this.colors.fill;
		fillRect(0,0,this.width,this.height)
	}

	var quad = this.width/4;
	var quad2 = this.width-quad;
	
	if (!this.recording) {
		with (this.context) {
			fillStyle = "#e33";
			beginPath()
			arc(quad,this.height/2,quad*0.8,0,Math.PI*2)
			fill()
			closePath();
			textAlign = "center"
			textBaseline = "middle"
			font = "normal "+this.height/6+"px courier"
			fillStyle = this.colors.fill
			fillText("rec",quad,this.height/2)
		}
	} else {
		with (this.context) {
			fillStyle = "#e33";
			fillRect(quad*0.4,quad*0.4,quad*1.2,quad*1.2)
		}
	}
	
	if (!this.playing) {
		with (this.context) {
			fillStyle = this.colors.border
			beginPath()
			arc(quad2,this.height/2,quad*0.8,0,Math.PI*2)
			fill()
			closePath()
			textAlign = "center"
			textBaseline = "middle"
			font = "normal "+this.height/6+"px courier"
			fillStyle = this.colors.fill
			fillText("play",quad2,this.height/2)
		}
	} else {
		with (this.context) {
			strokeStyle = this.colors.border
			lineWidth = this.width/30
			beginPath()
			arc(quad2,this.height/2,quad*0.8,0,Math.PI*2)
			stroke()
			closePath()
			var sec = ~~(this.needle/30)
			textAlign = "center"
			textBaseline = "middle"
			font = "normal "+this.height/3+"px courier"
			fillStyle = this.colors.border
			fillText(sec,quad2,this.height/2+2)
		}
	}
}

ghost.prototype.record = function() {
	this.moment = 0;
	nx.aniItems.push(this.boundLog)
	this.recording = true;
}

ghost.prototype.log = function() {
	for (var i=0;i<this.components.length;i++) {
		var sender = this.components[i];
		this.write(this.components[i].tapeNum,this.components[i].val);
	}
	this.moment++;
}

ghost.prototype.stop = function() {
	nx.removeAni(this.boundLog);
	this.size = this.moment;
	this.recording = false;
	this.draw();
}


ghost.prototype.scan = function(x) {
	// loop through the widgets that were recorded
	for (var i=0;i<this.components.length;i++) {
		//sender is the current widget we're looking at
		var sender = this.components[i];
		//loop through the widget's gesture buffer
		for (var key in this.buffer[sender.tapeNum]) {
			if (this.buffer[sender.tapeNum][key]) {
				//create a new val object
				var val = new Object();
				//make sure we're not looking out of bounds of the buffer
				var max = this.buffer[sender.tapeNum][key][~~this.needle+1] ? this.buffer[sender.tapeNum][key][~~this.needle+1] : this.buffer[sender.tapeNum][key][~~this.needle]
				if (this.buffer[sender.tapeNum][key][~~this.needle-this.direction] != undefined && this.buffer[sender.tapeNum][key][~~this.needle] != this.buffer[sender.tapeNum][key][~~this.needle-this.direction]) {
					// create the value pair
					val[key] = nx.interp(this.needle - ~~this.needle, this.buffer[sender.tapeNum][key][~~this.needle], max)
					val[key] += Math.random() * this.noise - this.noise/2;
					val[key] = nx.clip(val[key],0,1)
					//set the widget with the value from the buffer
					sender.set(val, true)
				}
			}
		}
	}
}



//this.moment is for the record head
//this.needle is for the playback head

ghost.prototype.play = function(rate,start,end) {
	rate ? this.rate = rate : false;
	if (start) {
		this.needle = this.moment-1;
		this.start = start;
	} else {
		this.needle = this.moment-1;
		this.start = 0;
	} 
	if (this.mode=="linear") {
		this.direction = 1;
	}
	end ? this.end = end : this.end = 1
	this.playing = true;
}

ghost.prototype.pause = function() {
	this.playing = false;
}

ghost.prototype.loop = function() {
	
}

ghost.prototype.advance = function() {
	if (this.playing) {
		if (this.mode == "linear" || this.mode == "bounce") {
			this.needle += this.rate*this.direction;
		} else if (this.mode=="random") {
			this.needle = nx.random((this.end-this.start)*this.size)+this.start*this.size;
			console.log(this.needle)
		} else if (this.mode=="wander") {
			var dir = 3
			this.needle > this.size*0.75 ? dir-- : null;
			this.needle < this.size*0.25 ? dir++ : null;
			this.needle += this.rate*this.direction * (nx.random(dir)-1);
		}

		if (this.needle/this.size < this.end && this.needle/this.size > this.start) {
			this.scan();
		} else if (this.looping) {
			if (this.mode=="linear") {
				this.needle = this.start*this.size + 1;
			} else {
				this.direction = this.direction * -1
			}
		} else {
			this.playing = false;
		}
		this.draw();
	}
}
	

ghost.prototype.click = function(e) {
	if (this.clickPos.x<this.width/2) {
		if (this.recording) {
			this.stop()
		} else {
			this.record()
		}
	} else {
		if (this.playing) {
			this.pause();
		} else {
			this.play();
		}
		this.draw();
	}
}