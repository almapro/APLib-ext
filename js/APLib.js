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
var lastInterval  = 0;
function APLib(interval){
	if(interval === undefined) interval = 1000;
	if(lastInterval == interval) return;
	if(runner != null) clearInterval(runner);
	runner = setInterval(
		function(){
			if(!wait) BackEnd();
		},
		interval
	);
	lastInterval = interval;
}
function BackEnd(data, callback){
	wait = true;
	var xmlHTTP = new XMLHttpRequest();
	xmlHTTP.onreadystatechange = function(){
		if(xmlHTTP.readyState == 4) wait = false;
		if(xmlHTTP.readyState == 4 && xmlHTTP.status == 200 && xmlHTTP.responseText != ''){
			if(callback !== undefined){
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
	if(data === undefined){
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
	if(typeof(command.interval) != 'undefined'){
		APLib(command.interval);
	}
	switch(command.command){
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
	if(placement === undefined || placement == null) placement = {from: 'bottom', align: 'left'};
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
  if ($.inArray(e.keyCode, [46, 8, 9, 27, 13]) !== -1 ||
      (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
      (e.keyCode >= 35 && e.keyCode <= 40)) {
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
