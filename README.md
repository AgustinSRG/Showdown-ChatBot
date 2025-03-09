Showdown ChatBot
====================

![NodeJS Workflow](https://github.com/AgustinSRG/Showdown-ChatBot/actions/workflows/node.js.yml/badge.svg)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat)](https://github.com/AgustinSRG/Showdown-ChatBot/blob/master/LICENSE)

[Pokemon Showdown](https://github.com/smogon/pokemon-showdown) bot written for [Node JS](http://nodejs.org/) with a ton of features often useful for chat rooms like automated moderation, blacklist, customizable help / information commands, games, tournament tools and chat logs. All of those features can be configured with a web control panel that does not require any programming knowledge to be used.

Features
------------

 - **Control Panel**: You can configure your bot using a web control panel. You do not need to edit any file manually.
 - **Modular design**: You can create and install add-ons in order to add new features (for example new commands or new options for the control panel). You can also enable and disable modules depending of your requires.
 - **Multi-Language**: Bot commands and modules can operate in multiple languages at the same time (for example for language rooms). Currently only English and Spanish are implemented. However, you can create new languages and translate the language files via your bot's control panel.
 - **Dynamic commands**: You can create custom text commands (the bot replies with a plain text) and html commands (the bot replies with an /htmlbox if it has permission). You can do this using commands or using the control panel.
 - **Logs**: You can log chat rooms and bot's private messages. You also have a security log for important events and crash reports.
 - **Backups**: You can save backups and restore them later (only configuration files, not logs or seen data). You can find this option in your bot's control panel, `Tools` option, `Backups` sub-option.
 - **Automated Moderation**: Filters like capitals, stretching, spoiler or banned words, with automated detection and punishment.
 - **Blacklist**: Permanent banning for chat rooms.
 - **Automated Battle Bot**: This bot can play Pokemon battles itself. It is not an artificial intelligence, but the algorithm is good enough to be a threat for less skilled players, specially in formats with random generated teams. It can participate in scripted tournaments, ladder and accept battles from users. You can give it teams via the control panel and configure it in the `Battle Bot` option.
 - **Tournaments Tools**: Tournament command (to create, start and set the auto-dq in a single command) and tournament leaderboards, with automated top 100 tables generation and customizable points system.
 - **Chat Games**: Hangman, anagrams, mini-blackjack, pass the bomb, trivia and kunc.
 - **Pokemon Commands**: Useful Pokemon related commands not implemented in Pokemon Showdown, like Smogon usage stats and translation commands.
 - **Auto-Invite**: Automated `/invite` message sent to the staff (for private rooms).
 - **Players-Auction**: You can create and play players auctions using commands (for team tournaments).
 - **Finding Users Tools**: Automatically saves the last time an user did something in a room where the bot was (this data is stored in hard disk, so it is permanent). Also tracks alts from name changes. Users can use `seen` and `alts` commands to easily find other users.
 - **Groupchat Tools**: Automatically maintains groupchats (temporal rooms) and promotes users.
 - **Others**: Quotes and jokes, join-phrases, commands like `helix`, etc.

Run a bot with Docker Compose
------------

The simplest way to run this project is with [Docker compose](https://docs.docker.com/compose/), using the [official Showdown-ChatBot image on Docker Hub](https://hub.docker.com/r/asanrom/showdown-chatbot).

First, make sure to install [Docker](https://www.docker.com/) and [Docker compose](https://docs.docker.com/compose/) in your system. You can also install other runtime, like [https://podman.io/](Podman), but the commands may vary.

Create a file named `docker-compose.yml`, and copy the following content into it:

```yml
version: '3.9'

services:

  bot:
    image: asanrom/showdown-chatbot
    ports:
      - '8080:8080'
      - '443:443'
    volumes:
      - ./config:/bot/config
      - ./data:/bot/data
      - ./logs:/bot/logs
      - ./instances:/bot/instances
    restart: unless-stopped
    command: -p 8080 -b 0.0.0.0
```

If you want to use a different port for the control panel, make sure to replace `8080` with the port you want.

Once you have the `docker-compose.yml`, in order to start the bot, open a terminal / command prompt in the folder where the file is located, and type the following command:

```sh
docker compose up -d
```

Configure your bot using the control panel. You can use the [Basic Configuration Guide](https://github.com/AgustinSRG/Showdown-ChatBot/wiki/Basic-Configuration-Guide) as help.

If you want to keep the image updated to the latest version automatically, you can use a tool like [Watchtower](https://containrrr.dev/watchtower/). You can also pull the image and restart the containers manually:

```sh
# Update the image and restart the containers
docker compose pull
docker compose up --detach
```

Manual installation
------------

Showdown ChatBot requires [node.js](http://nodejs.org/) to run. It is recommended to install the latest stable version to avoid bugs.

Install [Git](https://git-scm.com/) if you do not have it.

Open a terminal / console and clone this repository with the following command:
```
git clone https://github.com/AgustinSRG/Showdown-ChatBot.git Showdown-ChatBot
```

If you have an old version of Showdown-ChatBot and you want to update it,  use `cd` to reach the directory of the bot and run:
```
git pull https://github.com/AgustinSRG/Showdown-ChatBot.git
```

You also can download [the last release](https://github.com/AgustinSRG/Showdown-ChatBot/releases) of Showdown-ChatBot and decompress it if you prefer not using git

Use `cd` to reach the directory of the bot and run the following command to install dependencies:
```
npm install
```

To start the bot, use the following command:
```
npm start
```

Configure your bot using the control panel. You can use the [Basic Configuration Guide](https://github.com/AgustinSRG/Showdown-ChatBot/wiki/Basic-Configuration-Guide) as help.

If you want to stop your bot, use `Ctrl + C` or kill the process by other way.

Useful Documentation
------------

 - [Frequently Asked Questions](https://github.com/AgustinSRG/Showdown-ChatBot/wiki/Frequently-Asked-Questions)
 - [Commands List](https://github.com/AgustinSRG/Showdown-ChatBot/wiki/Commands-List)

For more guides and documentation, check the [Showdown-ChatBot Wiki](https://github.com/AgustinSRG/Showdown-ChatBot/wiki)


Add-ons
------------

Add-ons are like optional modules you can install for your bot. They are rather limited and have no translation feature but they can be used to add custom commands and very specific features to your bot. Some public add-ons [here](https://github.com/AgustinSRG/Showdown-ChatBot/wiki#add-ons).

Contributing
------------

 - [Contributing guidelines](https://github.com/AgustinSRG/Showdown-ChatBot/blob/master/CONTRIBUTING.md)
