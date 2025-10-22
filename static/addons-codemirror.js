/* CodeMirror loader for Add-on editor (CDN version) */
(function(){
	function onReady(fn){
		if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn();
	}
	function loadScript(src){
		return new Promise(function(res, rej){
			var s=document.createElement('script'); s.src=src; s.async=true; s.onload=res; s.onerror=function(){rej(new Error('Failed to load '+src));};
			document.head.appendChild(s);
		});
	}
	function loadCSS(href){
		var l=document.createElement('link'); l.rel='stylesheet'; l.href=href; l.onerror=function(){console.error('Failed to load', href);};
		document.head.appendChild(l);
	}
	function init(){
		var ta=document.getElementById('textareacontent');
		if (!ta || !window.CodeMirror) return;
		var cm=window.CodeMirror.fromTextArea(ta, {
			mode:'javascript', lineNumbers:true, theme:'default', tabSize:2, indentUnit:2, smartIndent:true, matchBrackets:true, autoCloseBrackets:true
		});
		var form=(ta.closest && ta.closest('form')) || ta.form;
		if (form){ form.addEventListener('submit', function(){ if (cm && cm.save) cm.save(); }); }
	}
	var base='https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/';
	onReady(function(){
		loadCSS(base+'codemirror.min.css');
		loadCSS(base+'theme/default.min.css');
		// Ensure load order using Promises
		loadScript(base+'codemirror.min.js')
			.then(function(){ return loadScript(base+'addon/edit/matchbrackets.min.js'); })
			.then(function(){ return loadScript(base+'addon/edit/closebrackets.min.js'); })
			.then(function(){ return loadScript(base+'mode/javascript/javascript.min.js'); })
			.then(init)
			.catch(function(err){ console.error(err && err.message || err); });
	});
})();
