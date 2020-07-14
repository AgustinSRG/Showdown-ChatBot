// CSRF protection for control panel

function getCookie(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2) return parts.pop().split(";").shift();
}

document.addEventListener("DOMContentLoaded", function () {
    if (window.$) {
        $(document).bind('ajaxSend', function (elm, xhr, s) {
            if (s.type != 'GET') {
                xhr.setRequestHeader('x-csrf-token', getCookie("usertoken"));
            }
        });
    }

    var forms = document.getElementsByTagName("form");
    for (var i = 0; i < forms.length; i++) {
        var form = forms[i];
        if ((form.method + "").toLowerCase() === "post") {
            var input = document.createElement("input");
            input.type = "hidden";
            input.name = "x-csrf-token";
            input.value = getCookie("usertoken");
            form.appendChild(input);
        }
    }
});

document.addEventListener('DOMNodeInserted', function(e) {
    console.log(e.target, ' was inserted');
    if (e.target.localName === "form") {
        var form = e.target;
        if ((form.method + "").toLowerCase() === "post") {
            var input = document.createElement("input");
            input.type = "hidden";
            input.name = "x-csrf-token";
            input.value = getCookie("usertoken");
            form.appendChild(input);
        }
    }
});
