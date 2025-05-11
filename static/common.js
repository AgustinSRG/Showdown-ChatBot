// Common script for the control panel

function getCookie(name) {
	var value = "; " + document.cookie;
	var parts = value.split("; " + name + "=");
	if (parts.length == 2) return parts.pop().split(";").shift();
}

function setCookie(name, value) {
	const date = new Date();
	date.setFullYear(date.getFullYear() + 10);
	document.cookie = name + "=" + value + ";expires=" + date.toString() + ";path=/";
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

	var initialTheme = getCookie("theme");

	if (initialTheme !== "l" && initialTheme !== "d") {
		initialTheme = "";
	}

	var themeSelect = document.querySelector(".theme-select");

	if (themeSelect) {
		themeSelect.value = initialTheme;

		themeSelect.addEventListener("change", function () {
			var currTheme = themeSelect.value || "";
			setCookie("theme", currTheme);

			window.location = window.location.href;
		});
	}
});

var loginPasswordVisible = false;

window.toggleLoginPasswordVisibility = function () {
	var inputEl = document.getElementById("login_password_input");
	var toggleEl = document.getElementById("password_visibility_toggle");

	if (loginPasswordVisible) {
		if (inputEl) {
			inputEl.type = "password";
			delete inputEl.autocomplete;
		}

		if (toggleEl) {
			toggleEl.innerHTML = "Show password";
		}
	} else {
		if (inputEl) {
			inputEl.type = "text";
			inputEl.autocomplete = "off";
		}

		if (toggleEl) {
			toggleEl.innerHTML = "Hide password";
		}
	}

	loginPasswordVisible = !loginPasswordVisible;
};
