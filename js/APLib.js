var config      = {};
var commands    = {};
var connections = {};
var websockets  = {};
var jobs        = {};
var threads     = {};
var functions   = {};

window.APLib = {
	Config: {
		setURL: function(URL) {
			config.URL = URL;
		},
		setVerbose: function(verbose) {
			config.verbose = verbose;
		},
		setTimeout: function(timeout) {
			config.timeout = timeout;
		}
	},
	Commands: {
		set: function(command, callback) {
			commands[command] = callback;
		},
		unset: function(command) {
			commands[command] = undefined;
			commands          = JSON.parse(JSON.stringify(commands));
		},
		execute: function(command) {
			commands[command.command](command);
		}
	},
	API: {
		connect: function(data, callback) {
			if(data === undefined) data = JSON.stringify({command: 'refresh', type: 'all'});
			var alreadyConnecting = false;
			Object.keys(connections).map(function(connection){
				if(connections[connection].data == data) alreadyConnecting = true;
			});
			if(alreadyConnecting) return false;
			if(config.verbose) console.log(data);
			var id       = APLib.Functions.call('Random String');
			var XHR      = new XMLHttpRequest();
			XHR.timeout  = config.timeout;
			XHR.callback = callback;
			XHR.data     = data;
			XHR.id       = id;
			XHR.onreadystatechange = function(){
				if(this.readyState == 4 && this.status == 200 && this.responseText != '') {
					if(config.verbose) console.log(this.responseText);
					if(this.callback !== undefined) {
						this.callback(this.responseText);
					} else {
						try {
							var command = JSON.parse(this.responseText);
							APLib.Commands.execute(command);
						} catch(e) {
							if(config.verbose) console.log(e);
						}
					}
					APLib.API.remove(this.id);
				}
			}
			XHR.open('POST', config.URL);
			XHR.setRequestHeader("Content-Type", "application/json");
			XHR.send(data);
			connections[id] = XHR;
			return id;
		},
		close: function(id) {
			connections[id].abort();
			APLib.API.remove(id);
		},
		remove: function(id) {
			connections[id] = undefined;
			connections     = JSON.parse(JSON.stringify(connections));
		}
	},
	WebSockets: {
		open: function(name, URL) {
			if(websockets[name] && !websockets[name].disconnected) return websockets[name];
			var messages                  = (websockets[name]) ? websockets[name].messages : new Array();
			websockets[name]              = new WebSocket(URL);
			websockets[name].name         = name;
			websockets[name].URL          = URL;
			websockets[name].disconnected = true;
			websockets[name].closed       = false;
			websockets[name].messages     = messages;
			websockets[name].onclose      = function(){
				this.disconnected = true;
			}
			websockets[name].onerror      = function(){
				APLib.WebSockets.close(this.name);
				this.closed = false;
			}
			websockets[name].onopen       = function(){
				this.disconnected = false;
				if(this.messages.length > 0){
					for (var i = 0; i < this.messages.length; i++) {
						this.send(JSON.stringify(this.messages[i]));
					}
					this.messages = new Array();
				}
			}
			return websockets[name];
		},
		get: function(name) {
			return websockets[name];
		},
		send: function(name, message) {
			if(websockets[name].readyState == 0) {
				APLib.WebSockets.appendMessage(name, message);
			} else if(websockets[name].disconnected && !websockets[name].closed) {
				APLib.WebSockets.appendMessage(name, message);
				APLib.WebSockets.open(name, websockets[name].URL);
			} else if(!websockets[name].closed) {
				if(websockets[name].messages.length > 0){
					for (var i = 0; i < websockets[name].messages.length; i++) {
						websockets[name].send(JSON.stringify(websockets[name].messages[i]));
					}
					websockets[name].messages = new Array();
				}
				websockets[name].send(JSON.stringify(message));
			}
		},
		close: function(name) {
			websockets[name].close();
			websockets[name].closed = true;
		},
		appendMessage: function(name, message) {
			var messages = websockets[name].messages;
			var exists   = false;
			messages.forEach(function(msg){
				if(JSON.stringify(msg) == JSON.stringify(message)) exists = true;
			});
			if(!exists) messages.push(message);
			websockets[name].messages = messages;
		}
	},
	Jobs: {
		add: function(name, call, timeout) {
			if(APLib.Jobs.get(name)) return APLib.Jobs.get(name);
			var f      = function(self){ self.value = setTimeout(self.call, self.timeout); }
			f.value    = null;
			f.call     = call;
			f.timeout  = timeout;
			func       = function(){ f(f) };
		    var job    = {name, func, call: func, execute: func, run: func, start: func};
		    jobs[name] = job;
			func();
		    return job;
		},
		remove: function(name) {
		    if(jobs[name].value != null) clearTimeout(jobs[name].value);
			jobs[name] = undefined;
			jobs       = JSON.parse(JSON.stringify(jobs));
		},
		get: function(name) {
		    if(jobs[name] !== undefined) return jobs[name];
		    return false;
		},
		reset: function() {
			Object.keys(jobs).map(function(job){
				APLib.Jobs.remove(job);
			})
		    jobs = {};
		},
		count: function() {
		    return Object.keys(jobs).length;
		}
	},
	Threads: {
		add: function(name, call, interval) {
		    if(APLib.Threads.get(name)) return APLib.Threads.get(name);
		    var func      = function(self){ APLib.Threads.start(self.tname) };
			func.tname    = name;
		    var startFunc = function(){ func(func) };
		    var thread    = {name, interval, callFunc: call, running: false, call: startFunc, execute: startFunc, run: startFunc, start: startFunc};
		    threads[name] = thread;
		    return thread;
		},
		start: function(name) {
		    var thread = APLib.Threads.get(name);
		    if(thread.running) return;
		    APLib.Threads.setInterval(name, setInterval(thread.callFunc, thread.interval));
		    APLib.Threads.setState(name, true);
		},
		stop: function(name) {
		    var thread = APLib.Threads.get(name);
		    if(!thread.running) return;
		    clearInterval(thread.value);
		    APLib.Threads.setState(name, false);
		},
		remove: function(name) {
		    APLib.Threads.stop(name);
		    threads[name] = undefined;
			threads       = JSON.parse(JSON.stringify(threads));
		},
		get: function(name) {
		    if(threads[name] !== undefined) return threads[name];
		    return false;
		},
		setInterval: function(name, interval) {
		    threads[name].value = interval;
		},
		setState: function(name, running) {
			threads[name].running = running;
		},
		reset: function() {
			Object.keys(threads).map(function(thread){
				APLib.Threads.remove(thread);
			});
		    threads = {};
		},
		count: function() {
		    return Object.keys(threads).length;
		}
	},
	Functions: {
		create: function(name, call) {
			functions[name] = call;
		},
		call: function(name, args) {
			return functions[name](args);
		}
	},
	Security: {
		check: function(data) {
			//
		}
	}
}

APLib.Config.setURL(location.href);
APLib.Config.setVerbose(false);
APLib.Config.setTimeout(0);
APLib.Commands.set('APLib', function(command) {
	if(command.verbose) APLib.Config.setVerbose(command.verbose);
	if(command.timeout) APLib.Config.setTimeout(command.timeout);
	if(command.alert) APLib.Commands.execute({command: 'notify', ...command.alert});
	if(command.security) APLib.Commands.execute({command: 'security', ...command.security});
})
APLib.Commands.set('notify', function(command) {
	if(command.placement === undefined || command.placement == null) command.placement = {from: 'top', align: 'center'};
	var alertConfigs = {
		title: "<strong>" + command.title + "</strong><BR>",
		message: command.message
	};
	var alertOptions = {
		animate: {
			enter: 'animated fadeInDown',
			exit: 'animated fadeOutUp'
		},
		placement: command.placement,
		offset: 10,
		mouse_over: 'pause'
	};
	switch(command.type){
		case 'error':
			alertOptions['type'] = 'danger';
			break;
		case 'success':
			alertOptions['type'] = 'success';
			break;
		case 'warning':
			alertOptions['type'] = 'warning';
			alertConfigs['icon'] = 'glyphicon glyphicon-warning-sign';
			break;
	}
	$.notify(alertConfigs, alertOptions);
})
APLib.Commands.set('security', function(command) {
	switch(command.action){
		case 'captcha':
			// TODO: Impelment captcha
			break;
		case 'warning':
			APLib.Commands.execute({command: 'notify', title: 'Security warning', message: command.message, placement: undefined, type: 'warning'});
			break;
	}
})
APLib.Functions.create('Random String', function(length) {
	length     = (length === undefined) ? 5 : length;
	var string = "";
	var chars  = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (var i = 0; i < length; i++) string += chars.charAt(Math.floor(Math.random() * chars.length));
	return string;
});

var shiftDown          = false;
var ctrlDown           = false;
var altDown            = false;
function checkDown(e){
	var code = (e.keyCode ? e.keyCode : e.which);
	switch(code){
		case 16:
			shiftDown = true;
			break;
		case 17:
			ctrlDown = true;
			break;
		case 18:
			altDown = true;
			break;
	}
}
function checkUp(e){
	var code = (e.keyCode ? e.keyCode : e.which);
	switch(code){
		case 16:
			shiftDown = false;
			break;
		case 17:
			ctrlDown = false;
			break;
		case 18:
			altDown = false;
			break;
	}
}
function GetQueryValue(name) {
    var url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
function scrollToView(element){
	var scrollHeight = Math.max(element.scrollHeight, element.clientHeight);
	element.scrollTop = scrollHeight - element.clientHeight;
}
/************/
/*  Checks  */
/************/

// Usage:
//        onKeyDown = onlyNumbers;
//        onKeyDown = function(e) { onlyNumbers(e); };
//        onKeyDown={onlyNumbers}   <==  ReactJS
//
// Return:
//        void
window.onlyNumbers = function(e){
	if ($.inArray(e.keyCode, [46, 8, 9, 27, 13]) !== -1 || (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) || (e.keyCode >= 35 && e.keyCode <= 40)) {
		return;
	}
	if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
		e.preventDefault();
	}
}

// Usage:
//        if(isIPAddress(element)) {...}
//        if(isIPAddress(event))   {...}
//
// Return:
//        boolean
window.isIPAddress = function(e){
	var element = (e.target ? e.target : e);
	var ipv4 = (element.value.match(/\b((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|$)){4}\b/));
	var ipv6 = (element.value.match(/^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/));
	return (ipv4 || ipv6);
}
