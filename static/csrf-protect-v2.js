// CSRF protection for control panel

function getCookie(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2) return parts.pop().split(";").shift();
}

function updateForms() {
    var forms = document.getElementsByTagName("form");
    for (var i = 0; i < forms.length; i++) {
        var form = forms[i];

        if (form.csrf_modified) {
            continue;
        }

        if ((form.method + "").toLowerCase() === "post") {
            var input = document.createElement("input");
            input.type = "hidden";
            input.name = "x-csrf-token";
            input.value = getCookie("usertoken");
            form.appendChild(input);
        }

        form.csrf_modified = "true";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    if (window.$) {
        $(document).bind('ajaxSend', function (elm, xhr, s) {
            if (s.type != 'GET') {
                xhr.setRequestHeader('x-csrf-token', getCookie("usertoken"));
            }
        });
    }

    updateForms();

    var observer = new MutationObserver(updateForms);
    observer.observe(document.querySelector("body"), { childList: true, subtree: true, attributes: false });
});
