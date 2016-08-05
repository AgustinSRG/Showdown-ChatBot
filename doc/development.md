Deveopment Documentation
====================

Commands
------------

Commands are encapsulated in objects where keys are the command ids and the values can be functions or strings. If the value is a string, it is an alias, if it is a function, is a command.

```js
const commands = {
	alias: 'command',
	command: function () {
		// Do something
	}
};
```

The command function is called in a *command context*, an object with all information about the user, room, command token, etc and a lot of useful methods.

Attributes:

 - `this.by` - A string made by group + username who called the command
 - `this.byIdent` - Identity parsed of this.by (id, name, group)
 - `this.room` - Room identifier or null if private message
 - `this.token` - Command token used
 - `this.cmd` - Original command id used to call the command
 - `this.arg` - Command argument
 - `this.args` - this.arg.split(',')
 - `this.wall` - true to reply with /announce
 - `this.targetRoom` - Target room (for configuration commands)
 - `this.lang` - Current language

Methods:

 - `this.send(data, room)` - Sends data
 - `this.sendPM(to, data)` - Sends a private message
 - `this.reply(text)` - Standard reply
 - `this.pmReply(text)` - Replies by private message
 - `this.restrictReply(text, permission)` - Replies standard or pm depending the permission
 - `this.errorReply(text)` - Standard error reply
 - `this.can(permission, room)` - Returns true if the user has the permission, false if not
 - `this.isExcepted()` - Returns true if the user is in the exception list, false if not
 - `this.replyAccessDenied(permission)` - Standard access denied reply
 - `this.usage(arg1, arg2, ...)` - Gets a standard usage message
 - `this.getRoomType(room)` - Returns the room type: chat, pm, battle, unknown
 

In order to add a commands object to the bot use `App.parser.addCommands(commands_object_here)` method.

In order to undo the previous method, you can use `App.parser.removeCommands(commands_object_here)` method.

Server Handlers
------------

The control panel server is composed by different handlers for the different main paths. To create a server handler use `App.server.setHandler(main_path, handler)`

Example:
```js
App.server.setHandler('example', (context, parts) => {
	context.endWithWebPage('This is an example!', {title: "Example - Showdown ChatBot"});
});
```

The handler receives via arguments an instance of RequestContext and an array with the url requested splitted by "/"

RequestContext Attributes:
 - `context.request` - Original Request object
 - `context.response` - Original Response object
 - `context.user` - User that makes the request (id, name, group) or null if not login in.
 - `context.url` - Requested url
 - `context.ip` - IP that makes the request
 - `context.headers` - Response headers
 - `context.get` - GET arguments
 - `context.post` - POST arguments
 - `context.cookies` - Client cookies

RequestContext Methods:
 - `context.endWithHtml(html, status_code)` - Sends an html source to the client
 - `context.endWithText(text, status_code)` - Sends a plain text to the client
 - `context.endWithWebPage(body, head_options, status_code)` - Sends a standard webpage to the client
 - `context.endWith404()` - Sends the standard 404 error webpage to the client
 - `context.endWith403()` - Sends the standard 403 error webpage to the client
 - `context.endWithError(error_code, title, error_message)` - Sends an error to the client
 - `context.endWithStaticFile(file)` - Sends a file to the client

In order to add server-side permissions, use `App.server.setPermission(permission_id, description)`

In order to add menu options, use `App.server.setMenuOption(id, name, url, permission_to_show)`

Bot events
------------

In order to add a bot events listener use `App.bot.on(event, listener)`

In order to remove an event listener use `App.bot.removeListener(event, listener)`

List of available events:
 - `error (err)` - When an internal error occurs
 - `connecting ()` - When the bot starts the connecion protocol to the server
 - `connect (connection)` - When the bot connects
 - `connectFailed (error)` - When the connection protocol fails
 - `disconnect (error)` - When the connection to the server is closed
 - `timeout ()` - When the connection to the server expires
 - `renamefailure (type, nick, pass)` - When a rename request fails
 - `send (msg)` - When the bot sends something to the server
 - `formats (formats_data)` - When battle formats are received
 - `challstr (challstr)` - When challstr (keywords for the login process) is received 
 - `updateuser (nick, named, avatar)` - When the bot gets a new nickname
 - `queryresponse (json_response)` - When a query response is received
 - `popup (popup_body)` - When a popup is received
 - `roomjoin (room, type)` - When the bot joins a room
 - `roomleave (room)` - When the bot leaves a room
 - `roomjoinfailure (room, errcode, reason)` - When the bot cannot join a room
 - `chat (room, time, message)` - When the bot sends a chat message
 - `userchat (room, time, by, message)` - When an user (not the bot) sends a chat message
 - `pmsent (to, message)` - When the bot sends a private message
 - `pm (from, message)` - When the bot receives a private message
 - `userrename (room, old_name, new_name)` - When an user (not the bot) gets a nickname change
 - `userjoin (room, user)` -  When an user (not the bot) joins a room
 - `userleave (room, user)` - When an user (not the bot) leaves a room
 - `line (room, line, splitted_line, is_init)` - When a line (part of a message) is received. General parsing event
 - `message (received_message)` - When something is received from the server

Tools
------------

Tools are simple scripts stored in [/src/tools/](https://github.com/asanrom/Showdown-ChatBot/tree/master/src/tools) path. You can use any of those scripts using `Tools.get(script_filename)`

An useful and frecuently used script is `text.js`. Example and descriptions:
```js
const Text = Tools.get('text.js');
let foo;

foo = Text.toId("Example"); // Reduces an string to an user identifier
foo = Text.toRoomid("Room name"); // Reduces an string to a room identifier
foo = Text.toCmdid("Command"); // Reduces an string to a command identifier
foo = Text.toCmdTokenid("."); // Reduces an string to a command token identifier
foo = Text.escapeHTML("Usage: command <arg1>, <arg2>"); // Replaces html reserved characters
foo = Text.stripCommands("/example"); // Removes pokemon showdown commands from a chat message
foo = Text.toChatMessage("   Example\n    "); // Reduces an string to a chat message
foo = Text.randomId(length); // Gets a random user identifier
foo = Text.randomToken(length); // Gets a random token (for keys)
foo = Text.parseUserIdent("@Username"); // Parses a raw username. Gets an object like {id: 'username', name: 'Username', group: '@'}
```

Another useful tool is the auto-translation system in `translate.js`. 

Example of usage:
```js
const Translator = Tools.get('translate.js');
const translator = new Translator(translations_file); // To load a translations file

let example = translator.get(key, language); // To get a translation of a key
```

Example of a translations file:
```
# This is a comment

# Use %language to define a language
# Any line placed betwen a language declaration and the next one
# are translations for that language
%english

# Key definition
# Syntax: $key = text here

$key1 = Hello
$key2 = Example

%spanish

$key1 = Hola
$key2 = Ejemplo
```
