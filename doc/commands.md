Commands Table
====================

This guide is an index with all **static commands** present in *Showdown Chatbot*. A static command is a command present by default in the bot and also cannot be removed without edditing the source files. These commands gives Pokemon Showdown users the capacity to interact with the bot and administrators to control it without accesing the control panel (note that there are a lot of configuration options only avaliable using the control pannel).

For each command, this guide gives the usage (or different usage modes), the description of what the command does, the permission required to use the command (\* means that the command can be used by anyone via private message, but requires certain permission to make the bot reply in a chat room) and the command type (**A** means Action Command, **C** means Configuration command, **I** means Information Command and **D** means development command)

Note: Arguments with `<>` means they are obligatory. Arguments with `[]` meams they are optional.

Core Module
------------

| Usage | Description | Permission | |
| ----- | ----------  | --- | --- |
`version` | Gets the bot version | info\* | **I**
`time` | Gets the bot current time | info\* | **I**
`uptime` | Gets the uptime (the time since the bot was started) | info\* | **I**
`seen <user>` | Gets the last time an user was seen by the bot | - | **I**
`alts <user>` | Gets the alts of an user. Note: There alts are known via renames. Full alts (Ip base) are only available via the /alts server command only for the staff members| - | **I**
`dyncmdlist` | Gets the dynamic commands list. Note: Requires to set the server url in the administration options in the control pannel. | info\* | **I**
`joinrooms <room>, [...]` | Command to make the bot joins rooms | joinroom | **A**
`leaverooms <room>, [...]` | Command to make the bot leaves rooms | joinroom | **A**
`custom <text>` | Replies with a custom message, no restrictions | send | **A**
`send <room>, <message>` | Sends a custom message | send | **A**
`sendpm <user>, <message>` | Sends a custom private message | send | **A**
`say <text>` | Replies with a custom message, but commands are not allowed | say | **A**
`exec <cmd>` | Executes a command | - | **A**
`execdyn <cmd>` | Executes a dynamic command | - | **A**
`wall <cmd>` | Executes a command and replies with an /announce message | wall\* | **A**
`setalias <alias>, <command>` | Creates an alias for an existing command | commands | **C**
`rmalias <alias>` | Removes an alias | commands | **C**
`temp <text>` | Changes the temporal variable | commands | **C**
`setcmd <cmd>` | Creates a text dynamic command using the content of the temporal variable | commands | **C**
`setindexcmd <cmd>` | Creates an empty index dynamic command | commands | **C**
`setsubcmd <index command>, <subcommand>` | Creates a subcommand for an existing index command using the content of the temporal variable | commands | **C**
`rmcmd <cmd>` | Removes a dynamic command | commands | **C**
`rmsubcmd <index command>, <subcommand>` | Removes a subcommand | commands | **C**
`setcontrolroom <room>, <target room>` | Sets a control room | commands | **C**
`rmcontrolroom <room>` | Removes a control room | commands | **C**
`grant <permission>, <rank>` | Configures a permission | grant | **C**
`set <permission>, <rank>` | Configures a permission in a room | set | **C**
`lang <language>` | Changes the language of a chat room | set | **C**
`eval <javascript>` | Executes arbitrry javascript. Note: Only available on debig mode | *(Only excepted users)* | **D**
`hotpatch` | Reloads the commands source files | *(Only excepted users)*  | **D**
`parserignore <user>` | Locks an user from using the bot commands | *(Only excepted users)* | **D**
`parserunignore <user>` | Unlocks an user from using the bot commands | *(Only excepted users)* | **D**
`null` | Does nothing. Only for development purposes | - | **D**

Pokemon Module
------------

| Usage | Description | Permission | |
| ----- | ----------  | --- | --- |
`gen <pokemon / item / ability / move>` | Gets the generation of a Pokemon, Item, Ability or Move | pokemon\* | **I**
`randommoves <pokemon>, [singles / doubles]` | Gets the random battle moves set for a pokemon | pokemon\* | **I**
`priority <pokemon>` | Gets the priority moves a pokemon can learn | pokemon\* | **I**
`boosting <pokemon>` | Gets the boosting moves a pokemon can learn | pokemon\* | **I**
`recovery <pokemon>` | Gets the recovery moves a pokemon can learn | pokemon\* | **I**
`hazards <pokemon>` | Gets the hazards moves a pokemon can learn | pokemon\* | **I**
`translate <pokemon / item / ability / move / nature>, [origin language], [target language]` | Translates pokemon stuff | translate\* | **I**
`usage` | Gets the smogon usage stats link | usage\* | **I**
`usage <pokemon>, [tier]` | Gets the usage stats of a pokemon (via Smogon) | usage\* | **I**
`usagedata <pokemon>, moves, [tier]` | Gets the most used moves of a pokemon (via Smogon) | usagedata\* | **I**
`usagedata <pokemon>, items, [tier]` | Gets the most used items of a pokemon (via Smogon) | usagedata\* | **I**
`usagedata <pokemon>, abilities, [tier]` | Gets the most used abilities of a pokemon (via Smogon) | usagedata\* | **I**
`usagedata <pokemon>, spreads, [tier]` | Gets the most used EV spreads of a pokemon (via Smogon) | usagedata\* | **I**
`usagedata <pokemon>, teammates, [tier]` | Gets the most used teammates of a pokemon (via Smogon) | usagedata\* | **I**

Misc Module
------------

| Usage | Description | Permission | |
| ----- | ----------  | --- | --- |
`regdate [user]` | Gets the register date of an user | - | **I**
`regtime [user]` | Gets the old of an user accoount | - | **I**
`autoconfirmedhelp [user]` | Provides help of the autoconfirmed status of an account | - | **I**
`pick <option1>, <option2>, [...]` | Randomly picks between 2 or more options | random\* | **A**
`poke` | Gets a random pokemon | randpoke\* | **A**
`hashpoke <text>` | Gets a pseudo-random pokemon using a text | random\* | **A**
`randomanswer` | Gets a random anwer (helix, 8ball command) | randomanswer\* | **A**

Quote-Joke Module
------------

| Usage | Description | Permission | |
| ----- | ----------  | --- | --- |
`quote` | Gets a random quote | quote\* | **A**
`joke` | Gets a random joke | quote\* | **A**
`addquote <text>` | Adds a quote | editquote | **C**
`rmquote <text>` | Removes a quote | editquote | **C**
`addjoke <text>` | Adds a joke | editquote | **C**
`rmjoke <text>` | Removes a joke | editquote | **C**

Games Module
------------

| Usage | Description | Permission | |
| ----- | ----------  | --- | --- |
`anagrams <games>, [answer time]` | Craetes a game of anagrams | games | **A**
`hangman [max fails]` | Creates a game of hangman | games | **A**
`pokeanagrams <games>, [answer time]` | Craetes a game of poke-anagrams | games | **A**
`pokehangman [max fails]` | Creates a game of poke-hangman | games | **A**
`trivia <games>, [answer time]` | Craetes a game of trivia | games | **A**
`kunc <games>, [answer time]` | Creates a game of kunc | games | **A**
`ambush <max players>` | Craetes a game of ambush | games | **A**
`blackjack <max players>` | Creates a game of blackjack | games | **A**
`passbomb <max players>` | Creates a game of pass-the-bomb | games | **A**
`end` | Terminates a game | games | **A**


Blacklist Module
------------

| Usage | Description | Permission | |
| ----- | ----------  | --- | --- |
`viewblacklist` | Returns the balcklist of the current chatroom. Note: Requires to set the server url in the administration options in the control pannel. | blacklist | **I**
`blacklist <user>, [...]` | Add users to the blacklist | blacklist | **C**
`unblacklist <user>, [...]` | Removes users from the blacklist | blacklist | **C**

Moderation Module
------------

| Usage | Description | Permission | |
| ----- | ----------  | --- | --- |
`viewbannedwords` | Gets the banned words list | banword | **I**
`viewzerotolerance` | Gets the zero tolerance list | zerotolerance | **I**
`checkzerotolerance <room>, <user>` | Checks is an user is in the zero tolerance list | checkzerotol | **I**
`banword <word>, [banned / inap / insult], [punishment], [std / strict], [std / ignorenicks]` | Adds a banned word | banword | **C**
`unbanword <word>` | Removes a banned word | banword | **C**
`addzerotolerance <user>, [min / low / normal / high / max]` | Adds an user to the zero tolerance list | zerotolerance | **C**
`rmzerotolerance <user>` | Removes an user from the zero tolrance list | zerotolerance | **C**
`setmoderation <moderation type>, <on / off>` | Configures the moderation filters | moderation | **C**
`modexception <rank>` | Configures the moderation exception | moderation | **C**

Tour Command Module
------------

| Usage | Description | Permission | |
| ----- | ----------  | --- | --- |
`tour` | Creates a tournament with default parametters | tour | **A**
`tour <format>` | Creates a tournament with default parametters and custom format | tour | **A**
`tour <format>, time = <seconds to start>` | Creates a tournament with custom signups time | tour | **A**
`tour <format>, time = infinite, users = <max users>` | Creates a tournament with users capacity | tour | **A**
`tour start` | Starts the tournament (if it does not do it automatically) | tour | **A**

Tour Leaderboards Module
------------

| Usage | Description | Permission | |
| ----- | ----------  | --- | --- |
`toursrank [user], [room]` | Gets the ranking of an user in the leaderboards system | toursrank\* | **I**
`top [room]` | Gets the Top5 of a room in the leaderboards system | toursrank\* | **I**
`tourleaderboards [room]` | Gets the laederboards Top100 of a room. Note: Requires to set the server url in the administration options in the control pannel. | toursrank\* | **I**
`official` | Sets a tournament official | tourofficial | **C**
`unofficial` | Sets a tournament unofficial | tourofficial | **C**

Battle Module
------------

| Usage | Description | Permission | |
| ----- | ----------  | --- | --- |
`chall <user>, <format>, [team]` | Challenges an user | chall | **A**
`cancelchallenge` | Cancels current challenge request | chall | **A**
`searchbattle <format>` | Search a battle in ladder and returns the link | searchbattle | **A**

HtmlBox Commands Module
------------

| Usage | Description | Permission | |
| ----- | ----------  | --- | --- |
`htmlcmdlist` | Gets html-box commands list. Note: Requires to set the server url in the administration options in the control pannel. | info\* | **I**
`htmlcmd <command>` | Executes a html-box command if exists | htmlboxcmd\* | **A**

GitHub Hook Module
------------

| Usage | Description | Permission | |
| ----- | ----------  | --- | --- |
`gitban <user>` | Adds an user to the github blacklist | gitban | **C**
`gitunban <user>` | Removes an user from the github blacklist | gitban | **C**

Timers Module
------------

| Usage | Description | Permission | |
| ----- | ----------  | --- | --- |
`starttimer <minutes>, <seconds>` | Starts a timeout | timer | **A**
`stoptimer` | Stops the timeout | timer | **A**
