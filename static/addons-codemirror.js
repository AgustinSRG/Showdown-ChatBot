/* CodeMirror loader for Add-on editor (panel-native theme, enhanced selection/clipboard) */
(function(){
	function onReady(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
	function loadScript(src){ return new Promise(function(res, rej){ var s=document.createElement('script'); s.src=src; s.async=true; s.onload=res; s.onerror=function(){rej(new Error('Failed '+src));}; document.head.appendChild(s); }); }
	function loadCSS(href){ var l=document.createElement('link'); l.rel='stylesheet'; l.href=href; document.head.appendChild(l); }
	function initIfReady(){
		var ta=document.getElementById('textareacontent');
		if(!ta||!window.CodeMirror) return false; if(ta._cm_inited) return true;
		var cm=window.CodeMirror.fromTextArea(ta, {
			mode:'javascript', lineNumbers:true, tabSize:2, indentUnit:2, smartIndent:true,
			matchBrackets:true, autoCloseBrackets:true,
			styleSelectedText:true, styleActiveLine:true
		});
		ta._cm_inited=true;
		var form=(ta.closest&&ta.closest('form'))||ta.form; if(form){ form.addEventListener('submit', function(){ if(cm&&cm.save) cm.save(); }); }
		return true;
	}
	function startInitWatcher(timeoutMs){ var start=Date.now(); (function tick(){ if(initIfReady()) return; if(Date.now()-start>timeoutMs) return; setTimeout(tick,100); })(); }
	var CDN='https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/';
	var CDN2='https://cdn.jsdelivr.net/npm/codemirror@5.65.16/';
	onReady(function(){
		// Base CSS and local theme bridge
		loadCSS(CDN+'codemirror.min.css');
		loadCSS('/static/codemirror-theme.css');
		// Scripts with fallbacks, including selection/clipboard addons
		loadScript(CDN+'codemirror.min.js')
		.then(function(){ return loadScript(CDN+'addon/edit/matchbrackets.min.js'); })
		.then(function(){ return loadScript(CDN+'addon/edit/closebrackets.min.js'); })
		.then(function(){ return loadScript(CDN+'mode/javascript/javascript.min.js'); })
		// selection/clipboard improvements
		.then(function(){ return loadScript(CDN+'addon/selection/active-line.min.js'); })
		.then(function(){ return loadScript(CDN+'addon/selection/selection-pointer.min.js'); })
		.then(function(){ return loadScript(CDN+'addon/selection/mark-selection.min.js'); })
		.then(function(){ return loadScript(CDN+'addon/clipboard/clipboard.min.js'); })
		.catch(function(){
			return loadScript(CDN2+'lib/codemirror.js')
				.then(function(){ return loadScript(CDN2+'addon/edit/matchbrackets.js'); })
				.then(function(){ return loadScript(CDN2+'addon/edit/closebrackets.js'); })
				.then(function(){ return loadScript(CDN2+'mode/javascript/javascript.js'); })
				.then(function(){ return loadScript(CDN2+'addon/selection/active-line.js'); })
				.then(function(){ return loadScript(CDN2+'addon/selection/selection-pointer.js'); })
				.then(function(){ return loadScript(CDN2+'addon/selection/mark-selection.js'); })
				.then(function(){ return loadScript(CDN2+'addon/clipboard/clipboard.js'); });
		})
		.finally(function(){ startInitWatcher(3000); });
	});
})();
