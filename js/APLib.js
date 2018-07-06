var frontend      = true;
var shiftDown     = false;
var ctrlDown      = false;
var altDown       = false;
var runner        = null;
var extraRunner   = null;
var extraCommands = [];
var verbose       = false;
var lastAlertT    = '';
var lastAlertM    = '';
var wait          = false;
function init(){
	init(1000);
}
function init(interval){
	if(runner != null) clearInterval(runner);
	runner = setInterval(
		function(){
			if(!wait) BackEnd();
		},
		interval
	);
}
function BackEnd(){
	BackEnd(null, null);
}
function BackEnd(data){
	BackEnd(data, null);
}
function BackEnd(data, callback){
	wait = true;
	var xmlHTTP = new XMLHttpRequest();
	xmlHTTP.onreadystatechange = function(){
		if(xmlHTTP.readyState == 4) wait = false;
		if(xmlHTTP.readyState == 4 && xmlHTTP.status == 200 && xmlHTTP.responseText != ''){
			if(typeof(callback) != 'undefined'){
				callback(xmlHTTP.responseText);
				return;
			}
			if(verbose) console.log(xmlHTTP.responseText);
			try{
				var data = JSON.parse(xmlHTTP.responseText);
			}catch(e){
				return;
			}
			FrontEnd(data);
		}
	}
	xmlHTTP.open('POST',location.href);
	if(data == null){
		data = JSON.stringify(
			{
				'command' : 'refresh',
				'type'    : 'all'
			}
		);
		if(!frontend) data = JSON.stringify({'command' : 'disabled'});
	}
	if(verbose) console.log(data);
	xmlHTTP.setRequestHeader(
		"Content-Type",
		"application/json"
	);
	xmlHTTP.send(data);
}
function FrontEnd(command){
	if(command.verbose){
		if(!verbose){
			console.log('Verbosity has been enabled');
			verbose = true;
		}
	}else{
		if(verbose){
			console.log('Verbosity has been disabled');
			verbose = false;
		}
	}
	if(typeof(command.security) != 'undefined'){
		switch(command.security){
			case 'captcha':
				// TODO: Impelment captcha
				break;
			case 'warning':
				floatingAlert('Security warning', command.security.message, null, 'warning');
				break;
		}
	}
	switch(command.command){
		case 'interval':
			init(command.interval);
			break;
		case 'update':
			if($(command.selector).html() != command.html) $(command.selector).html(command.html);
			break;
		case 'alert':
			var placement = null;
			if(typeof(command.placement) != 'undefined') placement = command.placement;
			floatingAlert(command.title, command.message, placement, command.type);
			break;
		case 'disable':
			if(frontend){
				console.log("Front-End has been disabled: " + command.reason);
				var placement = null;
				if(typeof(command.placement) != 'undefined') placement = command.placement;
				floatingAlert("Front-End has been disabled", command.reason, placement, 'warning');
				frontend=false;
			}
			break;
		case 'enable':
			if(!frontend){
				console.log("Front-End has been enabled");
				var placement = null;
				if(typeof(command.placement) != 'undefined') placement = command.placement;
				floatingAlert("Front-End has been enabled", '', placement, 'success');
				frontend=true;
			}
			break;
		case 'terminate':
			clearInterval(runner);
			if(extraRunner != null) clearInterval(extraRunner);
			frontend = false;
			console.log('Front-End has been terminated: ' + command.reason);
			var placement = null;
			if(typeof(command.placement) != 'undefined') placement = command.placement;
			floatingAlert("Front-End has been terminated", command.reason, placement, 'error');
			break;
		default:
			for(var i = 0; i < extraCommands.length; i++){
				if(extraCommands[i][0] == command.command){
					var exe = new Function('command', extraCommands[i][1])
					exe(command);
				}
			}
			break;
	}
}
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
function floatingAlert(title, message, placement, type){
	if(lastAlertT == title && lastAlertM == message) return;
	lastAlertT = title;
	lastAlertM = message;
	if(typeof(placement) == 'undefined' || placement == null) placement = {from: 'bottom', align: 'left'};
	var alertConfigs = {
		title: "<strong>" + title + "</strong><BR>",
		message: message
	};
	var alertOptions = {
		animate: {
			enter: 'animated fadeInDown',
			exit: 'animated fadeOutUp'
		},
		placement: placement,
		offset: 10,
		mouse_over: 'pause'
	};
	switch(type){
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
	$.notify(alertConfigs,alertOptions);
}
init();
