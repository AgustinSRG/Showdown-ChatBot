/* CodeMirror loader for Add-on editor */
(function(){
	function loadScript(src, cb){
		var s=document.createElement('script');
		s.src=src; s.onload=cb; document.head.appendChild(s);
	}
	function loadCSS(href){
		var l=document.createElement('link'); l.rel='stylesheet'; l.href=href; document.head.appendChild(l);
	}
	function init(){
		if (!window.CodeMirror) return;
		var ta=document.getElementById('textareacontent');
		if (!ta) return;
		var cm=window.CodeMirror.fromTextArea(ta, {
			mode:'javascript',
			lineNumbers:true,
			theme:'default',
			tabSize:2,
			indentUnit:2,
			smartIndent:true,
			matchBrackets:true,
			autoCloseBrackets:true,
		});
		// Ensure textarea stays synced on form submit
		var form=ta.closest('form');
		if (form){
			form.addEventListener('submit', function(){ cm.save(); });
		}
	}
	// Load assets
	loadCSS('/static/codemirror/codemirror.css');
	loadCSS('/static/codemirror/theme/default.css');
	loadScript('/static/codemirror/codemirror.js', function(){
		loadScript('/static/codemirror/mode/javascript/javascript.js', init);
	});
})();
