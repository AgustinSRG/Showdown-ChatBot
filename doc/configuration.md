Configuration Guide
====================

Once installed, you may want to configure your bot. In order to do it, you can use the *control panel* available by default in the port 8080. To access it, if you are running the bot locally, go to [http://localhost:8080/](http://localhost:8080/). If you are runing it using a VPS, go to your domain or subdomain.

The default administration account is `admin` with password `admin`. Note: It is recommended changing the password or deleting this account to avoid unauthorized accesses.

1 - Administration options
------------

In the `Admin` menu option you can configure these important values:
 - `Current Server Url` - If you have a domain or subdomain, specify here the url. For example: `www.myserver.com`
 - `Application Title` - Is the title that appears at the top of the control panel
 - If you are running the bot through a proxy (for example openshift) mark the option `Check this option if you are using a proxy for your application`

In this menu option you can also *Restart the application*. Do it if you want to change the port or bind address for the control pannel or you want to update your bot.

2 - Pokemon Showdown Server
------------

In the menu option `Bot Config` you can choose the server you want the bot to join. There are three possible cases:

 - You might want to use [Smogon Official Server (Main Server)](http://play.pokemonshowdown.com/). In that case use the option `Set Default Values` and `Save Changes`
 - Maybe you want to use a [Registered Server](http://pokemonshowdown.com/servers/), in that case you can use the *get-server* tool, in the `Tools` menu option, to get the **server**, **port** and **serverid** paramenters.
 - Or, you may want to use an unregistered server, then you must edit manually the parameters.
 
In this menu option you can also start, stop, restart an check the status of the bot. Note: Restart the bot when you finish the configuration process.

3 - Bot account
------------

In the menu option `Bot Login` tou can set the bot account (A pokemon showdown account). If you specify a registered account with a wrong password, the bot will not login.

4 - Bot initial actions (Rooms and Avatar)
------------

In the menu option `Bot AutoJoin` you can specify the list of rooms to join after the bot logs in.

You can also specify the bot avatar number or id.

5 - Parser Configuration
------------

In the `Command Parser` menu option, `Configuration` suboption, you can set the following important values:
 - `Command Tokens` - Command tokens make the difference between a command and a regular chat message. Example: If `.` is a command token, `.seen` is a command message.
 - `Groups` - Pokemon Showdown groups (maybe the server you want to use has custom symbols)
 - `Help Message` - Message sent when an user pms the bot with a not-command message.
 - `Sleeping Rooms` - Rooms where is no possible using bot commands. For example to avoid interferences with other bots.

6 - Commands Permissions Configuration
------------

In the `Command Parser` menu option, `Permissions` suboption, you can customize the command permissions.

**Important:** In the `Excepted Users` textbox add your accounts to give them full access to all bot commands regardless of rank.

7 - Bot Language
------------

In the `Bot Language` menu option you can change the language the bot uses into the Pokemon Showdown server, the control panel is only available in english.

8 - Control panel users
------------

In the `Users` menu option you can add, delete and edit accounts for accesing the control panel, for example for the staff (with some permissions like logs viewing).
