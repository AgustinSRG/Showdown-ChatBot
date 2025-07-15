# Official Add-ons for Showdown-ChatBot

This is a list of official add-ons: developed by the authors of the bot ar accepted by them.

The add-ons are sorted alphabetically.

Index:

- [Official Add-ons for Showdown-ChatBot](#official-add-ons-for-showdown-chatbot)
  - [Automated promotion to voice](#automated-promotion-to-voice)
  - [Automated response add-on](#automated-response-add-on)
  - [Battle spectate add-on](#battle-spectate-add-on)
  - [Commands guide add-on](#commands-guide-add-on)
  - [HashPoke command exceptions](#hashpoke-command-exceptions)
  - [Pastebin add-on](#pastebin-add-on)
  - [YouTube link recognition add-on](#youtube-link-recognition-add-on)

---

## Automated promotion to voice

**Description**: This add-on automatically promotes users to room voice when they join specific rooms. This may be useful in certain cases. Note: The bot account needs to be able to promote to voice for this to work.

**Add-on file**: [auto-voice](./auto-voice.js)

**Configuration**: In order to configure the add-on, change the value of the following constants before installing:

- `Rooms`: The list of rooms where this feature will be enabled

You can optionally change the value of `Promotion_Command`, in order to change the promotion command.

## Automated response add-on

**Description**: This add-on makes the bot automatically respond to certain message patterns. For example: If an user says `good luck` in battle, it will respond with `Have fun!`. It can serve as a template to create your own custom auto-response add-on.

**Add-on file**: [auto-response](./auto-response.js)

## Battle spectate add-on

**Description**: This add-on makes the bot automatically join battles in order to spectate them. Note: The `Battle Log` module also implements this feature. Use this add-on only if you want to keep the `Battle Log` module disabled.

**Add-on file**: [battle-spectate](./battle-spectate.js)

**Configuration**: In order to configure the add-on, change the value of the following constants before installing:

- `SPECTATE_TOURNAMENT_BATTLES`: True to spectate tournament battles
- `SPECTATE_SERVER_BATTLES`: True to spectate server battles announced in the `Lobby` room.

## Commands guide add-on

**Description**: This add-on turns the `.help` command into an interactive guide, making used of the `/sendhtmlpage` server command. The guide is divided in sections and the sections in pages. You can download the official guide from the Wiki (default), or configure your own guide via the control panel (new section: `Commands Guide`).

**Add-on files**:

- English version: [commands-guide](./commands-guide.js)
- Spanish version: [commands-guide-es](./commands-guide-es.js)

**Restrictions**:

- The bot requires the rank of **global bot** in order to be able to use the `/sendhtmlpage` server command.
- The bot must be present in the `Lobby` room of the server.
- Showdown-ChatBot version must be equal or greater than `2.16.1`.

**Configuration**: You can configure the commands guide by accessing the `Commands Guide` section of the control panel.

Also, you can change the `MAX_COMMANDS_PER_PAGE` constant in order to change the number of commands per page.

## HashPoke command exceptions

**Description**: This add-on adds a control panel section, named `HashPoke`, that allows you to configure exceptions for the `hashpoke` command. That way, you can set the resulting pokemon for certain usernames.

**Add-on file**: [hpoke-exceptions](./hpoke-exceptions.js)

## Pastebin add-on

**Description**: This add-on adds a set of commands to import and export certain think in bulk. The export process is done via temporal links of the control panel, while the import process is done via Pastebin links. This allows the staff to configure these settings without access to the control panel.

**Add-on files**:

- English version: [pastebin](./pastebin.js)
- Spanish version: [pastebin-es](./pastebin-es.js)

**Added commands**:

| Command syntax                       | Description                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `setrand <Command>, <Pastebin link>` | Imports the options for a random command. The Pastebin must have the options separated in each line. |
| `getkuncdata`                        | Exports the data of the game of Kunc.                                                                |
| `setkuncdata <Pastebin link>`        | Imports the data of the game of Kunc.                                                                |
| `gettriviadata`                      | Exports the data of the game of Trivia.                                                              |
| `settriviadata <Pastebin link>`      | Imports the data of the game of Trivia.                                                              |
| `gethangmandata`                     | Exports the data of the game of Hangman.                                                             |
| `sethangmandata <Pastebin link>`     | Imports the data of the game of Hangman.                                                             |
| `getanagramsdata`                    | Exports the data of the game of Anagrams.                                                            |
| `setanagramsdata <Pastebin link>`    | Imports the data of the game of Anagrams.                                                            |

For the Kunc data, the following format is used: `Species||move1,move2...`. Example:

```
Pikachu||Thunderbolt,Fake Out,Iron Tail,Extreme Speed
Cinderace||Acrobatics,Pyro Ball,High Jump Kick,Court Change
```

For the Trivia data, the following format is used: `Clue||answer,answer...`. Example:

```
Which is the fastest Pokemon?||Regieleki
Which is the signature move of Chatot?||Chatter
```

For Hangman and Anagrams data, the following format is used: `Clue||word,word...``. Example:

```
Fruit||Apple,Orange,Strawberry,Pear
Animal||Cat,Dog,Rabbit,Chicken,Cow,Pig,Sheep
```

**Configuration**: You can change the permission for the commands by changing the value of the `PERMISSION_REQUIRED` constant:

```js
// Name of the permission required for the commands
const PERMISSION_REQUIRED = "randadmin";
```

## YouTube link recognition add-on

**Description**: An addon that recognizes the YouTube links sent in chat and automatically analyzes it and responds with the video title and author.

**Add-on file**: [youtube](./youtube.js)

**Configuration**: In order to configure the add-on, change the value of the following constants before installing:

- `Rooms`: The list of rooms where this feature will be enabled
- `Youtube_API_Key`: The API key to get the YouTube data. Instructions on how to obtain one: https://developers.google.com/youtube/registering_an_application
