Showdown ChatBot Add-Ons
====================

Add-ons are single-file scripts you can use to customize your bot. This scripts are loaded when they are installed and when the applicatio is started.

There is not any restriction, so be careful, you can seriusly damage your bot if you install add-ons and you don't know what they do.

Example of add-on with commands:
```js
/* Example of Add-on */

'use strict';

const commands = {
  alias: 'command',
	command: function () {
		this.pmReply("This is a test command!");
	}
};

App.parser.addCommands(commands);

exports.destroy = function () {
	App.parser.removeCommands(commands);
};
```

Every add-on should have a `destroy` method, which is called when the add-on is uninstalled. If an add-on does not have that method, you must restart the application to remove the effects after unistalling it.

If you are instarested in developing an add-on, you can use the [development documentation](https://github.com/asanrom/Showdown-ChatBot/blob/master/doc/development.md) as help.
