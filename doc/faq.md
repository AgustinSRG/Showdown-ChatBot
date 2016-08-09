Frequently Asked Questions
====================

**Where I can report bugs or suggestions?**
 - Here: [https://github.com/asanrom/Showdown-ChatBot/issues](https://github.com/asanrom/Showdown-ChatBot/issues)

**Why can't I use any of the bot commands?**
 - Maybe you forgot configuring the commands in the *Command Parser* menu option at the control panel of your bot.
 - There are commands everyone can use, but the mayority of them require certain rank to be used. You can change this with the command `set` and `grant` or using the control pannel (*Commmand Parser* -> *Permissions*).

**My bot gets locked every time it joins the server, what is happening?**
 - Pokemon Showdown has a DNS Blacklist used to avoid spammers and DDos attacks. If you host your bot using a free hosting service like openshift, heroku or cloud9, your bot will get locked.
 - A way to solve this is hosting the bot in your personal computer or in a private VPS. Also, global bots and bots with staff rank in public rooms will not get locked.

**What is the Auto-Invite option at the control panel?**
 - It is a rarely used feature that consists on sending `/invite <room>` to the staff of a private room that has a link with a public room. For example if you have a room for a group of people (the private room) and you want to auto-invite them when they join the lobby (the public room).

**Why the bot is so bad at pokemon battles?**
 - Basically, Pokemon battles require human intelligence (prediction, strategy) and the bot does not have it. The bot uses a pseudo-random algorithm to decide in the battles.
 - Developing an artificial intelligence for Pokemon Showdown may sound interesting, but Pokemon is a game with a lot of lucky factors and usualy based on win ratios. If a bot could get high win ratios with ease, bots would be banned from pokemon showdown (basically because that would be cheating).
 - The battle module is secondary and only developed for pure fun, to integrate the bot more easily with the rest of users.

**What is the Anti-Spam system option in the Command Parser control panel option**
 - If you enable it, users cannot spam the bot with commands via pm. That's because they must wait 2 seconds between commands used with the private messages.

**What is a control room (in the Command Parser control panel option)**
 - If a room is a control room of another one, all *Configuration Commands* will also change the configuration for the controlled room. This is useful for staff rooms.

**How I add a text command to the bot**
 - Option A: You can use the control panel, *Dynamic commands* option.
 - Option B: Use the bot command `temp <command text here>`, then use `setcmd <command name here>`.

**What is the GitHub-Hook option at the control panel**
 - Is a developing tool that consists on reporting repository events to a developing room in a Pokemon Showdown server. Read [this](https://developer.github.com/webhooks/creating/) for more information about how to configure it. Note: Use a path like `http://server:port/github/callback`
