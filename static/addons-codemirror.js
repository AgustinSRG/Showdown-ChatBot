/* CodeMirror loader for Add-on editor (CDN version) */
(function(){
	function loadScript(src, cb){
		var s=document.createElement('script');
		s.src=src; s.async=true; s.onload=cb; s.onerror=function(){console.error('Failed to load', src);};
		document.head.appendChild(s);
	}
	function loadCSS(href){
		var l=document.createElement('link'); l.rel='stylesheet'; l.href=href; l.onerror=function(){console.error('Failed to load', href);};
		document.head.appendChild(l);
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
			autoCloseBrackets:true
		});
		var form=ta.closest && ta.closest('form');
		if (form){ form.addEventListener('submit', function(){ cm.save(); }); }
	}
	// CDN versions (CodeMirror 5.65.16 via cdnjs)
	var baseCss='https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/';
	var baseJs='https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/';
	loadCSS(baseCss + 'codemirror.min.css');
	loadCSS(baseCss + 'theme/default.min.css');
	loadScript(baseJs + 'codemirror.min.js', function(){
		loadScript(baseJs + 'addon/edit/matchbrackets.min.js', function(){
			loadScript(baseJs + 'addon/edit/closebrackets.min.js', function(){
				loadScript(baseJs + 'mode/javascript/javascript.min.js', init);
			});
		});
	});
})();
